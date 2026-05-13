"""Project service."""

import re
import unicodedata

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from vibe_kanban_clone.models.project import Project
from vibe_kanban_clone.schemas.project import ProjectCreate, ProjectUpdate

logger = structlog.get_logger()


def slugify(name: str) -> str:
    """Convert a name to a URL-friendly slug."""
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s or "project"


async def _ensure_unique_slug(session: AsyncSession, base_slug: str) -> str:
    """Append a numeric suffix until the slug is unique."""
    slug = base_slug
    counter = 2
    while True:
        result = await session.execute(select(Project).where(Project.slug == slug))
        if result.scalar_one_or_none() is None:
            return slug
        slug = f"{base_slug}{counter}"
        counter += 1


async def create_project(session: AsyncSession, data: ProjectCreate) -> Project:
    """Create a new project with a deduplicated slug."""
    slug = await _ensure_unique_slug(session, slugify(data.name))
    project = Project(
        name=data.name,
        slug=slug,
        description=data.description,
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)
    logger.info("project_created", project_id=project.id, slug=slug)
    return project


async def get_project(session: AsyncSession, project_id: int) -> Project | None:
    """Get a project by ID."""
    result = await session.execute(select(Project).where(Project.id == project_id))
    return result.scalar_one_or_none()


async def list_projects(session: AsyncSession) -> list[Project]:
    """List all projects."""
    result = await session.execute(select(Project))
    return list(result.scalars().all())


async def update_project(session: AsyncSession, project: Project, data: ProjectUpdate) -> Project:
    """Update a project, regenerating the slug if the name changes."""
    if data.name is not None:
        project.name = data.name
        project.slug = await _ensure_unique_slug(session, slugify(data.name))
    if data.description is not None:
        project.description = data.description
    await session.commit()
    await session.refresh(project)
    logger.info("project_updated", project_id=project.id)
    return project


async def delete_project(session: AsyncSession, project: Project) -> None:
    """Delete a project."""
    await session.delete(project)
    await session.commit()
    logger.info("project_deleted", project_id=project.id)
