"""Column routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from vibe_kanban_clone.api.deps import get_session
from vibe_kanban_clone.api.routes.ws import broadcast_project
from vibe_kanban_clone.schemas.column import (
    ColumnCreate,
    ColumnRead,
    ColumnReorder,
    ColumnUpdate,
)
from vibe_kanban_clone.schemas.common import PaginatedParams
from vibe_kanban_clone.services import columns as columns_service
from vibe_kanban_clone.services import projects as projects_service

router = APIRouter()


@router.get("/projects/{project_id}/columns", response_model=list[ColumnRead])
async def list_columns(
    project_id: int,
    pagination: Annotated[PaginatedParams, Depends()],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ColumnRead]:
    """List all columns in a project."""
    project = await projects_service.get_project(session, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return await columns_service.list_columns_by_project(
        session, project_id, pagination.limit, pagination.offset
    )


@router.post("/projects/{project_id}/columns", response_model=ColumnRead, status_code=201)
async def create_column(
    project_id: int,
    data: ColumnCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ColumnRead:
    """Create a new column in a project."""
    project = await projects_service.get_project(session, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    column = await columns_service.create_column(session, project_id, data)
    await broadcast_project(
        project_id,
        "column.created",
        ColumnRead.model_validate(column).model_dump(mode="json"),
    )
    return column


@router.patch("/columns/{column_id}", response_model=ColumnRead)
async def update_column(
    column_id: int,
    data: ColumnUpdate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ColumnRead:
    """Update a column."""
    column = await columns_service.get_column(session, column_id)
    if column is None:
        raise HTTPException(status_code=404, detail="Column not found")
    column = await columns_service.update_column(session, column, data)
    await broadcast_project(
        column.project_id,
        "column.updated",
        ColumnRead.model_validate(column).model_dump(mode="json"),
    )
    return column


@router.delete("/columns/{column_id}", status_code=204)
async def delete_column(
    column_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    """Delete a column."""
    column = await columns_service.get_column(session, column_id)
    if column is None:
        raise HTTPException(status_code=404, detail="Column not found")
    project_id = column.project_id
    await columns_service.delete_column(session, column)
    await broadcast_project(
        project_id,
        "column.deleted",
        {"column_id": column_id},
    )


@router.post("/columns/{column_id}/reorder", response_model=list[ColumnRead])
async def reorder_columns(
    column_id: int,
    data: ColumnReorder,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ColumnRead]:
    """Reorder columns in a project."""
    column = await columns_service.get_column(session, column_id)
    if column is None:
        raise HTTPException(status_code=404, detail="Column not found")
    columns = await columns_service.reorder_columns(session, column.project_id, data)
    await broadcast_project(
        column.project_id,
        "column.reordered",
        {
            "columns": [ColumnRead.model_validate(c).model_dump(mode="json") for c in columns],
        },
    )
    return columns
