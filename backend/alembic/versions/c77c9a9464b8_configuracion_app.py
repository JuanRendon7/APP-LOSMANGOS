"""configuracion_app

Revision ID: c77c9a9464b8
Revises: 99ca0d168565
Create Date: 2026-08-08 20:57:52.530717

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c77c9a9464b8'
down_revision: Union[str, None] = '99ca0d168565'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'configuracion_app',
        sa.Column('clave', sa.String(length=50), nullable=False),
        sa.Column('valor', sa.String(length=100), nullable=False),
        sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('actualizado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('clave'),
        schema='hotel',
    )


def downgrade() -> None:
    op.drop_table('configuracion_app', schema='hotel')
