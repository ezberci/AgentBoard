"""Skill schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SkillCreate(BaseModel):
    """Schema for creating a skill."""

    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, min_length=1, max_length=5000)
    instructions: str | None = Field(default=None, min_length=1, max_length=10000)
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

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, min_length=1, max_length=5000)
    instructions: str | None = Field(default=None, min_length=1, max_length=10000)
    allowed_tools: list[Any] | None = None
