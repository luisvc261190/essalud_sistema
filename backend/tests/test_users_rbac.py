from tests.conftest import (
    crear_usuario_test,
    eliminar_usuario_test,
)


def test_superadmin_crea_usuario(client, superadmin_token):
    usuario = "test_operador_1"
    eliminar_usuario_test(usuario)
    try:
        r = client.post(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {superadmin_token}"},
            json={
                "usuario": usuario,
                "password": "TestPass123!",
                "nombres": "Op",
                "apellidos": "Erador",
                "email": None,
                "is_active": True,
                "role_ids": [rol_id_safe("OPERADOR")],
            },
        )
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["usuario"] == usuario
        assert data["roles"] == ["OPERADOR"]
        assert "password" not in data and "password_hash" not in data
    finally:
        eliminar_usuario_test(usuario)


def test_usuario_duplicado_rechazado(client, superadmin_token):
    usuario = "test_operador_2"
    eliminar_usuario_test(usuario)
    try:
        payload = {
            "usuario": usuario,
            "password": "TestPass123!",
            "role_ids": [rol_id_safe("OPERADOR")],
        }
        r1 = client.post(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {superadmin_token}"},
            json=payload,
        )
        assert r1.status_code == 201
        r2 = client.post(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {superadmin_token}"},
            json=payload,
        )
        assert r2.status_code == 400
    finally:
        eliminar_usuario_test(usuario)


def test_operador_no_puede_gestionar_usuarios(client, superadmin_token):
    usuario = "test_operador_3"
    eliminar_usuario_test(usuario)
    try:
        id_user = crear_usuario_test(
            client, superadmin_token, usuario, "OPERADOR"
        )
        assert id_user is not None
        r = client.post(
            "/api/v1/auth/login",
            data={"username": usuario, "password": "TestPass123!"},
        )
        assert r.status_code == 200
        token_operador = r.json()["access_token"]

        # OPERADOR no tiene GESTIONAR_USUARIOS -> 403
        r2 = client.get(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {token_operador}"},
        )
        assert r2.status_code == 403

        r3 = client.get(
            "/api/v1/roles",
            headers={"Authorization": f"Bearer {token_operador}"},
        )
        assert r3.status_code == 403
    finally:
        eliminar_usuario_test(usuario)


def test_consulta_solo_lectura(client, superadmin_token):
    usuario = "test_consulta_1"
    eliminar_usuario_test(usuario)
    try:
        id_user = crear_usuario_test(
            client, superadmin_token, usuario, "CONSULTA"
        )
        assert id_user is not None
        r = client.post(
            "/api/v1/auth/login",
            data={"username": usuario, "password": "TestPass123!"},
        )
        token_consulta = r.json()["access_token"]

        # CONSULTA no puede crear usuarios ni nada de escritura
        r2 = client.post(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {token_consulta}"},
            json={
                "usuario": "otro_user",
                "password": "TestPass123!",
                "role_ids": [],
            },
        )
        assert r2.status_code == 403
    finally:
        eliminar_usuario_test(usuario)


def test_desactivar_usuario_impide_login(client, superadmin_token):
    usuario = "test_consulta_2"
    eliminar_usuario_test(usuario)
    try:
        id_user = crear_usuario_test(
            client, superadmin_token, usuario, "CONSULTA"
        )
        assert id_user is not None
        r = client.patch(
            f"/api/v1/users/{id_user}",
            headers={"Authorization": f"Bearer {superadmin_token}"},
            json={"is_active": False},
        )
        assert r.status_code == 200
        assert r.json()["is_active"] is False

        r2 = client.post(
            "/api/v1/auth/login",
            data={"username": usuario, "password": "TestPass123!"},
        )
        assert r2.status_code == 401
    finally:
        eliminar_usuario_test(usuario)


def test_no_se_muestra_password_algun_lado(client, superadmin_token):
    usuario = "test_operador_4"
    eliminar_usuario_test(usuario)
    try:
        r = client.post(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {superadmin_token}"},
            json={
                "usuario": usuario,
                "password": "TestPass123!",
                "role_ids": [rol_id_safe("OPERADOR")],
            },
        )
        assert r.status_code == 201
        texto = r.text
        assert "TestPass123!" not in texto
        assert "$2b$" not in texto
    finally:
        eliminar_usuario_test(usuario)


def test_roles_listado_para_superadmin(client, superadmin_token):
    r = client.get(
        "/api/v1/roles", headers={"Authorization": f"Bearer {superadmin_token}"}
    )
    assert r.status_code == 200
    nombres = [x["nombre"] for x in r.json()]
    assert set(nombres) == {"SUPERADMIN", "ADMIN", "OPERADOR", "CONSULTA"}


def test_cambiar_rol_registra_auditoria(client, superadmin_token, db):
    usuario = "test_operador_5"
    eliminar_usuario_test(usuario)
    try:
        id_user = crear_usuario_test(
            client, superadmin_token, usuario, "OPERADOR"
        )
        assert id_user is not None
        r = client.post(
            f"/api/v1/users/{id_user}/roles",
            headers={"Authorization": f"Bearer {superadmin_token}"},
            json={"role_id": rol_id_safe("CONSULTA")},
        )
        assert r.status_code == 200
        assert set(r.json()["roles"]) == {"OPERADOR", "CONSULTA"}

        from app.models.auditoria import AuditLog

        log = (
            db.query(AuditLog)
            .filter(
                AuditLog.registro_id == id_user,
                AuditLog.accion == "CAMBIAR_ROL",
            )
            .order_by(AuditLog.id.desc())
            .first()
        )
        assert log is not None
        assert log.informacion_anterior == {"roles": ["OPERADOR"]}
        assert set(log.informacion_nueva["roles"]) == {"OPERADOR", "CONSULTA"}
    finally:
        eliminar_usuario_test(usuario)


def rol_id_safe(nombre):
    from tests.conftest import rol_id

    return rol_id(nombre)
