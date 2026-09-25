from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field
from typing import Literal

from app.core.constants import (
    DNI_CE_MAX,
    DNI_CE_MIN,
    MAX_APELLIDOS_NOMBRES,
    MAX_ASEGURADO_TITULAR,
    MAX_ENTIDAD_EMPLEADORA,
    MAX_MOTIVO,
)

TipoTramite = Literal["SEGURO", "SUBSIDIO"]
RiesgoSeguro = Literal[
    "ALTA TITULAR",
    "ALTA DERECHOHABIENTE",
    "CONDICION DEL ASEGURADO",
    "AUDITORIA",
    "FISCALIZACION POSTERIOR",
    "BAJA TITULAR",
    "BAJA DERECHOHABIENTE",
    "LACTANCIA",
    "ENFERMEDAD",
]
DecisionSeguro = Literal["BAJA DE OFICIO", "RESOLUCION DE MULTA"]
RiesgoSubsidio = Literal[
    "LACTANCIA",
    "ENFERMEDAD",
    "MATERNIDAD",
    "SEPELIO",
    "REINTEGRO",
    "FISCALIZACION POSTERIOR",
]
DecisionSubsidio = Literal["BAJA DE OFICIO", "DENEGATORIA", "IMPROCEDENTE", "EN PARTE"]
DecisionReconsideracion = Literal["FUNDADO", "INFUNDADO", "EN PARTE"]
MedioComunicacion = Literal["CORREO", "PRESENCIAL", "VIRTUAL"]


class SolicitudBase(BaseModel):
    nit: str = Field(min_length=1, max_length=50)
    exp_sgd: str = Field(min_length=16, max_length=16)
    fecha_recepcion: date
    ruc: str = Field(min_length=11, max_length=11)
    entidad_empleadora: str = Field(min_length=1, max_length=MAX_ENTIDAD_EMPLEADORA)
    dni_ce: str = Field(min_length=DNI_CE_MIN, max_length=DNI_CE_MAX)
    asegurado_titular: str = Field(min_length=1, max_length=MAX_ASEGURADO_TITULAR)
    tipo_tramite: TipoTramite

    model_config = ConfigDict(str_strip_whitespace=True)


class DatosSeguroIn(BaseModel):
    riesgo: RiesgoSeguro
    decision_resolucion: DecisionSeguro
    motivo: str | None = Field(default=None, max_length=MAX_MOTIVO)

    model_config = ConfigDict(str_strip_whitespace=True)


class DatosSubsidioIn(BaseModel):
    motivo: str = Field(min_length=1, max_length=MAX_MOTIVO)
    riesgo: RiesgoSubsidio
    decision_resolucion: DecisionSubsidio

    model_config = ConfigDict(str_strip_whitespace=True)


class ResolucionIn(BaseModel):
    numero_resolucion: str = Field(min_length=1, max_length=4)
    anio: int
    fecha_emision: date
    fecha_notificacion: date
    medio_comunicacion: MedioComunicacion
    dni_recepciona: str = Field(min_length=DNI_CE_MIN, max_length=DNI_CE_MAX)
    apellidos_nombres: str = Field(min_length=1, max_length=MAX_APELLIDOS_NOMBRES)

    model_config = ConfigDict(str_strip_whitespace=True)


class ReconsideracionIn(BaseModel):
    fecha_recepcion: date
    numero_resolucion: str = Field(min_length=1, max_length=4)
    anio: int
    fecha_emision: date
    decision_resolucion: DecisionReconsideracion
    fecha_notificacion: date
    medio_comunicacion: MedioComunicacion
    dni_recepciona: str = Field(min_length=DNI_CE_MIN, max_length=DNI_CE_MAX)
    apellidos_nombres: str = Field(min_length=1, max_length=MAX_APELLIDOS_NOMBRES)

    model_config = ConfigDict(str_strip_whitespace=True)


class ApelacionIn(BaseModel):
    fecha_recepcion: date
    numero_nota_derivacion: str = Field(min_length=1, max_length=6)
    fecha_nota: date

    model_config = ConfigDict(str_strip_whitespace=True)


class SolicitudCreate(SolicitudBase):
    datos_seguro: DatosSeguroIn | None = None
    datos_subsidio: DatosSubsidioIn | None = None
    resolucion: ResolucionIn | None = None


class SolicitudUpdate(BaseModel):
    nit: str | None = Field(default=None, min_length=1, max_length=50)
    exp_sgd: str | None = Field(default=None, min_length=16, max_length=16)
    fecha_recepcion: date | None = None
    ruc: str | None = Field(default=None, min_length=11, max_length=11)
    entidad_empleadora: str | None = Field(default=None, min_length=1, max_length=MAX_ENTIDAD_EMPLEADORA)
    dni_ce: str | None = Field(default=None, min_length=DNI_CE_MIN, max_length=DNI_CE_MAX)
    asegurado_titular: str | None = Field(default=None, min_length=1, max_length=MAX_ASEGURADO_TITULAR)
    tipo_tramite: TipoTramite | None = None
    datos_seguro: DatosSeguroIn | None = None
    datos_subsidio: DatosSubsidioIn | None = None

    model_config = ConfigDict(str_strip_whitespace=True)


class DatosSeguroOut(BaseModel):
    riesgo: str
    decision_resolucion: str
    motivo: str | None = None


class DatosSubsidioOut(BaseModel):
    motivo: str
    riesgo: str
    decision_resolucion: str


class ResolucionOut(BaseModel):
    numero_resolucion: str
    anio: int
    fecha_emision: date
    fecha_notificacion: date
    medio_comunicacion: str
    dni_recepciona: str
    apellidos_nombres: str


class ReconsideracionOut(BaseModel):
    fecha_recepcion: date
    numero_resolucion: str
    anio: int
    fecha_emision: date
    decision_resolucion: str
    fecha_notificacion: date
    medio_comunicacion: str
    dni_recepciona: str
    apellidos_nombres: str


class ApelacionOut(BaseModel):
    fecha_recepcion: date
    numero_nota_derivacion: str
    fecha_nota: date


class SolicitudOut(BaseModel):
    id: int
    nit: str
    exp_sgd: str
    fecha_recepcion: date
    ruc: str
    entidad_empleadora: str
    dni_ce: str
    asegurado_titular: str
    tipo_tramite: str
    origen: str
    created_at: object | None = None

    datos_seguro: DatosSeguroOut | None = None
    datos_subsidio: DatosSubsidioOut | None = None
    resolucion: ResolucionOut | None = None
    reconsideracion: ReconsideracionOut | None = None
    apelacion: ApelacionOut | None = None


class PaginatedSolicitudes(BaseModel):
    items: list[SolicitudOut]
    total: int
    page: int
    page_size: int


class DatosSeguroResumen(BaseModel):
    riesgo: str
    decision_resolucion: str


class DatosSubsidioResumen(BaseModel):
    riesgo: str
    decision_resolucion: str


class ResolucionResumen(BaseModel):
    numero_resolucion: str
    anio: int


class SolicitudResumenOut(BaseModel):
    """Proyección ligera para el listado (única fuente de verdad del frontend)."""

    id: int
    nit: str
    exp_sgd: str
    fecha_recepcion: date
    ruc: str
    entidad_empleadora: str
    dni_ce: str
    asegurado_titular: str
    tipo_tramite: str
    origen: str
    created_at: object | None = None

    datos_seguro: DatosSeguroResumen | None = None
    datos_subsidio: DatosSubsidioResumen | None = None
    resolucion: ResolucionResumen | None = None


class PaginatedResumen(BaseModel):
    items: list[SolicitudResumenOut]
    total: int
    page: int
    page_size: int