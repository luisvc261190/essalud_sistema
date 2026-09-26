"""notificacion opcional en resolucion y reconsideracion

El cliente requiere poder grabar la primera resolucion y la reconsideracion
sin necesidad de llegar a la notificacion. Los campos de notificacion
(fecha, medio, DNI que recepciona y apellidos y nombres) pasan a ser
opcionales, pero si se informa alguno deben estar completos.

Revision ID: 20260925_0003
Revises: 20260924_0002
Create Date: 2026-09-25
"""

from alembic import op
import sqlalchemy as sa

revision = "20260925_0003"
down_revision = "20260924_0002"
branch_labels = None
depends_on = None

MAX_APELLIDOS_NOMBRES = 50
DNI_CE_MAX = 10

# Tipo real de cada columna: la fecha es Date y el resto String. Declararlo bien
# es necesario para que el dialecto genere el ALTER correcto.
COLUMNAS_NOTIFICACION = {
    "fecha_notificacion": sa.Date(),
    "medio_comunicacion": sa.String(length=15),
    "dni_recepciona": sa.String(length=DNI_CE_MAX),
    "apellidos_nombres": sa.String(length=MAX_APELLIDOS_NOMBRES),
}

TABLAS = ("resoluciones", "recursos_reconsideracion")


def upgrade() -> None:
    for tabla in TABLAS:
        for columna, tipo in COLUMNAS_NOTIFICACION.items():
            op.alter_column(
                tabla,
                columna,
                existing_type=tipo,
                nullable=True,
            )


def downgrade() -> None:
    """Vuelve a exigir la notificacion completa.

    No se inventan datos: si quedo alguna fila con la notificacion a medias se
    aborta, porque rellenar con cadenas vacias o con una fecha ficticia violaria
    los CHECK del modelo (medio_comunicacion solo admite CORREO, PRESENCIAL o
    VIRTUAL) y dejaria el historico con informacion falsa.
    """
    pendientes = []
    for tabla in TABLAS:
        for columna in COLUMNAS_NOTIFICACION:
            total = op.get_bind().execute(
                sa.text(
                    f"SELECT COUNT(*) FROM {tabla} WHERE {columna} IS NULL"
                )
            ).scalar()
            if total:
                pendientes.append(f"{tabla}.{columna}: {total}")

    if pendientes:
        raise RuntimeError(
            "No se puede revertir: hay notificaciones sin completar. "
            "Complete o elimine estos registros antes de hacer downgrade. "
            "Columnas afectadas -> " + ", ".join(pendientes)
        )

    for tabla in TABLAS:
        for columna, tipo in COLUMNAS_NOTIFICACION.items():
            op.alter_column(
                tabla,
                columna,
                existing_type=tipo,
                nullable=False,
            )
