"""Comment service."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from vibe_kanban_clone.models.task_comment import TaskComment
from vibe_kanban_clone.schemas.task_comment import TaskCommentCreate


async def create_comment(
    session: AsyncSession, task_id: int, data: TaskCommentCreate
) -> TaskComment:
    """Create a new comment on a task."""
    comment = TaskComment(
        task_id=task_id,
        author=data.author,
        body=data.body,
    )
    session.add(comment)
    await session.commit()
    await session.refresh(comment)
    return comment


async def list_comments_by_task(session: AsyncSession, task_id: int) -> list[TaskComment]:
    """List all comments on a task."""
    result = await session.execute(
        select(TaskComment).where(TaskComment.task_id == task_id).order_by(TaskComment.created_at)
    )
    return list(result.scalars().all())
