"""map legacy acquisition method text to dictionary references

Revision ID: c7d8e9f0a1b2
Revises: b5c6d7e8f9a0
"""

import sqlalchemy as sa
from alembic import op

revision = "c7d8e9f0a1b2"
down_revision = "b5c6d7e8f9a0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            """
            UPDATE coin
            SET
                acquisition_method_id = (
                    SELECT acquisition_method.id
                    FROM acquisition_method
                    WHERE acquisition_method.name = coin.acquisition_method_text
                ),
                acquisition_method_text = NULL
            WHERE acquisition_method_id IS NULL
              AND acquisition_method_text IS NOT NULL
              AND EXISTS (
                  SELECT 1
                  FROM acquisition_method
                  WHERE acquisition_method.name = coin.acquisition_method_text
              )
            """
        )
    )


def downgrade() -> None:
    # This is a one-way data migration. Reconstructing the original free text
    # would be unsafe because dictionary names may have changed after upgrade.
    pass
