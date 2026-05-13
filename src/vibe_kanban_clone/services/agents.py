"""Agent service."""

import re

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from vibe_kanban_clone.models.agent import Agent
from vibe_kanban_clone.models.skill import Skill
from vibe_kanban_clone.schemas.agent import AgentCreate, AgentUpdate

logger = structlog.get_logger()


def slug_to_color(name: str) -> str:
    """Derive a 2-char color code from a name."""
    parts = [p for p in re.split(r"[\s\-]+", name) if p]
    initials = "".join(p[0] for p in parts)[:2]
    return initials.lower() or "na"


async def _ensure_unique_color(session: AsyncSession, base_color: str) -> str:
    """Append a numeric suffix until the color code is unique."""
    color = base_color
    counter = 2
    while True:
        result = await session.execute(select(Agent).where(Agent.color == color))
        if result.scalar_one_or_none() is None:
            return color
        color = f"{base_color}{counter}"
        counter += 1


async def create_agent(session: AsyncSession, data: AgentCreate) -> Agent:
    """Create a new agent with an auto-deduped color."""
    color = data.color
    if color is None:
        color = await _ensure_unique_color(session, slug_to_color(data.name))
    agent = Agent(
        name=data.name,
        system_prompt=data.system_prompt,
        color=color,
    )
    session.add(agent)
    await session.commit()
    await session.refresh(agent)
    await session.refresh(agent, attribute_names=["skills"])
    logger.info("agent_created", agent_id=agent.id, color=color)
    return agent


async def get_agent(session: AsyncSession, agent_id: int) -> Agent | None:
    """Get an agent by ID with eagerly loaded skills."""
    result = await session.execute(
        select(Agent).options(selectinload(Agent.skills)).where(Agent.id == agent_id)
    )
    return result.scalar_one_or_none()


async def list_agents(session: AsyncSession) -> list[Agent]:
    """List all agents with eagerly loaded skills."""
    result = await session.execute(select(Agent).options(selectinload(Agent.skills)))
    return list(result.scalars().all())


async def update_agent(session: AsyncSession, agent: Agent, data: AgentUpdate) -> Agent:
    """Update an agent."""
    if data.name is not None:
        agent.name = data.name
    if data.system_prompt is not None:
        agent.system_prompt = data.system_prompt
    if data.color is not None:
        agent.color = data.color
    await session.commit()
    await session.refresh(agent)
    await session.refresh(agent, attribute_names=["skills"])
    logger.info("agent_updated", agent_id=agent.id)
    return agent


async def delete_agent(session: AsyncSession, agent: Agent) -> None:
    """Delete an agent."""
    await session.delete(agent)
    await session.commit()
    logger.info("agent_deleted", agent_id=agent.id)


async def assign_skill(session: AsyncSession, agent: Agent, skill: Skill) -> Agent:
    """Assign a skill to an agent."""
    await session.refresh(agent, attribute_names=["skills"])
    if skill not in agent.skills:
        agent.skills.append(skill)
        await session.commit()
        await session.refresh(agent)
        await session.refresh(agent, attribute_names=["skills"])
    return agent


async def remove_skill(session: AsyncSession, agent: Agent, skill: Skill) -> Agent:
    """Remove a skill from an agent."""
    await session.refresh(agent, attribute_names=["skills"])
    if skill in agent.skills:
        agent.skills.remove(skill)
        await session.commit()
        await session.refresh(agent)
        await session.refresh(agent, attribute_names=["skills"])
    return agent
