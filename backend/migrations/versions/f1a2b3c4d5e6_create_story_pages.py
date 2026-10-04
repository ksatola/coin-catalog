"""create story pages

Revision ID: f1a2b3c4d5e6
Revises: d8e9f0a1b2c3
"""

import sqlalchemy as sa
from alembic import op

revision = "f1a2b3c4d5e6"
down_revision = "d8e9f0a1b2c3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "story_page",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["parent_id"], ["story_page.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint("parent_id", "slug", name="uq_story_page_parent_slug"),
        sa.UniqueConstraint("parent_id", "title", name="uq_story_page_parent_title"),
    )
    op.create_index("ix_story_page_parent_id", "story_page", ["parent_id"])


def downgrade() -> None:
    op.drop_index("ix_story_page_parent_id", table_name="story_page")
    op.drop_table("story_page")
