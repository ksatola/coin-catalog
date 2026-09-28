"""make coin dating optional and add purchase data

Revision ID: b5c6d7e8f9a0
Revises: a4b5c6d7e8f9
"""

import sqlalchemy as sa
from alembic import op

revision = "b5c6d7e8f9a0"
down_revision = "a4b5c6d7e8f9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("coin") as batch_op:
        batch_op.alter_column(
            "from_year",
            existing_type=sa.Integer(),
            nullable=True,
        )
        batch_op.alter_column(
            "from_era_id",
            existing_type=sa.Integer(),
            nullable=True,
        )
        batch_op.alter_column(
            "to_year",
            existing_type=sa.Integer(),
            nullable=True,
        )
        batch_op.alter_column(
            "to_era_id",
            existing_type=sa.Integer(),
            nullable=True,
        )
        batch_op.add_column(sa.Column("purchase_price", sa.Numeric(), nullable=True))
        batch_op.add_column(sa.Column("purchase_date", sa.Date(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("coin") as batch_op:
        batch_op.drop_column("purchase_date")
        batch_op.drop_column("purchase_price")
        batch_op.alter_column(
            "to_era_id",
            existing_type=sa.Integer(),
            nullable=False,
        )
        batch_op.alter_column(
            "to_year",
            existing_type=sa.Integer(),
            nullable=False,
        )
        batch_op.alter_column(
            "from_era_id",
            existing_type=sa.Integer(),
            nullable=False,
        )
        batch_op.alter_column(
            "from_year",
            existing_type=sa.Integer(),
            nullable=False,
        )
