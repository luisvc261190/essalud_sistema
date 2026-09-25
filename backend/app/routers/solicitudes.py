from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.rbac import require_permission
from app.models.actos import Solicitud
from app.schemas.solicitudes import (
    ApelacionIn,
    ReconsideracionIn,
    ResolucionIn,
    SolicitudCreate,
    SolicitudOut,
    SolicitudUpdate,
)
from app.services.audit_service import registrar_auditoria
from app.services.solicitud_service import (
    actualizar_resolucion,
    create_solicitud,
    crear_apelacion,
    crear_reconsideracion,
    crear_resolucion,
    get_solicitud,
    solicitud_out,
    update_solicitud,
)

from app.routers.reportes import invalidar_cache_resumen

router = APIRouter(prefix="/solicitudes", tags=["solicitudes"])


def _get_o_404(db: Session, solicitud_id: int) -> Solicitud:
    solicitud = get_solicitud(db, solicitud_id)
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud de tramite no encontrada.")
    return solicitud


@router.post("", response_model=SolicitudOut, status_code=status.HTTP_201_CREATED)
def registrar_solicitud(
    payload: SolicitudCreate,
    request: Request,
    current_user=Depends(require_permission("CREAR_SOLICITUD")),
    db: Session = Depends(get_db),
):
    solicitud = create_solicitud(db, datos=payload, usuario_id=current_user.id)
    registrar_auditoria(
        db,
        user_id=current_user.id,
        accion="CREAR_SOLICITUD",
        entidad="solicitudes",
        registro_id=solicitud.id,
        informacion_nueva={
            "nit": solicitud.nit,
            "exp_sgd": solicitud.exp_sgd,
            "tipo_tramite": solicitud.tipo_tramite,
        },
        request=request,
    )
    db.commit()
    invalidar_cache_resumen()
    db.refresh(solicitud)
    return solicitud_out(solicitud)


@router.patch("/{solicitud_id}", response_model=SolicitudOut)
def editar_solicitud(
    solicitud_id: int,
    payload: SolicitudUpdate,
    request: Request,
    current_user=Depends(require_permission("EDITAR_SOLICITUD")),
    db: Session = Depends(get_db),
):
    solicitud = _get_o_404(db, solicitud_id)
    anterior = {
        "nit": solicitud.nit,
        "exp_sgd": solicitud.exp_sgd,
        "fecha_recepcion": solicitud.fecha_recepcion,
        "ruc": solicitud.ruc,
        "dni_ce": solicitud.dni_ce,
        "tipo_tramite": solicitud.tipo_tramite,
    }
    update_solicitud(db, solicitud, datos=payload)
    posterior = {
        "nit": solicitud.nit,
        "exp_sgd": solicitud.exp_sgd,
        "fecha_recepcion": solicitud.fecha_recepcion,
        "ruc": solicitud.ruc,
        "dni_ce": solicitud.dni_ce,
        "tipo_tramite": solicitud.tipo_tramite,
    }
    registrar_auditoria(
        db,
        user_id=current_user.id,
        accion="EDITAR_SOLICITUD",
        entidad="solicitudes",
        registro_id=solicitud.id,
        informacion_anterior=anterior,
        informacion_nueva=posterior,
        request=request,
    )
    db.commit()
    invalidar_cache_resumen()
    db.refresh(solicitud)
    return solicitud_out(solicitud)


@router.post("/{solicitud_id}/resolucion", response_model=SolicitudOut, status_code=status.HTTP_201_CREATED)
def registrar_resolucion(
    solicitud_id: int,
    payload: ResolucionIn,
    request: Request,
    current_user=Depends(require_permission("CREAR_RESOLUCION")),
    db: Session = Depends(get_db),
):
    solicitud = _get_o_404(db, solicitud_id)
    crear_resolucion(db, solicitud, payload=payload)
    registrar_auditoria(
        db,
        user_id=current_user.id,
        accion="CREAR_RESOLUCION",
        entidad="resoluciones",
        registro_id=solicitud.id,
        informacion_nueva={
            "numero_resolucion": solicitud.resolucion.numero_resolucion,
            "anio": solicitud.resolucion.anio,
        },
        request=request,
    )
    db.commit()
    invalidar_cache_resumen()
    db.refresh(solicitud)
    return solicitud_out(solicitud)


@router.patch("/{solicitud_id}/resolucion", response_model=SolicitudOut)
def editar_resolucion(
    solicitud_id: int,
    payload: ResolucionIn,
    request: Request,
    current_user=Depends(require_permission("EDITAR_RESOLUCION")),
    db: Session = Depends(get_db),
):
    solicitud = _get_o_404(db, solicitud_id)
    anterior = {
        "numero_resolucion": solicitud.resolucion.numero_resolucion,
        "anio": solicitud.resolucion.anio,
    } if solicitud.resolucion else None
    actualizar_resolucion(db, solicitud, payload=payload)
    registrar_auditoria(
        db,
        user_id=current_user.id,
        accion="EDITAR_RESOLUCION",
        entidad="resoluciones",
        registro_id=solicitud.id,
        informacion_anterior=anterior,
        informacion_nueva={
            "numero_resolucion": solicitud.resolucion.numero_resolucion,
            "anio": solicitud.resolucion.anio,
        },
        request=request,
    )
    db.commit()
    invalidar_cache_resumen()
    db.refresh(solicitud)
    return solicitud_out(solicitud)


@router.post("/{solicitud_id}/reconsideracion", response_model=SolicitudOut, status_code=status.HTTP_201_CREATED)
def registrar_reconsideracion(
    solicitud_id: int,
    payload: ReconsideracionIn,
    request: Request,
    current_user=Depends(require_permission("CREAR_RECONSIDERACION")),
    db: Session = Depends(get_db),
):
    solicitud = _get_o_404(db, solicitud_id)
    crear_reconsideracion(db, solicitud, payload=payload)
    registrar_auditoria(
        db,
        user_id=current_user.id,
        accion="CREAR_RECONSIDERACION",
        entidad="recursos_reconsideracion",
        registro_id=solicitud.id,
        informacion_nueva={
            "numero_resolucion": solicitud.reconsideracion.numero_resolucion,
            "anio": solicitud.reconsideracion.anio,
            "decision_resolucion": solicitud.reconsideracion.decision_resolucion,
        },
        request=request,
    )
    db.commit()
    invalidar_cache_resumen()
    db.refresh(solicitud)
    return solicitud_out(solicitud)


@router.post("/{solicitud_id}/apelacion", response_model=SolicitudOut, status_code=status.HTTP_201_CREATED)
def registrar_apelacion(
    solicitud_id: int,
    payload: ApelacionIn,
    request: Request,
    current_user=Depends(require_permission("CREAR_APELACION")),
    db: Session = Depends(get_db),
):
    solicitud = _get_o_404(db, solicitud_id)
    crear_apelacion(db, solicitud, payload=payload)
    registrar_auditoria(
        db,
        user_id=current_user.id,
        accion="CREAR_APELACION",
        entidad="recursos_apelacion",
        registro_id=solicitud.id,
        informacion_nueva={
            "numero_nota_derivacion": solicitud.apelacion.numero_nota_derivacion,
            "fecha_nota": solicitud.apelacion.fecha_nota,
        },
        request=request,
    )
    db.commit()
    invalidar_cache_resumen()
    db.refresh(solicitud)
    return solicitud_out(solicitud)