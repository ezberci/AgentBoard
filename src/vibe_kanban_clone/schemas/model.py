"""Model registry schemas."""

from pydantic import BaseModel


class ModelCreate(BaseModel):
    name: str
    provider: str
    model_id: str
    api_key_env: str
    base_url: str | None = None
    is_enabled: bool = True


class ModelUpdate(BaseModel):
    name: str | None = None
    provider: str | None = None
    model_id: str | None = None
    api_key_env: str | None = None
    base_url: str | None = None
    is_enabled: bool | None = None


class ModelRead(BaseModel):
    id: int
    name: str
    provider: str
    model_id: str
    api_key_env: str
    base_url: str | None
    is_enabled: bool
    created_at: str

    class Config:
        from_attributes = True
