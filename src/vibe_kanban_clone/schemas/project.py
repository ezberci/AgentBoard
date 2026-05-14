"""Project schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProjectCreate(BaseModel):
    """Schema for creating a project."""

    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, min_length=1, max_length=5000)


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

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, min_length=1, max_length=5000)
