from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.rbac import require_permission
from app.models.historico import Importacion
from app.schemas.importaciones import (
    ImportacionOut,
    ImportacionRegistroOut,
    PaginatedImportaciones,
)
from app.services import importacion_service
from app.services.audit_service import registrar_auditoria

from app.routers.reportes import invalidar_cache_resumen

router = APIRouter(prefix="/importaciones", tags=["importaciones"])


def _hashes_confirmados(db: Session, hashes: list[str | None]) -> set[str]:
    """Devuelve en una sola consulta los hashes ya confirmados (evita N+1)."""
    validos = [h for h in hashes if h]
    if not validos:
        return set()
    filas = (
        db.query(Importacion.hash_archivo)
        .filter(
            Importacion.hash_archivo.in_(validos),
            Importacion.modo == "CONFIRMADA",
        )
        .all()
    )
    return {h for (h,) in filas}


def _out(db: Session, imp: Importacion) -> ImportacionOut:
    return ImportacionOut(
        id=imp.id,
        nombre_archivo=imp.nombre_archivo,
        modo=imp.modo,
        estado=imp.estado,
        registros_leidos=imp.registros_leidos,
        registros_validos=imp.registros_validos,
        registros_con_errores=imp.registros_con_errores,
        hash_archivo=imp.hash_archivo,
        created_at=imp.created_at,
        reimportacion=imp.hash_archivo in _hashes_confirmados(db, [imp.hash_archivo]),
    )


@router.get("", response_model=PaginatedImportaciones)
def listar_importaciones(
    _=Depends(require_permission("GESTIONAR_IMPORTACIONES")),
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
):
    items, total = importacion_service.listar_importaciones(db, page=page, page_size=page_size)
    confirmados = _hashes_confirmados(db, [i.hash_archivo for i in items])
    return PaginatedImportaciones(
        items=[
            ImportacionOut(
                id=i.id,
                nombre_archivo=i.nombre_archivo,
                modo=i.modo,
                estado=i.estado,
                registros_leidos=i.registros_leidos,
                registros_validos=i.registros_validos,
                registros_con_errores=i.registros_con_errores,
                hash_archivo=i.hash_archivo,
                created_at=i.created_at,
                reimportacion=i.hash_archivo in confirmados,
            )
            for i in items
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=ImportacionOut, status_code=status.HTTP_201_CREATED)
def subir_archivo(
    archivo: UploadFile = File(...),
    request: Request = None,
    current_user=Depends(require_permission("GESTIONAR_IMPORTACIONES")),
    db: Session = Depends(get_db),
):
    if not (archivo.filename or "").lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos .xlsx.")
    data = archivo.file.read()
    imp = importacion_service.analizar_importacion(
        db, data=data, nombre_archivo=archivo.filename or "sin_nombre.xlsx", usuario_id=current_user.id
    )
    registrar_auditoria(
        db,
        user_id=current_user.id,
        accion="IMPORTACION",
        entidad="importaciones",
        registro_id=imp.id,
        informacion_nueva={
            "nombre_archivo": imp.nombre_archivo,
            "modo": imp.modo,
            "registros_leidos": imp.registros_leidos,
        },
        request=request,
    )
    db.commit()
    return _out(db, imp)


@router.get("/{importacion_id}", response_model=ImportacionOut)
def detalle_importacion(
    importacion_id: int,
    _=Depends(require_permission("GESTIONAR_IMPORTACIONES")),
    db: Session = Depends(get_db),
):
    imp = importacion_service.get_importacion(db, importacion_id)
    if not imp:
        raise HTTPException(status_code=404, detail="Importacion no encontrada.")
    return _out(db, imp)


@router.post("/{importacion_id}/confirmar", response_model=ImportacionOut)
def confirmar_importacion(
    importacion_id: int,
    request: Request = None,
    current_user=Depends(require_permission("GESTIONAR_IMPORTACIONES")),
    db: Session = Depends(get_db),
):
    imp = importacion_service.confirmar_importacion(db, importacion_id=importacion_id, usuario_id=current_user.id)
    registrar_auditoria(
        db,
        user_id=current_user.id,
        accion="IMPORTACION",
        entidad="importaciones",
        registro_id=imp.id,
        informacion_nueva={"estado": imp.estado},
        request=request,
    )
    db.commit()
    invalidar_cache_resumen()
    return _out(db, imp)


@router.post("/{importacion_id}/cancelar", response_model=ImportacionOut)
def cancelar_importacion(
    importacion_id: int,
    request: Request = None,
    current_user=Depends(require_permission("GESTIONAR_IMPORTACIONES")),
    db: Session = Depends(get_db),
):
    imp = importacion_service.cancelar_importacion(db, importacion_id=importacion_id)
    registrar_auditoria(
        db,
        user_id=current_user.id,
        accion="IMPORTACION",
        entidad="importaciones",
        registro_id=imp.id,
        informacion_nueva={"estado": imp.estado},
        request=request,
    )
    db.commit()
    return _out(db, imp)
