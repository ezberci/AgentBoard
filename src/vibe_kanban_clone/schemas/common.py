"""Common schemas."""

from pydantic import BaseModel, Field


class PaginatedParams(BaseModel):
    """Pagination query parameters."""

    limit: int = Field(50, ge=1, le=100)
    offset: int = Field(0, ge=0)
