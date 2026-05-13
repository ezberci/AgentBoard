import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_columns_api(client: AsyncClient):
    project_resp = await client.post("/api/projects", json={"name": "P"})
    assert project_resp.status_code == 201
    project_id = project_resp.json()["id"]

    await client.post(
        f"/api/projects/{project_id}/columns", json={"name": "Backlog", "position": 0}
    )
    await client.post(f"/api/projects/{project_id}/columns", json={"name": "Done", "position": 1})

    response = await client.get(f"/api/projects/{project_id}/columns")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["name"] == "Backlog"
    assert data[1]["name"] == "Done"


@pytest.mark.asyncio
async def test_create_column_api(client: AsyncClient):
    project_resp = await client.post("/api/projects", json={"name": "P"})
    assert project_resp.status_code == 201
    project_id = project_resp.json()["id"]

    response = await client.post(
        f"/api/projects/{project_id}/columns",
        json={"name": "In Progress", "position": 1, "is_terminal": False},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "In Progress"
    assert data["position"] == 1
    assert data["project_id"] == project_id


@pytest.mark.asyncio
async def test_update_column_api(client: AsyncClient):
    project_resp = await client.post("/api/projects", json={"name": "P"})
    assert project_resp.status_code == 201
    project_id = project_resp.json()["id"]

    col_resp = await client.post(f"/api/projects/{project_id}/columns", json={"name": "Old"})
    col_id = col_resp.json()["id"]

    response = await client.patch(f"/api/columns/{col_id}", json={"name": "New"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New"


@pytest.mark.asyncio
async def test_delete_column_api(client: AsyncClient):
    project_resp = await client.post("/api/projects", json={"name": "P"})
    assert project_resp.status_code == 201
    project_id = project_resp.json()["id"]

    col_resp = await client.post(f"/api/projects/{project_id}/columns", json={"name": "Temp"})
    col_id = col_resp.json()["id"]

    response = await client.delete(f"/api/columns/{col_id}")
    assert response.status_code == 204

    cols = await client.get(f"/api/projects/{project_id}/columns")
    assert cols.status_code == 200
    assert all(c["id"] != col_id for c in cols.json())


@pytest.mark.asyncio
async def test_reorder_columns_api(client: AsyncClient):
    project_resp = await client.post("/api/projects", json={"name": "P"})
    assert project_resp.status_code == 201
    project_id = project_resp.json()["id"]

    col1_resp = await client.post(
        f"/api/projects/{project_id}/columns", json={"name": "C1", "position": 0}
    )
    col1_id = col1_resp.json()["id"]

    col2_resp = await client.post(
        f"/api/projects/{project_id}/columns", json={"name": "C2", "position": 1}
    )
    col2_id = col2_resp.json()["id"]

    response = await client.post(
        f"/api/columns/{col1_id}/reorder",
        json={"positions": {str(col1_id): 5, str(col2_id): 10}},
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    positions = {c["id"]: c["position"] for c in data}
    assert positions[col1_id] == 5
    assert positions[col2_id] == 10
