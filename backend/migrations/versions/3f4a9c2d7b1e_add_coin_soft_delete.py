"""add coin soft delete flag

Revision ID: 3f4a9c2d7b1e
Revises: e6df2f7c0c11
"""

from alembic import op
import sqlalchemy as sa


revision = "3f4a9c2d7b1e"
down_revision = "e6df2f7c0c11"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "coin",
        sa.Column(
            "is_deleted",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("coin", "is_deleted")
