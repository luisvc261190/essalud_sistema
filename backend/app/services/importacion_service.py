"""Servicio de importacion historica (FASE 15).

Pipeline: Lectura -> Analisis -> Normalizacion -> Validacion -> Deteccion de
duplicados -> Vista previa (DRY RUN) -> Confirmacion -> Importacion.

Reglas (docs/MIGRACION.md):
- Ningun dato historico se altera silenciosamente; el original vive en
  datos_historicos y las discrepancias de formato se registran por fila.
- El nucleo (solicitudes) solo recibe filas con mapeo seguro.
- No se infieren recursos (reconsideracion/apelacion) (DP-08).
"""
from __future__ import annotations

import hashlib
import io
from datetime import date, datetime
from typing import Any

from openpyxl import load_workbook
from sqlalchemy.orm import Session

from app.core.constants import (
    DECISION_SEGURO_VALORES,
    DECISION_SUBSIDIO_VALORES,
    ORIGEN_MIGRACION,
    TIPO_TRAMITE_SEGURO,
    TIPO_TRAMITE_SUBSIDIO,
)
from app.errors import AppError
from app.models.actos import DatosSubsidio, Solicitud
from app.models.historico import DatosHistoricos, Importacion, ImportacionRegistro

HOJA = "Control Resoluciones"

# Mapeo por posicion (columna 1..35 de antes.xlsx) -> handler de datos_historicos
_COLS = [
    "nit",                # 1
    "exp_sgd",            # 2
    "fecha_recepcion",    # 3
    "entidad_empleadora", # 4
    "ruc",                # 5
    "asegurado_titular",  # 6
    "dni_ce",             # 7
    "decision_resolucion",# 8
    "riesgo",             # 9
    "numero_resolucion",  # 10
    "anio",               # 11
    "fecha_emision",      # 12
    "correo",             # 13
    "telefono",           # 14
    "comunicado_whatsapp",# 15
    "autorizacion_expresa",# 16
    "direccion_formulario",# 17
    "distrito",           # 18
    "provincia",          # 19
    "departamento",       # 20
    "nro_sobre",          # 21
    "fecha_sobre",        # 22
    "fecha_notificacion", # 23
    "estado_notificacion",# 24
    "nota_cargo",         # 25 (sin encabezado)
    "rotulo_file",        # 26
    "decision_resolucion_extra",  # 27
    "tipo_subsidio",      # 28
    "ruc_dni_beneficiario",# 29
    "monto",              # 30
    "motivo_resolucion",  # 31
    "observaciones",      # 32
    "plazo_espera_dias",  # 33
    "fecha_derivarse_calificador", # 34 (formula, data_only)
    "fecha_entregado_calificador", # 35
]


def _a_texto(v: Any) -> str | None:
    if v is None:
        return None
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v).strip() or None


def _a_fecha(v: Any) -> date | None:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    s = _a_texto(v)
    if not s:
        return None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _hash_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _leer_filas(data: bytes) -> list[dict[str, Any]]:
    wb = load_workbook(io.BytesIO(data), data_only=True, read_only=True)
    ws = wb[HOJA] if HOJA in wb.sheetnames else wb[wb.sheetnames[0]]
    filas: list[dict[str, Any]] = []
    for row in ws.iter_rows(values_only=True):
        filas.append({_COLS[i]: row[i] for i in range(min(len(row), len(_COLS)))})
    wb.close()
    return filas[1:]  # la fila 1 es el encabezado


def _derivar_tipo(decision: str | None, riesgo: str | None, tipo_subsidio: str | None,
                  ruc_dni: str | None, monto: str | None) -> str | None:
    riesgo = (riesgo or "").strip().upper()
    decision = (decision or "").strip().upper()
    if riesgo in ("EN", "MA"):
        return TIPO_TRAMITE_SUBSIDIO
    if decision in DECISION_SUBSIDIO_VALORES:
        return TIPO_TRAMITE_SUBSIDIO
    if decision in DECISION_SEGURO_VALORES:
        return TIPO_TRAMITE_SEGURO
    if tipo_subsidio or ruc_dni or monto:
        return TIPO_TRAMITE_SUBSIDIO
    return None


_MAPEOS_RIESGO = {"EN": "ENFERMEDAD", "MA": "MATERNIDAD"}


