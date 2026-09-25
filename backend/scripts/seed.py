"""Seed inicial: roles, permisos y usuario SUPERADMIN.

Uso:
    python -m scripts.seed
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.security import Permission, Role, RolePermission, User, UserRole

# Matriz RBAC (igual que docs/RBAC.md §3)
ROLES = {
    "SUPERADMIN": "Acceso total: usuarios, permisos, auditoria, backups.",
    "ADMIN": "Gestion de operaciones, reportes y tareas administrativas.",
    "OPERADOR": "Registro de actos, resoluciones, reconsideraciones y apelaciones.",
    "CONSULTA": "Solo lectura: buscar, consultar y visualizar.",
}

PERMISOS = {
    "CONSULTAR_SOLICITUDES": ("Buscar y ver tramites.", ("SUPERADMIN", "ADMIN", "OPERADOR", "CONSULTA")),
    "CREAR_SOLICITUD": ("Registrar proceso nuevo (pasos 1-22).", ("SUPERADMIN", "ADMIN", "OPERADOR")),
    "EDITAR_SOLICITUD": ("Modificar un tramite.", ("SUPERADMIN", "ADMIN", "OPERADOR")),
    "CREAR_RESOLUCION": ("Registrar resolucion del acto.", ("SUPERADMIN", "ADMIN", "OPERADOR")),
    "EDITAR_RESOLUCION": ("Modificar resolucion.", ("SUPERADMIN", "ADMIN", "OPERADOR")),
    "CREAR_RECONSIDERACION": ("Registrar recurso de reconsideracion.", ("SUPERADMIN", "ADMIN", "OPERADOR")),
    "CREAR_APELACION": ("Registrar recurso de apelacion.", ("SUPERADMIN", "ADMIN", "OPERADOR")),
    "EXPORTAR_REPORTES": ("Generar/exportar reportes.", ("SUPERADMIN", "ADMIN")),
    "GESTIONAR_USUARIOS": ("CRUD de usuarios.", ("SUPERADMIN",)),
    "CREAR_USUARIOS": ("Crear usuarios de operacion dentro del cupo asignado.", ("SUPERADMIN", "ADMIN")),
    "ASIGNAR_ROLES": ("Asignar/cambiar roles.", ("SUPERADMIN",)),
    "ADMINISTRAR_PERMISOS": ("Configurar permisos.", ("SUPERADMIN",)),
    "GESTIONAR_BACKUPS": ("Generar/administrar/restaurar respaldos.", ("SUPERADMIN",)),
    "GESTIONAR_IMPORTACIONES": ("Solicitar/confirmar migraciones historicas.", ("SUPERADMIN", "ADMIN")),
    "CONSULTAR_AUDITORIA": ("Ver registro de auditoria.", ("SUPERADMIN",)),
}


def run():
    db = SessionLocal()
    try:
        roles = {}
        for nombre, desc in ROLES.items():
            rol = db.query(Role).filter_by(nombre=nombre).first()
            if not rol:
                rol = Role(nombre=nombre, descripcion=desc)
                db.add(rol)
                db.flush()
            roles[nombre] = rol

        permisos = {}
        for codigo, (desc, _roles) in PERMISOS.items():
            perm = db.query(Permission).filter_by(codigo=codigo).first()
            if not perm:
                perm = Permission(codigo=codigo, descripcion=desc)
                db.add(perm)
                db.flush()
            permisos[codigo] = perm

        for codigo, (_desc, roles_names) in PERMISOS.items():
            for nombre in roles_names:
                existente = db.query(RolePermission).filter_by(
                    role_id=roles[nombre].id, permission_id=permisos[codigo].id
                ).first()
                if not existente:
                    db.add(
                        RolePermission(
                            role_id=roles[nombre].id,
                            permission_id=permisos[codigo].id,
                        )
                    )

        if settings.SEED_SUPERADMIN_USERNAME and settings.SEED_SUPERADMIN_PASSWORD:
            usuario = (
                db.query(User).filter_by(usuario=settings.SEED_SUPERADMIN_USERNAME).first()
            )
            if not usuario:
                usuario = User(
                    usuario=settings.SEED_SUPERADMIN_USERNAME,
                    password_hash=hash_password(settings.SEED_SUPERADMIN_PASSWORD),
                    nombres=settings.SEED_SUPERADMIN_NOMBRES,
                    apellidos=settings.SEED_SUPERADMIN_APELLIDOS,
                    email=settings.SEED_SUPERADMIN_EMAIL or None,
                    is_active=True,
                )
                db.add(usuario)
                db.flush()
                db.add(UserRole(user_id=usuario.id, role_id=roles["SUPERADMIN"].id))
            else:
                print(f"[seed] el usuario {usuario.usuario} ya existe; sin cambios.")

        db.commit()
        print("[seed] roles, permisos y superadmin listos.")
    finally:
        db.close()


if __name__ == "__main__":
    run()