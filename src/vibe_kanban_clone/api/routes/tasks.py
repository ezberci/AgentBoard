"""Task routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from vibe_kanban_clone.api.deps import get_session
from vibe_kanban_clone.api.routes.ws import broadcast_project
from vibe_kanban_clone.schemas.task import TaskCreate, TaskMove, TaskRead, TaskUpdate
from vibe_kanban_clone.schemas.task_comment import TaskCommentCreate, TaskCommentRead
from vibe_kanban_clone.services import comments as comments_service
from vibe_kanban_clone.services import projects as projects_service
from vibe_kanban_clone.services import tasks as tasks_service

router = APIRouter()


@router.get("/projects/{project_id}/tasks", response_model=list[TaskRead])
async def list_tasks(
    project_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[TaskRead]:
    """List all tasks in a project."""
    project = await projects_service.get_project(session, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return await tasks_service.list_tasks_by_project(session, project_id)


@router.post("/tasks", response_model=TaskRead, status_code=201)
async def create_task(
    data: TaskCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TaskRead:
    """Create a new task."""
    task = await tasks_service.create_task(session, data)
    await broadcast_project(
        task.project_id,
        "task.created",
        TaskRead.model_validate(task).model_dump(mode="json"),
    )
    return task


@router.get("/tasks/{task_id}", response_model=TaskRead)
async def get_task(
    task_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TaskRead:
    """Get a task by ID."""
    task = await tasks_service.get_task(session, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/tasks/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: int,
    data: TaskUpdate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TaskRead:
    """Update a task."""
    task = await tasks_service.get_task(session, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    try:
        task = await tasks_service.update_task(session, task, data)
    except ValueError:
        raise HTTPException(status_code=409, detail="Task was modified by another client") from None
    await broadcast_project(
        task.project_id,
        "task.updated",
        TaskRead.model_validate(task).model_dump(mode="json"),
    )
    return task


@router.delete("/tasks/{task_id}", status_code=204)
async def delete_task(
    task_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    """Delete a task."""
    task = await tasks_service.get_task(session, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    project_id = task.project_id
    await tasks_service.delete_task(session, task)
    await broadcast_project(
        project_id,
        "task.deleted",
        {"task_id": task_id},
    )


@router.post("/tasks/{task_id}/move", response_model=TaskRead)
async def move_task(
    task_id: int,
    data: TaskMove,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TaskRead:
    """Move a task to another column."""
    task = await tasks_service.get_task(session, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    try:
        task = await tasks_service.move_task(session, task, data)
    except ValueError:
        raise HTTPException(status_code=409, detail="Task was modified by another client") from None
    await broadcast_project(
        task.project_id,
        "task.moved",
        TaskRead.model_validate(task).model_dump(mode="json"),
    )
    return task


@router.post("/tasks/{task_id}/comments", response_model=TaskCommentRead, status_code=201)
async def create_comment(
    task_id: int,
    data: TaskCommentCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TaskCommentRead:
    """Create a comment on a task."""
    task = await tasks_service.get_task(session, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    comment = await comments_service.create_comment(session, task_id, data)
    await broadcast_project(
        task.project_id,
        "comment.created",
        TaskCommentRead.model_validate(comment).model_dump(mode="json"),
    )
    return comment
