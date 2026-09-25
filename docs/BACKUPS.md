# ESTRATEGIA DE RESPALDOS (BACKUPS)

> Estado: **FASE 1 — ANÁLISIS / diseño propuesto** | Fecha: 2026-09-24
> Reglas del cliente: backups de PostgreSQL, respaldo periódico, almacenamiento seguro, política de retención, procedimiento de restauración, registro (log) de backups y acceso restringido a usuarios autorizados. **Las credenciales de Neon nunca deben estar en React.**

---

## 1. Contexto

- Base de datos: **PostgreSQL** alojada en **Neon**.
- Responsabilidad: el proveedor da alta disponibilidad del clúster, pero el clúster **no sustituye** los respaldos lógicos propios (protección ante errores operativos y de migración).
- Estrategia: backup **lógico** (`pg_dump`) periódico + política de retención + restauración verificable.

## 2. Tipos de respaldo

| Tipo | Frecuencia | Herramienta | Contenido |
|---|---|---|---|
| `PERIODICO` | diario (configurable) | `pg_dump` (custom format) | esquema + datos + owners |
| `MANUAL` | a demanda (solo autorizados) | `pg_dump` | igual |
| copia de migración | previo a cada importación | `pg_dump` del estado actual | punto de restauración antes de migrar |

## 3. Ubicación del secreto

- `DATABASE_URL` (cadena de Neon con credencial) sólo en variables de entorno del **backend** (`.env`, no versionado; mock en `.env.example`).
- **Nunca** en código frontend ni en bundle de React.
- El backend actúa como único orquestador de `pg_dump` (servicio `backups`), autenticado con permisos `GESTIONAR_BACKUPS`.

## 4. Flujo de generación

1. Usuario autorizado (SUPERADMIN) solicita o el scheduler dispara el respaldo.
2. El servicio ejecuta `pg_dump -Fc` sobre la conexión de Neon.
3. El archivo se genera en almacenamiento seguro (bucket privado con cifrado, o carpeta con permisos restringidos según despliegue).
4. Se calcula `sha256` del archivo (integridad).
5. Se registra `backup_logs`: tipo, estado, archivo, tamaño, fechas, usuario.
6. La descarga/restauración queda auditada (`BACKUP`, `RESTAURAR_BACKUP`).

## 5. Almacenamiento y cifrado

- Almacenamiento separado de la BD (no en el mismo clúster).
- Cifrado en tránsito (TLS en Neon) y en reposo según proveedor de almacenamiento.
- Contraseña de cifrado del archivo, si aplica, en secretos del backend (nunca en el repo).

## 6. Política de retención

| Antigüedad | Cantidad conservada |
|---|---|
| últimos 7 días | todos los respaldos diarios |
| semanas 2–4 | 1 por semana |
| meses 2–6 | 1 por mes |
| > 6 meses | según normativa del cliente (decisión pendiente) |

- La purga automática se ejecuta en el job de respaldo y se registra.
- Retención configurable por variable de entorno (`BACKUP_RETENTION_*`).

## 7. Restauración

Procedimiento documentado y verificable:
1. Seleccionar respaldo desde la pantalla (SUPERADMIN) o ejecutar vía script.
2. Verificación previa de integridad (`pg_restore --list` o `pg_restore -l`).
3. Restaurar hacia la instancia de Neon (base nueva o reemplazo según aprobación).
4. Validación post-restauración: conteo de registros, fecha del respaldo y smoke test de login/API.
5. Registro en `backup_logs` y auditoría.

> La restauración **destructiva** sobre el clúster en uso requiere confirmación explícita; por defecto se restaura a base temporal.

## 8. Registro (log)

Tabla `backup_logs` (ver `BASE_DATOS.md`): tipo, estado, archivo, tamaño, fechas, creador. Se audita siempre con `BACKUP` y `RESTAURAR_BACKUP`.

## 9. Acceso

- Generar/administrar/restaurar: solo `SUPERADMIN` (`GESTIONAR_BACKUPS`).
- CONSULTA/OPERADOR/ADMIN: **sin** acceso a backups (ver `RBAC.md`).
- El endpoint `/api/v1/backups` valida permiso en backend (no solo ocultar botón).

## 10. Scheduler

- Job periódico (APScheduler o tarea externa según despliegue) con horario configurable por variable de entorno.
- En ausencia de scheduler, existe comando CLI `scripts/backup.py` (mismo servicio interno).

## 11. Checklist de implementación (FASE 14)

- [ ] Servicio `backups.service` (pg_dump + cifrado + sha256).
- [ ] Endpoints `/api/v1/backups`: listar, crear (manual), descargar, restaurar, log.
- [ ] Job periódico + políticas de retención/purga.
- [ ] Registro en `backup_logs` y auditoría.
- [ ] Pruebas (Pytest): permiso, formato, integridad, restauración a base temporal.
- [ ] Documento `BACKUPS.md` actualizado con el procedimiento operativo final.