"""Comment service tests."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from vibe_kanban_clone.schemas.column import ColumnCreate
from vibe_kanban_clone.schemas.project import ProjectCreate
from vibe_kanban_clone.schemas.task import TaskCreate
from vibe_kanban_clone.schemas.task_comment import TaskCommentCreate
from vibe_kanban_clone.services.columns import create_column
from vibe_kanban_clone.services.comments import create_comment, list_comments_by_task
from vibe_kanban_clone.services.projects import create_project
from vibe_kanban_clone.services.tasks import create_task


@pytest.mark.asyncio
async def test_create_comment(session: AsyncSession):
    project = await create_project(session, ProjectCreate(name="P"))
    column = await create_column(session, project.id, ColumnCreate(name="Backlog"))
    task = await create_task(
        session, TaskCreate(project_id=project.id, column_id=column.id, title="T1")
    )
    comment = await create_comment(
        session, task.id, TaskCommentCreate(author="Alice", body="Looks good")
    )
    assert comment.id is not None
    assert comment.author == "Alice"
    assert comment.body == "Looks good"
    assert comment.task_id == task.id


@pytest.mark.asyncio
async def test_list_comments_by_task(session: AsyncSession):
    project = await create_project(session, ProjectCreate(name="P"))
    column = await create_column(session, project.id, ColumnCreate(name="Backlog"))
    task = await create_task(
        session, TaskCreate(project_id=project.id, column_id=column.id, title="T1")
    )
    await create_comment(session, task.id, TaskCommentCreate(author="A", body="First"))
    await create_comment(session, task.id, TaskCommentCreate(author="B", body="Second"))
    comments = await list_comments_by_task(session, task.id)
    assert len(comments) == 2
    assert comments[0].author == "A"
    assert comments[1].author == "B"
