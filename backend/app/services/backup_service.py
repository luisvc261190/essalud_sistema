"""Servicio de respaldos (FASE 14).

Estrategia:
- Prioridad 1: `pg_dump`/`pg_restore` si estan disponibles en el servidor ->
  dump en formato custom de PostgreSQL (`.dump`) con SHA-256.
- Prioridad 2 (fallback, sin depender de herramientas del SO): volcado logico
  por **COPY binario** vía SQLAlchemy a un archivo `.backup` (zip con una
  copia por tabla + manifest.json). Permite respaldar/restaurar la base
  remota (ej. Neon) aunque `pg_dump` no este instalado.
- Solo se marca FALLIDO si ambos motores fallan.

Politica de retencion: se conservan los archivos de los ultimos
BACKUP_RETENTION_DAYS dias (siempre al menos el mas reciente).
"""
from __future__ import annotations

import hashlib
import io
import json
import os
import shutil
import subprocess
import time
import zipfile
from datetime import datetime

from sqlalchemy import MetaData, Table, inspect as sa_inspect
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_engine
from app.models.auditoria import BackupLog

TIPO_MANUAL = "MANUAL"
TIPO_PERIODICO = "PERIODICO"
ESTADO_EXITOSO = "EXITOSO"
ESTADO_FALLIDO = "FALLIDO"

_EXT_PGDUMP = ".dump"
_EXT_LOGICO = ".backup"

# Columnas/pk "blandas" usadas para ordenar de forma determinista la exportacion.
_PK_BANDERA = "id"


def _parse_url(database_url: str) -> dict:
    from sqlalchemy.engine import make_url

    url = make_url(database_url)
    return {
        "host": url.host,
        "port": url.port or 5432,
        "user": url.username,
        "password": url.password,
        "dbname": url.database,
    }


def _cmd_disponible(nombre: str) -> str | None:
    return shutil.which(nombre)


def _sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _garantizar_dir() -> str:
    dir_path = os.path.abspath(settings.BACKUP_DIR)
    os.makedirs(dir_path, exist_ok=True)
    return dir_path


def _aplicar_retencion(dir_path: str, days: int) -> None:
    limite = time.time() - days * 86400
    archivos = sorted(
        (
            f
            for f in os.listdir(dir_path)
            if f.endswith(_EXT_PGDUMP) or f.endswith(_EXT_LOGICO)
        ),
        key=lambda f: os.path.getmtime(os.path.join(dir_path, f)),
    )
    if not archivos:
        return
    mas_reciente = archivos[-1]
    for f in archivos[:-1]:
        path = os.path.join(dir_path, f)
        if os.path.getmtime(path) < limite and f != mas_reciente:
            try:
                os.remove(path)
            except OSError:
                pass


def _marcar_exitoso(log: BackupLog, ruta: str, nombre: str) -> None:
    log.estado = ESTADO_EXITOSO
    log.archivo_nombre = nombre
    log.archivo_url = ruta
    log.sha256 = _sha256(ruta)
    log.tamano_bytes = os.path.getsize(ruta)


# -------------------------------------------------------------------------
# Motores de volcado
# -------------------------------------------------------------------------
def _volcar_pg_dump(dir_path: str) -> tuple[str, str]:
    """Volcado custom de PostgreSQL. Devuelve (ruta, nombre)."""
    params = _parse_url(settings.DATABASE_URL)
    if not all([params["host"], params["user"], params["password"], params["dbname"]]):
        raise RuntimeError("DATABASE_URL incompleta para pg_dump.")
    nombre = f"backup_ESSALUD_{datetime.now().strftime('%Y%m%d_%H%M%S')}{_EXT_PGDUMP}"
    ruta = os.path.join(dir_path, nombre)
    env = os.environ.copy()
    env["PGPASSWORD"] = params["password"]
    cmd = [
        "pg_dump",
        "--no-owner",
        "--format=custom",
        "-h", str(params["host"]),
        "-p", str(params["port"]),
        "-U", params["user"],
        "-d", params["dbname"],
        "-f", ruta,
    ]
    resultado = subprocess.run(cmd, capture_output=True, text=True, env=env, timeout=600)
    if resultado.returncode != 0:
        raise RuntimeError(resultado.stderr.strip() or "pg_dump fallo sin detalle.")
    return ruta, nombre


