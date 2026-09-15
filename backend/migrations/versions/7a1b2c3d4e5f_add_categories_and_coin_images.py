"""add categories and coin images

Revision ID: 7a1b2c3d4e5f
Revises: 3f4a9c2d7b1e
"""

import sqlalchemy as sa
from alembic import op

revision = "7a1b2c3d4e5f"
down_revision = "3f4a9c2d7b1e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "category",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "category_relation",
        sa.Column("parent_id", sa.Integer(), nullable=False),
        sa.Column("child_id", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "parent_id <> child_id",
            name="ck_category_relation_not_self",
        ),
        sa.ForeignKeyConstraint(
            ["child_id"],
            ["category.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["parent_id"],
            ["category.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("parent_id", "child_id"),
    )

    op.create_table(
        "coin_category",
        sa.Column("coin_id", sa.Integer(), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["category.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["coin_id"],
            ["coin.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("coin_id", "category_id"),
    )

    op.create_table(
        "coin_image",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("coin_id", sa.Integer(), nullable=False),
        sa.Column("filename", sa.Text(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint(
            "kind IN ('avers', 'rewers', 'additional')",
            name="ck_coin_image_kind",
        ),
        sa.ForeignKeyConstraint(
            ["coin_id"],
            ["coin.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("filename"),
        sa.UniqueConstraint(
            "coin_id",
            "kind",
            "sort_order",
            name="uq_coin_image_order",
        ),
    )

    op.create_index(
        "uq_coin_image_avers",
        "coin_image",
        ["coin_id"],
        unique=True,
        sqlite_where=sa.text("kind = 'avers'"),
    )
    op.create_index(
        "uq_coin_image_rewers",
        "coin_image",
        ["coin_id"],
        unique=True,
        sqlite_where=sa.text("kind = 'rewers'"),
    )


def downgrade() -> None:
    op.drop_index("uq_coin_image_rewers", table_name="coin_image")
    op.drop_index("uq_coin_image_avers", table_name="coin_image")
    op.drop_table("coin_image")
    op.drop_table("coin_category")
    op.drop_table("category_relation")
    op.drop_table("category")
