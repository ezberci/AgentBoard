import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from vibe_kanban_clone.schemas.column import ColumnCreate
from vibe_kanban_clone.schemas.project import ProjectCreate
from vibe_kanban_clone.schemas.task import TaskCreate, TaskMove, TaskUpdate
from vibe_kanban_clone.services.columns import create_column
from vibe_kanban_clone.services.projects import create_project
from vibe_kanban_clone.services.tasks import (
    create_task,
    delete_task,
    get_task,
    list_tasks_by_project,
    move_task,
    update_task,
)


@pytest.mark.asyncio
async def test_create_task(session: AsyncSession):
    project = await create_project(session, ProjectCreate(name="P"))
    column = await create_column(session, project.id, ColumnCreate(name="Backlog"))
    data = TaskCreate(project_id=project.id, column_id=column.id, title="T1")
    task = await create_task(session, data)
    assert task.id is not None
    assert task.title == "T1"
    assert task.version == 1


@pytest.mark.asyncio
async def test_get_task(session: AsyncSession):
    project = await create_project(session, ProjectCreate(name="P"))
    column = await create_column(session, project.id, ColumnCreate(name="Backlog"))
    created = await create_task(
        session, TaskCreate(project_id=project.id, column_id=column.id, title="T1")
    )
    found = await get_task(session, created.id)
    assert found is not None
    assert found.id == created.id


@pytest.mark.asyncio
async def test_list_tasks_by_project(session: AsyncSession):
    project = await create_project(session, ProjectCreate(name="P"))
    column = await create_column(session, project.id, ColumnCreate(name="Backlog"))
    await create_task(session, TaskCreate(project_id=project.id, column_id=column.id, title="T1"))
    await create_task(session, TaskCreate(project_id=project.id, column_id=column.id, title="T2"))
    tasks = await list_tasks_by_project(session, project.id)
    assert len(tasks) == 2


@pytest.mark.asyncio
async def test_update_task(session: AsyncSession):
    project = await create_project(session, ProjectCreate(name="P"))
    column = await create_column(session, project.id, ColumnCreate(name="Backlog"))
    task = await create_task(
        session, TaskCreate(project_id=project.id, column_id=column.id, title="T1")
    )
    updated = await update_task(session, task, TaskUpdate(title="T2", expected_version=1))
    assert updated.title == "T2"
    assert updated.version == 2


@pytest.mark.asyncio
async def test_update_task_version_mismatch(session: AsyncSession):
    project = await create_project(session, ProjectCreate(name="P"))
    column = await create_column(session, project.id, ColumnCreate(name="Backlog"))
    task = await create_task(
        session, TaskCreate(project_id=project.id, column_id=column.id, title="T1")
    )
    with pytest.raises(ValueError, match="version mismatch"):
        await update_task(session, task, TaskUpdate(title="T2", expected_version=99))


@pytest.mark.asyncio
async def test_move_task(session: AsyncSession):
    project = await create_project(session, ProjectCreate(name="P"))
    col1 = await create_column(session, project.id, ColumnCreate(name="Backlog"))
    col2 = await create_column(session, project.id, ColumnCreate(name="Done"))
    task = await create_task(
        session, TaskCreate(project_id=project.id, column_id=col1.id, title="T1")
    )
    moved = await move_task(session, task, TaskMove(column_id=col2.id, expected_version=1))
    assert moved.column_id == col2.id
    assert moved.version == 2


@pytest.mark.asyncio
async def test_move_task_version_mismatch(session: AsyncSession):
    project = await create_project(session, ProjectCreate(name="P"))
    col1 = await create_column(session, project.id, ColumnCreate(name="Backlog"))
    col2 = await create_column(session, project.id, ColumnCreate(name="Done"))
    task = await create_task(
        session, TaskCreate(project_id=project.id, column_id=col1.id, title="T1")
    )
    with pytest.raises(ValueError, match="version mismatch"):
        await move_task(session, task, TaskMove(column_id=col2.id, expected_version=99))


@pytest.mark.asyncio
async def test_delete_task(session: AsyncSession):
    project = await create_project(session, ProjectCreate(name="P"))
    column = await create_column(session, project.id, ColumnCreate(name="Backlog"))
    task = await create_task(
        session, TaskCreate(project_id=project.id, column_id=column.id, title="T1")
    )
    await delete_task(session, task)
    found = await get_task(session, task.id)
    assert found is None
