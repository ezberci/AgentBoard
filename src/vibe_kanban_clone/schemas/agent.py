"""Agent schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from vibe_kanban_clone.schemas.skill import SkillRead


class AgentCreate(BaseModel):
    """Schema for creating an agent."""

    name: str
    system_prompt: str | None = None
    color: str | None = None


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

    name: str | None = None
    system_prompt: str | None = None
    color: str | None = None
