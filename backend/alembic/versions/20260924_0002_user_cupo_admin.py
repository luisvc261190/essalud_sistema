"""cupo de usuarios y creador por usuario

Revision ID: 20260924_0002
Revises: 20260924_0001
Create Date: 2026-09-24
"""

from alembic import op
import sqlalchemy as sa

revision = "20260924_0002"
down_revision = "20260924_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("max_usuarios", sa.Integer(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "usuario_creador_id",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "usuario_creador_id")
    op.drop_column("users", "max_usuarios")