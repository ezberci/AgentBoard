"""Column schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ColumnCreate(BaseModel):
    """Schema for creating a column."""

    name: str
    position: int = 0
    is_terminal: bool = False


class ColumnRead(BaseModel):
    """Schema for reading a column."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    position: int
    is_terminal: bool
    created_at: datetime


class ColumnUpdate(BaseModel):
    """Schema for updating a column."""

    name: str | None = None
    position: int | None = None
    is_terminal: bool | None = None


class ColumnReorder(BaseModel):
    """Schema for reordering columns."""

    positions: dict[int, int]