def _normalizar_proceso(db: Session, fila: dict[str, Any]) -> tuple[dict, list[str]]:
    """Normaliza una fila historica. Devuelve (nucleo|None, mensajes)."""
    mensajes: list[str] = []

    def t(campo):
        return _a_texto(fila.get(campo))

    def f(campo):
        return _a_fecha(fila.get(campo))

    nit = t("nit")
    exp = t("exp_sgd")
    ruc = t("ruc")
    dni = t("dni_ce")

    nucleo: dict[str, Any] = {
        "nit": nit,
        "exp_sgd": exp,
        "fecha_recepcion": f("fecha_recepcion"),
        "ruc": ruc,
        "entidad_empleadora": t("entidad_empleadora"),
        "dni_ce": dni,
        "asegurado_titular": t("asegurado_titular"),
        "tipo_tramite": None,
        "datos_subsidio": None,
    }

    if nit:
        if len(nit) == 15 and nit.count("-") == 2 and "NIT" in nit.upper():
            nucleo["nit"] = nit.upper()
        else:
            mensajes.append("NIT con formato distinto al nuevo; conservado literal (DP-01).")
    else:
        mensajes.append("Sin NIT.")

    if exp:
        exp = exp.strip()
        if len(exp) == 16 and exp.isdigit() and exp.startswith("0"):
            nucleo["exp_sgd"] = exp
        else:
            mensajes.append("EXP SGD distinto a 16 digitos iniciando en 0; conservado literal.")
    else:
        mensajes.append("Sin EXP SGD.")

    if ruc:
        digitos = ruc.lstrip("0") if ruc.isdigit() else ruc
        if len(digitos) != 11:
            mensajes.append(f"RUC '{ruc}' no tiene 11 digitos; conservado literal.")
    if dni is None:
        mensajes.append("Sin DNI/CE.")

    decision = t("decision_resolucion")
    riesgo = t("riesgo")
    tipo = _derivar_tipo(decision, riesgo, t("tipo_subsidio"), t("ruc_dni_beneficiario"), t("monto"))
    if tipo is None:
        mensajes.append("No se infiere TIPO DE TRAMITE (DP-08); fila solo a datos_historicos.")
        return nucleo, mensajes

    nucleo["tipo_tramite"] = tipo
    if tipo == TIPO_TRAMITE_SUBSIDIO:
        riesgo_ok = (riesgo or "").strip().upper()
        riesgo_cat = _MAPEOS_RIESGO.get(riesgo_ok)
        if riesgo_ok and riesgo_cat and riesgo_ok not in ("EN", "MA"):
            mensajes.append(f"Riesgo 'Riego' abreviado '{riesgo}' -> {riesgo_cat} (mapeo supuesto, DP-06).")
        elif riesgo_ok and not riesgo_cat:
            riesgo_cat = riesgo_ok
        decision_cat = (decision or "").strip().upper() if decision and decision.upper() in DECISION_SUBSIDIO_VALORES else None
        motivo = t("motivo_resolucion")
        if decision and decision.upper() not in DECISION_SUBSIDIO_VALORES:
            mensajes.append(f"Decision '{decision}' fuera del catalogo; conservada literal (DP-05).")
        if motivo or riesgo_cat or decision_cat:
            nucleo["datos_subsidio"] = {"motivo": motivo, "riesgo": riesgo_cat, "decision_resolucion": decision_cat}
    else:
        # SEGURO: el historico no distingue rama SEGURO
        mensajes.append("Sin mapa seguro a rama SEGURO (solo se conserva historico, DP-08).")

    return nucleo, mensajes or ["Lista para importar."]


def analizar_importacion(db: Session, *, data: bytes, nombre_archivo: str, usuario_id: int) -> Importacion:
    if not data:
        raise AppError(400, "El archivo esta vacio.")
    try:
        filas = _leer_filas(data)
    except Exception as exc:  # noqa: BLE001
        raise AppError(400, f"No se pudo leer el archivo Excel: {exc}")

    hash_archivo = _hash_bytes(data)
    reimportacion = (
        db.query(Importacion).filter_by(hash_archivo=hash_archivo, modo="CONFIRMADA").first()
        is not None
    )

    importacion = Importacion(
        nombre_archivo=nombre_archivo,
        modo="DRY_RUN",
        estado="ANALIZADO",
        registros_leidos=len(filas),
        hash_archivo=hash_archivo,
        creada_por=usuario_id,
    )
    db.add(importacion)
    db.flush()

    exp_vistos: set[str] = set()
    validos = 0
    errores = 0
    for idx, fila in enumerate(filas, start=2):
        nucleo, mensajes = _normalizar_proceso(db, fila)

        if nucleo.get("exp_sgd"):
            if nucleo["exp_sgd"] in exp_vistos:
                mensajes.append("EXP SGD duplicado dentro del propio archivo.")
            exp_vistos.add(nucleo["exp_sgd"])

        estado = "OK"
        if any("no se infiere" in m or "sin" in m.lower() for m in mensajes):
            estado = "ADVERTENCIA"
        if any(m.startswith("EXP SGD duplicado") for m in mensajes):
            estado = "ADVERTENCIA"

        reg = ImportacionRegistro(
            importacion_id=importacion.id,
            fila_excel=idx,
            estado=estado,
            mensajes=mensajes,
            datos_fila=fila,
        )
        db.add(reg)
        if estado != "ERROR":
            validos += 1
        else:
            errores += 1

    importacion.registros_validos = validos
    importacion.registros_con_errores = errores
    db.flush()
    return importacion


