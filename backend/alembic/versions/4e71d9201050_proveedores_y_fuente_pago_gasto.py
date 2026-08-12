"""proveedores_y_fuente_pago_gasto

Revision ID: 4e71d9201050
Revises: 264ef859beef
Create Date: 2026-08-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4e71d9201050'
down_revision: Union[str, None] = '264ef859beef'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'proveedor',
        sa.Column('id_proveedor', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=150), nullable=False),
        sa.Column('nit_cedula', sa.String(length=30), nullable=True),
        sa.Column('contacto', sa.String(length=100), nullable=True),
        sa.Column('categoria', sa.String(length=100), nullable=True),
        sa.Column('notas', sa.String(length=255), nullable=True),
        sa.Column('activo', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('actualizado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id_proveedor'),
        schema='hotel',
    )
    op.create_index(
        op.f('ix_hotel_proveedor_nit_cedula'), 'proveedor', ['nit_cedula'],
        unique=True, schema='hotel',
    )

    op.add_column(
        'gasto',
        sa.Column('id_proveedor', sa.Integer(), nullable=True),
        schema='hotel',
    )
    op.add_column(
        'gasto',
        sa.Column(
            'fuente_pago', sa.String(length=20),
            server_default='CAJA', nullable=False,
        ),
        schema='hotel',
    )
    op.create_foreign_key(
        'gasto_id_proveedor_fkey', 'gasto', 'proveedor',
        ['id_proveedor'], ['id_proveedor'],
        source_schema='hotel', referent_schema='hotel',
    )


def downgrade() -> None:
    op.drop_constraint('gasto_id_proveedor_fkey', 'gasto', schema='hotel', type_='foreignkey')
    op.drop_column('gasto', 'fuente_pago', schema='hotel')
    op.drop_column('gasto', 'id_proveedor', schema='hotel')
    op.drop_index(op.f('ix_hotel_proveedor_nit_cedula'), table_name='proveedor', schema='hotel')
    op.drop_table('proveedor', schema='hotel')
