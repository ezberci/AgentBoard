from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from vibe_kanban_clone.db.engine import engine


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSession(engine) as session:
        yield session
