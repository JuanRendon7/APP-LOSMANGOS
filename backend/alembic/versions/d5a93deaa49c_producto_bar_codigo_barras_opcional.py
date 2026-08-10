"""producto_bar_codigo_barras_opcional

Revision ID: d5a93deaa49c
Revises: 3cbe1ca7c9ec
Create Date: 2026-08-10 15:52:59.414471

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd5a93deaa49c'
down_revision: Union[str, None] = '3cbe1ca7c9ec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'producto_bar', 'codigo_barras', existing_type=sa.String(length=50),
        nullable=True, schema='hotel',
    )


def downgrade() -> None:
    op.alter_column(
        'producto_bar', 'codigo_barras', existing_type=sa.String(length=50),
        nullable=False, schema='hotel',
    )
