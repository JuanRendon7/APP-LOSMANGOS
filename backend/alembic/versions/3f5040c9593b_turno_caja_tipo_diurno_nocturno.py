"""turno caja tipo diurno nocturno

Revision ID: 3f5040c9593b
Revises: bc5d121066f5
Create Date: 2026-08-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3f5040c9593b'
down_revision: Union[str, None] = 'bc5d121066f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'turno_caja',
        sa.Column(
            'tipo',
            sa.Enum('DIURNO', 'NOCTURNO', name='tipo_turno_caja', native_enum=False),
            server_default='DIURNO',
            nullable=False,
        ),
        schema='hotel',
    )


def downgrade() -> None:
    op.drop_column('turno_caja', 'tipo', schema='hotel')
