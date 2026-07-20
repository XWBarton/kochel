"""composer image focal point

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0003"
down_revision: Union[str, Sequence[str], None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "composers", sa.Column("image_focal_x", sa.Float(), nullable=False, server_default="0.5")
    )
    op.add_column(
        "composers", sa.Column("image_focal_y", sa.Float(), nullable=False, server_default="0.5")
    )


def downgrade() -> None:
    op.drop_column("composers", "image_focal_y")
    op.drop_column("composers", "image_focal_x")
