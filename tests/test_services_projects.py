import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from vibe_kanban_clone.schemas.project import ProjectCreate, ProjectUpdate
from vibe_kanban_clone.services.projects import (
    create_project,
    delete_project,
    get_project,
    list_projects,
    slugify,
    update_project,
)


def test_slugify():
    assert slugify("Hello World") == "hello-world"
    assert slugify("My Project!!!") == "my-project"
    assert slugify("---") == "project"


@pytest.mark.asyncio
async def test_create_project(session: AsyncSession):
    data = ProjectCreate(name="Test Project", description="A test")
    project = await create_project(session, data)
    assert project.id is not None
    assert project.name == "Test Project"
    assert project.slug == "test-project"
    assert project.description == "A test"


@pytest.mark.asyncio
async def test_get_project(session: AsyncSession):
    data = ProjectCreate(name="Find Me")
    created = await create_project(session, data)
    found = await get_project(session, created.id)
    assert found is not None
    assert found.id == created.id


@pytest.mark.asyncio
async def test_get_project_not_found(session: AsyncSession):
    found = await get_project(session, 9999)
    assert found is None


@pytest.mark.asyncio
async def test_list_projects(session: AsyncSession):
    await create_project(session, ProjectCreate(name="P1"))
    await create_project(session, ProjectCreate(name="P2"))
    projects = await list_projects(session)
    assert len(projects) == 2


@pytest.mark.asyncio
async def test_update_project(session: AsyncSession):
    project = await create_project(session, ProjectCreate(name="Old"))
    updated = await update_project(session, project, ProjectUpdate(name="New"))
    assert updated.name == "New"
    assert updated.slug == "new"


@pytest.mark.asyncio
async def test_delete_project(session: AsyncSession):
    project = await create_project(session, ProjectCreate(name="To Delete"))
    await delete_project(session, project)
    found = await get_project(session, project.id)
    assert found is None
