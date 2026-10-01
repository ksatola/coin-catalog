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


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(
        column["name"] == column_name
        for column in inspector.get_columns(table_name)
    )


def upgrade() -> None:
    if not _has_column("coin_image", "revision"):
        op.add_column(
            "coin_image",
            sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        )

    if not _has_column("coin_image", "thumbnail_revision"):
        op.add_column(
            "coin_image",
            sa.Column("thumbnail_revision", sa.Integer(), nullable=True),
        )

    if not _has_column("coin_image", "thumbnail_generator_version"):
        op.add_column(
            "coin_image",
            sa.Column("thumbnail_generator_version", sa.Integer(), nullable=True),
        )


def downgrade() -> None:
    if _has_column("coin_image", "thumbnail_generator_version"):
        op.drop_column("coin_image", "thumbnail_generator_version")
    if _has_column("coin_image", "thumbnail_revision"):
        op.drop_column("coin_image", "thumbnail_revision")
    if _has_column("coin_image", "revision"):
        op.drop_column("coin_image", "revision")
