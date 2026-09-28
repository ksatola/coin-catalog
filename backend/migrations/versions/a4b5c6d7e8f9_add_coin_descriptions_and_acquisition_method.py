"""add coin descriptions and acquisition method

Revision ID: a4b5c6d7e8f9
Revises: 9c7e1a2b4d6f
"""

import sqlalchemy as sa
from alembic import op

revision = "a4b5c6d7e8f9"
down_revision = "9c7e1a2b4d6f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "acquisition_method",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False, unique=True),
    )
    op.add_column("coin", sa.Column("avers_description", sa.Text(), nullable=True))
    op.add_column("coin", sa.Column("revers_description", sa.Text(), nullable=True))
    op.add_column("coin", sa.Column("literature", sa.Text(), nullable=True))
    op.add_column(
        "coin",
        sa.Column(
            "acquisition_method_id",
            sa.Integer(),
            sa.ForeignKey("acquisition_method.id"),
            nullable=True,
        ),
    )
    op.add_column("coin", sa.Column("acquisition_method_text", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("coin", "acquisition_method_text")
    op.drop_column("coin", "acquisition_method_id")
    op.drop_column("coin", "literature")
    op.drop_column("coin", "revers_description")
    op.drop_column("coin", "avers_description")
    op.drop_table("acquisition_method")
