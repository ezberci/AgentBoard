"""Skill routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from vibe_kanban_clone.api.deps import get_session
from vibe_kanban_clone.schemas.skill import SkillCreate, SkillRead, SkillUpdate
from vibe_kanban_clone.services import skills as skills_service

router = APIRouter()


@router.get("/skills", response_model=list[SkillRead])
async def list_skills(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[SkillRead]:
    """List all skills."""
    return await skills_service.list_skills(session)


@router.post("/skills", response_model=SkillRead, status_code=201)
async def create_skill(
    data: SkillCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SkillRead:
    """Create a new skill."""
    skill = await skills_service.create_skill(session, data)
    return skill


@router.get("/skills/{skill_id}", response_model=SkillRead)
async def get_skill(
    skill_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SkillRead:
    """Get a skill by ID."""
    skill = await skills_service.get_skill(session, skill_id)
    if skill is None:
        raise HTTPException(status_code=404, detail="Skill not found")
    return skill


@router.patch("/skills/{skill_id}", response_model=SkillRead)
async def update_skill(
    skill_id: int,
    data: SkillUpdate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SkillRead:
    """Update a skill."""
    skill = await skills_service.get_skill(session, skill_id)
    if skill is None:
        raise HTTPException(status_code=404, detail="Skill not found")
    skill = await skills_service.update_skill(session, skill, data)
    return skill


@router.delete("/skills/{skill_id}", status_code=204)
async def delete_skill(
    skill_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    """Delete a skill."""
    skill = await skills_service.get_skill(session, skill_id)
    if skill is None:
        raise HTTPException(status_code=404, detail="Skill not found")
    await skills_service.delete_skill(session, skill)
