"""categoria_restaurante_y_bar_en_pedidos

Revision ID: 64ee25951de0
Revises: d5a93deaa49c
Create Date: 2026-08-10 16:11:35.808210

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '64ee25951de0'
down_revision: Union[str, None] = 'd5a93deaa49c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'producto_restaurante',
        sa.Column(
            'categoria', sa.String(length=20),
            server_default='ALMUERZO', nullable=False,
        ),
        schema='hotel',
    )

    op.add_column(
        'pedido_item',
        sa.Column(
            'origen', sa.String(length=20),
            server_default='RESTAURANTE', nullable=False,
        ),
        schema='hotel',
    )
    op.add_column(
        'pedido_item',
        sa.Column('id_producto_bar', sa.Integer(), nullable=True),
        schema='hotel',
    )
    op.add_column(
        'pedido_item',
        sa.Column('id_producto_restaurante', sa.Integer(), nullable=True),
        schema='hotel',
    )
    op.execute(
        "UPDATE hotel.pedido_item SET id_producto_restaurante = id_producto"
    )
    op.drop_constraint(
        'pedido_item_id_producto_fkey', 'pedido_item', schema='hotel', type_='foreignkey'
    )
    op.drop_column('pedido_item', 'id_producto', schema='hotel')
    op.create_foreign_key(
        'pedido_item_id_producto_bar_fkey', 'pedido_item', 'producto_bar',
        ['id_producto_bar'], ['id_producto'],
        source_schema='hotel', referent_schema='hotel',
    )
    op.create_foreign_key(
        'pedido_item_id_producto_restaurante_fkey', 'pedido_item', 'producto_restaurante',
        ['id_producto_restaurante'], ['id_producto'],
        source_schema='hotel', referent_schema='hotel',
    )


def downgrade() -> None:
    op.drop_constraint(
        'pedido_item_id_producto_restaurante_fkey', 'pedido_item',
        schema='hotel', type_='foreignkey',
    )
    op.drop_constraint(
        'pedido_item_id_producto_bar_fkey', 'pedido_item',
        schema='hotel', type_='foreignkey',
    )
    op.add_column(
        'pedido_item', sa.Column('id_producto', sa.Integer(), nullable=True), schema='hotel',
    )
    op.execute(
        "UPDATE hotel.pedido_item SET id_producto = id_producto_restaurante"
    )
    op.alter_column('pedido_item', 'id_producto', nullable=False, schema='hotel')
    op.create_foreign_key(
        'pedido_item_id_producto_fkey', 'pedido_item', 'producto_restaurante',
        ['id_producto'], ['id_producto'],
        source_schema='hotel', referent_schema='hotel',
    )
    op.drop_column('pedido_item', 'id_producto_restaurante', schema='hotel')
    op.drop_column('pedido_item', 'id_producto_bar', schema='hotel')
    op.drop_column('pedido_item', 'origen', schema='hotel')
    op.drop_column('producto_restaurante', 'categoria', schema='hotel')
