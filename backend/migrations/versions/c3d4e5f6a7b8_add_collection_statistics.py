"""add persisted collection statistics

Revision ID: c3d4e5f6a7b8
Revises: b1c2d3e4f5a6
"""

from pathlib import Path

import sqlalchemy as sa
from alembic import op

revision = "c3d4e5f6a7b8"
down_revision = "b1c2d3e4f5a6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "collection",
        sa.Column("coin_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "collection",
        sa.Column(
            "archived_coin_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "collection",
        sa.Column("image_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "collection",
        sa.Column(
            "file_size_bytes",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "collection",
        sa.Column("category_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "collection",
        sa.Column(
            "coins_without_images_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "collection",
        sa.Column("last_modified_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "coin_image",
        sa.Column("file_size_bytes", sa.Integer(), nullable=False, server_default="0"),
    )

    bind = op.get_bind()
    images_dir = Path(__file__).resolve().parents[3] / "images"
    image_rows = bind.execute(
        sa.text(
            "SELECT ci.id, c.collection_id, ci.filename "
            "FROM coin_image AS ci "
            "JOIN coin AS c ON c.id = ci.coin_id"
        )
    ).all()
    for image_id, collection_id, filename in image_rows:
        path = images_dir / f"collection-{collection_id:03d}" / filename
        size = path.stat().st_size if path.is_file() else 0
        bind.execute(
            sa.text("UPDATE coin_image SET file_size_bytes = :size WHERE id = :id"),
            {"id": image_id, "size": size},
        )

    bind.execute(
        sa.text(
            "UPDATE collection SET "
            "coin_count = (SELECT COUNT(*) FROM coin WHERE coin.collection_id = collection.id), "
            "archived_coin_count = (SELECT COUNT(*) FROM coin WHERE coin.collection_id = collection.id AND coin.is_deleted = 1), "
            "image_count = (SELECT COUNT(*) FROM coin_image JOIN coin ON coin.id = coin_image.coin_id WHERE coin.collection_id = collection.id), "
            "file_size_bytes = (SELECT COALESCE(SUM(coin_image.file_size_bytes), 0) FROM coin_image JOIN coin ON coin.id = coin_image.coin_id WHERE coin.collection_id = collection.id), "
            "category_count = (SELECT COUNT(DISTINCT coin_category.category_id) FROM coin_category JOIN coin ON coin.id = coin_category.coin_id WHERE coin.collection_id = collection.id), "
            "coins_without_images_count = (SELECT COUNT(*) FROM coin WHERE coin.collection_id = collection.id AND NOT EXISTS (SELECT 1 FROM coin_image WHERE coin_image.coin_id = coin.id)), "
            "last_modified_at = updated_at"
        )
    )

    for column in (
        "coin_count",
        "archived_coin_count",
        "image_count",
        "file_size_bytes",
        "category_count",
        "coins_without_images_count",
    ):
        op.alter_column("collection", column, server_default=None)
    op.alter_column("coin_image", "file_size_bytes", server_default=None)

    with op.batch_alter_table("collection", recreate="always") as batch_op:
        batch_op.alter_column("last_modified_at", nullable=False)


def downgrade() -> None:
    op.drop_column("coin_image", "file_size_bytes")
    op.drop_column("collection", "last_modified_at")
    op.drop_column("collection", "coins_without_images_count")
    op.drop_column("collection", "category_count")
    op.drop_column("collection", "file_size_bytes")
    op.drop_column("collection", "image_count")
    op.drop_column("collection", "archived_coin_count")
    op.drop_column("collection", "coin_count")
