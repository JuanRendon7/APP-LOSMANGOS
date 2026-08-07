"""auth_usuario_cedula_celular

Revision ID: 99ca0d168565
Revises: aec004432553
Create Date: 2026-08-07 15:59:55.744372

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '99ca0d168565'
down_revision: Union[str, None] = 'aec004432553'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'usuario', sa.Column('cedula', sa.String(length=20), nullable=True), schema='hotel'
    )
    op.add_column(
        'usuario', sa.Column('celular', sa.String(length=20), nullable=True), schema='hotel'
    )
    op.execute(
        "UPDATE hotel.usuario SET cedula = 'PENDIENTE-' || id_usuario::text, "
        "celular = '3000000000' WHERE cedula IS NULL"
    )
    op.alter_column('usuario', 'cedula', nullable=False, schema='hotel')
    op.alter_column('usuario', 'celular', nullable=False, schema='hotel')
    op.create_unique_constraint('uq_usuario_cedula', 'usuario', ['cedula'], schema='hotel')


def downgrade() -> None:
    op.drop_constraint('uq_usuario_cedula', 'usuario', schema='hotel', type_='unique')
    op.drop_column('usuario', 'celular', schema='hotel')
    op.drop_column('usuario', 'cedula', schema='hotel')
