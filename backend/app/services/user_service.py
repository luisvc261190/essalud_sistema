from __future__ import annotations

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.security import hash_password
from app.errors import AppError
from app.models.security import Role, RolePermission, User, UserRole

# Roles que un ADMIN puede asignar al crear usuarios dentro de su cupo.
ROLES_CREABLES_POR_ADMIN = {"OPERADOR", "CONSULTA"}
# Rol reservado al seed; nunca debe asignarse desde la API.
ROL_PROTEGIDO = "SUPERADMIN"


def rol_names(user: User) -> list[str]:
    return [ur.role.nombre for ur in user.roles]


def permission_codes_of(user: User) -> list[str]:
    codigos: list[str] = []
    for ur in user.roles:
        for rp in ur.role.permissions:
            codigos.append(rp.permission.codigo)
    return sorted(set(codigos))


def _with_recursos(q):
    """Carga roles->permisos y creador para evitar consultas N+1."""
    return q.options(
        joinedload(User.roles)
        .joinedload(UserRole.role)
        .joinedload(Role.permissions)
        .joinedload(RolePermission.permission),
        joinedload(User.creado_por),
    )


def list_users(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
) -> tuple[list[User], int]:
    query = db.query(User)
    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                User.usuario.ilike(like),
                User.nombres.ilike(like),
                User.apellidos.ilike(like),
            )
        )
    total = query.count()
    items = (
        _with_recursos(query)
        .order_by(User.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items, total


def get_user(db: Session, user_id: int) -> User | None:
    return _with_recursos(db.query(User)).filter(User.id == user_id).first()


def eliminar_usuario(db: Session, user_id: int) -> User | None:
    """Elimina un usuario solo si no tiene registros asociados (evita romper FK).

    Si el usuario tiene actividad (usuarios creados, solicitudes, auditorias o
    respaldos) lanza AppError pidiendo bloquearlo en lugar de eliminarlo.
    """
    from app.models.actos import Solicitud
    from app.models.auditoria import AuditLog, BackupLog

    user = get_user(db, user_id)
    if not user:
        return None

    motivos: list[str] = []
    creados = (
        db.query(func.count(User.id)).filter(User.usuario_creador_id == user_id).scalar() or 0
    )
    if creados:
        motivos.append(f"{creados} usuario(s)")
    solicitudes = (
        db.query(func.count(Solicitud.id))
        .filter(or_(Solicitud.created_by == user_id, Solicitud.updated_by == user_id))
        .scalar()
        or 0
    )
    if solicitudes:
        motivos.append(f"{solicitudes} solicitud(es)")
    auditorias = (
        db.query(func.count(AuditLog.id)).filter(AuditLog.user_id == user_id).scalar() or 0
    )
    if auditorias:
        motivos.append(f"{auditorias} registro(s) de auditoria")
    backups = (
        db.query(func.count(BackupLog.id)).filter(BackupLog.creado_por == user_id).scalar() or 0
    )
    if backups:
        motivos.append(f"{backups} respaldo(s)")

    if motivos:
        raise AppError(
            400,
            f"No se puede eliminar: el usuario tiene actividad asociada "
            f"({', '.join(motivos)}). Puede bloquearlo en su lugar.",
        )

    db.delete(user)
    db.flush()
    return user


def create_user(
    db: Session,
    *,
    usuario: str,
    password: str,
    nombres: str | None,
    apellidos: str | None,
    email: str | None,
    is_active: bool,
    role_ids: list[int],
    creado_por_id: int | None = None,
    max_usuarios: int | None = None,
) -> User:
    if db.query(User).filter(User.usuario == usuario).first():
        raise AppError(400, "El nombre de usuario ya existe.")
    user = User(
        usuario=usuario,
        password_hash=hash_password(password),
        nombres=nombres,
        apellidos=apellidos,
        email=email,
        is_active=is_active,
        usuario_creador_id=creado_por_id,
        max_usuarios=max_usuarios,
    )
    db.add(user)
    db.flush()
    for role_id in set(role_ids):
        _asignar_rol_simple(db, user, role_id)
    db.flush()
    return user


def update_user(db: Session, user: User, **kwargs) -> User:
    if "password" in kwargs and kwargs["password"]:
        kwargs["password_hash"] = hash_password(kwargs.pop("password"))
    for campo, valor in kwargs.items():
        # Solo actualizar si el valor no es None, excepto para is_active cuando es explícitamente False
        if valor is not None:
            setattr(user, campo, valor)
    db.flush()
    return user


def _asignar_rol_simple(db: Session, user: User, role_id: int) -> None:
    if not db.get(Role, role_id):
        raise AppError(400, f"Rol {role_id} inexistente.")
    if any(ur.role_id == role_id for ur in user.roles):
        return
    user.roles.append(UserRole(role_id=role_id))
    db.flush()


def asignar_rol(db: Session, user: User, role_id: int) -> User:
    _asignar_rol_simple(db, user, role_id)
    return user


def remover_rol(db: Session, user: User, role_id: int) -> User:
    match = next((ur for ur in user.roles if ur.role_id == role_id), None)
    if not match:
        raise AppError(404, "El usuario no tiene ese rol.")
    user.roles.remove(match)
    db.flush()
    return user


def contador_usuarios_creados(db: Session, admin_id: int) -> int:
    """Cuantos usuarios ha creado un administrador (para controlar su cupo)."""
    return (
        db.query(func.count(User.id))
        .filter(User.usuario_creador_id == admin_id)
        .scalar()
        or 0
    )


def contar_usuarios_creados_por_admins(
    db: Session, admin_ids: list[int]
) -> dict[int, int]:
    """Conteo agrupado de usuarios creados para varios administradores (evita N+1)."""
    if not admin_ids:
        return {}
    filas = (
        db.query(User.usuario_creador_id, func.count(User.id))
        .filter(User.usuario_creador_id.in_(admin_ids))
        .group_by(User.usuario_creador_id)
        .all()
    )
    return {admin_id: total for admin_id, total in filas}


def rol_ids_por_nombre(db: Session) -> dict[str, int]:
    """Mapa nombre de rol -> id para validar roles objetivo en la creacion."""
    return {rol.nombre: rol.id for rol in db.query(Role).all()}


def list_roles(db: Session) -> list[Role]:
    return db.query(Role).order_by(Role.id.asc()).all()


def rol_out_payload(role: Role) -> dict:
    return {
        "id": role.id,
        "nombre": role.nombre,
        "descripcion": role.descripcion,
        "permissions": sorted(rp.permission.codigo for rp in role.permissions),
    }