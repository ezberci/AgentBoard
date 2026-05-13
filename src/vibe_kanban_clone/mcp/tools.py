"""MCP tools implementation."""

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from vibe_kanban_clone.db import engine as _engine_module
from vibe_kanban_clone.mcp.server import mcp
from vibe_kanban_clone.schemas.agent import AgentRead
from vibe_kanban_clone.schemas.column import ColumnRead
from vibe_kanban_clone.schemas.project import ProjectRead
from vibe_kanban_clone.schemas.skill import SkillRead
from vibe_kanban_clone.schemas.task import TaskCreate, TaskRead, TaskUpdate
from vibe_kanban_clone.schemas.task_comment import TaskCommentCreate, TaskCommentRead
from vibe_kanban_clone.services import agents as agents_service
from vibe_kanban_clone.services import columns as columns_service
from vibe_kanban_clone.services import comments as comments_service
from vibe_kanban_clone.services import projects as projects_service
from vibe_kanban_clone.services import skills as skills_service
from vibe_kanban_clone.services import tasks as tasks_service


@mcp.tool()
async def get_context() -> dict[str, Any]:
    """Return current project context with columns and recent tasks."""
    async with AsyncSession(_engine_module.engine) as session:
        projects = await projects_service.list_projects(session)
        if not projects:
            return {"current_project": None, "columns": [], "recent_tasks": []}
        current_project = projects[0]
        columns = await columns_service.list_columns_by_project(session, current_project.id)
        tasks = await tasks_service.list_tasks_by_project(session, current_project.id)
        recent_tasks = sorted(tasks, key=lambda t: t.created_at, reverse=True)[:10]
        return {
            "current_project": ProjectRead.model_validate(current_project).model_dump(mode="json"),
            "columns": [ColumnRead.model_validate(c).model_dump(mode="json") for c in columns],
            "recent_tasks": [
                TaskRead.model_validate(t).model_dump(mode="json") for t in recent_tasks
            ],
        }


@mcp.tool()
async def list_projects() -> list[dict[str, Any]]:
    """List all projects."""
    async with AsyncSession(_engine_module.engine) as session:
        projects = await projects_service.list_projects(session)
        return [ProjectRead.model_validate(p).model_dump(mode="json") for p in projects]


@mcp.tool()
async def get_project(project_id: int) -> dict[str, Any] | None:
    """Get project detail."""
    async with AsyncSession(_engine_module.engine) as session:
        project = await projects_service.get_project(session, project_id)
        if project is None:
            return None
        return ProjectRead.model_validate(project).model_dump(mode="json")


@mcp.tool()
async def list_tasks(
    project_id: int,
    status: str | None = None,
    agent_id: int | None = None,
    priority_gte: int | None = None,
) -> list[dict[str, Any]]:
    """List tasks with optional filters."""
    async with AsyncSession(_engine_module.engine) as session:
        tasks = await tasks_service.list_tasks_filtered(
            session, project_id, status, agent_id, priority_gte
        )
        return [TaskRead.model_validate(t).model_dump(mode="json") for t in tasks]


@mcp.tool()
async def get_task(task_id: int) -> dict[str, Any] | None:
    """Get task detail with comments."""
    async with AsyncSession(_engine_module.engine) as session:
        task = await tasks_service.get_task(session, task_id)
        if task is None:
            return None
        data = TaskRead.model_validate(task).model_dump(mode="json")
        data["comments"] = [
            TaskCommentRead.model_validate(c).model_dump(mode="json") for c in task.comments
        ]
        return data


@mcp.tool()
async def create_task(
    project_id: int,
    title: str,
    description: str | None = None,
    priority: int | None = None,
    agent_id: int | None = None,
) -> dict[str, Any]:
    """Create a new task."""
    async with AsyncSession(_engine_module.engine) as session:
        columns = await columns_service.list_columns_by_project(session, project_id)
        column_id = columns[0].id if columns else None
        data = TaskCreate(
            project_id=project_id,
            column_id=column_id,
            title=title,
            description=description,
            priority=priority if priority is not None else 4,
            assigned_agent_id=agent_id,
        )
        task = await tasks_service.create_task(session, data)
        from vibe_kanban_clone.api.routes.ws import broadcast_project

        await broadcast_project(
            task.project_id,
            "task.created",
            TaskRead.model_validate(task).model_dump(mode="json"),
        )
        return TaskRead.model_validate(task).model_dump(mode="json")


@mcp.tool()
async def update_task(
    task_id: int,
    description: str | None = None,
    result: str | None = None,
    priority: int | None = None,
) -> dict[str, Any] | None:
    """Update task fields."""
    async with AsyncSession(_engine_module.engine) as session:
        task = await tasks_service.get_task(session, task_id)
        if task is None:
            return None
        data = TaskUpdate(description=description, result=result, priority=priority)
        updated = await tasks_service.update_task(session, task, data)
        from vibe_kanban_clone.api.routes.ws import broadcast_project

        await broadcast_project(
            updated.project_id,
            "task.updated",
            TaskRead.model_validate(updated).model_dump(mode="json"),
        )
        return TaskRead.model_validate(updated).model_dump(mode="json")


