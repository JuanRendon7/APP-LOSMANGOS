"""liquidacion_empleado

Revision ID: db7b37f492db
Revises: 64ee25951de0
Create Date: 2026-08-10 16:40:38.805297

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'db7b37f492db'
down_revision: Union[str, None] = '64ee25951de0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'liquidacion_empleado',
        sa.Column('id_liquidacion', sa.Integer(), nullable=False),
        sa.Column('id_usuario', sa.Integer(), nullable=False),
        sa.Column('periodo', sa.String(length=7), nullable=False),
        sa.Column('monto', sa.Integer(), nullable=False),
        sa.Column('concepto', sa.String(length=255), nullable=True),
        sa.Column('fecha_pago', sa.Date(), nullable=False),
        sa.Column('creado_por', sa.Integer(), nullable=True),
        sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('actualizado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['id_usuario'], ['hotel.usuario.id_usuario']),
        sa.ForeignKeyConstraint(['creado_por'], ['hotel.usuario.id_usuario']),
        sa.PrimaryKeyConstraint('id_liquidacion'),
        schema='hotel',
    )
    op.create_index(
        op.f('ix_hotel_liquidacion_empleado_id_usuario'),
        'liquidacion_empleado', ['id_usuario'], schema='hotel',
    )
    op.create_index(
        op.f('ix_hotel_liquidacion_empleado_periodo'),
        'liquidacion_empleado', ['periodo'], schema='hotel',
    )


def downgrade() -> None:
    op.drop_table('liquidacion_empleado', schema='hotel')
