from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import decode_access_token, decode_refresh_token
from app.models.security import Role, RolePermission, User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def _query_con_recursos(query):
    """Carga roles->permisos en una sola consulta (evita N+1 en /me y RBAC)."""
    return query.options(
        joinedload(User.roles)
        .joinedload(UserRole.role)
        .joinedload(Role.permissions)
        .joinedload(RolePermission.permission)
    )


def get_user_from_db(db: Session, user_id: int) -> User:
    user = (
        _query_con_recursos(db.query(User))
        .filter(User.id == user_id)
        .first()
    )
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario inactivo o inexistente.",
        )
    return user


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    user_id = decode_access_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de acceso invalido o expirado.",
        )
    return get_user_from_db(db, user_id)


def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User | None:
    if not token:
        return None
    user_id = decode_access_token(token)
    if user_id is None:
        return None
    return get_user_from_db(db, user_id)


def get_user_id_from_refresh(token: str) -> int:
    user_id = decode_refresh_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token invalido o expirado.",
        )
    return user_id