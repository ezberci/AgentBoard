"""Skill schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class SkillCreate(BaseModel):
    """Schema for creating a skill."""

    name: str
    description: str | None = None
    instructions: str | None = None
    allowed_tools: list[Any] | None = None


class SkillRead(BaseModel):
    """Schema for reading a skill."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    instructions: str | None
    allowed_tools: list[Any] | None
    created_at: datetime


class SkillUpdate(BaseModel):
    """Schema for updating a skill."""

    name: str | None = None
    description: str | None = None
    instructions: str | None = None
    allowed_tools: list[Any] | None = None
