# -*- coding: utf-8 -*-
from __future__ import annotations

import threading
import time

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.rbac import require_permission
from app.models.actos import (
    DatosSeguro,
    DatosSubsidio,
    RecursoApelacion,
    RecursoReconsideracion,
    Resolucion,
    Solicitud,
)
from app.schemas.reportes import ConteoBase, ResumenDashboardOut

router = APIRouter(prefix="/reportes", tags=["reportes"])

# Caché en memoria del resumen del dashboard (TTL corto: 60s).
# El dashboard ejecuta ~8 agregados; cachearlo evita consultas repetidas.
_RESUMEN_TTL_SEG = 60
_resumen_cache: dict = {"data": None, "ts": 0.0}
_resumen_lock = threading.Lock()


def _conteos(db: Session, col) -> list[ConteoBase]:
    filas = db.query(col, func.count(Solicitud.id)).group_by(col).order_by(col).all()
    return [ConteoBase(grupo=str(g), total=t) for g, t in filas]


def _riesgos(db: Session) -> list[ConteoBase]:
    """Riesgos agregados desde las dos ramas (SEGURO + SUBSIDIO)."""
    por_seguro = (
        db.query(func.concat("SEGURO - ", DatosSeguro.riesgo).label("grupo"), func.count(DatosSeguro.id))
        .group_by(DatosSeguro.riesgo)
        .order_by(DatosSeguro.riesgo)
        .all()
    )
    por_subsidio = (
        db.query(func.concat("SUBSIDIO - ", DatosSubsidio.riesgo).label("grupo"), func.count(DatosSubsidio.id))
        .group_by(DatosSubsidio.riesgo)
        .order_by(DatosSubsidio.riesgo)
        .all()
    )
    return [ConteoBase(grupo=str(g), total=t) for g, t in por_seguro + por_subsidio]


def invalidar_cache_resumen() -> None:
    """Invalida el resumen cacheado (llamado tras crear/editar solicitudes o importar)."""
    with _resumen_lock:
        _resumen_cache["data"] = None
        _resumen_cache["ts"] = 0.0


@router.get("/resumen", response_model=ResumenDashboardOut)
def resumen_dashboard(
    _=Depends(require_permission("EXPORTAR_REPORTES")),
    db: Session = Depends(get_db),
):
    ahora = time.monotonic()
    with _resumen_lock:
        if _resumen_cache["data"] is not None and ahora - _resumen_cache["ts"] < _RESUMEN_TTL_SEG:
            return _resumen_cache["data"]

    datos = ResumenDashboardOut(
        total_solicitudes=db.query(func.count(Solicitud.id)).scalar() or 0,
        por_tipo_tramite=_conteos(db, Solicitud.tipo_tramite),
        por_riesgo=_riesgos(db),
        total_resoluciones=db.query(func.count(Resolucion.id)).scalar() or 0,
        total_reconsideraciones=db.query(func.count(RecursoReconsideracion.id)).scalar() or 0,
        total_apelaciones=db.query(func.count(RecursoApelacion.id)).scalar() or 0,
        por_anio=_conteos(db, func.extract("year", Solicitud.fecha_recepcion)),
    )

    with _resumen_lock:
        _resumen_cache["data"] = datos
        _resumen_cache["ts"] = ahora
    return datos