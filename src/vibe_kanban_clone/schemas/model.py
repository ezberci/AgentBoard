"""Model registry schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ModelCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    provider: str = Field(min_length=1, max_length=100)
    model_id: str = Field(min_length=1, max_length=255)
    api_key_env: str = Field(min_length=1, max_length=255)
    base_url: str | None = Field(default=None, min_length=1, max_length=500)
    is_enabled: bool = True


class ModelUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    provider: str | None = Field(default=None, min_length=1, max_length=100)
    model_id: str | None = Field(default=None, min_length=1, max_length=255)
    api_key_env: str | None = Field(default=None, min_length=1, max_length=255)
    base_url: str | None = Field(default=None, min_length=1, max_length=500)
    is_enabled: bool | None = None


class ModelRead(BaseModel):
    id: int
    name: str
    provider: str
    model_id: str
    api_key_env: str
    base_url: str | None
    is_enabled: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
