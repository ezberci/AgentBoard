import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_skills_api(client: AsyncClient):
    response = await client.get("/api/skills")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_create_skill_api(client: AsyncClient):
    response = await client.post(
        "/api/skills",
        json={
            "name": "Skill One",
            "description": "A skill",
            "instructions": "Do it",
            "allowed_tools": ["tool1"],
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Skill One"
    assert data["description"] == "A skill"
    assert data["allowed_tools"] == ["tool1"]


@pytest.mark.asyncio
async def test_get_skill_api(client: AsyncClient):
    create_resp = await client.post("/api/skills", json={"name": "S1"})
    skill_id = create_resp.json()["id"]

    response = await client.get(f"/api/skills/{skill_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == skill_id
    assert data["name"] == "S1"


@pytest.mark.asyncio
async def test_update_skill_api(client: AsyncClient):
    create_resp = await client.post("/api/skills", json={"name": "Old"})
    skill_id = create_resp.json()["id"]

    response = await client.patch(
        f"/api/skills/{skill_id}",
        json={"name": "New", "description": "Updated"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New"
    assert data["description"] == "Updated"


@pytest.mark.asyncio
async def test_delete_skill_api(client: AsyncClient):
    create_resp = await client.post("/api/skills", json={"name": "ToDelete"})
    skill_id = create_resp.json()["id"]

    response = await client.delete(f"/api/skills/{skill_id}")
    assert response.status_code == 204

    response = await client.get(f"/api/skills/{skill_id}")
    assert response.status_code == 404
