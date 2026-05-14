"""Task run execution service."""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from vibe_kanban_clone.api.routes.ws import broadcast_project
from vibe_kanban_clone.executors.registry import get_executor
from vibe_kanban_clone.models.task import Task
from vibe_kanban_clone.models.task_run import TaskRun
from vibe_kanban_clone.services.models import get_model


async def list_task_runs(session: AsyncSession, task_id: int) -> list[TaskRun]:
    result = await session.scalars(
        select(TaskRun).where(TaskRun.task_id == task_id).order_by(TaskRun.started_at.desc())
    )
    return list(result.all())


async def execute_task_run(
    async_session_factory: async_sessionmaker,
    task_id: int,
    model_id: int,
    prompt: str,
) -> TaskRun:
    """Execute a task run with streaming and broadcast updates."""
    async with async_session_factory() as session:
        task = await session.get(Task, task_id)
        if task is None:
            raise RuntimeError("Task not found")

        run = TaskRun(
            task_id=task_id,
            model_id=model_id,
            agent_id=task.assigned_agent_id,
            status="running",
            prompt=prompt,
            started_at=datetime.now(UTC),
        )
        session.add(run)
        await session.commit()
        await session.refresh(run)

        await broadcast_project(
            task.project_id,
            "run.started",
            {"run_id": run.id, "task_id": task.id},
        )

        model = await get_model(session, model_id)
        if model is None:
            raise RuntimeError("Model not found")

        executor = get_executor(model.provider)

    try:
        full_output = ""
        async for token in executor.run(
            prompt,
            {
                "model_id": model.model_id,
                "api_key_env": model.api_key_env,
                "base_url": model.base_url,
            },
        ):
            full_output += token
            await broadcast_project(
                task.project_id,
                "run.token",
                {"run_id": run.id, "token": token},
            )

        async with async_session_factory() as session:
            run = await session.get(TaskRun, run.id)
            if run is not None:
                run.output = full_output
                run.status = "completed"
                run.finished_at = datetime.now(UTC)
                await session.commit()

        await broadcast_project(
            task.project_id,
            "run.finished",
            {"run_id": run.id, "status": "completed"},
        )
        return run
    except Exception as e:
        async with async_session_factory() as session:
            run_clone = await session.get(TaskRun, run.id)
            if run_clone is not None:
                run_clone.status = "failed"
                run_clone.error = f"{type(e).__name__}: {e}"[:500]
                run_clone.finished_at = datetime.now(UTC)
                await session.commit()

        await broadcast_project(
            task.project_id,
            "run.finished",
            {"run_id": run.id, "status": "failed", "error": f"{type(e).__name__}: {e}"[:500]},
        )
        return run_clone
