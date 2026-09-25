from tests.conftest import (
    crear_solicitud_payload,
    eliminar_solicitud_test,
    eliminar_usuario_test,
)


def setup_datos(client, superadmin_token):
    import random

    exp1 = "0" + f"{random.randint(0, 10**15 - 1):015d}"
    exp2 = "0" + f"{random.randint(0, 10**15 - 1):015d}"
    ids = []
    p1 = crear_solicitud_payload(
        exp_sgd=exp1,
        nit="1234-5678-NIT-0000001",
        asegurado_titular="MARIA QUISPE",
        datos_seguro={"riesgo": "LACTANCIA", "decision_resolucion": "BAJA DE OFICIO"},
        resolucion={
            "numero_resolucion": "1",
            "anio": 2025,
            "fecha_emision": "2025-01-10",
            "fecha_notificacion": "2025-01-15",
            "medio_comunicacion": "CORREO",
            "dni_recepciona": "10101010",
            "apellidos_nombres": "LUZ ROJAS",
        },
    )
    r1 = client.post(
        "/api/v1/solicitudes",
        headers={"Authorization": f"Bearer {superadmin_token}"},
        json=p1,
    )
    assert r1.status_code == 201, r1.text
    ids.append(r1.json()["id"])

    p2 = crear_solicitud_payload(
        exp_sgd=exp2,
        nit="2222-3333-NIT-0000002",
        asegurado_titular="PEDRO FLORES",
        tipo_tramite="SUBSIDIO",
        datos_subsidio={"motivo": "MATERNIDAD", "riesgo": "MATERNIDAD", "decision_resolucion": "EN PARTE"},
    )
    r2 = client.post(
        "/api/v1/solicitudes",
        headers={"Authorization": f"Bearer {superadmin_token}"},
        json=p2,
    )
    assert r2.status_code == 201, r2.text
    ids.append(r2.json()["id"])
    return ids, exp1, exp2


def test_buscar_por_cada_criterio(client, superadmin_token):
    ids, exp1, exp2 = setup_datos(client, superadmin_token)
    try:
        headers = {"Authorization": f"Bearer {superadmin_token}"}
        # por NIT (parcial/tal como se registro)
        r = client.get("/api/v1/consultas", headers=headers, params={"nit": "2222-3333"})
        assert r.status_code == 200
        assert r.json()["total"] == 1
        assert r.json()["items"][0]["exp_sgd"] == exp2
        # por EXP SGD
        r = client.get("/api/v1/consultas", headers=headers, params={"exp_sgd": exp1})
        assert r.json()["total"] == 1
        # por DNI/C.E.
        r = client.get("/api/v1/consultas", headers=headers, params={"dni_ce": "10366944"})
        assert r.json()["total"] == 2
        # por asegurado (subcadena)
        r = client.get("/api/v1/consultas", headers=headers, params={"asegurado_titular": "QUISPE"})
        assert r.json()["total"] == 1
        assert r.json()["items"][0]["datos_seguro"]["riesgo"] == "LACTANCIA"
        assert r.json()["items"][0]["resolucion"]["numero_resolucion"] == "0001"
        assert r.json()["items"][0]["resolucion"]["anio"] == 2025
        # paginacion
        r = client.get("/api/v1/consultas", headers=headers, params={"page": 1, "page_size": 1})
        assert r.json()["total"] == 2
        assert len(r.json()["items"]) == 1
    finally:
        for sid in ids:
            eliminar_solicitud_test(sid)


def test_detalle_solicitud(client, superadmin_token):
    ids, _exp1, _exp2 = setup_datos(client, superadmin_token)
    try:
        r = client.get(
            f"/api/v1/consultas/{ids[0]}",
            headers={"Authorization": f"Bearer {superadmin_token}"},
        )
        assert r.status_code == 200
        assert r.json()["id"] == ids[0]
        r = client.get("/api/v1/consultas/999999999", headers={"Authorization": f"Bearer {superadmin_token}"})
        assert r.status_code == 404
    finally:
        for sid in ids:
            eliminar_solicitud_test(sid)


def test_consulta_solo_lectura(client, superadmin_token):
    usuario = "test_consulta_actos"
    eliminar_usuario_test(usuario)
    try:
        r = client.post(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {superadmin_token}"},
            json={"usuario": usuario, "password": "TestPass123!", "role_ids": [rol_c()]},
        )
        assert r.status_code == 201, r.text
        r = client.post("/api/v1/auth/login", data={"username": usuario, "password": "TestPass123!"})
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        # puede consultar
        r2 = client.get("/api/v1/consultas", headers=headers)
        assert r2.status_code == 200
        # no puede escribir
        r3 = client.post(
            "/api/v1/solicitudes",
            headers=headers,
            json=crear_solicitud_payload(),
        )
        assert r3.status_code == 403
        r4 = client.get("/api/v1/catalogos", headers={})
        assert r4.status_code == 401
        r5 = client.get("/api/v1/catalogos", headers=headers)
        assert r5.status_code == 200
    finally:
        eliminar_usuario_test(usuario)


def rol_c():
    from tests.conftest import rol_id

    return rol_id("CONSULTA")