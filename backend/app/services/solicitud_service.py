"""Logica de negocio del modulo de Actos Administrativos.

Reconstruye la vista completa de una solicitud (pasos 2-22) con su rama,
resolucion y recursos, aplicando las validaciones del cliente en el backend.
"""
from __future__ import annotations

from app.core.validators import (
    formatear_nit,
    formatear_numero_nota_derivacion,
    formatear_numero_resolucion,
    normalizar_dni_ce,
    normalizar_exp_sgd,
    normalizar_ruc,
)
from app.errors import AppError
from app.models.actos import (
    DatosSeguro,
    DatosSubsidio,
    RecursoApelacion,
    RecursoReconsideracion,
    Resolucion,
    Solicitud,
)
from app.core.constants import (
    ORIGEN_REGISTRO,
    TIPO_TRAMITE_SEGURO,
    TIPO_TRAMITE_SUBSIDIO,
)


def _verificar_rama(tipo_tramite: str, datos_seguro, datos_subsidio):
    if tipo_tramite == TIPO_TRAMITE_SEGURO:
        if datos_subsidio is not None:
            raise AppError(400, "Tipo de tramite SEGURO no admite datos de SUBSIDIO.")
        if datos_seguro is None:
            raise AppError(400, "Para SEGURO se requiere el bloque datos_seguro (riesgo y decision).")
    else:
        if datos_seguro is not None:
            raise AppError(400, "Tipo de tramite SUBSIDIO no admite datos de SEGURO.")
        if datos_subsidio is None:
            raise AppError(400, "Para SUBSIDIO se requiere el bloque datos_subsidio (motivo, riesgo y decision).")


def _set_resolucion(res: Resolucion, payload) -> None:
    res.numero_resolucion = formatear_numero_resolucion(payload.numero_resolucion)
    res.anio = payload.anio
    res.fecha_emision = payload.fecha_emision
    res.fecha_notificacion = payload.fecha_notificacion
    res.medio_comunicacion = payload.medio_comunicacion
    res.dni_recepciona = normalizar_dni_ce(payload.dni_recepciona)
    res.apellidos_nombres = payload.apellidos_nombres.strip()


def _set_reconsideracion(rec: RecursoReconsideracion, payload) -> None:
    rec.fecha_recepcion = payload.fecha_recepcion
    rec.numero_resolucion = formatear_numero_resolucion(payload.numero_resolucion)
    rec.anio = payload.anio
    rec.fecha_emision = payload.fecha_emision
    rec.decision_resolucion = payload.decision_resolucion
    rec.fecha_notificacion = payload.fecha_notificacion
    rec.medio_comunicacion = payload.medio_comunicacion
    rec.dni_recepciona = normalizar_dni_ce(payload.dni_recepciona)
    rec.apellidos_nombres = payload.apellidos_nombres.strip()


def _set_apelacion(ap: RecursoApelacion, payload) -> None:
    ap.fecha_recepcion = payload.fecha_recepcion
    ap.numero_nota_derivacion = formatear_numero_nota_derivacion(payload.numero_nota_derivacion)
    ap.fecha_nota = payload.fecha_nota


def _sync_rama(db, solicitud: Solicitud, datos_seguro, datos_subsidio) -> None:
    """Sincroniza la rama (0..1) con el tipo de tramite actual."""
    tipo = solicitud.tipo_tramite
    if tipo == TIPO_TRAMITE_SEGURO:
        if solicitud.datos_subsidio:
            db.delete(solicitud.datos_subsidio)
            solicitud.datos_subsidio = None
        if datos_seguro is not None:
            if solicitud.datos_seguro:
                d = solicitud.datos_seguro
                d.riesgo = datos_seguro.riesgo
                d.decision_resolucion = datos_seguro.decision_resolucion
                d.motivo = datos_seguro.motivo.strip() if datos_seguro.motivo else datos_seguro.motivo
            else:
                solicitud.datos_seguro = DatosSeguro(
                    riesgo=datos_seguro.riesgo,
                    decision_resolucion=datos_seguro.decision_resolucion,
                    motivo=datos_seguro.motivo.strip()
                    if datos_seguro.motivo
                    else datos_seguro.motivo,
                )
    else:
        if solicitud.datos_seguro:
            db.delete(solicitud.datos_seguro)
            solicitud.datos_seguro = None
        if datos_subsidio is not None:
            if solicitud.datos_subsidio:
                d = solicitud.datos_subsidio
                d.motivo = datos_subsidio.motivo.strip()
                d.riesgo = datos_subsidio.riesgo
                d.decision_resolucion = datos_subsidio.decision_resolucion
            else:
                solicitud.datos_subsidio = DatosSubsidio(
                    motivo=datos_subsidio.motivo.strip(),
                    riesgo=datos_subsidio.riesgo,
                    decision_resolucion=datos_subsidio.decision_resolucion,
                )


