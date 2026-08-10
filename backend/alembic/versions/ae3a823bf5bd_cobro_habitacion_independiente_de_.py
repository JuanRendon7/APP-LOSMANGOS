"""cobro_habitacion_independiente_de_checkout

Revision ID: ae3a823bf5bd
Revises: db7b37f492db
Create Date: 2026-08-10 16:52:58.764389

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ae3a823bf5bd'
down_revision: Union[str, None] = 'db7b37f492db'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'reserva',
        sa.Column('pagada', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        schema='hotel',
    )
    op.add_column(
        'consumo_item',
        sa.Column('id_venta', sa.Integer(), nullable=True),
        schema='hotel',
    )
    op.create_foreign_key(
        'consumo_item_id_venta_fkey', 'consumo_item', 'venta',
        ['id_venta'], ['id_venta'],
        source_schema='hotel', referent_schema='hotel',
    )

    # Antes, cobrar la habitacion pasaba SIEMPRE por checkout, asi que toda
    # reserva con una venta de origen HABITACION ya fue cobrada -- y todo el
    # consumo que tenia hasta ahora quedo incluido en ese cobro.
    op.execute(
        """
        UPDATE hotel.reserva
        SET pagada = true
        WHERE id_reserva IN (
            SELECT id_reserva FROM hotel.venta WHERE origen = 'HABITACION'
        )
        """
    )
    op.execute(
        """
        UPDATE hotel.consumo_item ci
        SET id_venta = v.id_venta
        FROM hotel.venta v
        WHERE v.id_reserva = ci.id_reserva
          AND v.origen = 'HABITACION'
          AND ci.id_venta IS NULL
        """
    )


def downgrade() -> None:
    op.drop_constraint(
        'consumo_item_id_venta_fkey', 'consumo_item', schema='hotel', type_='foreignkey'
    )
    op.drop_column('consumo_item', 'id_venta', schema='hotel')
    op.drop_column('reserva', 'pagada', schema='hotel')
