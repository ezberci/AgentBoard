#!/usr/bin/env python3
"""Seed script for Vibe Kanban."""

import asyncio

from vibe_kanban_clone.db.base import Base
from vibe_kanban_clone.db.engine import engine


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database initialized.")


if __name__ == "__main__":
    asyncio.run(main())