@mcp.tool()
async def delete_task(task_id: int) -> bool:
    """Delete a task."""
    async with AsyncSession(_engine_module.engine) as session:
        task = await tasks_service.get_task(session, task_id)
        if task is None:
            return False
        project_id = task.project_id
        await tasks_service.delete_task(session, task)
        from vibe_kanban_clone.api.routes.ws import broadcast_project

        await broadcast_project(project_id, "task.deleted", {"task_id": task_id})
        return True


@mcp.tool()
async def list_agents() -> list[dict[str, Any]]:
    """List all agents."""
    async with AsyncSession(_engine_module.engine) as session:
        agents = await agents_service.list_agents(session)
        return [AgentRead.model_validate(a).model_dump(mode="json") for a in agents]


@mcp.tool()
async def get_agent(agent_id: int) -> dict[str, Any] | None:
    """Get agent detail with skills."""
    async with AsyncSession(_engine_module.engine) as session:
        agent = await agents_service.get_agent(session, agent_id)
        if agent is None:
            return None
        return AgentRead.model_validate(agent).model_dump(mode="json")


@mcp.tool()
async def list_skills() -> list[dict[str, Any]]:
    """List all skills."""
    async with AsyncSession(_engine_module.engine) as session:
        skills = await skills_service.list_skills(session)
        return [SkillRead.model_validate(s).model_dump(mode="json") for s in skills]


@mcp.tool()
async def get_skill(skill_id: int) -> dict[str, Any] | None:
    """Get skill detail."""
    async with AsyncSession(_engine_module.engine) as session:
        skill = await skills_service.get_skill(session, skill_id)
        if skill is None:
            return None
        return SkillRead.model_validate(skill).model_dump(mode="json")


@mcp.tool()
async def assign_agent_to_task(task_id: int, agent_id: int) -> dict[str, Any] | None:
    """Assign an agent to a task."""
    async with AsyncSession(_engine_module.engine) as session:
        task = await tasks_service.get_task(session, task_id)
        if task is None:
            return None
        updated = await tasks_service.assign_agent_to_task(session, task, agent_id)
        from vibe_kanban_clone.api.routes.ws import broadcast_project

        await broadcast_project(
            updated.project_id,
            "task.updated",
            TaskRead.model_validate(updated).model_dump(mode="json"),
        )
        return TaskRead.model_validate(updated).model_dump(mode="json")


@mcp.tool()
async def unassign_agent(task_id: int) -> dict[str, Any] | None:
    """Unassign the agent from a task."""
    async with AsyncSession(_engine_module.engine) as session:
        task = await tasks_service.get_task(session, task_id)
        if task is None:
            return None
        updated = await tasks_service.unassign_agent(session, task)
        from vibe_kanban_clone.api.routes.ws import broadcast_project

        await broadcast_project(
            updated.project_id,
            "task.updated",
            TaskRead.model_validate(updated).model_dump(mode="json"),
        )
        return TaskRead.model_validate(updated).model_dump(mode="json")


@mcp.tool()
async def claim_next_task(agent_id: int, project_id: int) -> dict[str, Any] | None:
    """Atomically claim the next available task for an agent."""
    async with AsyncSession(_engine_module.engine) as session:
        claimed = await tasks_service.claim_next_task(session, agent_id, project_id)
        if claimed is None:
            return None
        return TaskRead.model_validate(claimed).model_dump(mode="json")


@mcp.tool()
async def complete_task(task_id: int, result: str) -> dict[str, Any] | None:
    """Complete a task by writing a result and moving it to the terminal column."""
    async with AsyncSession(_engine_module.engine) as session:
        task = await tasks_service.get_task(session, task_id)
        if task is None:
            return None
        completed = await tasks_service.complete_task(session, task, result)
        return TaskRead.model_validate(completed).model_dump(mode="json")


@mcp.tool()
async def add_task_comment(
    task_id: int, body: str, author: str | None = None
) -> dict[str, Any] | None:
    """Add a comment to a task."""
    async with AsyncSession(_engine_module.engine) as session:
        task = await tasks_service.get_task(session, task_id)
        if task is None:
            return None
        data = TaskCommentCreate(author=author or "MCP", body=body)
        comment = await comments_service.create_comment(session, task_id, data)
        from vibe_kanban_clone.api.routes.ws import broadcast_project

        await broadcast_project(
            task.project_id,
            "comment.created",
            TaskCommentRead.model_validate(comment).model_dump(mode="json"),
        )
        return TaskCommentRead.model_validate(comment).model_dump(mode="json")
