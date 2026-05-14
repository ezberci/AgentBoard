"""Model registry services."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from vibe_kanban_clone.models.model import Model
from vibe_kanban_clone.schemas.model import ModelCreate, ModelUpdate


async def list_models(session: AsyncSession) -> list[Model]:
    result = await session.scalars(select(Model).order_by(Model.name))
    return list(result.all())


async def get_model(session: AsyncSession, model_id: int) -> Model | None:
    return await session.get(Model, model_id)


async def create_model(session: AsyncSession, data: ModelCreate) -> Model:
    model = Model(**data.model_dump())
    session.add(model)
    await session.commit()
    await session.refresh(model)
    return model


async def update_model(session: AsyncSession, model: Model, data: ModelUpdate) -> Model:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(model, key, value)
    await session.commit()
    await session.refresh(model)
    return model


async def delete_model(session: AsyncSession, model: Model) -> None:
    await session.delete(model)
    await session.commit()
