"""Project schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProjectCreate(BaseModel):
    """Schema for creating a project."""

    name: str
    description: str | None = None


class ProjectRead(BaseModel):
    """Schema for reading a project."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    description: str | None
    created_at: datetime
    updated_at: datetime


class ProjectUpdate(BaseModel):
    """Schema for updating a project."""

    name: str | None = None
    description: str | None = None
