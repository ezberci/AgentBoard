import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from vibe_kanban_clone.services.comments import list_comments_by_task
from vibe_kanban_clone.services.tasks import get_task


@pytest.mark.asyncio
async def test_add_comment_api(client: AsyncClient):
    project_resp = await client.post("/api/projects", json={"name": "P"})
    project_id = project_resp.json()["id"]

    col_resp = await client.post(f"/api/projects/{project_id}/columns", json={"name": "Backlog"})
    col_id = col_resp.json()["id"]

    task_resp = await client.post(
        "/api/tasks",
        json={"project_id": project_id, "column_id": col_id, "title": "T1"},
    )
    task_id = task_resp.json()["id"]

    response = await client.post(
        f"/api/tasks/{task_id}/comments",
        json={"author": "Alice", "body": "Looks good"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["task_id"] == task_id
    assert data["author"] == "Alice"
    assert data["body"] == "Looks good"


@pytest.mark.asyncio
async def test_list_comments_via_task_detail(client: AsyncClient, session: AsyncSession):
    project_resp = await client.post("/api/projects", json={"name": "P"})
    project_id = project_resp.json()["id"]

    col_resp = await client.post(f"/api/projects/{project_id}/columns", json={"name": "Backlog"})
    col_id = col_resp.json()["id"]

    task_resp = await client.post(
        "/api/tasks",
        json={"project_id": project_id, "column_id": col_id, "title": "T1"},
    )
    task_id = task_resp.json()["id"]

    await client.post(
        f"/api/tasks/{task_id}/comments",
        json={"author": "Bob", "body": "First"},
    )
    await client.post(
        f"/api/tasks/{task_id}/comments",
        json={"author": "Charlie", "body": "Second"},
    )

    task = await get_task(session, task_id)
    assert task is not None
    assert len(task.comments) == 2
    assert task.comments[0].author == "Bob"
    assert task.comments[1].author == "Charlie"

    comments = await list_comments_by_task(session, task_id)
    assert len(comments) == 2
    assert comments[0].body == "First"
    assert comments[1].body == "Second"
