# -*- coding: utf-8 -*-
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class ConteoBase(BaseModel):
    grupo: str
    total: int


class ResumenDashboardOut(BaseModel):
    total_solicitudes: int
    por_tipo_tramite: list[ConteoBase]
    por_riesgo: list[ConteoBase]
    total_resoluciones: int
    total_reconsideraciones: int
    total_apelaciones: int
    por_anio: list[ConteoBase]