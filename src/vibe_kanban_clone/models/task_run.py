from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, ForeignKey, Index, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from vibe_kanban_clone.db.base import Base

if TYPE_CHECKING:
    from vibe_kanban_clone.models.agent import Agent
    from vibe_kanban_clone.models.model import Model
    from vibe_kanban_clone.models.task import Task


class TaskRun(Base):
    """Execution run for a task."""

    __tablename__ = "task_runs"
    __table_args__ = (Index("idx_task_runs_task_started", "task_id", text("started_at DESC")),)

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    model_id: Mapped[int | None] = mapped_column(
        ForeignKey("models.id", ondelete="SET NULL"), nullable=True
    )
    agent_id: Mapped[int | None] = mapped_column(
        ForeignKey("agents.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(nullable=False)
    prompt: Mapped[str | None] = mapped_column(nullable=True)
    output: Mapped[str | None] = mapped_column(nullable=True)
    usage: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(nullable=True)
    error: Mapped[str | None] = mapped_column(nullable=True)

    task: Mapped[Task] = relationship(back_populates="runs")
    model: Mapped[Model | None] = relationship(back_populates="runs")
    agent: Mapped[Agent | None] = relationship(back_populates="runs")
