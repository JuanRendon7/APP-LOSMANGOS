"""consumo_item enviado_cocina_en

Revision ID: f717c3e84b15
Revises: 3f5040c9593b
Create Date: 2026-08-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f717c3e84b15'
down_revision: Union[str, None] = '3f5040c9593b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'consumo_item',
        sa.Column('enviado_cocina_en', sa.DateTime(timezone=True), nullable=True),
        schema='hotel',
    )


def downgrade() -> None:
    op.drop_column('consumo_item', 'enviado_cocina_en', schema='hotel')
