"""add collection number to coins

Revision ID: 9c7e1a2b4d6f
Revises: 7b2e4c1d9a60
"""

import sqlalchemy as sa
from alembic import op

revision = "9c7e1a2b4d6f"
down_revision = "7b2e4c1d9a60"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("coin", sa.Column("collection_number", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("coin", "collection_number")
