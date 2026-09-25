from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient

from app.core.database import SessionLocal
from app.dependencies.rate_limit import login_rate_limiter
from app.main import app
from app.models.auditoria import AuditLog
from app.models.security import User, UserRole

SEED_USER = "superadmin"
SEED_PASS = "umKdGl0GBjozDtIk"


@pytest.fixture(autouse=True)
def limpiar_rate_limiter():
    login_rate_limiter._attempts.clear()
    yield
    login_rate_limiter._attempts.clear()


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def superadmin_token(client):
    r = client.post(
        "/api/v1/auth/login",
        data={"username": SEED_USER, "password": SEED_PASS},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture()
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def crear_usuario_test(client, token, usuario, rol_nombre, password="TestPass123!"):
    """Crea usuario de prueba con rol dado; devuelve id o None si ya existia."""
    r = client.post(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "usuario": usuario,
            "password": password,
            "nombres": "Usuario",
            "apellidos": "De Prueba",
            "email": None,
            "is_active": True,
            "role_ids": [rol_id(rol_nombre)],
        },
    )
    if r.status_code == 201:
        return r.json()["id"]
    return None


def rol_id(nombre):
    db = SessionLocal()
    try:
        from app.models.security import Role

        rol = db.query(Role).filter(Role.nombre == nombre).first()
        return rol.id if rol else None
    finally:
        db.close()


def eliminar_usuario_test(usuario: str):
    """Limpieza: borra auditoria, roles y usuario de prueba."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.usuario == usuario).first()
        if user:
            db.query(AuditLog).filter(AuditLog.user_id == user.id).delete()
            db.query(UserRole).filter(UserRole.user_id == user.id).delete()
            db.delete(user)
            db.commit()
    finally:
        db.close()


def eliminar_solicitud_test(solicitud_id: int):
    """Limpieza de solicitudes de prueba (ramas, resolucion, recursos, auditoria)."""
    from app.models.actos import (
        DatosSeguro,
        DatosSubsidio,
        RecursoApelacion,
        RecursoReconsideracion,
        Resolucion,
        Solicitud,
    )

    db = SessionLocal()
    try:
        ids_log = [
            r[0]
            for r in db.query(AuditLog.id)
            .filter(
                AuditLog.registro_id == solicitud_id,
                AuditLog.entidad.in_(
                    [
                        "solicitudes",
                        "resoluciones",
                        "recursos_reconsideracion",
                        "recursos_apelacion",
                    ]
                ),
            )
            .all()
        ]
        if ids_log:
            db.query(AuditLog).filter(AuditLog.id.in_(ids_log)).delete(
                synchronize_session=False
            )
        for model in (
            DatosSeguro,
            DatosSubsidio,
            Resolucion,
            RecursoReconsideracion,
            RecursoApelacion,
        ):
            db.query(model).filter(model.solicitud_id == solicitud_id).delete(
                synchronize_session=False
            )
        solicitud = db.get(Solicitud, solicitud_id)
        if solicitud:
            db.delete(solicitud)
        db.commit()
    finally:
        db.close()


def crear_solicitud_payload(
    *,
    nit="1234-5678-NIT-0012345",
    exp_sgd="0048220250000824",
    fecha_recepcion="2026-01-15",
    ruc="20225634085",
    entidad_empleadora="EMPRESA PRUEBA SAC",
    dni_ce="10366944",
    asegurado_titular="JUAN PEREZ",
    tipo_tramite="SEGURO",
    datos_seguro=None,
    datos_subsidio=None,
    resolucion=None,
):
    return {
        "nit": nit,
        "exp_sgd": exp_sgd,
        "fecha_recepcion": fecha_recepcion,
        "ruc": ruc,
        "entidad_empleadora": entidad_empleadora,
        "dni_ce": dni_ce,
        "asegurado_titular": asegurado_titular,
        "tipo_tramite": tipo_tramite,
        "datos_seguro": datos_seguro,
        "datos_subsidio": datos_subsidio,
        "resolucion": resolucion,
    }


def resolucion_payload(
    *,
    numero_resolucion="12",
    anio=2026,
    fecha_emision="2026-02-01",
    fecha_notificacion="2026-02-10",
    medio_comunicacion="CORREO",
    dni_recepciona="10000001",
    apellidos_nombres="MARIA GARCIA",
):
    return {
        "numero_resolucion": numero_resolucion,
        "anio": anio,
        "fecha_emision": fecha_emision,
        "fecha_notificacion": fecha_notificacion,
        "medio_comunicacion": medio_comunicacion,
        "dni_recepciona": dni_recepciona,
        "apellidos_nombres": apellidos_nombres,
    }
