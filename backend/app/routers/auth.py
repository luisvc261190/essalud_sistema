from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token
from app.dependencies.auth import get_current_user, get_user_id_from_refresh
from app.dependencies.rate_limit import login_rate_limiter
from app.models.security import Role, RolePermission, User, UserRole
from app.schemas.auth import RefreshRequest, TokenResponse, UserMe
from app.services.audit_service import registrar_auditoria
from app.services.auth_service import authenticate_user
from app.services.user_service import permission_codes_of, rol_names

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_me(user) -> UserMe:
    return UserMe(
        id=user.id,
        usuario=user.usuario,
        nombres=user.nombres,
        apellidos=user.apellidos,
        email=user.email,
        roles=rol_names(user),
        permissions=permission_codes_of(user),
    )


@router.post("/login", response_model=TokenResponse)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    ip = request.client.host if request.client else "?"
    login_rate_limiter.check(ip)
    login_rate_limiter.check(f"{ip}:{form_data.username.lower()}")

    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales invalidas o usuario inactivo.",
        )

    registrar_auditoria(
        db,
        user_id=user.id,
        accion="LOGIN",
        entidad="users",
        registro_id=user.id,
        request=request,
    )
    db.commit()

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=_user_me(user),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    user_id = get_user_id_from_refresh(payload.refresh_token)
    user = (
        db.query(User)
        .options(
            joinedload(User.roles)
            .joinedload(UserRole.role)
            .joinedload(Role.permissions)
            .joinedload(RolePermission.permission)
        )
        .filter(User.id == user_id)
        .first()
    )
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario inactivo o inexistente.",
        )
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=_user_me(user),
    )


@router.get("/me", response_model=UserMe)
def me(user=Depends(get_current_user)):
    return _user_me(user)


@router.post("/logout")
def logout():
    # Con JWT sin estado el token se descarta en el cliente; se documenta
    # la limitacion (revocacion requiere denylist) en docs/SEGURIDAD.md.
    return {"mensaje": "Sesion cerrada. Descarte los tokens en el cliente."}