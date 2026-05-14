"""Task schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TaskCreate(BaseModel):
    """Schema for creating a task."""

    project_id: int
    column_id: int | None = None
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, min_length=1, max_length=5000)
    priority: int = Field(default=4, ge=1, le=5)
    assigned_agent_id: int | None = None


class TaskRead(BaseModel):
    """Schema for reading a task."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    column_id: int | None
    title: str
    description: str | None
    priority: int
    result: str | None
    assigned_agent_id: int | None
    version: int
    claimed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class TaskUpdate(BaseModel):
    """Schema for updating a task."""

    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, min_length=1, max_length=5000)
    priority: int | None = Field(default=None, ge=1, le=5)
    result: str | None = Field(default=None, min_length=1, max_length=50000)
    assigned_agent_id: int | None = None
    expected_version: int | None = None


class TaskMove(BaseModel):
    """Schema for moving a task to another column."""

    column_id: int
    expected_version: int | None = None


class TaskRunCreate(BaseModel):
    """Schema for starting a task execution run."""

    model_id: int
    prompt: str | None = None
