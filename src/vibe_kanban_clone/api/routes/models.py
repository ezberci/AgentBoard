"""Model registry routes."""

import os
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from vibe_kanban_clone.api.deps import get_session
from vibe_kanban_clone.api.routes.ws import broadcast_global
from vibe_kanban_clone.schemas.model import ModelCreate, ModelRead, ModelUpdate
from vibe_kanban_clone.services import models as models_service

router = APIRouter()


@router.get("/models", response_model=list[ModelRead])
async def list_models(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ModelRead]:
    """List all registered models."""
    return await models_service.list_models(session)


@router.post("/models", response_model=ModelRead, status_code=201)
async def create_model(
    data: ModelCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ModelRead:
    """Register a new model."""
    model = await models_service.create_model(session, data)
    await broadcast_global(
        "model.created",
        ModelRead.model_validate(model).model_dump(mode="json"),
    )
    return model


@router.get("/models/{model_id}", response_model=ModelRead)
async def get_model(
    model_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ModelRead:
    """Get a model by ID."""
    model = await models_service.get_model(session, model_id)
    if model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    return model


@router.patch("/models/{model_id}", response_model=ModelRead)
async def update_model(
    model_id: int,
    data: ModelUpdate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ModelRead:
    """Update a model."""
    model = await models_service.get_model(session, model_id)
    if model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    model = await models_service.update_model(session, model, data)
    await broadcast_global(
        "model.updated",
        ModelRead.model_validate(model).model_dump(mode="json"),
    )
    return model


@router.delete("/models/{model_id}", status_code=204)
async def delete_model(
    model_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    """Delete a model."""
    model = await models_service.get_model(session, model_id)
    if model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    await models_service.delete_model(session, model)
    await broadcast_global("model.deleted", {"model_id": model_id})


@router.get("/models/health")
async def models_health(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[dict]:
    """Check API key env vars for enabled models."""
    models = await models_service.list_models(session)
    return [
        {
            "id": m.id,
            "name": m.name,
            "env_var": m.api_key_env,
            "env_present": m.api_key_env in os.environ,
        }
        for m in models
        if m.is_enabled
    ]
