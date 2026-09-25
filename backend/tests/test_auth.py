from tests.conftest import SEED_PASS, SEED_USER


def test_login_exitoso(client):
    r = client.post(
        "/api/v1/auth/login",
        data={"username": SEED_USER, "password": SEED_PASS},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["token_type"] == "bearer"
    assert data["access_token"] and data["refresh_token"]
    assert "SUPERADMIN" in data["user"]["roles"]


def test_login_fallido(client):
    r = client.post(
        "/api/v1/auth/login",
        data={"username": SEED_USER, "password": "contrasenia-mala"},
    )
    assert r.status_code == 401


def test_login_usuario_inexistente(client):
    r = client.post(
        "/api/v1/auth/login",
        data={"username": "no_existe_xyz", "password": SEED_PASS},
    )
    assert r.status_code == 401


def test_me_requiere_token(client):
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 401


def test_me_con_token(client, superadmin_token):
    r = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {superadmin_token}"}
    )
    assert r.status_code == 200
    assert r.json()["usuario"] == SEED_USER
    assert "GESTIONAR_USUARIOS" in r.json()["permissions"]


def test_token_falso(client):
    r = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer no-es-jwt"})
    assert r.status_code == 401


def test_refresh_token(client, superadmin_token):
    r = client.post(
        "/api/v1/auth/login",
        data={"username": SEED_USER, "password": SEED_PASS},
    )
    refresh = r.json()["refresh_token"]
    r2 = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert r2.status_code == 200
    nuevo = r2.json()["access_token"]
    r3 = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {nuevo}"})
    assert r3.status_code == 200


def test_refresh_token_invalido(client):
    r = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": "token-falso"}
    )
    assert r.status_code == 401


def test_login_registra_auditoria(client, db):
    r = client.post(
        "/api/v1/auth/login",
        data={"username": SEED_USER, "password": SEED_PASS},
    )
    assert r.status_code == 200
    from app.models.auditoria import AuditLog
    from app.models.security import User

    user = db.query(User).filter(User.usuario == SEED_USER).first()
    log = (
        db.query(AuditLog)
        .filter(AuditLog.user_id == user.id, AuditLog.accion == "LOGIN")
        .order_by(AuditLog.id.desc())
        .first()
    )
    assert log is not None
    assert log.entidad == "users"
    assert log.created_at is not None


def test_rate_limit_login(client):
    # 5 intentos fallidos rapidos -> el sexto debe ser 429
    for _ in range(5):
        client.post(
            "/api/v1/auth/login",
            data={"username": SEED_USER, "password": "mala-1"},
        )
    r = client.post(
        "/api/v1/auth/login",
        data={"username": SEED_USER, "password": SEED_PASS},
    )
    assert r.status_code == 429