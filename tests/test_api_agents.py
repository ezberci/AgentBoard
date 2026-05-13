import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_agents_api(client: AsyncClient):
    response = await client.get("/api/agents")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_create_agent_api(client: AsyncClient):
    response = await client.post(
        "/api/agents",
        json={"name": "Agent One", "system_prompt": "Be helpful"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Agent One"
    assert data["color"] == "ao"
    assert data["skills"] == []


@pytest.mark.asyncio
async def test_get_agent_api(client: AsyncClient):
    create_resp = await client.post("/api/agents", json={"name": "A1"})
    agent_id = create_resp.json()["id"]

    response = await client.get(f"/api/agents/{agent_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == agent_id
    assert data["name"] == "A1"


@pytest.mark.asyncio
async def test_update_agent_api(client: AsyncClient):
    create_resp = await client.post("/api/agents", json={"name": "Old"})
    agent_id = create_resp.json()["id"]

    response = await client.patch(
        f"/api/agents/{agent_id}",
        json={"name": "New"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New"


@pytest.mark.asyncio
async def test_delete_agent_api(client: AsyncClient):
    create_resp = await client.post("/api/agents", json={"name": "ToDelete"})
    agent_id = create_resp.json()["id"]

    response = await client.delete(f"/api/agents/{agent_id}")
    assert response.status_code == 204

    response = await client.get(f"/api/agents/{agent_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_assign_skill_api(client: AsyncClient):
    agent_resp = await client.post("/api/agents", json={"name": "A1"})
    agent_id = agent_resp.json()["id"]

    skill_resp = await client.post(
        "/api/skills",
        json={"name": "Skill1", "description": "D1"},
    )
    skill_id = skill_resp.json()["id"]

    response = await client.post(f"/api/agents/{agent_id}/skills/{skill_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data["skills"]) == 1
    assert data["skills"][0]["id"] == skill_id


@pytest.mark.asyncio
async def test_remove_skill_api(client: AsyncClient):
    agent_resp = await client.post("/api/agents", json={"name": "A1"})
    agent_id = agent_resp.json()["id"]

    skill_resp = await client.post(
        "/api/skills",
        json={"name": "Skill1", "description": "D1"},
    )
    skill_id = skill_resp.json()["id"]

    await client.post(f"/api/agents/{agent_id}/skills/{skill_id}")

    response = await client.delete(f"/api/agents/{agent_id}/skills/{skill_id}")
    assert response.status_code == 204

    get_resp = await client.get(f"/api/agents/{agent_id}")
    assert get_resp.json()["skills"] == []
