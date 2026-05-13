import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from vibe_kanban_clone.schemas.skill import SkillCreate, SkillUpdate
from vibe_kanban_clone.services.skills import (
    create_skill,
    delete_skill,
    get_skill,
    list_skills,
    update_skill,
)


@pytest.mark.asyncio
async def test_create_skill(session: AsyncSession):
    data = SkillCreate(
        name="Skill One", description="Desc", instructions="Do it", allowed_tools=["t1"]
    )
    skill = await create_skill(session, data)
    assert skill.id is not None
    assert skill.name == "Skill One"
    assert skill.description == "Desc"
    assert skill.allowed_tools == ["t1"]


@pytest.mark.asyncio
async def test_get_skill(session: AsyncSession):
    created = await create_skill(session, SkillCreate(name="S1"))
    found = await get_skill(session, created.id)
    assert found is not None
    assert found.id == created.id


@pytest.mark.asyncio
async def test_list_skills(session: AsyncSession):
    await create_skill(session, SkillCreate(name="S1"))
    await create_skill(session, SkillCreate(name="S2"))
    skills = await list_skills(session)
    assert len(skills) == 2


@pytest.mark.asyncio
async def test_update_skill(session: AsyncSession):
    skill = await create_skill(session, SkillCreate(name="Old"))
    updated = await update_skill(session, skill, SkillUpdate(name="New", description="D2"))
    assert updated.name == "New"
    assert updated.description == "D2"


@pytest.mark.asyncio
async def test_delete_skill(session: AsyncSession):
    skill = await create_skill(session, SkillCreate(name="To Delete"))
    await delete_skill(session, skill)
    found = await get_skill(session, skill.id)
    assert found is None
