from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.dependencies.rbac import require_permission
from app.models.actos import Solicitud
from app.schemas.solicitudes import PaginatedResumen, SolicitudOut
from app.services.solicitud_service import solicitud_out, solicitud_resumen_out

router = APIRouter(prefix="/consultas", tags=["consultas"])

CAMPOS_ORDEN = {"fecha_recepcion", "exp_sgd", "nit", "asegurado_titular", "dni_ce"}


@router.get("", response_model=PaginatedResumen)
def buscar_solicitudes(
    _=Depends(require_permission("CONSULTAR_SOLICITUDES")),
    nit: str | None = None,
    exp_sgd: str | None = None,
    dni_ce: str | None = None,
    asegurado_titular: str | None = None,
    page: int = 1,
    page_size: int = 20,
    orden_campo: str = "fecha_recepcion",
    orden_dir: str = "desc",
    db: Session = Depends(get_db),
):
    if page < 1:
        page = 1
    if page_size < 1 or page_size > 100:
        raise HTTPException(status_code=400, detail="page_size debe estar entre 1 y 100.")

    # Filtros comunes aplicados a conteo y a los registros de la página.
    filtros = db.query(Solicitud.id)
    if nit:
        filtros = filtros.filter(Solicitud.nit.ilike(f"%{nit.strip()}%"))
    if exp_sgd:
        filtros = filtros.filter(Solicitud.exp_sgd.ilike(f"%{exp_sgd.strip()}%"))
    if dni_ce:
        filtros = filtros.filter(Solicitud.dni_ce.ilike(f"%{dni_ce.strip()}%"))
    if asegurado_titular:
        filtros = filtros.filter(Solicitud.asegurado_titular.ilike(f"%{asegurado_titular.strip()}%"))

    total = filtros.with_entities(func.count(Solicitud.id)).scalar() or 0

    if orden_campo not in CAMPOS_ORDEN:
        orden_campo = "fecha_recepcion"
    columna = getattr(Solicitud, orden_campo)

    # Proyección ligera: solo se precargan las relaciones que pinta el listado.
    q = (
        db.query(Solicitud)
        .options(
            joinedload(Solicitud.datos_seguro),
            joinedload(Solicitud.datos_subsidio),
            joinedload(Solicitud.resolucion),
        )
        .filter(Solicitud.id.in_(filtros.subquery()))
    )
    items = (
        q.order_by(columna.desc() if orden_dir == "desc" else columna.asc(), Solicitud.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return PaginatedResumen(
        items=[solicitud_resumen_out(s) for s in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{solicitud_id}", response_model=SolicitudOut)
def detalle_solicitud(
    solicitud_id: int,
    _=Depends(require_permission("CONSULTAR_SOLICITUDES")),
    db: Session = Depends(get_db),
):
    solicitud = (
        db.query(Solicitud)
        .options(
            joinedload(Solicitud.datos_seguro),
            joinedload(Solicitud.datos_subsidio),
            joinedload(Solicitud.resolucion),
            joinedload(Solicitud.reconsideracion),
            joinedload(Solicitud.apelacion),
        )
        .filter(Solicitud.id == solicitud_id)
        .first()
    )
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud de tramite no encontrada.")
    return solicitud_out(solicitud)