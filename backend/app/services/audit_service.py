from __future__ import annotations

from datetime import date, datetime
from typing import Any

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.auditoria import AuditLog


def _jsonable(value: Any) -> Any:
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_jsonable(v) for v in value]
    return value


def registrar_auditoria(
    db: Session,
    *,
    user_id: int | None,
    accion: str,
    entidad: str,
    registro_id: int | None = None,
    informacion_anterior: dict[str, Any] | None = None,
    informacion_nueva: dict[str, Any] | None = None,
    request: Request | None = None,
) -> None:
    log = AuditLog(
        user_id=user_id,
        accion=accion,
        entidad=entidad,
        registro_id=registro_id,
        informacion_anterior=_jsonable(informacion_anterior),
        informacion_nueva=_jsonable(informacion_nueva),
        ip=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )
    db.add(log)
    db.flush()