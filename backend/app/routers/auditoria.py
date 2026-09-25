from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, contains_eager

from app.core.database import get_db
from app.dependencies.rbac import require_permission
from app.models.auditoria import AuditLog
from app.models.security import User
from app.schemas.auditoria import AuditLogOut, PaginatedAuditLogs

router = APIRouter(prefix="/auditoria", tags=["auditoria"])


@router.get("", response_model=PaginatedAuditLogs)
def listar_auditoria(
    _=Depends(require_permission("CONSULTAR_AUDITORIA")),
    usuario: str | None = None,
    accion: str | None = None,
    entidad: str | None = None,
    desde: date | None = None,
    hasta: date | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
):
    if page < 1:
        page = 1
    if page_size < 1 or page_size > 100:
        raise HTTPException(status_code=400, detail="page_size debe estar entre 1 y 100.")

    q = (
        db.query(AuditLog)
        .outerjoin(User, User.id == AuditLog.user_id)
        .options(contains_eager(AuditLog.user))
    )
    if usuario:
        q = q.filter(User.usuario.ilike(f"%{usuario.strip()}%"))
    if accion:
        q = q.filter(AuditLog.accion == accion.strip().upper())
    if entidad:
        q = q.filter(AuditLog.entidad == entidad.strip())
    if desde:
        q = q.filter(AuditLog.created_at >= desde)
    if hasta:
        q = q.filter(AuditLog.created_at < hasta + timedelta(days=1))

    total = q.with_entities(func.count(AuditLog.id)).scalar() or 0
    items = (
        q.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return PaginatedAuditLogs(
        items=[
            AuditLogOut(
                id=log.id,
                usuario=log.user.usuario if log.user else None,
                accion=log.accion,
                entidad=log.entidad,
                registro_id=log.registro_id,
                informacion_anterior=log.informacion_anterior,
                informacion_nueva=log.informacion_nueva,
                ip=log.ip,
                created_at=log.created_at,
            )
            for log in items
        ],
        total=total,
        page=page,
        page_size=page_size,
    )