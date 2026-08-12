"""consumo_item nota

Revision ID: 264ef859beef
Revises: f717c3e84b15
Create Date: 2026-08-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '264ef859beef'
down_revision: Union[str, None] = 'f717c3e84b15'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'consumo_item',
        sa.Column('nota', sa.String(length=255), nullable=True),
        schema='hotel',
    )


def downgrade() -> None:
    op.drop_column('consumo_item', 'nota', schema='hotel')
