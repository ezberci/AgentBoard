"""Task run schemas."""

from pydantic import BaseModel


class TaskRunRead(BaseModel):
    id: int
    task_id: int
    model_id: int | None
    agent_id: int | None
    status: str
    prompt: str | None
    output: str | None
    usage: dict | None
    started_at: str | None
    finished_at: str | None
    error: str | None

    class Config:
        from_attributes = True
