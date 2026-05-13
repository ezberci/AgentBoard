import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from vibe_kanban_clone.schemas.project import ProjectCreate
from vibe_kanban_clone.services.projects import create_project


@pytest.mark.asyncio
async def test_list_projects_api(client: AsyncClient) -> None:
    response = await client.get("/api/projects")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_create_project_api(client: AsyncClient) -> None:
    response = await client.post(
        "/api/projects",
        json={"name": "API Project", "description": "From API"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "API Project"
    assert data["slug"] == "api-project"
    assert data["description"] == "From API"


@pytest.mark.asyncio
async def test_get_project_api(client: AsyncClient, session: AsyncSession) -> None:
    project = await create_project(session, ProjectCreate(name="Find Me"))
    response = await client.get(f"/api/projects/{project.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == project.id
    assert data["name"] == "Find Me"


@pytest.mark.asyncio
async def test_update_project_api(client: AsyncClient, session: AsyncSession) -> None:
    project = await create_project(session, ProjectCreate(name="Old"))
    response = await client.patch(
        f"/api/projects/{project.id}",
        json={"name": "New"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New"
    assert data["slug"] == "new"


@pytest.mark.asyncio
async def test_delete_project_api(client: AsyncClient, session: AsyncSession) -> None:
    project = await create_project(session, ProjectCreate(name="Delete Me"))
    response = await client.delete(f"/api/projects/{project.id}")
    assert response.status_code == 204
    response = await client.get(f"/api/projects/{project.id}")
    assert response.status_code == 404
