from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from vibe_kanban_clone.db.base import Base

if TYPE_CHECKING:
    from vibe_kanban_clone.models.project import Project
    from vibe_kanban_clone.models.task import Task


class Column(Base):
    """Kanban column entity."""

    __tablename__ = "columns"
    __table_args__ = (Index("idx_columns_project_position", "project_id", "position"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(nullable=False)
    position: Mapped[int] = mapped_column(default=0, nullable=False)
    is_terminal: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=func.now(), nullable=False)

    project: Mapped[Project] = relationship(back_populates="columns")
    tasks: Mapped[list[Task]] = relationship(back_populates="column")
