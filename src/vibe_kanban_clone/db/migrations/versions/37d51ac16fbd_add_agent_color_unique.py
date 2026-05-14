"""add_agent_color_unique

Revision ID: 37d51ac16fbd
Revises: d7b3eed5b03f
Create Date: 2026-05-14 17:23:29.957196

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "37d51ac16fbd"
down_revision: str | Sequence[str] | None = "d7b3eed5b03f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("agents", schema=None) as batch_op:
        batch_op.create_unique_constraint("uq_agents_color", ["color"])


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("agents", schema=None) as batch_op:
        batch_op.drop_constraint("uq_agents_color", type_="unique")
