"""Skill service."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from vibe_kanban_clone.models.skill import Skill
from vibe_kanban_clone.schemas.skill import SkillCreate, SkillUpdate


async def create_skill(session: AsyncSession, data: SkillCreate) -> Skill:
    """Create a new skill."""
    skill = Skill(
        name=data.name,
        description=data.description,
        instructions=data.instructions,
        allowed_tools=data.allowed_tools,
    )
    session.add(skill)
    await session.commit()
    await session.refresh(skill)
    return skill


async def get_skill(session: AsyncSession, skill_id: int) -> Skill | None:
    """Get a skill by ID."""
    result = await session.execute(select(Skill).where(Skill.id == skill_id))
    return result.scalar_one_or_none()


async def list_skills(session: AsyncSession) -> list[Skill]:
    """List all skills."""
    result = await session.execute(select(Skill))
    return list(result.scalars().all())


async def update_skill(session: AsyncSession, skill: Skill, data: SkillUpdate) -> Skill:
    """Update a skill."""
    if data.name is not None:
        skill.name = data.name
    if data.description is not None:
        skill.description = data.description
    if data.instructions is not None:
        skill.instructions = data.instructions
    if data.allowed_tools is not None:
        skill.allowed_tools = data.allowed_tools
    await session.commit()
    await session.refresh(skill)
    return skill


async def delete_skill(session: AsyncSession, skill: Skill) -> None:
    """Delete a skill."""
    await session.delete(skill)
    await session.commit()
