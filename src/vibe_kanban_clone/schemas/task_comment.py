"""TaskComment schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TaskCommentCreate(BaseModel):
    """Schema for creating a task comment."""

    author: str
    body: str


class TaskCommentRead(BaseModel):
    """Schema for reading a task comment."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    author: str
    body: str
    created_at: datetime
