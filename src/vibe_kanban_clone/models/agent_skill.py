from __future__ import annotations

from sqlalchemy import ForeignKey, PrimaryKeyConstraint
from sqlalchemy.orm import Mapped, mapped_column

from vibe_kanban_clone.db.base import Base


class AgentSkill(Base):
    """Many-to-many association between Agent and Skill."""

    __tablename__ = "agent_skills"
    __table_args__ = (PrimaryKeyConstraint("agent_id", "skill_id"),)

    agent_id: Mapped[int] = mapped_column(
        ForeignKey("agents.id", ondelete="CASCADE"), nullable=False
    )
    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"), nullable=False
    )
