"""Task run schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TaskRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    model_id: int | None
    agent_id: int | None
    status: str
    prompt: str | None
    output: str | None
    usage: dict | None
    started_at: datetime | None
    finished_at: datetime | None
    error: str | None
