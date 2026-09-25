from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    SmallInteger,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import (
    DECISION_RECONSIDERACION_VALORES,
    DECISION_SEGURO_VALORES,
    DECISION_SUBSIDIO_VALORES,
    DNI_CE_MAX,
    DNI_CE_MIN,
    EXP_SGD_LONGITUD,
    MAX_APELLIDOS_NOMBRES,
    MAX_ASEGURADO_TITULAR,
    MAX_ENTIDAD_EMPLEADORA,
    MAX_MOTIVO,
    MEDIO_COMUNICACION_VALORES,
    NUMERO_NOTA_DERIVACION_LONGITUD,
    NUMERO_RESOLUCION_LONGITUD,
    ORIGEN_MIGRACION,
    ORIGEN_REGISTRO,
    RIESGO_SEGURO_VALORES,
    RIESGO_SUBSIDIO_VALORES,
    RUC_LONGITUD,
    TIPO_TRAMITE_VALORES,
)
from app.core.database import Base


def _in_list(values) -> str:
    return ",".join(f"'{v}'" for v in values)


class Solicitud(Base):
    __tablename__ = "solicitudes"
    __table_args__ = (
        CheckConstraint(
            f"tipo_tramite IN ({_in_list(TIPO_TRAMITE_VALORES)})",
            name="ck_solicitudes_tipo_tramite",
        ),
        CheckConstraint(
            f"origen IN ('{ORIGEN_REGISTRO}','{ORIGEN_MIGRACION}')",
            name="ck_solicitudes_origen",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    nit: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    exp_sgd: Mapped[str] = mapped_column(
        String(EXP_SGD_LONGITUD), nullable=False, unique=True, index=True
    )
    fecha_recepcion: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    ruc: Mapped[str] = mapped_column(String(RUC_LONGITUD), nullable=False)
    entidad_empleadora: Mapped[str] = mapped_column(
        String(MAX_ENTIDAD_EMPLEADORA), nullable=False
    )
    dni_ce: Mapped[str] = mapped_column(String(DNI_CE_MAX), nullable=False, index=True)
    asegurado_titular: Mapped[str] = mapped_column(
        String(MAX_ASEGURADO_TITULAR), nullable=False, index=True
    )
    tipo_tramite: Mapped[str] = mapped_column(String(10), nullable=False)
    origen: Mapped[str] = mapped_column(String(20), nullable=False, default=ORIGEN_REGISTRO)

    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    datos_seguro: Mapped["DatosSeguro | None"] = relationship(
        back_populates="solicitud", uselist=False, cascade="all, delete-orphan"
    )
    datos_subsidio: Mapped["DatosSubsidio | None"] = relationship(
        back_populates="solicitud", uselist=False, cascade="all, delete-orphan"
    )
    resolucion: Mapped["Resolucion | None"] = relationship(
        back_populates="solicitud", uselist=False, cascade="all, delete-orphan"
    )
    reconsideracion: Mapped["RecursoReconsideracion | None"] = relationship(
        back_populates="solicitud", uselist=False, cascade="all, delete-orphan"
    )
    apelacion: Mapped["RecursoApelacion | None"] = relationship(
        back_populates="solicitud", uselist=False, cascade="all, delete-orphan"
    )


class DatosSeguro(Base):
    __tablename__ = "datos_seguro"
    __table_args__ = (
        CheckConstraint(
            f"riesgo IN ({_in_list(RIESGO_SEGURO_VALORES)})",
            name="ck_datos_seguro_riesgo",
        ),
        CheckConstraint(
            f"decision_resolucion IN ({_in_list(DECISION_SEGURO_VALORES)})",
            name="ck_datos_seguro_decision",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    solicitud_id: Mapped[int] = mapped_column(
        ForeignKey("solicitudes.id", ondelete="RESTRICT"), nullable=False, unique=True
    )
    riesgo: Mapped[str] = mapped_column(String(40), nullable=False)
    decision_resolucion: Mapped[str] = mapped_column(String(30), nullable=False)
    motivo: Mapped[str | None] = mapped_column(String(MAX_MOTIVO))

    solicitud: Mapped[Solicitud] = relationship(back_populates="datos_seguro")


class DatosSubsidio(Base):
    __tablename__ = "datos_subsidio"
    __table_args__ = (
        CheckConstraint(
            f"riesgo IN ({_in_list(RIESGO_SUBSIDIO_VALORES)})",
            name="ck_datos_subsidio_riesgo",
        ),
        CheckConstraint(
            f"decision_resolucion IN ({_in_list(DECISION_SUBSIDIO_VALORES)})",
            name="ck_datos_subsidio_decision",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    solicitud_id: Mapped[int] = mapped_column(
        ForeignKey("solicitudes.id", ondelete="RESTRICT"), nullable=False, unique=True
    )
    motivo: Mapped[str] = mapped_column(String(MAX_MOTIVO), nullable=False)
    riesgo: Mapped[str] = mapped_column(String(40), nullable=False)
    decision_resolucion: Mapped[str] = mapped_column(String(30), nullable=False)

    solicitud: Mapped[Solicitud] = relationship(back_populates="datos_subsidio")


class Resolucion(Base):
    __tablename__ = "resoluciones"
    __table_args__ = (
        CheckConstraint(
            f"medio_comunicacion IN ({_in_list(MEDIO_COMUNICACION_VALORES)})",
            name="ck_resoluciones_medio",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    solicitud_id: Mapped[int] = mapped_column(
        ForeignKey("solicitudes.id", ondelete="RESTRICT"), nullable=False, unique=True
    )
    numero_resolucion: Mapped[str] = mapped_column(
        String(NUMERO_RESOLUCION_LONGITUD), nullable=False
    )
    anio: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    fecha_emision: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_notificacion: Mapped[date] = mapped_column(Date, nullable=False)
    medio_comunicacion: Mapped[str] = mapped_column(String(15), nullable=False)
    dni_recepciona: Mapped[str] = mapped_column(String(DNI_CE_MAX), nullable=False)
    apellidos_nombres: Mapped[str] = mapped_column(
        String(MAX_APELLIDOS_NOMBRES), nullable=False
    )

    solicitud: Mapped[Solicitud] = relationship(back_populates="resolucion")


class RecursoReconsideracion(Base):
    __tablename__ = "recursos_reconsideracion"
    __table_args__ = (
        CheckConstraint(
            f"decision_resolucion IN ({_in_list(DECISION_RECONSIDERACION_VALORES)})",
            name="ck_reconsideracion_decision",
        ),
        CheckConstraint(
            f"medio_comunicacion IN ({_in_list(MEDIO_COMUNICACION_VALORES)})",
            name="ck_reconsideracion_medio",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    solicitud_id: Mapped[int] = mapped_column(
        ForeignKey("solicitudes.id", ondelete="RESTRICT"), nullable=False, unique=True
    )
    fecha_recepcion: Mapped[date] = mapped_column(Date, nullable=False)
    numero_resolucion: Mapped[str] = mapped_column(
        String(NUMERO_RESOLUCION_LONGITUD), nullable=False
    )
    anio: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    fecha_emision: Mapped[date] = mapped_column(Date, nullable=False)
    decision_resolucion: Mapped[str] = mapped_column(String(15), nullable=False)
    fecha_notificacion: Mapped[date] = mapped_column(Date, nullable=False)
    medio_comunicacion: Mapped[str] = mapped_column(String(15), nullable=False)
    dni_recepciona: Mapped[str] = mapped_column(String(DNI_CE_MAX), nullable=False)
    apellidos_nombres: Mapped[str] = mapped_column(
        String(MAX_APELLIDOS_NOMBRES), nullable=False
    )

    solicitud: Mapped[Solicitud] = relationship(back_populates="reconsideracion")


class RecursoApelacion(Base):
    __tablename__ = "recursos_apelacion"

    id: Mapped[int] = mapped_column(primary_key=True)
    solicitud_id: Mapped[int] = mapped_column(
        ForeignKey("solicitudes.id", ondelete="RESTRICT"), nullable=False, unique=True
    )
    fecha_recepcion: Mapped[date] = mapped_column(Date, nullable=False)
    numero_nota_derivacion: Mapped[str] = mapped_column(
        String(NUMERO_NOTA_DERIVACION_LONGITUD), nullable=False
    )
    fecha_nota: Mapped[date] = mapped_column(Date, nullable=False)

    solicitud: Mapped[Solicitud] = relationship(back_populates="apelacion")