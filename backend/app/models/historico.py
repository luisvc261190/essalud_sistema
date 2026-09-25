from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

ESTADOS_IMPORTACION = ("ANALIZADO", "VALIDADO", "PREVISTO", "IMPORTADO", "CANCELADO")
MODOS_IMPORTACION = ("DRY_RUN", "CONFIRMADA")
ESTADOS_REGISTRO_IMPORTACION = ("OK", "ADVERTENCIA", "ERROR")


class Importacion(Base):
    __tablename__ = "importaciones"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre_archivo: Mapped[str] = mapped_column(String(255), nullable=False)
    modo: Mapped[str] = mapped_column(String(10), nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="ANALIZADO")
    registros_leidos: Mapped[int] = mapped_column(Integer, default=0)
    registros_validos: Mapped[int] = mapped_column(Integer, default=0)
    registros_con_errores: Mapped[int] = mapped_column(Integer, default=0)
    hash_archivo: Mapped[str | None] = mapped_column(String(64))
    creada_por: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    registros: Mapped[list[ImportacionRegistro]] = relationship(
        back_populates="importacion", cascade="all, delete-orphan"
    )


class ImportacionRegistro(Base):
    __tablename__ = "importacion_registros"

    id: Mapped[int] = mapped_column(primary_key=True)
    importacion_id: Mapped[int] = mapped_column(
        ForeignKey("importaciones.id", ondelete="CASCADE"), nullable=False
    )
    fila_excel: Mapped[int] = mapped_column(Integer, nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False)
    mensajes: Mapped[list | None] = mapped_column(JSONB)
    datos_fila: Mapped[dict | None] = mapped_column(JSONB)
    solicitud_id: Mapped[int | None] = mapped_column(ForeignKey("solicitudes.id"))

    importacion: Mapped[Importacion] = relationship(back_populates="registros")


class DatosHistoricos(Base):
    __tablename__ = "datos_historicos"

    id: Mapped[int] = mapped_column(primary_key=True)
    solicitud_id: Mapped[int | None] = mapped_column(
        ForeignKey("solicitudes.id"), unique=True
    )
    importacion_registro_id: Mapped[int | None] = mapped_column(
        ForeignKey("importacion_registros.id")
    )

    fila_excel: Mapped[int] = mapped_column(Integer, nullable=False)

    nit_original: Mapped[str | None] = mapped_column(String(50))
    exp_sgd_original: Mapped[str | None] = mapped_column(String(50))
    fecha_recepcion_original: Mapped[date | None] = mapped_column(Date)
    ruc_original: Mapped[str | None] = mapped_column(String(30))
    dni_ce_original: Mapped[str | None] = mapped_column(String(30))
    numero_resolucion_original: Mapped[str | None] = mapped_column(String(20))

    correo: Mapped[str | None] = mapped_column(String(255))
    telefono: Mapped[str | None] = mapped_column(String(30))
    comunicado_whatsapp: Mapped[str | None] = mapped_column(String(255))
    autorizacion_expresa: Mapped[str | None] = mapped_column(String(255))
    direccion_formulario: Mapped[str | None] = mapped_column(String(255))
    distrito: Mapped[str | None] = mapped_column(String(100))
    provincia: Mapped[str | None] = mapped_column(String(100))
    departamento: Mapped[str | None] = mapped_column(String(100))
    nro_sobre: Mapped[str | None] = mapped_column(String(50))
    fecha_sobre: Mapped[date | None] = mapped_column(Date)
    fecha_notificacion_historica: Mapped[date | None] = mapped_column(Date)
    estado_notificacion: Mapped[str | None] = mapped_column(String(255))
    nota_cargo: Mapped[str | None] = mapped_column(String(500))
    rotulo_file: Mapped[str | None] = mapped_column(String(255))
    decision_resolucion_extra: Mapped[str | None] = mapped_column(String(255))
    tipo_subsidio: Mapped[str | None] = mapped_column(String(150))
    ruc_dni_beneficiario: Mapped[str | None] = mapped_column(String(30))
    monto: Mapped[str | None] = mapped_column(Numeric(12, 2))
    motivo_resolucion: Mapped[str | None] = mapped_column(String(150))
    observaciones: Mapped[str | None] = mapped_column(Text)
    plazo_espera_dias: Mapped[str | None] = mapped_column(String(100))
    fecha_derivarse_calificador: Mapped[date | None] = mapped_column(Date)
    fecha_entregado_calificador: Mapped[date | None] = mapped_column(Date)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )