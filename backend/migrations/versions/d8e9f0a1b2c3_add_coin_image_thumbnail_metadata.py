"""add coin image thumbnail metadata

Revision ID: d8e9f0a1b2c3
Revises: c7d8e9f0a1b2
"""

import sqlalchemy as sa
from alembic import op

revision = "d8e9f0a1b2c3"
down_revision = "c7d8e9f0a1b2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "coin_image",
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "coin_image",
        sa.Column("thumbnail_revision", sa.Integer(), nullable=True),
    )
    op.add_column(
        "coin_image",
        sa.Column("thumbnail_generator_version", sa.Integer(), nullable=True),
    )
    op.alter_column("coin_image", "revision", server_default=None)


def downgrade() -> None:
    op.drop_column("coin_image", "thumbnail_generator_version")
    op.drop_column("coin_image", "thumbnail_revision")
    op.drop_column("coin_image", "revision")