def _aplicar_campos_base(solicitud: Solicitud, payload) -> None:
    solicitud.nit = formatear_nit(payload.nit)
    solicitud.exp_sgd = normalizar_exp_sgd(payload.exp_sgd)
    solicitud.fecha_recepcion = payload.fecha_recepcion
    solicitud.ruc = normalizar_ruc(payload.ruc)
    solicitud.entidad_empleadora = payload.entidad_empleadora.strip()
    solicitud.dni_ce = normalizar_dni_ce(payload.dni_ce)
    solicitud.asegurado_titular = payload.asegurado_titular.strip()


def create_solicitud(db, *, usuario_id: int, datos: dict) -> Solicitud:
    base = datos
    _verificar_rama(
        base.tipo_tramite, base.datos_seguro, base.datos_subsidio
    )
    if db.query(Solicitud).filter_by(exp_sgd=base.exp_sgd.strip()).first():
        raise AppError(400, "El EXP SGD ya se encuentra registrado.")

    solicitud = Solicitud(origen=ORIGEN_REGISTRO)
    solicitud.created_by = usuario_id
    _aplicar_campos_base(solicitud, base)
    solicitud.tipo_tramite = base.tipo_tramite
    db.add(solicitud)
    db.flush()
    _sync_rama(db, solicitud, base.datos_seguro, base.datos_subsidio)
    if base.resolucion:
        if solicitud.resolucion:
            _set_resolucion(solicitud.resolucion, base.resolucion)
        else:
            res = Resolucion()
            _set_resolucion(res, base.resolucion)
            solicitud.resolucion = res
    db.flush()
    return solicitud


def update_solicitud(db, solicitud: Solicitud, *, datos) -> Solicitud:
    """Edita los campos principales y/o la rama. No toca resolucion/recursos."""
    campos = datos.model_dump(exclude_unset=True)

    if "nit" in campos:
        solicitud.nit = formatear_nit(datos.nit)
    if "exp_sgd" in campos:
        nuevo = normalizar_exp_sgd(datos.exp_sgd)
        if nuevo != solicitud.exp_sgd and db.query(Solicitud).filter_by(exp_sgd=nuevo).first():
            raise AppError(400, "El EXP SGD ya se encuentra registrado.")
        solicitud.exp_sgd = nuevo
    if "fecha_recepcion" in campos:
        solicitud.fecha_recepcion = datos.fecha_recepcion
    if "ruc" in campos:
        solicitud.ruc = normalizar_ruc(datos.ruc)
    if "entidad_empleadora" in campos:
        solicitud.entidad_empleadora = datos.entidad_empleadora.strip()
    if "dni_ce" in campos:
        solicitud.dni_ce = normalizar_dni_ce(datos.dni_ce)
    if "asegurado_titular" in campos:
        solicitud.asegurado_titular = datos.asegurado_titular.strip()
    if "tipo_tramite" in campos:
        if datos.tipo_tramite != solicitud.tipo_tramite:
            bloque = "datos_seguro" if datos.tipo_tramite == TIPO_TRAMITE_SEGURO else "datos_subsidio"
            if bloque not in campos or campos[bloque] is None:
                raise AppError(
                    400,
                    f"Para cambiar el tipo de tramite a {datos.tipo_tramite} se debe enviar el bloque {bloque}.",
                )
        solicitud.tipo_tramite = datos.tipo_tramite

    if campos.get("datos_seguro") is not None and campos.get("datos_subsidio") is not None:
        raise AppError(400, "No se puede enviar datos_seguro y datos_subsidio a la vez.")
    rama_esperada = solicitud.tipo_tramite
    bloque_invalido = "datos_subsidio" if rama_esperada == TIPO_TRAMITE_SEGURO else "datos_seguro"
    if campos.get(bloque_invalido) is not None:
        raise AppError(
            400,
            f"El bloque {bloque_invalido} no corresponde al tipo de tramite {rama_esperada}.",
        )
    _sync_rama(db, solicitud, datos.datos_seguro, datos.datos_subsidio)
    db.flush()
    return solicitud


def crear_resolucion(db, solicitud: Solicitud, *, payload) -> Resolucion:
    if solicitud.resolucion:
        raise AppError(400, "La solicitud ya tiene resolucion registrada.")
    res = Resolucion()
    _set_resolucion(res, payload)
    solicitud.resolucion = res
    db.flush()
    return res


def actualizar_resolucion(db, solicitud: Solicitud, *, payload) -> Resolucion:
    if not solicitud.resolucion:
        raise AppError(404, "La solicitud no tiene resolucion registrada.")
    _set_resolucion(solicitud.resolucion, payload)
    db.flush()
    return solicitud.resolucion


