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
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "acquisition_method" not in inspector.get_table_names():
        op.create_table(
            "acquisition_method",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.Text(), nullable=False, unique=True),
        )

    with op.batch_alter_table("coin") as batch_op:
        existing_columns = {column["name"] for column in inspector.get_columns("coin")}
        if "avers_description" not in existing_columns:
            batch_op.add_column(
                sa.Column("avers_description", sa.Text(), nullable=True)
            )
        if "revers_description" not in existing_columns:
            batch_op.add_column(
                sa.Column("revers_description", sa.Text(), nullable=True)
            )
        if "literature" not in existing_columns:
            batch_op.add_column(sa.Column("literature", sa.Text(), nullable=True))
        if "acquisition_method_id" not in existing_columns:
            batch_op.add_column(
                sa.Column(
                    "acquisition_method_id",
                    sa.Integer(),
                    sa.ForeignKey("acquisition_method.id"),
                    nullable=True,
                )
            )
        if "acquisition_method_text" not in existing_columns:
            batch_op.add_column(
                sa.Column("acquisition_method_text", sa.Text(), nullable=True)
            )


def downgrade() -> None:
    with op.batch_alter_table("coin") as batch_op:
        existing_columns = {
            column["name"] for column in sa.inspect(op.get_bind()).get_columns("coin")
        }
        for column_name in (
            "acquisition_method_text",
            "acquisition_method_id",
            "literature",
            "revers_description",
            "avers_description",
        ):
            if column_name in existing_columns:
                batch_op.drop_column(column_name)
    if "acquisition_method" in sa.inspect(op.get_bind()).get_table_names():
        op.drop_table("acquisition_method")
