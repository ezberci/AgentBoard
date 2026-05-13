"""Task service."""

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

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


async def list_tasks_by_project(session: AsyncSession, project_id: int) -> list[Task]:
    """List all tasks in a project."""
    result = await session.execute(select(Task).where(Task.project_id == project_id))
    return list(result.scalars().all())


async def update_task(session: AsyncSession, task: Task, data: TaskUpdate) -> Task:
    """Update a task, checking expected_version for optimistic locking."""
    if data.expected_version is not None and task.version != data.expected_version:
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
        task.assigned_agent_id = data.assigned_agent_id

    task.version += 1
    await session.commit()
    await session.refresh(task)
    logger.info("task_updated", task_id=task.id, version=task.version)
    return task


async def move_task(session: AsyncSession, task: Task, data: TaskMove) -> Task:
    """Move a task to another column, checking expected_version."""
    if data.expected_version is not None and task.version != data.expected_version:
        raise ValueError("version mismatch")

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