def crear_reconsideracion(db, solicitud: Solicitud, *, payload) -> RecursoReconsideracion:
    if solicitud.reconsideracion:
        raise AppError(409, "La solicitud ya tiene un recurso de reconsideracion registrado.")
    rec = RecursoReconsideracion()
    _set_reconsideracion(rec, payload)
    solicitud.reconsideracion = rec
    db.flush()
    return rec


def crear_apelacion(db, solicitud: Solicitud, *, payload) -> RecursoApelacion:
    if solicitud.apelacion:
        raise AppError(409, "La solicitud ya tiene un recurso de apelacion registrado.")
    ap = RecursoApelacion()
    _set_apelacion(ap, payload)
    solicitud.apelacion = ap
    db.flush()
    return ap


def get_solicitud(db, solicitud_id: int) -> Solicitud | None:
    """Carga la solicitud con todas sus ramas para evitar N+1 en ediciones."""
    from sqlalchemy.orm import joinedload

    return (
        db.query(Solicitud)
        .options(
            joinedload(Solicitud.datos_seguro),
            joinedload(Solicitud.datos_subsidio),
            joinedload(Solicitud.resolucion),
            joinedload(Solicitud.reconsideracion),
            joinedload(Solicitud.apelacion),
        )
        .filter(Solicitud.id == solicitud_id)
        .first()
    )


def solicitud_out(s: Solicitud) -> dict:
    seg = s.datos_seguro
    sub = s.datos_subsidio
    res = s.resolucion
    rec = s.reconsideracion
    ap = s.apelacion
    return {
        "id": s.id,
        "nit": s.nit,
        "exp_sgd": s.exp_sgd,
        "fecha_recepcion": s.fecha_recepcion,
        "ruc": s.ruc,
        "entidad_empleadora": s.entidad_empleadora,
        "dni_ce": s.dni_ce,
        "asegurado_titular": s.asegurado_titular,
        "tipo_tramite": s.tipo_tramite,
        "origen": s.origen,
        "created_at": s.created_at,
        "datos_seguro": {
            "riesgo": seg.riesgo,
            "decision_resolucion": seg.decision_resolucion,
            "motivo": seg.motivo,
        }
        if seg
        else None,
        "datos_subsidio": {
            "motivo": sub.motivo,
            "riesgo": sub.riesgo,
            "decision_resolucion": sub.decision_resolucion,
        }
        if sub
        else None,
        "resolucion": _resolucion_out(res) if res else None,
        "reconsideracion": _reconsideracion_out(rec) if rec else None,
        "apelacion": _apelacion_out(ap) if ap else None,
    }


def solicitud_resumen_out(s: Solicitud) -> dict:
    """Proyección ligera para listados: evita serializar recursos anidados."""
    seg = s.datos_seguro
    sub = s.datos_subsidio
    res = s.resolucion
    return {
        "id": s.id,
        "nit": s.nit,
        "exp_sgd": s.exp_sgd,
        "fecha_recepcion": s.fecha_recepcion,
        "ruc": s.ruc,
        "entidad_empleadora": s.entidad_empleadora,
        "dni_ce": s.dni_ce,
        "asegurado_titular": s.asegurado_titular,
        "tipo_tramite": s.tipo_tramite,
        "origen": s.origen,
        "created_at": s.created_at,
        "datos_seguro": {"riesgo": seg.riesgo, "decision_resolucion": seg.decision_resolucion}
        if seg
        else None,
        "datos_subsidio": {"riesgo": sub.riesgo, "decision_resolucion": sub.decision_resolucion}
        if sub
        else None,
        "resolucion": {"numero_resolucion": res.numero_resolucion, "anio": res.anio}
        if res
        else None,
        "reconsideracion": None,
        "apelacion": None,
    }


def _resolucion_out(res: Resolucion) -> dict:
    return {
        "numero_resolucion": res.numero_resolucion,
        "anio": res.anio,
        "fecha_emision": res.fecha_emision,
        "fecha_notificacion": res.fecha_notificacion,
        "medio_comunicacion": res.medio_comunicacion,
        "dni_recepciona": res.dni_recepciona,
        "apellidos_nombres": res.apellidos_nombres,
    }


def _reconsideracion_out(rec: RecursoReconsideracion) -> dict:
    return {
        "fecha_recepcion": rec.fecha_recepcion,
        "numero_resolucion": rec.numero_resolucion,
        "anio": rec.anio,
        "fecha_emision": rec.fecha_emision,
        "decision_resolucion": rec.decision_resolucion,
        "fecha_notificacion": rec.fecha_notificacion,
        "medio_comunicacion": rec.medio_comunicacion,
        "dni_recepciona": rec.dni_recepciona,
        "apellidos_nombres": rec.apellidos_nombres,
    }


def _apelacion_out(ap: RecursoApelacion) -> dict:
    return {
        "fecha_recepcion": ap.fecha_recepcion,
        "numero_nota_derivacion": ap.numero_nota_derivacion,
        "fecha_nota": ap.fecha_nota,
    }