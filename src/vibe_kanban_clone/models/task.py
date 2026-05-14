from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from vibe_kanban_clone.db.base import Base

if TYPE_CHECKING:
    from vibe_kanban_clone.models.agent import Agent
    from vibe_kanban_clone.models.column import Column
    from vibe_kanban_clone.models.project import Project
    from vibe_kanban_clone.models.task_comment import TaskComment


class Task(Base):
    """Task entity."""

    __tablename__ = "tasks"
    __table_args__ = (
        Index("idx_tasks_project_column", "project_id", "column_id", "priority"),
        Index("idx_tasks_agent_claimed", "assigned_agent_id", "claimed_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    column_id: Mapped[int | None] = mapped_column(ForeignKey("columns.id"), nullable=True)
    title: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[str | None] = mapped_column(nullable=True)
    priority: Mapped[int] = mapped_column(default=4, nullable=False)
    result: Mapped[str | None] = mapped_column(nullable=True)
    assigned_agent_id: Mapped[int | None] = mapped_column(
        ForeignKey("agents.id", ondelete="SET NULL"), nullable=True
    )
    version: Mapped[int] = mapped_column(default=1, nullable=False)
    claimed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        default=func.now(), onupdate=func.now(), nullable=False
    )

    project: Mapped[Project] = relationship(back_populates="tasks")
    column: Mapped[Column | None] = relationship(back_populates="tasks")
    assigned_agent: Mapped[Agent | None] = relationship(back_populates="tasks")
    comments: Mapped[list[TaskComment]] = relationship(
        back_populates="task", cascade="all, delete-orphan"
    )
    runs: Mapped[list[TaskRun]] = relationship(back_populates="task", cascade="all, delete-orphan")
