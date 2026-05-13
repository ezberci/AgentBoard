"""Task schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TaskCreate(BaseModel):
    """Schema for creating a task."""

    project_id: int
    column_id: int | None = None
    title: str
    description: str | None = None
    priority: int = 4
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

    title: str | None = None
    description: str | None = None
    priority: int | None = None
    result: str | None = None
    assigned_agent_id: int | None = None
    expected_version: int | None = None


class TaskMove(BaseModel):
    """Schema for moving a task to another column."""

    column_id: int
    expected_version: int | None = None
