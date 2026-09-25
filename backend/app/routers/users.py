from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.rbac import require_any_permission, require_permission, require_superadmin
from app.schemas.users import (
    PaginatedUsers,
    UserCreate,
    UserOut,
    UserRoleAssign,
    UserUpdate,
)
from app.services.audit_service import registrar_auditoria
from app.services.user_service import (
    ROLES_CREABLES_POR_ADMIN,
    ROL_PROTEGIDO,
    asignar_rol,
    contador_usuarios_creados,
    contar_usuarios_creados_por_admins,
    create_user,
    eliminar_usuario as eliminar_usuario_service,
    get_user,
    list_users,
    permission_codes_of,
    remover_rol,
    rol_ids_por_nombre,
    rol_names,
    update_user,
)

router = APIRouter(prefix="/users", tags=["users"])

PERMISO_GESTIONAR = "GESTIONAR_USUARIOS"
PERMISO_CREAR = "CREAR_USUARIOS"


def _es_gestion_total(user) -> bool:
    return PERMISO_GESTIONAR in permission_codes_of(user)


def _user_out(user, usuarios_creados: int = 0) -> UserOut:
    creador = user.creado_por
    return UserOut(
        id=user.id,
        usuario=user.usuario,
        nombres=user.nombres,
        apellidos=user.apellidos,
        email=user.email,
        is_active=user.is_active,
        roles=rol_names(user),
        max_usuarios=user.max_usuarios,
        usuarios_creados=usuarios_creados,
        usuario_creador_id=user.usuario_creador_id,
        usuario_creador=creador.usuario if creador else None,
        created_at=user.created_at,
    )


@router.get("", response_model=PaginatedUsers)
def listar_usuarios(
    _=Depends(require_any_permission(PERMISO_GESTIONAR, PERMISO_CREAR)),
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    items, total = list_users(db, page=page, page_size=page_size, search=search)
    conteos = contar_usuarios_creados_por_admins(db, [u.id for u in items])
    return PaginatedUsers(
        items=[_user_out(u, conteos.get(u.id, 0)) for u in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def crear_usuario(
    payload: UserCreate,
    request: Request,
    current_user=Depends(require_any_permission(PERMISO_GESTIONAR, PERMISO_CREAR)),
    db: Session = Depends(get_db),
):
    es_gestion_total = _es_gestion_total(current_user)
    role_ids = list(set(payload.role_ids or []))
    rol_ids = rol_ids_por_nombre(db)

    if role_ids and rol_ids.get(ROL_PROTEGIDO) in role_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El rol {ROL_PROTEGIDO} no puede asignarse desde la API.",
        )

    max_usuarios = payload.max_usuarios
    if es_gestion_total:
        # Solo SUPERADMIN puede crear administradores o fijar cupos.
        if role_ids and rol_ids.get("ADMIN") in role_ids and payload.max_usuarios is None:
            max_usuarios = 0
    else:
        # ADMIN: solo crea OPERADOR/CONSULTA dentro de su cupo.
        permitidos = {
            rol_ids[nombre] for nombre in ROLES_CREABLES_POR_ADMIN if nombre in rol_ids
        }
        if not role_ids or not set(role_ids).issubset(permitidos):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El administrador solo puede crear usuarios OPERADOR o CONSULTA.",
            )
        cupo = current_user.max_usuarios or 0
        usados = contador_usuarios_creados(db, current_user.id)
        if cupo <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Su cuenta no tiene cupo asignado para crear usuarios. Contacte al SUPERADMIN.",
            )
        if usados >= cupo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cupo de creacion agotado ({usados}/{cupo}). Contacte al SUPERADMIN.",
            )
        max_usuarios = None

    user = create_user(
        db,
        usuario=payload.usuario,
        password=payload.password,
        nombres=payload.nombres,
        apellidos=payload.apellidos,
        email=payload.email,
        is_active=payload.is_active,
        role_ids=role_ids,
        creado_por_id=current_user.id,
        max_usuarios=max_usuarios,
    )
    registrar_auditoria(
        db,
        user_id=current_user.id,
        accion="CREAR_USUARIO",
        entidad="users",
        registro_id=user.id,
        informacion_nueva={
            "usuario": user.usuario,
            "nombres": user.nombres,
            "apellidos": user.apellidos,
            "is_active": user.is_active,
            "role_ids": role_ids,
            "max_usuarios": user.max_usuarios,
        },
        request=request,
    )
    db.commit()
    db.refresh(user)
    return _user_out(user)


@router.get("/{user_id}", response_model=UserOut)
def detalle_usuario(
    user_id: int,
    _=Depends(require_any_permission(PERMISO_GESTIONAR, PERMISO_CREAR)),
    db: Session = Depends(get_db),
):
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    return _user_out(user, contador_usuarios_creados(db, user_id))