def _volcar_logico(dir_path: str) -> tuple[str, str]:
    """Volcado todo-tablas por COPY binario a un .backup (zip)."""
    nombre = f"backup_ESSALUD_{datetime.now().strftime('%Y%m%d_%H%M%S')}{_EXT_LOGICO}"
    ruta = os.path.join(dir_path, nombre)
    with zipfile.ZipFile(ruta, "w", zipfile.ZIP_DEFLATED) as zf:
        with get_engine().begin() as conn:
            insp = sa_inspect(conn)
            tablas = insp.get_table_names()
            conexion = conn.connection

            def _columnas(tabla: str) -> list[str]:
                return [c["name"] for c in insp.get_columns(tabla)]

            for tabla in tablas:
                orden = " ORDER BY id" if _PK_BANDERA in _columnas(tabla) else ""
                sql = f'COPY (SELECT * FROM "{tabla}"{orden}) TO STDOUT WITH (FORMAT binary)'
                buf = io.BytesIO()
                with conexion.cursor() as cur:
                    cur.copy_expert(sql, buf)
                zf.writestr(f"{tabla}.copy", buf.getvalue())
        manifest = {"version": 1, "motor": "copy-binario", "tablas": tablas}
        zf.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False))
    return ruta, nombre


# -------------------------------------------------------------------------
# Motores de restauracion
# -------------------------------------------------------------------------
def _restaurar_pg_dump(original: BackupLog, db: Session) -> None:
    pg_restore = _cmd_disponible("pg_restore")
    if not pg_restore:
        raise RuntimeError("pg_restore no disponible.")
    params = _parse_url(settings.DATABASE_URL)
    env = os.environ.copy()
    env["PGPASSWORD"] = params["password"]
    cmd = [
        pg_restore,
        "--no-owner",
        "--verbose",
        "-h", str(params["host"]),
        "-p", str(params["port"]),
        "-U", params["user"],
        "-d", params["dbname"],
        original.archivo_url,
    ]
    resultado = subprocess.run(cmd, capture_output=True, text=True, env=env, timeout=1200)
    if resultado.returncode != 0:
        raise RuntimeError(resultado.stderr.strip() or "pg_restore fallo sin detalle.")


def _restaurar_logico(ruta: str) -> None:
    """Restaura un .backup: TRUNCATE de las tablas del manifiesto y COPY binario."""
    with zipfile.ZipFile(ruta, "r") as zf:
        manifest = json.loads(zf.read("manifest.json"))
        tablas = manifest.get("tablas", [])
        if not tablas:
            raise RuntimeError("Manifiesto de respaldo sin tablas.")

        with get_engine().begin() as conn:
            insp = sa_inspect(conn)
            conexion = conn.connection
            # Orden seguro por FK (padres primero) basado en el esquema real.
            metadata = MetaData()
            for tabla in tablas:
                Table(tabla, metadata, autoload_with=conn)
            orden = [t.name for t in metadata.sorted_tables if t.name in set(tablas)]

            if set(orden) != set(tablas):
                raise RuntimeError("El respaldo no cubre todas las tablas actuales.")

            lista = ", ".join(f'"{t}"' for t in orden)
            with conexion.cursor() as cur:
                cur.execute(f"TRUNCATE TABLE {lista} RESTART IDENTITY CASCADE")
                for tabla in orden:
                    data = zf.read(f"{tabla}.copy")
                    cur.copy_expert(
                        f'COPY "{tabla}" FROM STDIN WITH (FORMAT binary)',
                        io.BytesIO(data),
                    )


