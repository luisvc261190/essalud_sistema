"""Índices de rendimiento aplicados de forma idempotente al iniciar la app.

Los filtros de búsqueda del módulo de Actos Administrativos usan coincidencias
parciales (ILIKE '%...%'), por lo que los índices btree tradicionales no bastan.
Se crea índices GIN con la extensión pg_trgm sobre las columnas de búsqueda y un
índice compuesto para el ordenamiento por defecto (fecha_recepcion DESC, id).

La empresa requiere: búsqueda parcial por NIT, EXP SGD, DNI/C.E. y asegurado
titular sin alterar la funcionalidad. Estos índices solo aceleran esas consultas.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

_SENTENCIAS: list[str] = [
    "CREATE EXTENSION IF NOT EXISTS pg_trgm",
    # El buscador compara el NIT ya normalizado a digitos
    # (replace(replace(nit,'-',''),'NIT','')). Un indice sobre la columna `nit`
    # no sirve para eso, asi que se indexa la EXPRESION EXACTA que usa la
    # consulta: asi el indice puede usarse en vez de recorrer la tabla entera.
    "CREATE INDEX IF NOT EXISTS ix_solicitudes_nit_digitos_trgm "
    "ON solicitudes USING gin "
    "((replace(replace(nit, '-', ''), 'NIT', '')) gin_trgm_ops)",
    "CREATE INDEX IF NOT EXISTS ix_solicitudes_nit_trgm "
    "ON solicitudes USING gin (nit gin_trgm_ops)",
    "CREATE INDEX IF NOT EXISTS ix_solicitudes_exp_sgd_trgm "
    "ON solicitudes USING gin (exp_sgd gin_trgm_ops)",
    "CREATE INDEX IF NOT EXISTS ix_solicitudes_dni_ce_trgm "
    "ON solicitudes USING gin (dni_ce gin_trgm_ops)",
    "CREATE INDEX IF NOT EXISTS ix_solicitudes_asegurado_trgm "
    "ON solicitudes USING gin (asegurado_titular gin_trgm_ops)",
    "CREATE INDEX IF NOT EXISTS ix_solicitudes_fecha_id "
    "ON solicitudes (fecha_recepcion DESC, id)",
    # Búsquedas parciales en usuarios (módulo de gestión de usuarios).
    "CREATE INDEX IF NOT EXISTS ix_users_usuario_trgm "
    "ON users USING gin (usuario gin_trgm_ops)",
    "CREATE INDEX IF NOT EXISTS ix_users_nombres_trgm "
    "ON users USING gin (nombres gin_trgm_ops)",
    "CREATE INDEX IF NOT EXISTS ix_users_apellidos_trgm "
    "ON users USING gin (apellidos gin_trgm_ops)",
    "CREATE INDEX IF NOT EXISTS ix_users_usuario_creador_id "
    "ON users (usuario_creador_id)",
    # Filtros de la auditoría (usuario, acción y entidad).
    "CREATE INDEX IF NOT EXISTS ix_audit_logs_user_id "
    "ON audit_logs (user_id)",
    "CREATE INDEX IF NOT EXISTS ix_audit_logs_accion "
    "ON audit_logs (accion)",
    "CREATE INDEX IF NOT EXISTS ix_audit_logs_entidad "
    "ON audit_logs (entidad)",
    # Detección de reimportaciones y detalle de importación.
    "CREATE INDEX IF NOT EXISTS ix_importaciones_hash_archivo "
    "ON importaciones (hash_archivo)",
    "CREATE INDEX IF NOT EXISTS ix_importacion_registros_importacion_id "
    "ON importacion_registros (importacion_id)",
    # FK de solicitudes (borrado/auditoría de usuarios).
    "CREATE INDEX IF NOT EXISTS ix_solicitudes_created_by "
    "ON solicitudes (created_by)",
    "CREATE INDEX IF NOT EXISTS ix_solicitudes_updated_by "
    "ON solicitudes (updated_by)",
]


def asegurar_indices() -> None:
    """Ejecuta las sentencias DDL de forma aislada (no rompe el arranque)."""
    from sqlalchemy import text

    from app.core.database import SessionLocal

    db = SessionLocal()
    try:
        for sentencia in _SENTENCIAS:
            try:
                db.execute(text(sentencia))
                db.commit()
            except Exception as exc:  # noqa: BLE001 - indice opcional
                db.rollback()
                logger.warning(
                    "No se pudo crear índice de rendimiento (%s): %s",
                    sentencia.split(" ")[-1],
                    exc,
                )
    finally:
        db.close()