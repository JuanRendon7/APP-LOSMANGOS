"""liquidacion_empleado_nombre_libre

Revision ID: bc5d121066f5
Revises: ae3a823bf5bd
Create Date: 2026-08-10 17:54:54.920706

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bc5d121066f5'
down_revision: Union[str, None] = 'ae3a823bf5bd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'liquidacion_empleado',
        sa.Column('nombre_empleado', sa.String(length=150), nullable=True),
        schema='hotel',
    )
    op.execute("""
        UPDATE hotel.liquidacion_empleado le
        SET nombre_empleado = u.nombre
        FROM hotel.usuario u
        WHERE le.id_usuario = u.id_usuario
    """)
    op.alter_column(
        'liquidacion_empleado', 'nombre_empleado', nullable=False, schema='hotel'
    )
    op.drop_index(
        op.f('ix_hotel_liquidacion_empleado_id_usuario'),
        table_name='liquidacion_empleado', schema='hotel',
    )
    op.drop_constraint(
        'liquidacion_empleado_id_usuario_fkey', 'liquidacion_empleado',
        schema='hotel', type_='foreignkey',
    )
    op.drop_column('liquidacion_empleado', 'id_usuario', schema='hotel')
    op.alter_column(
        'liquidacion_empleado', 'periodo', type_=sa.String(length=100), schema='hotel'
    )


def downgrade() -> None:
    op.alter_column(
        'liquidacion_empleado', 'periodo', type_=sa.String(length=7), schema='hotel'
    )
    op.add_column(
        'liquidacion_empleado',
        sa.Column('id_usuario', sa.Integer(), nullable=True),
        schema='hotel',
    )
    op.create_foreign_key(
        'liquidacion_empleado_id_usuario_fkey', 'liquidacion_empleado', 'usuario',
        ['id_usuario'], ['id_usuario'], source_schema='hotel', referent_schema='hotel',
    )
    op.create_index(
        op.f('ix_hotel_liquidacion_empleado_id_usuario'),
        'liquidacion_empleado', ['id_usuario'], schema='hotel',
    )
    op.drop_column('liquidacion_empleado', 'nombre_empleado', schema='hotel')