def _insertar_registro(db: Session, reg: ImportacionRegistro) -> None:
    fila = reg.datos_fila or {}
    nucleo, _mensajes = _normalizar_proceso(db, fila)
    if not nucleo or not nucleo.get("tipo_tramite"):
        # Sin mapeo seguro al nucleo: la informacion se conserva integra en historico.
        db.add(_construir_historico(None, reg.id, reg.fila_excel, fila))
        return

    solicitud = Solicitud(
        nit=(nucleo.get("nit") or "SIN NIT")[:50],
        exp_sgd=(nucleo.get("exp_sgd") or f"MIG-{reg.id:012d}"),
        fecha_recepcion=nucleo.get("fecha_recepcion") or date(1900, 1, 1),
        ruc=(nucleo.get("ruc") or "00000000000")[:11],
        entidad_empleadora=(nucleo.get("entidad_empleadora") or "SIN ENTIDAD")[:50],
        dni_ce=(nucleo.get("dni_ce") or "00000")[:10],
        asegurado_titular=(nucleo.get("asegurado_titular") or "SIN ASEGURADO")[:50],
        tipo_tramite=nucleo["tipo_tramite"],
        origen=ORIGEN_MIGRACION,
    )
    db.add(solicitud)
    db.flush()

    datos_sub = nucleo.get("datos_subsidio")
    if datos_sub and datos_sub.get("riesgo") and datos_sub.get("decision_resolucion") and datos_sub.get("motivo"):
        db.add(
            DatosSubsidio(
                solicitud_id=solicitud.id,
                motivo=datos_sub["motivo"],
                riesgo=datos_sub["riesgo"],
                decision_resolucion=datos_sub["decision_resolucion"],
            )
        )

    db.add(_construir_historico(solicitud.id, reg.id, reg.fila_excel, fila))
    reg.solicitud_id = solicitud.id


def _construir_historico(
    solicitud_id: int | None, registro_id: int, fila_excel: int, fila: dict[str, Any]
) -> DatosHistoricos:
    def t(campo):
        return _a_texto(fila.get(campo))

    def f(campo):
        return _a_fecha(fila.get(campo))

    return DatosHistoricos(
        solicitud_id=solicitud_id,
        importacion_registro_id=registro_id,
        fila_excel=fila_excel,
        nit_original=t("nit"),
        exp_sgd_original=t("exp_sgd"),
        fecha_recepcion_original=f("fecha_recepcion"),
        ruc_original=t("ruc"),
        dni_ce_original=t("dni_ce"),
        numero_resolucion_original=t("numero_resolucion"),
        correo=t("correo"),
        telefono=t("telefono"),
        comunicado_whatsapp=t("comunicado_whatsapp"),
        autorizacion_expresa=t("autorizacion_expresa"),
        direccion_formulario=t("direccion_formulario"),
        distrito=t("distrito"),
        provincia=t("provincia"),
        departamento=t("departamento"),
        nro_sobre=t("nro_sobre"),
        fecha_sobre=f("fecha_sobre"),
        fecha_notificacion_historica=f("fecha_notificacion"),
        estado_notificacion=t("estado_notificacion"),
        nota_cargo=t("nota_cargo"),
        rotulo_file=t("rotulo_file"),
        decision_resolucion_extra=t("decision_resolucion_extra"),
        tipo_subsidio=t("tipo_subsidio"),
        ruc_dni_beneficiario=t("ruc_dni_beneficiario"),
        monto=t("monto"),
        motivo_resolucion=t("motivo_resolucion"),
        observaciones=t("observaciones"),
        plazo_espera_dias=t("plazo_espera_dias"),
        fecha_derivarse_calificador=f("fecha_derivarse_calificador"),
        fecha_entregado_calificador=f("fecha_entregado_calificador"),
    )


def confirmar_importacion(db: Session, *, importacion_id: int, usuario_id: int) -> Importacion:
    imp = db.get(Importacion, importacion_id)
    if not imp:
        raise AppError(404, "Importacion no encontrada.")
    if imp.estado == "IMPORTADO":
        raise AppError(400, "Esta importacion ya fue confirmada. Hash duplicado detectado.")
    try:
        for reg in imp.registros:
            if reg.estado == "ERROR":
                continue
            _insertar_registro(db, reg)
        imp.estado = "IMPORTADO"
        imp.modo = "CONFIRMADA"
        imp.registros_validos = sum(1 for r in imp.registros if r.solicitud_id)
        db.commit()
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        imp.estado = "CANCELADO"
        db.commit()
        raise AppError(400, f"La importacion no pudo completarse y fue cancelada: {exc}")
    return imp


def cancelar_importacion(db: Session, *, importacion_id: int) -> Importacion:
    imp = db.get(Importacion, importacion_id)
    if not imp:
        raise AppError(404, "Importacion no encontrada.")
    if imp.estado == "IMPORTADO":
        raise AppError(400, "No se puede cancelar una importacion confirmada.")
    imp.estado = "CANCELADO"
    db.commit()
    return imp


def listar_importaciones(db: Session, *, page: int = 1, page_size: int = 20):
    total = db.query(Importacion).count()
    items = (
        db.query(Importacion)
        .order_by(Importacion.created_at.desc(), Importacion.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items, total


def get_importacion(db: Session, importacion_id: int) -> Importacion | None:
    return db.get(Importacion, importacion_id)