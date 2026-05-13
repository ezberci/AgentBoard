import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from vibe_kanban_clone.schemas.column import ColumnCreate, ColumnReorder, ColumnUpdate
from vibe_kanban_clone.schemas.project import ProjectCreate
from vibe_kanban_clone.services.columns import (
    create_column,
    delete_column,
    get_column,
    list_columns_by_project,
    reorder_columns,
    update_column,
)
from vibe_kanban_clone.services.projects import create_project


@pytest.mark.asyncio
async def test_create_column(session: AsyncSession):
    project = await create_project(session, ProjectCreate(name="P"))
    data = ColumnCreate(name="Backlog", position=0, is_terminal=False)
    column = await create_column(session, project.id, data)
    assert column.id is not None
    assert column.name == "Backlog"
    assert column.project_id == project.id


@pytest.mark.asyncio
async def test_list_columns_by_project(session: AsyncSession):
    project = await create_project(session, ProjectCreate(name="P"))
    await create_column(session, project.id, ColumnCreate(name="C1", position=1))
    await create_column(session, project.id, ColumnCreate(name="C2", position=0))
    columns = await list_columns_by_project(session, project.id)
    assert len(columns) == 2
    assert columns[0].name == "C2"
    assert columns[1].name == "C1"


@pytest.mark.asyncio
async def test_update_column(session: AsyncSession):
    project = await create_project(session, ProjectCreate(name="P"))
    column = await create_column(session, project.id, ColumnCreate(name="Old"))
    updated = await update_column(session, column, ColumnUpdate(name="New", is_terminal=True))
    assert updated.name == "New"
    assert updated.is_terminal is True


@pytest.mark.asyncio
async def test_reorder_columns(session: AsyncSession):
    project = await create_project(session, ProjectCreate(name="P"))
    col1 = await create_column(session, project.id, ColumnCreate(name="C1", position=0))
    col2 = await create_column(session, project.id, ColumnCreate(name="C2", position=1))

    reordered = await reorder_columns(
        session, project.id, ColumnReorder(positions={col1.id: 10, col2.id: 5})
    )
    assert len(reordered) == 2

    updated1 = await get_column(session, col1.id)
    updated2 = await get_column(session, col2.id)
    assert updated1 is not None
    assert updated2 is not None
    assert updated1.position == 10
    assert updated2.position == 5


@pytest.mark.asyncio
async def test_delete_column(session: AsyncSession):
    project = await create_project(session, ProjectCreate(name="P"))
    column = await create_column(session, project.id, ColumnCreate(name="Temp"))
    await delete_column(session, column)
    found = await get_column(session, column.id)
    assert found is None
