"""Agent routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from vibe_kanban_clone.api.deps import get_session
from vibe_kanban_clone.schemas.agent import AgentCreate, AgentRead, AgentUpdate
from vibe_kanban_clone.schemas.common import PaginatedParams
from vibe_kanban_clone.services import agents as agents_service
from vibe_kanban_clone.services import skills as skills_service

router = APIRouter()


@router.get("/agents", response_model=list[AgentRead])
async def list_agents(
    pagination: Annotated[PaginatedParams, Depends()],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[AgentRead]:
    """List all agents."""
    return await agents_service.list_agents(session, pagination.limit, pagination.offset)


@router.post("/agents", response_model=AgentRead, status_code=201)
async def create_agent(
    data: AgentCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AgentRead:
    """Create a new agent."""
    agent = await agents_service.create_agent(session, data)
    return agent


@router.get("/agents/{agent_id}", response_model=AgentRead)
async def get_agent(
    agent_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AgentRead:
    """Get an agent by ID."""
    agent = await agents_service.get_agent(session, agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.patch("/agents/{agent_id}", response_model=AgentRead)
async def update_agent(
    agent_id: int,
    data: AgentUpdate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AgentRead:
    """Update an agent."""
    agent = await agents_service.get_agent(session, agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent = await agents_service.update_agent(session, agent, data)
    return agent


@router.delete("/agents/{agent_id}", status_code=204)
async def delete_agent(
    agent_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    """Delete an agent."""
    agent = await agents_service.get_agent(session, agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    await agents_service.delete_agent(session, agent)


@router.post("/agents/{agent_id}/skills/{skill_id}", response_model=AgentRead)
async def assign_skill(
    agent_id: int,
    skill_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AgentRead:
    """Assign a skill to an agent."""
    agent = await agents_service.get_agent(session, agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    skill = await skills_service.get_skill(session, skill_id)
    if skill is None:
        raise HTTPException(status_code=404, detail="Skill not found")
    agent = await agents_service.assign_skill(session, agent, skill)
    return agent


@router.delete("/agents/{agent_id}/skills/{skill_id}", status_code=204)
async def remove_skill(
    agent_id: int,
    skill_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    """Remove a skill from an agent."""
    agent = await agents_service.get_agent(session, agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    skill = await skills_service.get_skill(session, skill_id)
    if skill is None:
        raise HTTPException(status_code=404, detail="Skill not found")
    await agents_service.remove_skill(session, agent, skill)
