# Sistema de Gestión de Actos Administrativos (ESSALUD)

Sistema web empresarial para el registro y gestión de **Actos Administrativos**: solicitudes de Seguro y Subsidio, resoluciones, recursos de reconsideración y apelación, usuarios, roles, auditoría, respaldos e información histórica.

## Estado del proyecto

**FASE 1 — ANÁLISIS:** completada (análisis de `BD_ACTOS.xlsm` y `antes.xlsx`, documentación en `docs/`).
**FASE 2 — DISEÑO DE BD:** completada (16 tablas, 9 constraints CHECK, ver `docs/BASE_DATOS.md`).
**FASE 3 — CONFIGURACIÓN NEON:** completada (schema aplicado vía Alembic + seed de roles/permisos/superadmin).
**FASES 5–7 — AUTH + RBAC + USUARIOS:** completadas (`/api/v1/auth` con JWT access+refresh y rate limit; dependencias RBAC verificadas en backend; CRUD de usuarios solo SUPERADMIN con auditoría; 18 pruebas Pytest en verde).
**FASE 8–12 — MÓDULO DE ACTOS ADMINISTRATIVOS (backend):** completada (validaciones del cliente en backend para NIT/EXP SGD/RUC/DNI-CE/resolución/nota; rutas `/api/v1/solicitudes{/resolucion,/reconsideracion,/apelacion}`, `/api/v1/consultas` con búsqueda+orden+paginación, `/api/v1/catalogos`; auditoría por bloque; RBAC por operación; +12 pruebas en verde → 30 en total).
**FASE 13–16 (backend) — AUDITORÍA, BACKUPS, MIGRACIÓN (Excel) Y REPORTES:** completada (routers `/api/v1/auditoria`, `/api/v1/backups`, `/api/v1/importaciones`, `/api/v1/reportes`; flujo Excel con DRY RUN y detección de duplicados; respaldos `pg_dump`/`pg_restore` con retención y verificación de herramientas en `estado-herramientas`; reportes por tipo/riesgo/año).
**FRONTEND (React SPA):** completada (login, layout por rol con menú RBAC, dashboard, consulta por NIT/EXP SGD/DNI·C.E./asegurado con paginación y orden, wizard de proceso nuevo SEGURO/SUBSIDIO, detalle con registro de resolución/reconsideración/apelación, usuarios y roles, auditoría, backups, importaciones Excel, reportes con exportación CSV, perfil). Build (`tsc -b && vite build`) y lint (`oxlint`) en verde.
Pendiente: confirmación de las DECISIONES PENDIENTES (DP-01…DP-11), pruebas automatizadas del frontend (Vitest/RTL/Playwright) y hardening/deploy.

## Credenciales de arranque (bootstrap)

Usuario inicial creado por el script `backend/scripts/seed.py` (valores desde `backend/.env`):
- Usuario: `superadmin` · Contraseña: `umKdGl0GBjozDtIk`
- Rol: **SUPERADMIN**
- Las credenciales reales viven en `backend/.env` (ignorado por git). Cambia la contraseña en producción.

## Tecnologías

- **Backend:** Python · FastAPI · SQLAlchemy · Alembic · Pydantic
- **BD:** PostgreSQL (proveedor **Neon**)
- **Frontend:** React · TypeScript · Vite · React Hook Form · Zod
- **Seguridad:** JWT · hashing seguro · RBAC · auditoría
- **Testing:** Pytest · Vitest · React Testing Library · Playwright

## Estructura

| Origen | Contenido | Rol en el sistema |
|---|---|---|
| `BD_ACTOS.xlsm` | 33 columnas (hoja `Hoja3`) | Formulario nuevo de Actos Administrativos (referencia principal) |
| `antes.xlsx` | 35 columnas (hoja `Control Resoluciones`) | Información histórica para migración y análisis |

> Prioridad de fuentes: (1) requerimientos de la empresa → (2) `BD_ACTOS.xlsm` → (3) `antes.xlsx` → (4) decisiones técnicas.

## Documentación

| Documento | Contenido |
|---|---|
| [docs/ANALISIS_REQUERIMIENTOS.md](docs/ANALISIS_REQUERIMIENTOS.md) | Inventario completo de requerimientos y DECISIONES PENDIENTES |
| [docs/COMPARACION_EXCEL.md](docs/COMPARACION_EXCEL.md) | Comparación requerimiento vs. `BD_ACTOS.xlsm` vs. `antes.xlsx` |
| [docs/FLUJO_PROCESO.md](docs/FLUJO_PROCESO.md) | Flujo de proceso nuevo, búsqueda y recursos |
| [docs/BASE_DATOS.md](docs/BASE_DATOS.md) | Diseño propuesto de base de datos (PostgreSQL/Neon) |
| [docs/RBAC.md](docs/RBAC.md) | Roles, permisos y control de acceso |
| [docs/MIGRACION.md](docs/MIGRACION.md) | Migración del histórico con DRY RUN |
| [docs/BACKUPS.md](docs/BACKUPS.md) | Estrategia de respaldos |
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Arquitectura del sistema (frontend/backend/BD) |
| [docs/SEGURIDAD.md](docs/SEGURIDAD.md) | Autenticación, RBAC, validación y auditoría |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Pasos de instalación, configuración y despliegue |
| [docs/REQUERIMIENTOS.md](docs/REQUERIMIENTOS.md) | Requerimientos funcionales originales de la empresa (íntegros) |

## DECISIONES PENDIENTES (requieren confirmación del cliente)

Ver `docs/ANALISIS_REQUERIMIENTOS.md` §6. Resumen:

| ID | Tema |
|---|---|
| DP-01 | Formato de NIT histórico vs. nuevo (`XXXX-XXXX-NIT-XXXXXXX`) |
| DP-02 | Nº Resolución: 4 dígitos nuevo vs. 6 dígitos histórico |
| DP-03 | MOTIVO en flujo SEGURO (¿obligatorio u opcional?) |
| DP-04 | Estado de Notificación histórico |
| DP-05 | Valores de decisión históricos vs. catálogo |
| DP-06 | Riesgo histórico abreviado (`EN`/`MA`) |
| DP-07 | Columnas históricas adicionales (Correo, Telef, Whatsapp, Monto, etc.) |
| DP-08 | ¿Existen recursos históricos de reconsideración/apelación a migrar? |
| DP-09 | Normalización Resolución→Reconsideración→Apelación |
| DP-10 | Encabezado extendido `Fecha de Sobre NIT en el SIAD...` |
| DP-11 | Columna sin encabezado con notas de cargo |

## Próximos pasos (FASES)

1. ~~FASE 1 · Análisis de requerimientos y archivos~~ ✅
2. ~~FASE 2 · Diseño e implementación de BD~~ ✅ (schema en Neon)
3. ~~FASE 3 · Configuración de Neon~~ ✅
4. ~~FASE 5–7 · Autenticación, roles y usuarios~~ ✅
5. ~~FASE 4/8–12 · Actos, búsqueda, resoluciones, reconsideraciones, apelaciones~~ ✅
6. ~~FASE 13–16 · Auditoría, backups, migración Excel, reportes (backend)~~ ✅
7. ~~Frontend React SPA completo (login, consulta, registro, recursos, usuarios, auditoría, respaldos, importaciones, reportes)~~ ✅ build y lint en verde
8. FASE 17–19 · Confirmación de DECISIONES PENDIENTES, pruebas frontend (Vitest/RTL/Playwright), seguridad y deploy