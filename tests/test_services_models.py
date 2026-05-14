"""Model registry service tests."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from vibe_kanban_clone.schemas.model import ModelCreate, ModelUpdate
from vibe_kanban_clone.services.models import (
    create_model,
    delete_model,
    get_model,
    list_models,
    update_model,
)


@pytest.mark.asyncio
async def test_create_model(session: AsyncSession):
    data = ModelCreate(
        name="deepseek-chat",
        provider="deepseek",
        model_id="deepseek-chat",
        api_key_env="DEEPSEEK_API_KEY",
    )
    model = await create_model(session, data)
    assert model.id is not None
    assert model.name == "deepseek-chat"
    assert model.provider == "deepseek"


@pytest.mark.asyncio
async def test_create_model_duplicate_name(session: AsyncSession):
    data = ModelCreate(
        name="deepseek-chat",
        provider="deepseek",
        model_id="deepseek-chat",
        api_key_env="DEEPSEEK_API_KEY",
    )
    await create_model(session, data)
    with pytest.raises(ValueError, match="already exists"):
        await create_model(session, data)


@pytest.mark.asyncio
async def test_get_model(session: AsyncSession):
    data = ModelCreate(
        name="gpt-4",
        provider="openai",
        model_id="gpt-4",
        api_key_env="OPENAI_API_KEY",
    )
    created = await create_model(session, data)
    found = await get_model(session, created.id)
    assert found is not None
    assert found.id == created.id


@pytest.mark.asyncio
async def test_list_models(session: AsyncSession):
    await create_model(
        session,
        ModelCreate(name="m1", provider="p1", model_id="mid1", api_key_env="ENV1"),
    )
    await create_model(
        session,
        ModelCreate(name="m2", provider="p2", model_id="mid2", api_key_env="ENV2"),
    )
    models = await list_models(session)
    assert len(models) == 2


@pytest.mark.asyncio
async def test_update_model(session: AsyncSession):
    data = ModelCreate(
        name="old-name",
        provider="deepseek",
        model_id="deepseek-chat",
        api_key_env="KEY",
    )
    model = await create_model(session, data)
    updated = await update_model(session, model, ModelUpdate(name="new-name"))
    assert updated.name == "new-name"


@pytest.mark.asyncio
async def test_delete_model(session: AsyncSession):
    data = ModelCreate(
        name="to-delete",
        provider="deepseek",
        model_id="deepseek-chat",
        api_key_env="KEY",
    )
    model = await create_model(session, data)
    await delete_model(session, model)
    found = await get_model(session, model.id)
    assert found is None
