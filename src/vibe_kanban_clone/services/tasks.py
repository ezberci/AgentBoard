"""Task service."""

import structlog
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from vibe_kanban_clone.models.agent import Agent
from vibe_kanban_clone.models.column import Column
from vibe_kanban_clone.models.task import Task
from vibe_kanban_clone.schemas.task import TaskCreate, TaskMove, TaskUpdate

logger = structlog.get_logger()


async def create_task(session: AsyncSession, data: TaskCreate) -> Task:
    """Create a new task."""
    task = Task(
        project_id=data.project_id,
        column_id=data.column_id,
        title=data.title,
        description=data.description,
        priority=data.priority,
        assigned_agent_id=data.assigned_agent_id,
    )
    session.add(task)

    col_result = await session.execute(select(Column).where(Column.id == task.column_id))
    column = col_result.scalar_one_or_none()
    if column is None or column.project_id != task.project_id:
        raise ValueError("Column does not belong to project")

    await session.commit()
    await session.refresh(task)
    logger.info("task_created", task_id=task.id)
    return task


async def get_task(session: AsyncSession, task_id: int) -> Task | None:
    """Get a task by ID with eagerly loaded comments."""
    result = await session.execute(
        select(Task).options(selectinload(Task.comments)).where(Task.id == task_id)
    )
    return result.scalar_one_or_none()


async def list_tasks_by_project(
    session: AsyncSession, project_id: int, limit: int = 50, offset: int = 0
) -> list[Task]:
    """List all tasks in a project."""
    result = await session.execute(
        select(Task).where(Task.project_id == project_id).limit(limit).offset(offset)
    )
    return list(result.scalars().all())


async def list_tasks_filtered(
    session: AsyncSession,
    project_id: int,
    status: str | None = None,
    agent_id: int | None = None,
    priority_gte: int | None = None,
) -> list[Task]:
    """List tasks with optional filters."""
    stmt = select(Task).where(Task.project_id == project_id)
    if status is not None:
        stmt = stmt.outerjoin(Column, Task.column_id == Column.id)
        if status == "todo":
            stmt = stmt.where(Task.claimed_at.is_(None))
        elif status == "in_progress":
            stmt = stmt.where(Task.claimed_at.is_not(None), Column.is_terminal == False)  # noqa: E712
        elif status == "done":
            stmt = stmt.where(Column.is_terminal == True)  # noqa: E712
    if agent_id is not None:
        stmt = stmt.where(Task.assigned_agent_id == agent_id)
    if priority_gte is not None:
        stmt = stmt.where(Task.priority >= priority_gte)
    stmt = stmt.order_by(Task.priority.asc(), Task.created_at.asc())
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def update_task(session: AsyncSession, task: Task, data: TaskUpdate) -> Task:
    """Update a task, checking expected_version for optimistic locking."""
    if task.version != data.expected_version:
        raise ValueError("version mismatch")

    if data.title is not None:
        task.title = data.title
    if data.description is not None:
        task.description = data.description
    if data.priority is not None:
        task.priority = data.priority
    if data.result is not None:
        task.result = data.result
    if data.assigned_agent_id is not None:
        agent_result = await session.execute(
            select(Agent).where(Agent.id == data.assigned_agent_id)
        )
        agent = agent_result.scalar_one_or_none()
        if agent is None:
            raise ValueError("Agent not found")
        task.assigned_agent_id = data.assigned_agent_id

    task.version += 1
    await session.commit()
    await session.refresh(task)
    logger.info("task_updated", task_id=task.id, version=task.version)
    return task


async def move_task(session: AsyncSession, task: Task, data: TaskMove) -> Task:
    """Move a task to another column, checking expected_version."""
    if task.version != data.expected_version:
        raise ValueError("version mismatch")

    col_result = await session.execute(select(Column).where(Column.id == data.column_id))
    column = col_result.scalar_one_or_none()
    if column is None or column.project_id != task.project_id:
        raise ValueError("Column does not belong to project")

    task.column_id = data.column_id
    task.version += 1
    await session.commit()
    await session.refresh(task)
    logger.info("task_moved", task_id=task.id, column_id=task.column_id)
    return task


async def delete_task(session: AsyncSession, task: Task) -> None:
    """Delete a task."""
    await session.delete(task)
    await session.commit()
    logger.info("task_deleted", task_id=task.id)


async def assign_agent_to_task(session: AsyncSession, task: Task, agent_id: int) -> Task:
    """Assign an agent to a task."""
    task.assigned_agent_id = agent_id
    await session.commit()
    await session.refresh(task)
    logger.info("task_assigned", task_id=task.id, agent_id=agent_id)
    return task


async def unassign_agent(session: AsyncSession, task: Task) -> Task:
    """Unassign the agent from a task."""
    task.assigned_agent_id = None
    await session.commit()
    await session.refresh(task)
    logger.info("task_unassigned", task_id=task.id)
    return task


async def claim_next_task(session: AsyncSession, agent_id: int, project_id: int) -> Task | None:
    """Atomically claim the next available task for an agent."""
    sql = text(
        """
        UPDATE tasks
        SET
            column_id = (
                SELECT c2.id
                FROM columns c2
                WHERE c2.project_id = :project_id
                AND c2.position > (
                    SELECT c.position FROM columns c WHERE c.id = tasks.column_id
                )
                ORDER BY c2.position ASC
                LIMIT 1
            ),
            claimed_at = CURRENT_TIMESTAMP,
            assigned_agent_id = :agent_id,
            version = version + 1
        WHERE id = (
            SELECT t.id
            FROM tasks t
            JOIN columns c ON t.column_id = c.id
            WHERE t.project_id = :project_id
            AND t.claimed_at IS NULL
            AND c.is_terminal = FALSE
            AND EXISTS (
                SELECT 1 FROM columns c2
                WHERE c2.project_id = :project_id
                AND c2.position > c.position
            )
            ORDER BY t.priority ASC, t.created_at ASC
            LIMIT 1
        )
        RETURNING *
        """
    )
    result = await session.execute(sql, {"project_id": project_id, "agent_id": agent_id})
    row = result.mappings().fetchone()
    await session.commit()
    if row is None:
        return None
    task = await session.get(Task, row["id"])
    if task is None:
        return None

    logger.info("task_claimed", task_id=task.id, agent_id=agent_id)
    return task


async def complete_task(
    session: AsyncSession, task: Task, result: str, terminal_column_id: int | None = None
) -> Task:
    """Mark a task as complete by writing the result and moving it to the terminal column."""
    if terminal_column_id is None:
        col_result = await session.execute(
            select(Column)
            .where(Column.project_id == task.project_id, Column.is_terminal == True)  # noqa: E712
            .order_by(Column.position.asc())
            .limit(1)
        )
        terminal_col = col_result.scalar_one_or_none()
        if terminal_col is None:
            raise ValueError("no terminal column")
        terminal_column_id = terminal_col.id

    task.result = result
    task.column_id = terminal_column_id
    task.version += 1
    await session.commit()
    await session.refresh(task)
    logger.info("task_completed", task_id=task.id)
    return task
