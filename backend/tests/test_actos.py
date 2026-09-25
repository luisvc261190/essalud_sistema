from tests.conftest import (
    crear_solicitud_payload,
    eliminar_solicitud_test,
    resolucion_payload,
)

NIT = "1234-5678-NIT-0012345"
EXP = "0048220250000824"


def crear_una(client, token, payload):
    r = client.post(
        "/api/v1/solicitudes",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    return r


def test_crear_solicitud_seguro_completa(client, superadmin_token):
    payload = crear_solicitud_payload(
        datos_seguro={
            "riesgo": "ALTA TITULAR",
            "decision_resolucion": "BAJA DE OFICIO",
            "motivo": "AUDITORIA",
        },
        resolucion=resolucion_payload(numero_resolucion="12"),
    )
    r = crear_una(client, superadmin_token, payload)
    assert r.status_code == 201, r.text
    data = r.json()
    sid = data["id"]
    try:
        # NIT normalizado
        assert data["nit"] == NIT
        # resolucion con ceros a la izquierda (12 -> 0012)
        assert data["resolucion"]["numero_resolucion"] == "0012"
        assert data["datos_seguro"] == {
            "riesgo": "ALTA TITULAR",
            "decision_resolucion": "BAJA DE OFICIO",
            "motivo": "AUDITORIA",
        }
        assert data["datos_subsidio"] is None
        assert data["origen"] == "REGISTRO"
    finally:
        eliminar_solicitud_test(sid)


def test_crear_solicitud_subsidio_con_apelacion(client, superadmin_token):
    payload = crear_solicitud_payload(
        exp_sgd="0100000000000001",
        tipo_tramite="SUBSIDIO",
        datos_subsidio={
            "motivo": "LICENCIA MATERNIDAD",
            "riesgo": "MATERNIDAD",
            "decision_resolucion": "PROCEDENTE",
        },
    )
    # SUBSIDIO no tiene "PROCEDENTE"; debe fallar (decision invalida)
    r = crear_una(client, superadmin_token, payload)
    assert r.status_code == 422
    # Decision correcta
    payload["datos_subsidio"]["decision_resolucion"] = "EN PARTE"
    r = crear_una(client, superadmin_token, payload)
    assert r.status_code == 201, r.text
    sid = r.json()["id"]
    try:
        assert r.json()["datos_subsidio"]["riesgo"] == "MATERNIDAD"
        assert r.json()["datos_subsidio"]["motivo"] == "LICENCIA MATERNIDAD"

        # apelacion: nota de derivacion 6 digitos (12 -> 000012)
        r2 = client.post(
            f"/api/v1/solicitudes/{sid}/apelacion",
            headers={"Authorization": f"Bearer {superadmin_token}"},
            json={
                "fecha_recepcion": "2026-03-01",
                "numero_nota_derivacion": "12",
                "fecha_nota": "2026-03-02",
            },
        )
        assert r2.status_code == 201, r2.text
        assert r2.json()["apelacion"]["numero_nota_derivacion"] == "000012"
    finally:
        eliminar_solicitud_test(sid)


def test_validaciones_de_formato(client, superadmin_token):
    casos = [
        {"nit": "1234"},
        {"nit": "AB12-5678-NIT-0012345"},
        {"exp_sgd": "004822025000082"},
        {"exp_sgd": "00482202500008245"},
        {"exp_sgd": "1148220250000824"},
        {"exp_sgd": "0048220250000abc"},
        {"ruc": "2022563408"},
        {"dni_ce": "123"},
    ]
    for inv in casos:
        payload = crear_solicitud_payload(
            datos_seguro={"riesgo": "LACTANCIA", "decision_resolucion": "BAJA DE OFICIO"}
        )
        payload.update(inv)
        r = crear_una(client, superadmin_token, payload)
        assert r.status_code in (400, 422), (inv, r.status_code, r.text)


def test_formateo_parcial_nit_y_resoluciones(client, superadmin_token):
    # NIT parcial: ultimo grupo con ceros a la izquierda
    payload = crear_solicitud_payload(
        nit="1234-5678-NIT-12",
        datos_seguro={"riesgo": "LACTANCIA", "decision_resolucion": "BAJA DE OFICIO"},
    )
    r = crear_una(client, superadmin_token, payload)
    assert r.status_code == 201, r.text
    sid = r.json()["id"]
    try:
        assert r.json()["nit"] == "1234-5678-NIT-0000012"
    finally:
        eliminar_solicitud_test(sid)

    # resolucion: 5 -> 0005, 123 -> 0123, 1234 -> 1234
    for entrada, esperado in (("5", "0005"), ("123", "0123"), ("1234", "1234")):
        p = crear_solicitud_payload(
            exp_sgd=f"0{entrada}{'0' * (15 - len(entrada))}"[:16],
            datos_seguro={
                "riesgo": "ENFERMEDAD",
                "decision_resolucion": "RESOLUCION DE MULTA",
            },
            resolucion=resolucion_payload(numero_resolucion=entrada),
        )
        r = crear_una(client, superadmin_token, p)
        assert r.status_code == 201, (entrada, r.text)
        sid2 = r.json()["id"]
        try:
            assert r.json()["resolucion"]["numero_resolucion"] == esperado
        finally:
            eliminar_solicitud_test(sid2)


def test_rama_obligatoria_y_excluyente(client, superadmin_token):
    # sin rama
    r = crear_una(client, superadmin_token, crear_solicitud_payload())
    assert r.status_code == 400
    # SUBSIDIO con datos de SEGURO
    payload = crear_solicitud_payload(
        tipo_tramite="SUBSIDIO",
        datos_seguro={"riesgo": "ALTA TITULAR", "decision_resolucion": "BAJA DE OFICIO"},
    )
    r = crear_una(client, superadmin_token, payload)
    assert r.status_code == 400
    # SEGURO con datos de SUBSIDIO
    payload = crear_solicitud_payload(
        datos_subsidio={"motivo": "X", "riesgo": "LACTANCIA", "decision_resolucion": "IMPROCEDENTE"}
    )
    r = crear_una(client, superadmin_token, payload)
    assert r.status_code == 400


def test_exp_sgd_duplicado_rechazado(client, superadmin_token):
    payload = crear_solicitud_payload(
        datos_seguro={"riesgo": "LACTANCIA", "decision_resolucion": "BAJA DE OFICIO"}
    )
    r1 = crear_una(client, superadmin_token, payload)
    assert r1.status_code == 201
    sid = r1.json()["id"]
    try:
        r2 = crear_una(client, superadmin_token, payload)
        assert r2.status_code == 400
    finally:
        eliminar_solicitud_test(sid)


def test_crear_editar_resolucion_y_duplicado(client, superadmin_token):
    payload = crear_solicitud_payload(
        datos_seguro={"riesgo": "ENFERMEDAD", "decision_resolucion": "RESOLUCION DE MULTA"}
    )
    r = crear_una(client, superadmin_token, payload)
    sid = r.json()["id"]
    try:
        # crear resolucion
        r1 = client.post(
            f"/api/v1/solicitudes/{sid}/resolucion",
            headers={"Authorization": f"Bearer {superadmin_token}"},
            json=resolucion_payload(numero_resolucion="8"),
        )
        assert r1.status_code == 201, r1.text
        assert r1.json()["resolucion"]["numero_resolucion"] == "0008"
        # duplicar
        r2 = client.post(
            f"/api/v1/solicitudes/{sid}/resolucion",
            headers={"Authorization": f"Bearer {superadmin_token}"},
            json=resolucion_payload(numero_resolucion="9"),
        )
        assert r2.status_code == 400
        # editar
        r3 = client.patch(
            f"/api/v1/solicitudes/{sid}/resolucion",
            headers={"Authorization": f"Bearer {superadmin_token}"},
            json=resolucion_payload(numero_resolucion="777"),
        )
        assert r3.status_code == 200
        assert r3.json()["resolucion"]["numero_resolucion"] == "0777"
    finally:
        eliminar_solicitud_test(sid)


def test_recursos_vinculados_no_duplican_tramite(client, superadmin_token):
    payload = crear_solicitud_payload(
        datos_seguro={"riesgo": "AUDITORIA", "decision_resolucion": "RESOLUCION DE MULTA"}
    )
    r = crear_una(client, superadmin_token, payload)
    sid = r.json()["id"]
    try:
        # reconsideracion
        r1 = client.post(
            f"/api/v1/solicitudes/{sid}/reconsideracion",
            headers={"Authorization": f"Bearer {superadmin_token}"},
            json={
                "fecha_recepcion": "2026-04-01",
                "numero_resolucion": "21",
                "anio": 2026,
                "fecha_emision": "2026-04-05",
                "decision_resolucion": "INFUNDADO",
                "fecha_notificacion": "2026-04-10",
                "medio_comunicacion": "PRESENCIAL",
                "dni_recepciona": "9999999",
                "apellidos_nombres": "PEDRO SOLIS",
            },
        )
        assert r1.status_code == 201, r1.text
        assert r1.json()["reconsideracion"]["numero_resolucion"] == "0021"
        # duplicado
        r2 = client.post(
            f"/api/v1/solicitudes/{sid}/reconsideracion",
            headers={"Authorization": f"Bearer {superadmin_token}"},
            json=r1.json()["reconsideracion"] | {"anio": 2026},
        )
        assert r2.status_code == 409
        # apelacion
        r3 = client.post(
            f"/api/v1/solicitudes/{sid}/apelacion",
            headers={"Authorization": f"Bearer {superadmin_token}"},
            json={
                "fecha_recepcion": "2026-05-01",
                "numero_nota_derivacion": "345678",
                "fecha_nota": "2026-05-02",
            },
        )
        assert r3.status_code == 201
        assert r3.json()["apelacion"]["numero_nota_derivacion"] == "345678"
        # sigue siendo el mismo tramite (no se duplico)
        assert r3.json()["id"] == sid
        assert r3.json()["exp_sgd"] == EXP
    finally:
        eliminar_solicitud_test(sid)


def test_editar_solicitud_y_cambio_de_rama(client, superadmin_token):
    payload = crear_solicitud_payload(
        datos_seguro={"riesgo": "LACTANCIA", "decision_resolucion": "BAJA DE OFICIO"}
    )
    r = crear_una(client, superadmin_token, payload)
    sid = r.json()["id"]
    try:
        # editar solo asegurado_titular
        r1 = client.patch(
            f"/api/v1/solicitudes/{sid}",
            headers={"Authorization": f"Bearer {superadmin_token}"},
            json={"asegurado_titular": "JOSE ALVAREZ"},
        )
        assert r1.status_code == 200
        assert r1.json()["asegurado_titular"] == "JOSE ALVAREZ"
        assert r1.json()["datos_seguro"] is not None  # rama intacta
        # cambio de tipo sin rama -> error
        r2 = client.patch(
            f"/api/v1/solicitudes/{sid}",
            headers={"Authorization": f"Bearer {superadmin_token}"},
            json={"tipo_tramite": "SUBSIDIO"},
        )
        assert r2.status_code == 400
        # cambio de tipo con nueva rama -> ok, rama vieja se elimina
        r3 = client.patch(
            f"/api/v1/solicitudes/{sid}",
            headers={"Authorization": f"Bearer {superadmin_token}"},
            json={
                "tipo_tramite": "SUBSIDIO",
                "datos_subsidio": {
                    "motivo": "SEPELIO",
                    "riesgo": "SEPELIO",
                    "decision_resolucion": "DENEGATORIA",
                },
            },
        )
        assert r3.status_code == 200, r3.text
        assert r3.json()["datos_subsidio"]["riesgo"] == "SEPELIO"
        assert r3.json()["datos_seguro"] is None
    finally:
        eliminar_solicitud_test(sid)