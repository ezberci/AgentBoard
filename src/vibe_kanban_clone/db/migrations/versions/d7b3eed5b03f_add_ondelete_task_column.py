"""add_ondelete_task_column

Revision ID: d7b3eed5b03f
Revises: 0002
Create Date: 2026-05-14 16:47:40.974829

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d7b3eed5b03f"
down_revision: str | Sequence[str] | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # SQLite does not support ALTER TABLE for foreign key constraints.
    # Recreate the tasks table with ON DELETE SET NULL on column_id.
    op.execute(
        """
        CREATE TABLE tasks_new (
            id INTEGER NOT NULL,
            project_id INTEGER NOT NULL,
            column_id INTEGER,
            title VARCHAR NOT NULL,
            description VARCHAR,
            priority INTEGER NOT NULL,
            result VARCHAR,
            assigned_agent_id INTEGER,
            version INTEGER NOT NULL,
            claimed_at DATETIME,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            PRIMARY KEY (id),
            FOREIGN KEY(assigned_agent_id) REFERENCES agents (id) ON DELETE SET NULL,
            FOREIGN KEY(column_id) REFERENCES columns (id) ON DELETE SET NULL,
            FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE CASCADE
        )
        """
    )
    op.execute(
        """
        INSERT INTO tasks_new (
            id, project_id, column_id, title, description,
            priority, result, assigned_agent_id, version,
            claimed_at, created_at, updated_at
        )
        SELECT
            id, project_id, column_id, title, description,
            priority, result, assigned_agent_id, version,
            claimed_at, created_at, updated_at
        FROM tasks
        """
    )
    op.drop_table("tasks")
    op.execute("ALTER TABLE tasks_new RENAME TO tasks")
    op.create_index(
        "idx_tasks_agent_claimed",
        "tasks",
        ["assigned_agent_id", "claimed_at"],
        unique=False,
    )
    op.create_index(
        "idx_tasks_project_column",
        "tasks",
        ["project_id", "column_id", "priority"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        """
        CREATE TABLE tasks_new (
            id INTEGER NOT NULL,
            project_id INTEGER NOT NULL,
            column_id INTEGER,
            title VARCHAR NOT NULL,
            description VARCHAR,
            priority INTEGER NOT NULL,
            result VARCHAR,
            assigned_agent_id INTEGER,
            version INTEGER NOT NULL,
            claimed_at DATETIME,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            PRIMARY KEY (id),
            FOREIGN KEY(assigned_agent_id) REFERENCES agents (id) ON DELETE SET NULL,
            FOREIGN KEY(column_id) REFERENCES columns (id),
            FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE CASCADE
        )
        """
    )
    op.execute(
        """
        INSERT INTO tasks_new (
            id, project_id, column_id, title, description,
            priority, result, assigned_agent_id, version,
            claimed_at, created_at, updated_at
        )
        SELECT
            id, project_id, column_id, title, description,
            priority, result, assigned_agent_id, version,
            claimed_at, created_at, updated_at
        FROM tasks
        """
    )
    op.drop_table("tasks")
    op.execute("ALTER TABLE tasks_new RENAME TO tasks")
    op.create_index(
        "idx_tasks_agent_claimed",
        "tasks",
        ["assigned_agent_id", "claimed_at"],
        unique=False,
    )
    op.create_index(
        "idx_tasks_project_column",
        "tasks",
        ["project_id", "column_id", "priority"],
        unique=False,
    )
