"""Task routes."""

import asyncio
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from vibe_kanban_clone.api.deps import get_session
from vibe_kanban_clone.api.routes.ws import broadcast_project
from vibe_kanban_clone.db.engine import async_session_factory
from vibe_kanban_clone.schemas.common import PaginatedParams
from vibe_kanban_clone.schemas.task import TaskCreate, TaskMove, TaskRead, TaskRunCreate, TaskUpdate
from vibe_kanban_clone.schemas.task_comment import TaskCommentCreate, TaskCommentRead
from vibe_kanban_clone.schemas.task_run import TaskRunRead
from vibe_kanban_clone.services import comments as comments_service
from vibe_kanban_clone.services import projects as projects_service
from vibe_kanban_clone.services import runs as runs_service
from vibe_kanban_clone.services import tasks as tasks_service

router = APIRouter()
logger = structlog.get_logger()
_bg_tasks: set[asyncio.Task] = set()
_run_semaphore = asyncio.Semaphore(5)


@router.get("/projects/{project_id}/tasks", response_model=list[TaskRead])
async def list_tasks(
    project_id: int,
    pagination: Annotated[PaginatedParams, Depends()],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[TaskRead]:
    """List all tasks in a project."""
    project = await projects_service.get_project(session, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return await tasks_service.list_tasks_by_project(
        session, project_id, pagination.limit, pagination.offset
    )


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
    if data.expected_version is None:
        data.expected_version = task.version
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
    if data.expected_version is None:
        data.expected_version = task.version
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


@router.post("/tasks/{task_id}/run", status_code=202)
async def run_task(
    task_id: int,
    data: TaskRunCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict:
    """Start a task execution run."""
    task = await tasks_service.get_task(session, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    prompt = data.prompt if data.prompt is not None else (task.description or task.title)

    try:
        await asyncio.wait_for(_run_semaphore.acquire(), timeout=1.0)
    except TimeoutError:
        raise HTTPException(status_code=503, detail="Server busy, try again later") from None

    try:
        task_ref = asyncio.create_task(
            runs_service.execute_task_run(
                async_session_factory,
                task_id,
                data.model_id,
                prompt,
            )
        )
    except Exception:
        _run_semaphore.release()
        raise

    _bg_tasks.add(task_ref)

    def _on_task_done(t: asyncio.Task) -> None:
        _bg_tasks.discard(t)
        _run_semaphore.release()
        if exc := t.exception():
            logger.error("task_run_failed", error=str(exc))

    task_ref.add_done_callback(_on_task_done)

    return {"status": "started", "task_id": task_id}


@router.get("/tasks/{task_id}/runs", response_model=list[TaskRunRead])
async def list_task_runs(
    task_id: int,
    pagination: Annotated[PaginatedParams, Depends()],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[TaskRunRead]:
    """List execution runs for a task."""
    task = await tasks_service.get_task(session, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return await runs_service.list_task_runs(session, task_id, pagination.limit, pagination.offset)
