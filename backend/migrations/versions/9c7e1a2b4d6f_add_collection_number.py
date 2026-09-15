"""add collection number to coins

Revision ID: 9c7e1a2b4d6f
Revises: 7a1b2c3d4e5f
"""

import sqlalchemy as sa
from alembic import op

revision = "9c7e1a2b4d6f"
down_revision = "7a1b2c3d4e5f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("coin", sa.Column("collection_number", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("coin", "collection_number")
