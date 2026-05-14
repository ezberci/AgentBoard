"""Project service."""

import re
import unicodedata

import structlog
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from vibe_kanban_clone.models.project import Project
from vibe_kanban_clone.schemas.project import ProjectCreate, ProjectUpdate

logger = structlog.get_logger()


def slugify(name: str) -> str:
    """Convert a name to a URL-friendly slug."""
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s or "project"


def _is_slug_integrity_error(exc: IntegrityError) -> bool:
    msg = str(exc.orig) if exc.orig else str(exc)
    return "projects.slug" in msg


async def _ensure_unique_slug(
    session: AsyncSession, base_slug: str, exclude_id: int | None = None
) -> str:
    """Append a numeric suffix until the slug is unique (best-effort pre-check)."""
    slug = base_slug
    counter = 2
    while True:
        stmt = select(Project).where(Project.slug == slug)
        if exclude_id is not None:
            stmt = stmt.where(Project.id != exclude_id)
        result = await session.execute(stmt)
        if result.scalar_one_or_none() is None:
            return slug
        slug = f"{base_slug}{counter}"
        counter += 1


async def create_project(session: AsyncSession, data: ProjectCreate) -> Project:
    """Create a new project with a deduplicated slug."""
    base_slug = slugify(data.name)
    slug = await _ensure_unique_slug(session, base_slug)
    project = Project(
        name=data.name,
        slug=slug,
        description=data.description,
    )
    session.add(project)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        if not _is_slug_integrity_error(exc):
            raise
        counter = 2
        while True:
            project.slug = f"{base_slug}{counter}"
            counter += 1
            session.add(project)
            try:
                await session.commit()
                break
            except IntegrityError as inner_exc:
                await session.rollback()
                if not _is_slug_integrity_error(inner_exc):
                    raise
    await session.refresh(project)
    logger.info("project_created", project_id=project.id, slug=project.slug)
    return project


async def get_project(session: AsyncSession, project_id: int) -> Project | None:
    """Get a project by ID."""
    result = await session.execute(select(Project).where(Project.id == project_id))
    return result.scalar_one_or_none()


async def list_projects(session: AsyncSession, limit: int = 50, offset: int = 0) -> list[Project]:
    """List all projects."""
    result = await session.execute(select(Project).limit(limit).offset(offset))
    return list(result.scalars().all())


async def update_project(session: AsyncSession, project: Project, data: ProjectUpdate) -> Project:
    """Update a project, regenerating the slug if the name changes."""
    base_slug = None
    if data.name is not None:
        project.name = data.name
        base_slug = slugify(data.name)
        project.slug = await _ensure_unique_slug(session, base_slug, exclude_id=project.id)
    if data.description is not None:
        project.description = data.description

    if base_slug is not None:
        try:
            await session.commit()
        except IntegrityError as exc:
            await session.rollback()
            if not _is_slug_integrity_error(exc):
                raise
            counter = 2
            while True:
                project.name = data.name
                project.slug = f"{base_slug}{counter}"
                counter += 1
                if data.description is not None:
                    project.description = data.description
                try:
                    await session.commit()
                    break
                except IntegrityError as inner_exc:
                    await session.rollback()
                    if not _is_slug_integrity_error(inner_exc):
                        raise
    else:
        await session.commit()

    await session.refresh(project)
    logger.info("project_updated", project_id=project.id)
    return project


async def delete_project(session: AsyncSession, project: Project) -> None:
    """Delete a project."""
    await session.delete(project)
    await session.commit()
    logger.info("project_deleted", project_id=project.id)
