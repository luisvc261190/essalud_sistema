from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class BackupLogOut(BaseModel):
    id: int
    tipo: str
    estado: str
    archivo_nombre: str | None = None
    archivo_url: str | None = None
    sha256: str | None = None
    tamano_bytes: int | None = None
    fecha_inicio: datetime | None = None
    fecha_fin: datetime | None = None
    creado_por: int | None = None


class PaginatedBackups(BaseModel):
    items: list[BackupLogOut]
    total: int
    page: int
    page_size: int