"""add coin descriptions and acquisition method

Revision ID: a4b5c6d7e8f9
Revises: c3d4e5f6a7b8
"""

import sqlalchemy as sa
from alembic import op

revision = "a4b5c6d7e8f9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "acquisition_method",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False, unique=True),
    )
    with op.batch_alter_table("coin") as batch_op:
        batch_op.add_column(sa.Column("avers_description", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("revers_description", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("literature", sa.Text(), nullable=True))
        batch_op.add_column(
            sa.Column(
                "acquisition_method_id",
                sa.Integer(),
                sa.ForeignKey("acquisition_method.id"),
                nullable=True,
            )
        )
        batch_op.add_column(
            sa.Column("acquisition_method_text", sa.Text(), nullable=True)
        )


def downgrade() -> None:
    with op.batch_alter_table("coin") as batch_op:
        batch_op.drop_column("acquisition_method_text")
        batch_op.drop_column("acquisition_method_id")
        batch_op.drop_column("literature")
        batch_op.drop_column("revers_description")
        batch_op.drop_column("avers_description")
    op.drop_table("acquisition_method")
