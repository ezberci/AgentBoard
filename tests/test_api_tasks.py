import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_task_api(client: AsyncClient):
    project_resp = await client.post("/api/projects", json={"name": "API Project"})
    assert project_resp.status_code == 201
    project_id = project_resp.json()["id"]

    col_resp = await client.post(f"/api/projects/{project_id}/columns", json={"name": "Backlog"})
    assert col_resp.status_code == 201
    col_id = col_resp.json()["id"]

    response = await client.post(
        "/api/tasks",
        json={
            "project_id": project_id,
            "column_id": col_id,
            "title": "API Task",
            "priority": 2,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "API Task"
    assert data["priority"] == 2
    assert data["version"] == 1


@pytest.mark.asyncio
async def test_list_tasks_api(client: AsyncClient):
    project_resp = await client.post("/api/projects", json={"name": "P"})
    project_id = project_resp.json()["id"]

    col_resp = await client.post(f"/api/projects/{project_id}/columns", json={"name": "Backlog"})
    col_id = col_resp.json()["id"]

    await client.post(
        "/api/tasks",
        json={"project_id": project_id, "column_id": col_id, "title": "T1"},
    )

    response = await client.get(f"/api/projects/{project_id}/tasks")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1


@pytest.mark.asyncio
async def test_get_task_api(client: AsyncClient):
    project_resp = await client.post("/api/projects", json={"name": "P"})
    project_id = project_resp.json()["id"]

    col_resp = await client.post(f"/api/projects/{project_id}/columns", json={"name": "Backlog"})
    col_id = col_resp.json()["id"]

    task_resp = await client.post(
        "/api/tasks",
        json={"project_id": project_id, "column_id": col_id, "title": "T1"},
    )
    task_id = task_resp.json()["id"]

    response = await client.get(f"/api/tasks/{task_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "T1"


@pytest.mark.asyncio
async def test_update_task_api(client: AsyncClient):
    project_resp = await client.post("/api/projects", json={"name": "P"})
    project_id = project_resp.json()["id"]

    col_resp = await client.post(f"/api/projects/{project_id}/columns", json={"name": "Backlog"})
    col_id = col_resp.json()["id"]

    task_resp = await client.post(
        "/api/tasks",
        json={"project_id": project_id, "column_id": col_id, "title": "T1"},
    )
    task_id = task_resp.json()["id"]

    response = await client.patch(
        f"/api/tasks/{task_id}",
        json={"title": "Updated", "expected_version": 1},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated"
    assert data["version"] == 2


@pytest.mark.asyncio
async def test_update_task_conflict(client: AsyncClient):
    project_resp = await client.post("/api/projects", json={"name": "P"})
    project_id = project_resp.json()["id"]

    col_resp = await client.post(f"/api/projects/{project_id}/columns", json={"name": "Backlog"})
    col_id = col_resp.json()["id"]

    task_resp = await client.post(
        "/api/tasks",
        json={"project_id": project_id, "column_id": col_id, "title": "T1"},
    )
    task_id = task_resp.json()["id"]

    response = await client.patch(
        f"/api/tasks/{task_id}",
        json={"title": "Updated", "expected_version": 99},
    )
    assert response.status_code == 409
    assert "modified by another client" in response.json()["detail"]


@pytest.mark.asyncio
async def test_move_task_api(client: AsyncClient):
    project_resp = await client.post("/api/projects", json={"name": "P"})
    project_id = project_resp.json()["id"]

    col1_resp = await client.post(f"/api/projects/{project_id}/columns", json={"name": "C1"})
    col1_id = col1_resp.json()["id"]

    col2_resp = await client.post(f"/api/projects/{project_id}/columns", json={"name": "C2"})
    col2_id = col2_resp.json()["id"]

    task_resp = await client.post(
        "/api/tasks",
        json={"project_id": project_id, "column_id": col1_id, "title": "T1"},
    )
    task_id = task_resp.json()["id"]

    response = await client.post(
        f"/api/tasks/{task_id}/move",
        json={"column_id": col2_id, "expected_version": 1},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["column_id"] == col2_id
    assert data["version"] == 2


@pytest.mark.asyncio
async def test_delete_task_api(client: AsyncClient):
    project_resp = await client.post("/api/projects", json={"name": "P"})
    project_id = project_resp.json()["id"]

    col_resp = await client.post(f"/api/projects/{project_id}/columns", json={"name": "Backlog"})
    col_id = col_resp.json()["id"]

    task_resp = await client.post(
        "/api/tasks",
        json={"project_id": project_id, "column_id": col_id, "title": "T1"},
    )
    task_id = task_resp.json()["id"]

    response = await client.delete(f"/api/tasks/{task_id}")
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_run_task_api(client: AsyncClient):
    project_resp = await client.post("/api/projects", json={"name": "P"})
    project_id = project_resp.json()["id"]

    col_resp = await client.post(f"/api/projects/{project_id}/columns", json={"name": "Backlog"})
    col_id = col_resp.json()["id"]

    task_resp = await client.post(
        "/api/tasks",
        json={"project_id": project_id, "column_id": col_id, "title": "T1"},
    )
    task_id = task_resp.json()["id"]

    model_resp = await client.post(
        "/api/models",
        json={
            "name": "test-model",
            "provider": "deepseek",
            "model_id": "deepseek-chat",
            "api_key_env": "DEEPSEEK_API_KEY",
        },
    )
    model_id = model_resp.json()["id"]

    response = await client.post(
        f"/api/tasks/{task_id}/run",
        json={"model_id": model_id, "prompt": "Hello"},
    )
    assert response.status_code == 202
    data = response.json()
    assert data["status"] == "started"
    assert data["task_id"] == task_id
