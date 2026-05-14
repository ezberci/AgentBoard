"""Column service."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from vibe_kanban_clone.models.column import Column
from vibe_kanban_clone.schemas.column import ColumnCreate, ColumnReorder, ColumnUpdate


async def create_column(session: AsyncSession, project_id: int, data: ColumnCreate) -> Column:
    """Create a new column in a project."""
    column = Column(
        project_id=project_id,
        name=data.name,
        position=data.position,
        is_terminal=data.is_terminal,
    )
    session.add(column)
    await session.commit()
    await session.refresh(column)
    return column


async def get_column(session: AsyncSession, column_id: int) -> Column | None:
    """Get a column by ID."""
    result = await session.execute(select(Column).where(Column.id == column_id))
    return result.scalar_one_or_none()


async def list_columns_by_project(
    session: AsyncSession, project_id: int, limit: int = 50, offset: int = 0
) -> list[Column]:
    """List all columns in a project, ordered by position."""
    result = await session.execute(
        select(Column)
        .where(Column.project_id == project_id)
        .order_by(Column.position)
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


async def update_column(session: AsyncSession, column: Column, data: ColumnUpdate) -> Column:
    """Update a column."""
    if data.name is not None:
        column.name = data.name
    if data.position is not None:
        column.position = data.position
    if data.is_terminal is not None:
        column.is_terminal = data.is_terminal
    await session.commit()
    await session.refresh(column)
    return column


async def delete_column(session: AsyncSession, column: Column) -> None:
    """Delete a column."""
    await session.delete(column)
    await session.commit()


async def reorder_columns(
    session: AsyncSession, project_id: int, data: ColumnReorder
) -> list[Column]:
    """Reorder columns within a project."""
    result = await session.execute(select(Column).where(Column.project_id == project_id))
    columns = {c.id: c for c in result.scalars().all()}

    valid_ids = set(columns.keys())
    for col_id, new_pos in data.positions.items():
        if col_id in valid_ids:
            columns[col_id].position = new_pos

    await session.commit()
    return list(columns.values())
