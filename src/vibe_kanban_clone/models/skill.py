from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from vibe_kanban_clone.db.base import Base

if TYPE_CHECKING:
    from vibe_kanban_clone.models.agent import Agent


class Skill(Base):
    """Skill entity."""

    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(nullable=True)
    instructions: Mapped[str | None] = mapped_column(nullable=True)
    allowed_tools: Mapped[list[Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now(), nullable=False)

    agents: Mapped[list[Agent]] = relationship(secondary="agent_skills", back_populates="skills")