# -------------------------------------------------------------------------
# API de alto nivel
# -------------------------------------------------------------------------
def crear_backup(db: Session, *, usuario_id: int | None, tipo: str = TIPO_MANUAL) -> BackupLog:
    """Ejecuta pg_dump (si existe) y registra el resultado, respetando retencion."""
    inicio = datetime.utcnow()
    log = BackupLog(
        tipo=tipo,
        estado=ESTADO_FALLIDO,
        fecha_inicio=inicio,
        creado_por=usuario_id,
    )
    db.add(log)
    db.flush()

    dir_path = _garantizar_dir()
    vuelco_ok = False
    if _cmd_disponible("pg_dump"):
        try:
            ruta, nombre = _volcar_pg_dump(dir_path)
            _marcar_exitoso(log, ruta, nombre)
            vuelco_ok = True
        except Exception:  # noqa: BLE001 - se intenta el motor alternativo
            db.flush()
    if not vuelco_ok:
        try:
            ruta, nombre = _volcar_logico(dir_path)
            _marcar_exitoso(log, ruta, nombre)
        except Exception:  # noqa: BLE001 - respaldo FALLIDO
            log.estado = ESTADO_FALLIDO
    if log.estado == ESTADO_EXITOSO:
        _aplicar_retencion(dir_path, settings.BACKUP_RETENTION_DAYS)
    log.fecha_fin = datetime.utcnow()
    db.flush()
    return log


def restaurar_backup(db: Session, *, log_id: int, usuario_id: int | None) -> BackupLog:
    """Restaura un respaldo EXITOSO usando el mismo motor que lo genero."""
    original = db.get(BackupLog, log_id)
    if (
        not original
        or original.estado != ESTADO_EXITOSO
        or not original.archivo_url
        or not os.path.exists(original.archivo_url)
    ):
        raise ValueError("Respaldo EXITOSO no encontrado para restaurar.")

    log = BackupLog(
        tipo=TIPO_MANUAL,
        estado=ESTADO_FALLIDO,
        fecha_inicio=datetime.utcnow(),
        archivo_nombre=original.archivo_nombre,
        archivo_url=original.archivo_url,
        sha256=original.sha256,
        tamano_bytes=original.tamano_bytes,
        creado_por=usuario_id,
    )
    db.add(log)
    db.flush()

    try:
        if original.archivo_url and original.archivo_url.endswith(_EXT_LOGICO):
            _restaurar_logico(original.archivo_url)
        else:
            _restaurar_pg_dump(original, db)
        log.estado = ESTADO_EXITOSO
    except Exception:  # noqa: BLE001 - se registra el fallo
        log.estado = ESTADO_FALLIDO
    finally:
        log.fecha_fin = datetime.utcnow()
        db.flush()
    return log


def listar_backups(db: Session, *, tipo: str | None = None, estado: str | None = None, page: int = 1, page_size: int = 50):
    q = db.query(BackupLog)
    if tipo:
        q = q.filter(BackupLog.tipo == tipo)
    if estado:
        q = q.filter(BackupLog.estado == estado)
    total = q.count()
    items = q.order_by(BackupLog.fecha_inicio.desc().nullslast(), BackupLog.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_backup(db: Session, log_id: int) -> BackupLog | None:
    return db.get(BackupLog, log_id)


def eliminar_backup(db: Session, *, log_id: int) -> BackupLog:
    """Elimina un respaldo: baja el archivo fisico (si existe) y su registro."""
    log = db.get(BackupLog, log_id)
    if not log:
        raise ValueError("Respaldo no encontrado.")
    if log.archivo_url and os.path.exists(log.archivo_url):
        try:
            os.remove(log.archivo_url)
        except OSError:
            pass
    db.delete(log)
    db.flush()
    return log


def estado_herramientas() -> dict:
    return {
        "pg_dump": bool(_cmd_disponible("pg_dump")),
        "pg_restore": bool(_cmd_disponible("pg_restore")),
        "motor_backup": "pg_dump" if _cmd_disponible("pg_dump") else "COPY binario (SQLAlchemy)",
        "backup_dir": os.path.abspath(settings.BACKUP_DIR),
    }