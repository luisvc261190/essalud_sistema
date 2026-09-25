from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from app.core.security import verify_password
from app.models.security import Role, RolePermission, User, UserRole


def authenticate_user(db: Session, usuario: str, password: str) -> User | None:
    user = (
        db.query(User)
        .options(
            joinedload(User.roles)
            .joinedload(UserRole.role)
            .joinedload(Role.permissions)
            .joinedload(RolePermission.permission)
        )
        .filter(User.usuario == usuario)
        .first()
    )
    if not user or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)