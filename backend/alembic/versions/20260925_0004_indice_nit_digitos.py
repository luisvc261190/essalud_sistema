"""indice GIN de trigramas sobre el NIT normalizado

El buscador compara el NIT reducido a digitos
(replace(replace(nit, '-', ''), 'NIT', '')) para tolerar que se busque con o
sin guiones y con el ultimo grupo. Un indice sobre la columna `nit` no sirve
para esa expresion, asi que PostgreSQL acaba recorriendo la tabla entera en
cada pulsacion del buscador en tiempo real.

Este indice cubre exactamente la expresion que genera la consulta, de modo que
pueda usarse en lugar del recorrido secuencial. Es idempotente y no altera
ningun dato ni el resultado de las consultas: solo acelera las que ya usan
coincidencia parcial.

Revision ID: 20260925_0004
Revises: 20260925_0003
Create Date: 2026-09-25
"""

from alembic import op

revision = "20260925_0004"
down_revision = "20260925_0003"
branch_labels = None
depends_on = None

INDICE = "ix_solicitudes_nit_digitos_trgm"
EXPRESION = "((replace(replace(nit, '-', ''), 'NIT', '')) gin_trgm_ops)"


def upgrade() -> None:
    # La extension es la que aporta los operadores de trigramas.
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute(f"CREATE INDEX IF NOT EXISTS {INDICE} ON solicitudes USING gin {EXPRESION}")


def downgrade() -> None:
    op.execute(f"DROP INDEX IF EXISTS {INDICE}")
