from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.rbac import require_permission, require_superadmin
from app.models.auditoria import BackupLog
from app.schemas.backups import BackupLogOut, PaginatedBackups
from app.services import backup_service
from app.services.audit_service import registrar_auditoria

router = APIRouter(prefix="/backups", tags=["backups"])


def _out(log: BackupLog) -> BackupLogOut:
    return BackupLogOut(
        id=log.id,
        tipo=log.tipo,
        estado=log.estado,
        archivo_nombre=log.archivo_nombre,
        archivo_url=log.archivo_url,
        sha256=log.sha256,
        tamano_bytes=log.tamano_bytes,
        fecha_inicio=log.fecha_inicio,
        fecha_fin=log.fecha_fin,
        creado_por=log.creado_por,
    )


@router.get("", response_model=PaginatedBackups)
def listar_backups(
    _=Depends(require_permission("GESTIONAR_BACKUPS")),
    tipo: str | None = None,
    estado: str | None = None,
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
):
    items, total = backup_service.listar_backups(
        db, tipo=tipo, estado=estado, page=page, page_size=page_size
    )
    return PaginatedBackups(
        items=[_out(i) for i in items], total=total, page=page, page_size=page_size
    )


@router.get("/estado-herramientas")
def estado_herramientas(
    _=Depends(require_permission("GESTIONAR_BACKUPS")),
):
    return backup_service.estado_herramientas()


@router.post("", response_model=BackupLogOut, status_code=status.HTTP_201_CREATED)
def crear_backup(
    request: Request,
    current_user=Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    log = backup_service.crear_backup(
        db, usuario_id=current_user.id, tipo=backup_service.TIPO_MANUAL
    )
    registrar_auditoria(
        db,
        user_id=current_user.id,
        accion="CREAR_BACKUP",
        entidad="backup_logs",
        registro_id=log.id,
        informacion_nueva={
            "estado": log.estado,
            "archivo_nombre": log.archivo_nombre,
            "tamano_bytes": log.tamano_bytes,
        },
        request=request,
    )
    db.commit()
    return _out(log)


@router.get("/{backup_id}", response_model=BackupLogOut)
def detalle_backup(
    backup_id: int,
    _=Depends(require_permission("GESTIONAR_BACKUPS")),
    db: Session = Depends(get_db),
):
    log = backup_service.get_backup(db, backup_id)
    if not log:
        raise HTTPException(status_code=404, detail="Respaldo no encontrado.")
    return _out(log)


@router.delete("/{backup_id}", response_model=BackupLogOut)
def eliminar_backup(
    backup_id: int,
    request: Request,
    current_user=Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    try:
        log = backup_service.eliminar_backup(db, log_id=backup_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    respuesta = _out(log)
    registrar_auditoria(
        db,
        user_id=current_user.id,
        accion="ELIMINAR_BACKUP",
        entidad="backup_logs",
        registro_id=log.id,
        informacion_nueva={
            "estado": log.estado,
            "archivo_nombre": log.archivo_nombre,
        },
        request=request,
    )
    db.commit()
    return respuesta


@router.post("/{backup_id}/restaurar", response_model=BackupLogOut)
def restaurar_backup(
    backup_id: int,
    request: Request,
    current_user=Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    try:
        log = backup_service.restaurar_backup(db, log_id=backup_id, usuario_id=current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    registrar_auditoria(
        db,
        user_id=current_user.id,
        accion="RESTAURAR_BACKUP",
        entidad="backup_logs",
        registro_id=log.id,
        informacion_nueva={"estado": log.estado},
        request=request,
    )
    db.commit()
    return _out(log)