@router.patch("/{user_id}", response_model=UserOut)
def editar_usuario(
    user_id: int,
    payload: UserUpdate,
    request: Request,
    current_user=Depends(require_permission(PERMISO_GESTIONAR)),
    db: Session = Depends(get_db),
):
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    anterior = {
        "nombres": user.nombres,
        "apellidos": user.apellidos,
        "email": user.email,
        "max_usuarios": user.max_usuarios,
    }
    if payload.max_usuarios is not None:
        update_user(db, user, max_usuarios=payload.max_usuarios)
    
    # Filtrar campos None para la actualización
    update_fields = {}
    if payload.nombres is not None:
        update_fields["nombres"] = payload.nombres
    if payload.apellidos is not None:
        update_fields["apellidos"] = payload.apellidos
    if payload.email is not None:
        update_fields["email"] = payload.email
    if payload.password is not None:
        update_fields["password"] = payload.password
    
    if update_fields:
        update_user(db, user, **update_fields)
    db.flush()
    posterior = {
        "nombres": user.nombres,
        "apellidos": user.apellidos,
        "email": user.email,
        "max_usuarios": user.max_usuarios,
    }
    registrar_auditoria(
        db,
        user_id=current_user.id,
        accion="EDITAR_USUARIO",
        entidad="users",
        registro_id=user.id,
        informacion_anterior=anterior,
        informacion_nueva=posterior,
        request=request,
    )
    db.commit()
    db.refresh(user)
    return _user_out(user, contador_usuarios_creados(db, user_id))


def _proteger_superadmin(user) -> None:
    if ROL_PROTEGIDO in rol_names(user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se permite bloquear, modificar o eliminar a un SUPERADMIN.",
        )


@router.post("/{user_id}/bloquear", response_model=UserOut)
def bloquear_usuario(
    user_id: int,
    request: Request,
    current_user=Depends(require_permission(PERMISO_GESTIONAR)),
    db: Session = Depends(get_db),
):
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    _proteger_superadmin(user)
    anterior = {"is_active": user.is_active, "bloqueado": False}
    update_user(db, user, is_active=False)
    db.flush()
    posterior = {"is_active": False, "bloqueado": True}
    registrar_auditoria(
        db,
        user_id=current_user.id,
        accion="BLOQUEAR_USUARIO",
        entidad="users",
        registro_id=user.id,
        informacion_anterior=anterior,
        informacion_nueva=posterior,
        request=request,
    )
    db.commit()
    db.refresh(user)
    return _user_out(user, contador_usuarios_creados(db, user_id))


@router.post("/{user_id}/desbloquear", response_model=UserOut)
def desbloquear_usuario(
    user_id: int,
    request: Request,
    current_user=Depends(require_permission(PERMISO_GESTIONAR)),
    db: Session = Depends(get_db),
):
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    _proteger_superadmin(user)
    anterior = {"is_active": user.is_active, "bloqueado": True}
    update_user(db, user, is_active=True)
    db.flush()
    posterior = {"is_active": True, "bloqueado": False}
    registrar_auditoria(
        db,
        user_id=current_user.id,
        accion="DESBLOQUEAR_USUARIO",
        entidad="users",
        registro_id=user.id,
        informacion_anterior=anterior,
        informacion_nueva=posterior,
        request=request,
    )
    db.commit()
    db.refresh(user)
    return _user_out(user, contador_usuarios_creados(db, user_id))


@router.delete("/{user_id}", response_model=UserOut)
def delete_usuario(
    user_id: int,
    request: Request,
    current_user=Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puede eliminarse a si mismo.",
        )
    _proteger_superadmin(user)
    anterior = {
        "usuario": user.usuario,
        "nombres": user.nombres,
        "apellidos": user.apellidos,
        "email": user.email,
        "roles": rol_names(user),
        "is_active": user.is_active,
    }
    respuesta = _user_out(user, 0)
    eliminar_usuario_service(db, user_id)
    registrar_auditoria(
        db,
        user_id=current_user.id,
        accion="ELIMINAR_USUARIO",
        entidad="users",
        registro_id=user_id,
        informacion_anterior=anterior,
        informacion_nueva={"eliminado": True},
        request=request,
    )
    db.commit()
    return respuesta


@router.post("/{user_id}/roles", response_model=UserOut)
def asignar_rol_usuario(
    user_id: int,
    payload: UserRoleAssign,
    request: Request,
    current_user=Depends(require_permission(PERMISO_GESTIONAR)),
    db: Session = Depends(get_db),
):
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    anterior = {"roles": rol_names(user)}
    asignar_rol(db, user, payload.role_id)
    registrar_auditoria(
        db,
        user_id=current_user.id,
        accion="CAMBIAR_ROL",
        entidad="users",
        registro_id=user.id,
        informacion_anterior=anterior,
        informacion_nueva={"roles": rol_names(user)},
        request=request,
    )
    db.commit()
    db.refresh(user)
    return _user_out(user, contador_usuarios_creados(db, user_id))


@router.delete("/{user_id}/roles/{role_id}", response_model=UserOut)
def remover_rol_usuario(
    user_id: int,
    role_id: int,
    request: Request,
    current_user=Depends(require_permission(PERMISO_GESTIONAR)),
    db: Session = Depends(get_db),
):
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    anterior = {"roles": rol_names(user)}
    remover_rol(db, user, role_id)
    registrar_auditoria(
        db,
        user_id=current_user.id,
        accion="CAMBIAR_ROL",
        entidad="users",
        registro_id=user.id,
        informacion_anterior=anterior,
        informacion_nueva={"roles": rol_names(user)},
        request=request,
    )
    db.commit()
    db.refresh(user)
    return _user_out(user, contador_usuarios_creados(db, user_id))