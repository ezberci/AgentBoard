"""Project routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from vibe_kanban_clone.api.deps import get_session
from vibe_kanban_clone.api.routes.ws import broadcast_global
from vibe_kanban_clone.schemas.common import PaginatedParams
from vibe_kanban_clone.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from vibe_kanban_clone.services import projects as projects_service

router = APIRouter()


@router.get("/projects", response_model=list[ProjectRead])
async def list_projects(
    pagination: Annotated[PaginatedParams, Depends()],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ProjectRead]:
    """List all projects."""
    return await projects_service.list_projects(session, pagination.limit, pagination.offset)


@router.post("/projects", response_model=ProjectRead, status_code=201)
async def create_project(
    data: ProjectCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProjectRead:
    """Create a new project."""
    project = await projects_service.create_project(session, data)
    await broadcast_global(
        "project.created",
        ProjectRead.model_validate(project).model_dump(mode="json"),
    )
    return project


@router.get("/projects/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProjectRead:
    """Get a project by ID."""
    project = await projects_service.get_project(session, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/projects/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: int,
    data: ProjectUpdate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProjectRead:
    """Update a project."""
    project = await projects_service.get_project(session, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    project = await projects_service.update_project(session, project, data)
    await broadcast_global(
        "project.updated",
        ProjectRead.model_validate(project).model_dump(mode="json"),
    )
    return project


@router.delete("/projects/{project_id}", status_code=204)
async def delete_project(
    project_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    """Delete a project."""
    project = await projects_service.get_project(session, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    await projects_service.delete_project(session, project)
    await broadcast_global(
        "project.deleted",
        {"project_id": project_id},
    )
