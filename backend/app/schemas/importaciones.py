from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class ImportacionOut(BaseModel):
    id: int
    nombre_archivo: str
    modo: str
    estado: str
    registros_leidos: int
    registros_validos: int
    registros_con_errores: int
    hash_archivo: str | None = None
    created_at: datetime
    reimportacion: bool = False


class ImportacionRegistroOut(BaseModel):
    id: int
    fila_excel: int
    estado: str
    mensajes: list[str] = []
    solicitud_id: int | None = None


class ImportacionDetalleOut(ImportacionOut):
    registros: list[ImportacionRegistroOut]


class PaginatedImportaciones(BaseModel):
    items: list[ImportacionOut]
    total: int
    page: int
    page_size: int