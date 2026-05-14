from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from vibe_kanban_clone.db.base import Base

if TYPE_CHECKING:
    from vibe_kanban_clone.models.skill import Skill
    from vibe_kanban_clone.models.task import Task
    from vibe_kanban_clone.models.task_run import TaskRun


class Agent(Base):
    """Agent entity."""

    __tablename__ = "agents"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True, nullable=False)
    system_prompt: Mapped[str | None] = mapped_column(nullable=True)
    color: Mapped[str | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now(), nullable=False)

    skills: Mapped[list[Skill]] = relationship(secondary="agent_skills", back_populates="agents")
    tasks: Mapped[list[Task]] = relationship(back_populates="assigned_agent")
    runs: Mapped[list[TaskRun]] = relationship(back_populates="agent")
