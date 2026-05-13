import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from vibe_kanban_clone.schemas.agent import AgentCreate, AgentUpdate
from vibe_kanban_clone.schemas.skill import SkillCreate
from vibe_kanban_clone.services.agents import (
    assign_skill,
    create_agent,
    delete_agent,
    get_agent,
    list_agents,
    remove_skill,
    slug_to_color,
    update_agent,
)
from vibe_kanban_clone.services.skills import create_skill


def test_slug_to_color_basic():
    assert slug_to_color("Hello World") == "hw"
    assert slug_to_color("Alice") == "a"
    assert slug_to_color("") == "na"
    assert slug_to_color("One Two Three") == "ot"


@pytest.mark.asyncio
async def test_create_agent(session: AsyncSession):
    data = AgentCreate(name="Agent One", system_prompt="Be nice")
    agent = await create_agent(session, data)
    assert agent.id is not None
    assert agent.name == "Agent One"
    assert agent.color == "ao"


@pytest.mark.asyncio
async def test_create_agent_with_explicit_color(session: AsyncSession):
    data = AgentCreate(name="Agent Two", color="red")
    agent = await create_agent(session, data)
    assert agent.color == "red"


@pytest.mark.asyncio
async def test_slug_to_color_dedupe(session: AsyncSession):
    agent1 = await create_agent(session, AgentCreate(name="Foo Bar"))
    assert agent1.color == "fb"

    agent2 = await create_agent(session, AgentCreate(name="Fizz Buzz"))
    assert agent2.color == "fb2"

    agent3 = await create_agent(session, AgentCreate(name="Fuzz Ball"))
    assert agent3.color == "fb3"


@pytest.mark.asyncio
async def test_get_agent(session: AsyncSession):
    created = await create_agent(session, AgentCreate(name="Find Me"))
    found = await get_agent(session, created.id)
    assert found is not None
    assert found.id == created.id
    assert found.skills == []


@pytest.mark.asyncio
async def test_list_agents(session: AsyncSession):
    await create_agent(session, AgentCreate(name="A1"))
    await create_agent(session, AgentCreate(name="A2"))
    agents = await list_agents(session)
    assert len(agents) == 2


@pytest.mark.asyncio
async def test_update_agent(session: AsyncSession):
    agent = await create_agent(session, AgentCreate(name="Old"))
    updated = await update_agent(session, agent, AgentUpdate(name="New", color="blue"))
    assert updated.name == "New"
    assert updated.color == "blue"


@pytest.mark.asyncio
async def test_delete_agent(session: AsyncSession):
    agent = await create_agent(session, AgentCreate(name="To Delete"))
    await delete_agent(session, agent)
    found = await get_agent(session, agent.id)
    assert found is None


@pytest.mark.asyncio
async def test_assign_and_remove_skill(session: AsyncSession):
    agent = await create_agent(session, AgentCreate(name="A1"))
    skill = await create_skill(session, SkillCreate(name="S1"))

    agent = await assign_skill(session, agent, skill)
    assert len(agent.skills) == 1
    assert agent.skills[0].id == skill.id

    agent = await remove_skill(session, agent, skill)
    assert len(agent.skills) == 0
