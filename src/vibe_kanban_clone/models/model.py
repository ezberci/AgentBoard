from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from vibe_kanban_clone.db.base import Base

if TYPE_CHECKING:
    from vibe_kanban_clone.models.task_run import TaskRun


class Model(Base):
    """LLM model registry entry."""

    __tablename__ = "models"
    __table_args__ = (Index("idx_models_provider_enabled", "provider", "is_enabled"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True, nullable=False)
    provider: Mapped[str] = mapped_column(nullable=False)
    model_id: Mapped[str] = mapped_column(nullable=False)
    api_key_env: Mapped[str] = mapped_column(nullable=False)
    base_url: Mapped[str | None] = mapped_column(nullable=True)
    is_enabled: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=func.now(), nullable=False)

    runs: Mapped[list[TaskRun]] = relationship(back_populates="model")
