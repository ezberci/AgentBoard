"""Task run service tests."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from vibe_kanban_clone.schemas.column import ColumnCreate
from vibe_kanban_clone.schemas.model import ModelCreate
from vibe_kanban_clone.schemas.project import ProjectCreate
from vibe_kanban_clone.schemas.task import TaskCreate
from vibe_kanban_clone.services.columns import create_column
from vibe_kanban_clone.services.models import create_model
from vibe_kanban_clone.services.projects import create_project
from vibe_kanban_clone.services.runs import list_task_runs
from vibe_kanban_clone.services.tasks import create_task


@pytest.mark.asyncio
async def test_list_task_runs(session: AsyncSession):
    project = await create_project(session, ProjectCreate(name="P"))
    column = await create_column(session, project.id, ColumnCreate(name="Backlog"))
    task = await create_task(
        session, TaskCreate(project_id=project.id, column_id=column.id, title="T1")
    )
    model = await create_model(
        session,
        ModelCreate(name="m1", provider="deepseek", model_id="mid", api_key_env="KEY"),
    )

    from vibe_kanban_clone.models.task_run import TaskRun

    run1 = TaskRun(task_id=task.id, model_id=model.id, status="completed", prompt="p1")
    run2 = TaskRun(task_id=task.id, model_id=model.id, status="failed", prompt="p2")
    session.add(run1)
    session.add(run2)
    await session.commit()

    runs = await list_task_runs(session, task.id)
    assert len(runs) == 2
