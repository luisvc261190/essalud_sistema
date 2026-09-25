from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: int
    usuario: str | None = None
    accion: str
    entidad: str
    registro_id: int | None = None
    informacion_anterior: dict | None = None
    informacion_nueva: dict | None = None
    ip: str | None = None
    created_at: datetime


class PaginatedAuditLogs(BaseModel):
    items: list[AuditLogOut]
    total: int
    page: int
    page_size: int