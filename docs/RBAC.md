# RBAC — CONTROL DE ACCESO BASADO EN ROLES

> Estado: **FASE 1 — ANÁLISIS / diseño propuesto** | Fecha: 2026-09-24
> Regla del cliente: los permisos deben verificarse **realmente desde backend** (no solo ocultando botones en el frontend).

---

## 1. Modelo

- Tablas: `users`, `roles`, `permissions`, `user_roles`, `role_permissions` (ver `BASE_DATOS.md` §3.1).
- Un usuario puede tener **uno o varios roles**. La decisión editorial del diseño se mantiene conservadora: un rol por defecto en la creación de usuarios, con opción de asignar más (capacidad SUPERADMIN).
- La autorización se resuelve en **dependencias FastAPI** por endpoint y por objeto de recurso.

## 2. Rol y capacidades mínimas (requerimiento)

| Capacidad | SUPERADMIN | ADMIN | OPERADOR | CONSULTA |
|---|:---:|:---:|:---:|:---:|
| Crear usuarios | ✅ | — | — | — |
| Editar usuarios | ✅ | — | — | — |
| Activar/desactivar usuarios | ✅ | — | — | — |
| Asignar roles | ✅ | — | — | — |
| Administrar permisos | ✅ | — | — | — |
| Crear actos / solicitudes | ✅ | ✅ | ✅ | — |
| Modificar actos / solicitudes | ✅ | ✅ | ✅* | — |
| Consultar / buscar / visualizar | ✅ | ✅ | ✅ | ✅ |
| Registrar resoluciones | ✅ | ✅ | ✅ | — |
| Registrar reconsideraciones | ✅ | ✅ | ✅ | — |
| Registrar apelaciones | ✅ | ✅ | ✅ | — |
| Consultar reportes | ✅ | ✅ | — | — |
| Gestionar operaciones administrativas | ✅ | ✅ | — | — |
| Administrar backups | ✅ | — | — | — |
| Consultar auditoría | ✅ | — | — | — |

(*Solidariedad OPERADOR: modificar "según permisos" según requerimiento; se implementa con permiso granular de edición, ver §5.)

## 3. Catálogo de permisos (matriz)

| Permiso (código) | Descripción | Roles asignados |
|---|---|---|
| `CONSULTAR_SOLICITUDES` | Buscar y ver trámites | S, A, O, C |
| `CREAR_SOLICITUD` | Registrar proceso nuevo (pasos 1–22) | S, A, O |
| `EDITAR_SOLICITUD` | Modificar un trámite | S, A, O |
| `CREAR_RESOLUCION` | Registrar resolución del acto | S, A, O |
| `EDITAR_RESOLUCION` | Modificar resolución | S, A, O |
| `CREAR_RECONSIDERACION` | Registrar recurso de reconsideración | S, A, O |
| `CREAR_APELACION` | Registrar recurso de apelación | S, A, O |
| `EXPORTAR_REPORTES` | Generar/exportar reportes | S, A |
| `GESTIONAR_USUARIOS` | CRUD de usuarios | S |
| `ASIGNAR_ROLES` | Asignar/cambiar roles | S |
| `ADMINISTRAR_PERMISOS` | Configurar permisos | S |
| `GESTIONAR_BACKUPS` | Generar/administrar/restaurar respaldos | S |
| `CONSULTAR_AUDITORIA` | Ver registro de auditoría | S |

S = SUPERADMIN, A = ADMIN, O = OPERADOR, C = CONSULTA.

## 4. Menú por rol (frontend)

| Módulo | SUPERADMIN | ADMIN | OPERADOR | CONSULTA |
|---|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Actos Administrativos | ✅ | ✅ | ✅ | ✅ |
| New Solicitud / Proceso Nuevo | ✅ | ✅ | ✅ | — |
| Consulta | ✅ | ✅ | ✅ | ✅ |
| Resoluciones | ✅ | ✅ | ✅ | — |
| Reconsideraciones | ✅ | ✅ | ✅ | — |
| Apelaciones | ✅ | ✅ | ✅ | — |
| Reportes | ✅ | ✅ | — | — |
| Usuarios | ✅ | — | — | — |
| Auditoría | ✅ | — | — | — |
| Backups | ✅ | — | — | — |
| Perfil / Cerrar sesión | ✅ | ✅ | ✅ | ✅ |

## 5. Cómo se garantiza el control real (backend)

1. **Autenticación**: login → JWT access (corto) + refresh (largo). El middleware de auth resuelve el usuario.
2. **Autorización por permiso**: deps.rbac can load del usuario → `role_permissions` → si falta permiso → **403**.
   - Ej.: crear solicitud exige `CREAR_SOLICITUD`; exportar reportes exige `EXPORTAR_REPORTES`.
3. **Protección de rutas del backend para CONSULTA**: scope de solo lectura (GET) permitido; cualquier POST/PUT/DELETE rechazado.
4. **Registro de auditoría** de cada acción de escritura y de asignación de roles (`CAMBIAR_ROL`).
5. **No se depende de la UI**: el frontend oculta menús según rol, pero toda decisión real de acceso se valida en el API (evitar saltos vía Postman/cURL).
6. Rotación de roles/permisos: al cambiar un rol se registra en auditoría; los JWT en circulación quedan fuera de vigencia al expirar (no hay invalidez inmediata sin mecanismo de denylist; se documenta como mejora opcional).

## 6. Creación de usuarios (flujo)

1. Entrada por `ADMINISTRACIÓN → USUARIOS` (solo SUPERADMIN).
2. Campos: usuario, contraseña (regla de fuerza), nombres, apellidos, email.
3. Asignación de rol(es), activación/desactivación.
4. La contraseña se almacena únicamente como hash (p. ej. `bcrypt`/`argon2`); **nunca** se muestra.
5. El cambio de rol queda auditado con valores anteriores/nuevos.

## 7. Semilla inicial (seed)

- Roles: `SUPERADMIN`, `ADMIN`, `OPERADOR`, `CONSULTA`.
- Permisos del §3 con las asignaciones de la matriz.
- Un usuario SUPERADMIN inicial creado desde variable de entorno (seed), nunca con credenciales en el repositorio.