"""habitacion tipo

Revision ID: 993a29c8d2d4
Revises: c77c9a9464b8
Create Date: 2026-08-08 22:58:08.479495

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '993a29c8d2d4'
down_revision: Union[str, None] = 'c77c9a9464b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'habitacion',
        sa.Column('tipo', sa.String(length=50), nullable=True),
        schema='hotel',
    )
    op.execute("UPDATE hotel.habitacion SET tipo = 'Sencilla' WHERE numero LIKE '1%'")
    op.execute(
        "UPDATE hotel.habitacion SET tipo = 'Dos camas' WHERE numero IN ('201', '210')"
    )
    op.execute("UPDATE hotel.habitacion SET tipo = 'Pareja' WHERE tipo IS NULL")
    op.alter_column('habitacion', 'tipo', nullable=False, schema='hotel')


def downgrade() -> None:
    op.drop_column('habitacion', 'tipo', schema='hotel')
