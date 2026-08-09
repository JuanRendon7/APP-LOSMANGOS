"""producto bar umbral stock bajo

Revision ID: 3cbe1ca7c9ec
Revises: 993a29c8d2d4
Create Date: 2026-08-08 23:35:39.392939

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3cbe1ca7c9ec'
down_revision: Union[str, None] = '993a29c8d2d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'producto_bar',
        sa.Column(
            'umbral_stock_bajo',
            sa.Integer(),
            server_default=sa.text('5'),
            nullable=False,
        ),
        schema='hotel',
    )


def downgrade() -> None:
    op.drop_column('producto_bar', 'umbral_stock_bajo', schema='hotel')
