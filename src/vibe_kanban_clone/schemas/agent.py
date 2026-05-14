"""Agent schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from vibe_kanban_clone.schemas.skill import SkillRead


class AgentCreate(BaseModel):
    """Schema for creating an agent."""

    name: str = Field(min_length=1, max_length=255)
    system_prompt: str | None = Field(default=None, min_length=1, max_length=10000)
    color: str | None = Field(default=None, min_length=1, max_length=50)


class AgentRead(BaseModel):
    """Schema for reading an agent."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    system_prompt: str | None
    color: str | None
    created_at: datetime
    skills: list[SkillRead]


class AgentUpdate(BaseModel):
    """Schema for updating an agent."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    system_prompt: str | None = Field(default=None, min_length=1, max_length=10000)
    color: str | None = Field(default=None, min_length=1, max_length=50)
