# Arquitectura del Sistema

## Visión general

Aplicación web de 3 capas:

```
Navegador (React SPA)
      │  HTTPS / API JSON
      ▼
FastAPI (backend, capa de aplicación y negocio)
      │  SQLAlchemy
      ▼
PostgreSQL (Neon, cloud)
```

## Frontend (React + TypeScript + Vite)

- SPA servida estáticamente; la API se consume bajo `/api/v1`.
- `src/services/api.ts`: instancia axios con `Authorization: Bearer`, refresh automático de tokens (interceptor 401 → `/auth/refresh`) y normalización de errores a `ApiError`.
- `src/services/endpoints.ts`: contratos tipados de todas las rutas del backend.
- `src/hooks/useAuth.tsx`: estado de sesión (login, logout, `usuario`, `roles`, `permisos`, `tienePermiso`).
- `src/components/guards.tsx`: `RutaProtegida` (sesión) y `RutaPorPermiso` (RBAC por ruta).
- Validación de formularios con React Hook Form + Zod (`src/schemas/validation.ts`).
- Módulos por dominio: `src/pages/*` (pantallas) y `src/features/solicitudes/*` (wizard y recursos).

## Backend (FastAPI + SQLAlchemy)

- `app/main.py` registra los routers bajo `/api/v1`.
- `app/routers/`: `auth`, `users`, `roles`, `solicitudes`, `consultas`, `catalogos`, `auditoria`, `backups`, `importaciones`, `reportes`.
- `app/models/`: modelos SQLAlchemy (16 tablas, constraints CHECK).
- `app/schemas/`: esquemas Pydantic de entrada/salida.
- `app/core/security.py`: hashing de contraseñas (PBKDF2/bcrypt) y JWT.
- `app/core/deps.py` + `app/rbac.py`: control de acceso por permiso.
- `app/services/auditoria.py`: registro auditado por operación.
- Migraciones con Alembic (`backend/alembic/`).

## Base de datos (PostgreSQL/Neon)

- Conexión centralizada en `app/core/config.py` vía `DATABASE_URL`.
- Seed de datos base: `backend/scripts/seed.py` (roles, permisos, superadmin).
- Respaldos y restauración vía `pg_dump`/`pg_restore` (ver `docs/BACKUPS.md`).

## Flujo de datos (acto administrativo)

1. `NuevaSolicitudPage` recorre pasos: ¿proceso nuevo? → datos base → rama SEGURO/SUBSIDIO → resolución.
2. `POST /api/v1/solicitudes` crea el trámite con su resolución (validaciones cliente y servidor).
3. `ConsultasPage` (ActosAdminPage) busca por NIT / EXP SGD / DNI·C.E. / asegurado con paginación y orden.
4. `SolicitudDetallePage` permite registrar resolución, reconsideración y apelación según permisos.
5. Todo lo determinante se audita y las operaciones de recursos verifican el orden del flujo.