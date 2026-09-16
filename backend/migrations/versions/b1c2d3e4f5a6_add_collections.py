"""add collections to coins

Revision ID: b1c2d3e4f5a6
Revises: 9c7e1a2b4d6f
"""

import sqlalchemy as sa
from alembic import op

revision = "b1c2d3e4f5a6"
down_revision = "9c7e1a2b4d6f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "collection",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("name", name="uq_collection_name"),
    )

    bind = op.get_bind()
    bind.execute(
        sa.text(
            "INSERT INTO collection (name, description, created_at, updated_at) "
            "VALUES (:name, :description, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
        ),
        {"name": "Default Collection", "description": None},
    )
    default_collection_id = bind.execute(
        sa.text("SELECT id FROM collection WHERE name = :name"),
        {"name": "Default Collection"},
    ).scalar_one()

    op.add_column("coin", sa.Column("collection_id", sa.Integer(), nullable=True))
    bind.execute(
        sa.text("UPDATE coin SET collection_id = :collection_id"),
        {"collection_id": default_collection_id},
    )

    with op.batch_alter_table("coin", recreate="always") as batch_op:
        batch_op.alter_column(
            "collection_id", existing_type=sa.Integer(), nullable=False
        )
        batch_op.create_foreign_key(
            "fk_coin_collection_id",
            "collection",
            ["collection_id"],
            ["id"],
            ondelete="RESTRICT",
        )


def downgrade() -> None:
    with op.batch_alter_table("coin", recreate="always") as batch_op:
        batch_op.drop_constraint("fk_coin_collection_id", type_="foreignkey")
        batch_op.drop_column("collection_id")

    op.drop_table("collection")
