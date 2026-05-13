from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from vibe_kanban_clone.db.base import Base

if TYPE_CHECKING:
    from vibe_kanban_clone.models.task import Task


class TaskComment(Base):
    """Task comment entity."""

    __tablename__ = "task_comments"
    __table_args__ = (Index("idx_task_comments_task_created", "task_id", "created_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    author: Mapped[str] = mapped_column(nullable=False)
    body: Mapped[str] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=func.now(), nullable=False)

    task: Mapped[Task] = relationship(back_populates="comments")
