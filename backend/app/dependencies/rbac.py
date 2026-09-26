from __future__ import annotations

from fastapi import Depends, HTTPException, status
from sqlalchemy import inspect as sa_inspect
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.security import Permission, RolePermission, User


def _permisos_en_memoria(user: User) -> set[str] | None:
    """Permisos ya cargados por `get_current_user`, o None si falta algun eslabon.

    `get_current_user` carga el usuario con `roles -> role -> permissions ->
    permission` en una sola sentencia, asi que los codigos ya estan en memoria.
    Consultarlos otra vez costaba un viaje extra a la base de datos en *cada*
    peticion, que es justo lo que hacia lento al buscador en tiempo real.
    """
    estado = sa_inspect(user)
    if "roles" in estado.unloaded:
        return None

    codigos: set[str] = set()
    for usuario_rol in user.roles:
        estado_rol = sa_inspect(usuario_rol)
        if "role" in estado_rol.unloaded or usuario_rol.role is None:
            return None
        rol = usuario_rol.role
        if "permissions" in sa_inspect(rol).unloaded:
            return None
        for rol_permiso in rol.permissions:
            estado_permiso = sa_inspect(rol_permiso)
            if "permission" in estado_permiso.unloaded:
                return None
            if rol_permiso.permission is not None and rol_permiso.permission.codigo:
                codigos.add(rol_permiso.permission.codigo)
    return codigos


def _permissions_of_user(db: Session, user: User) -> set[str]:
    codigos = _permisos_en_memoria(user)
    if codigos is not None:
        return codigos

    consulta = (
        db.query(Permission.codigo)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(RolePermission.role)
        .filter(
            RolePermission.role_id.in_([ur.role_id for ur in user.roles]),
        )
        .all()
    )
    return {c[0] for c in consulta}


def get_permissions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> set[str]:
    return _permissions_of_user(db, user)


def require_permission(codigo: str):
    """Crea una dependencia que exige un permiso concreto (403 si falta)."""

    def checker(
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        permisos = _permissions_of_user(db, user)
        if codigo not in permisos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permiso requerido: {codigo}.",
            )
        return user

    return checker


def require_any_permission(*codigos: str):
    """Crea una dependencia que exige al menos uno de los permisos (403 si ninguno)."""

    def checker(
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        permisos = _permissions_of_user(db, user)
        if not codigos or not permisos.intersection(codigos):
            detalle = " o ".join(f"{c}" for c in codigos) if codigos else "-"
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permiso requerido: {detalle}.",
            )
        return user

    return checker


def require_superadmin(
    user: User = Depends(get_current_user),
) -> User:
    """Acceso exclusivo del rol SUPERADMIN (ej. respaldos manuales)."""
    if not any(ur.role.nombre == "SUPERADMIN" for ur in user.roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accion permitida solo para el SUPERADMIN.",
        )
    return user


def is_superadmin(user: User = Depends(get_current_user)) -> bool:
    return any(ur.role.nombre == "SUPERADMIN" for ur in user.roles)