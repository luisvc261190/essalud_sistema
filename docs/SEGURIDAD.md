# Seguridad

## Autenticación

- Login en `POST /api/v1/auth/login` (form-urlencoded). Emite **access token** (corto) + **refresh token** (largo).
- El access token viaja en `Authorization: Bearer` y el refresh en el cuerpo de `/auth/refresh`.
- La SPA guarda ambos en `localStorage`; ante 401 con refresh disponible se renueva automáticamente; si no, se redirige a `/login` y se limpia la sesión.
- Limitación (revocación real del refresh requiere una denylist): documentada como limitación conocida en `app/routers/auth.py`.

## Autorización (RBAC)

- Cada endpoint protegido declara el permiso con `require_permission("CODIGO")` (ver `app/core/deps.py`).
- Permisos: `CONSULTAR_SOLICITUDES`, `CREAR_SOLICITUD`, `EDITAR_SOLICITUD`, `CREAR_RESOLUCION`, `EDITAR_RESOLUCION`, `CREAR_RECONSIDERACION`, `CREAR_APELACION`, `EXPORTAR_REPORTES`, `GESTIONAR_USUARIOS`, `ASIGNAR_ROLES`, `ADMINISTRAR_PERMISOS`, `GESTIONAR_BACKUPS`, `GESTIONAR_IMPORTACIONES`, `CONSULTAR_AUDITORIA`.
- El frontend aplica las mismas reglas en rutas y menú (`RutaPorPermiso`), pero **la autorización real siempre la impone el backend**.

## Validación de datos

- Frontend: React Hook Form + Zod (máscaras y reglas por campo: NIT `XXXX-XXXX-NIT-XXXXXXX`, EXP SGD 16 dígitos, RUC 11, DNI/C.E. 5-10, resolución 4, nota 6).
- Backend: Pydantic + validación de negocio en `app/services` (contraparte autoritativa).

## Registro de auditoría

- Toda operación relevante se registra (`app/services/auditoria.py`): usuario, acción, entidad, registro, información anterior/nueva, IP, fecha.
- Accesible solo con `CONSULTAR_AUDITORIA` (SUPERADMIN).

## Credenciales y secretos

- `backend/.env` contiene `DATABASE_URL`, secretos JWT y credenciales del superadmin; está ignorado por git.
- No exponer contraseñas ni URIs completas de Neon al frontend (los respaldos se ejecutan en el servidor).

## CORS y disciplina de entornos

- CORS restringido a `settings.cors_origins_list`.
- `/docs` (Swagger) deshabilitado en producción.