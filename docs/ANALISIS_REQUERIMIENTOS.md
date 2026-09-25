# ANÁLISIS DE REQUERIMIENTOS — SISTEMA DE GESTIÓN DE ACTOS ADMINISTRATIVOS

> Estado: **FASE 1 — ANÁLISIS** (documento de trabajo)
> Fecha: 2026-09-24
> Fuente principal: requerimientos funcionales de la empresa (prompt maestro).
> Prioridades de fuente: **(1)** requerimientos escritos → **(2)** `BD_ACTOS.xlsm` → **(3)** `antes.xlsx` → **(4)** decisiones técnicas.

---

## 1. Objetivo

Construir un sistema web empresarial para registrar y gestionar **Actos Administrativos** de ESSALUD: registro de solicitudes de Seguro y Subsidio, resolución, recursos de reconsideración, recursos de apelación, usuarios, roles, auditoría, respaldos e información histórica.

---

## 2. Técnica base obligatoria

| Capa | Tecnología |
|---|---|
| Backend | Python + FastAPI + SQLAlchemy + Alembic + Pydantic |
| BD | PostgreSQL (proveedor: **Neon**) |
| Frontend | React + TypeScript + Vite |
| Validaciones | React Hook Form + Zod |
| Seguridad | JWT (access + refresh), hashing de contraseñas, RBAC, auditoría |
| Testing | Pytest, Vitest, React Testing Library, Playwright |

---

## 3. Inventario de requerimientos funcionales

### 3.1 Flujo principal — Paso 1: Proceso nuevo

El primer paso del sistema es la pregunta **¿PROCESO NUEVO?** con alternativas `SI` / `NO`.

- **SI** → inicia el ingreso de datos del Acto Administrativo.
- **NO** → no crea un registro nuevo; muestra la pantalla **BUSCAR SOLICITUDES DEL TRÁMITE**.

Requisito de UI: los campos del acto deben aparecer respetando el orden funcional solicitado.

### 3.2 Paso 2 — NIT

- Formato requerido: `XXXX-XXXX-NIT-XXXXXXX` (todas X numéricas).
- La última parte se completa con **ceros a la izquierda** cuando el usuario ingrese menos dígitos. Ej.: usuario ingresa `12` → sistema muestra `0000012`.
- Formateo automático al escribir o al salir del campo.
- Validación definitiva **también en backend**.
- **Regla histórica**: en `antes.xlsx` el NIT usa otros formatos (ej. `0947-2025-1421`, `260E400175`). **No** modificar datos históricos. Conservar el valor original. Documentar la discrepancia de formato (ver `COMPARACION_EXCEL.md` y `MIGRACION.md`). Prohibido inventar una conversión que destruya información.

### 3.3 Paso 3 — EXP SGD

- Exactamente **16 números**.
- Siempre **comienza en 0** (ejemplo: `0048220250000824`).
- No aceptar letras. No aceptar menos de 16 ni más de 16.
- Almacenar como **texto**, nunca como número.

### 3.4 Paso 4 — FECHA DE RECEPCIÓN

- Formato `DD/MM/YYYY`.
- En PostgreSQL: tipo **DATE** (prohibido VARCHAR para fechas).

### 3.5 Paso 5 — RUC

- Exactamente **11 números** (ejemplo: `20225634085`).
- Almacenar como **texto** (evitar pérdida de ceros).

### 3.6 Paso 6 — ENTIDAD EMPLEADORA

- Máximo **50 caracteres**.

### 3.7 Paso 7 — DNI/C.E.

- **5 a 10 caracteres alfanuméricos**.
- Puede contener cero(s) a la izquierda (ej.: `10366944`, `00012345`, `ABC123`).
- No convertir a número.

### 3.8 Paso 8 — ASEGURADO TITULAR

- Máximo **50 caracteres**.

### 3.9 Paso 9 — TIPO DE TRÁMITE

- Únicamente dos valores: `SEGURO` o `SUBSIDIO`. No se permiten otros.

### 3.10 Flujo SEGURO

Si `TIPO DE TRÁMITE = SEGURO`:
- Pasa por **Paso 10** y **Paso 11** y luego continúa con **Paso 16 en adelante**.
- Los campos de SUBSIDIO **no** se solicitan como obligatorios en este flujo.

#### Paso 10 — RIESGO SEGURO

Valores permitidos (cerrados, sin opción a otros):
`ALTA TITULAR`, `ALTA DERECHOHABIENTE`, `CONDICION DEL ASEGURADO`, `AUDITORIA`, `FISCALIZACION POSTERIOR`, `BAJA TITULAR`, `BAJA DERECHOHABIENTE`, `LACTANCIA`, `ENFERMEDAD`.

#### Paso 11 — DECISIÓN DE RESOLUCIÓN PARA SEGURO

Valores permitidos (cerrados):
`BAJA DE OFICIO`, `RESOLUCION DE MULTA`.

#### Paso 12 — MOTIVO

- Máximo **100 caracteres**, solo caracteres alfanuméricos según especificación del cliente (ver §6 DECISIÓN PENDIENTE).
- Se pide "cuando corresponda según el flujo solicitado".

### 3.11 Flujo SUBSIDIO

Si `TIPO DE TRÁMITE = SUBSIDIO`:
- Pasa por **Paso 12, Paso 13 y Paso 14** y luego continúa con **Paso 16 en adelante**.

#### Paso 13 — RIESGO SUBSIDIO

Valores permitidos (cerrados):
`LACTANCIA`, `ENFERMEDAD`, `MATERNIDAD`, `SEPELIO`, `REINTEGRO`, `FISCALIZACION POSTERIOR`.

#### Paso 14 — DECISIÓN DE RESOLUCIÓN PARA SUBSIDIO

Valores permitidos (cerrados):
`BAJA DE OFICIO`, `DENEGATORIA`, `IMPROCEDENTE`, `EN PARTE`.

#### Paso 15 — MOTIVO

- Máximo **100 caracteres**; cumple la misma regla de caracteres.

> Nota: el documento de la empresa numera dos campos **MOTIVO** (paso 12 y paso 15); `BD_ACTOS.xlsm` contiene ambos (una columna por rama). No se elimina ninguno. Ver §6 DP-03.

### 3.12 Pasos 16–22 — Resolución del acto (bloque común a ambos flujos)

#### Paso 16 — Nº RESOLUCIÓN

- Exactamente **4 números**.
- Relleno con ceros a la izquierda: `12 → 0012`, `5 → 0005`, `123 → 0123`, `1234 → 1234`.
- Almacenar como **texto**; prohibido INTEGER.

#### Paso 17 — AÑO

- Muestra automáticamente el **año actual** (ej. `2026`).
- **Editable**.

#### Paso 18 — FECHA DE EMISIÓN

- Formato `DD/MM/YYYY`.

#### Paso 19 — FECHA DE NOTIFICACIÓN

- Formato `DD/MM/YYYY`.

#### Paso 20 — MEDIO DE COMUNICACIÓN

- Valores permitidos (cerrados): `CORREO`, `PRESENCIAL`, `VIRTUAL`.

#### Paso 21 — DNI QUIEN RECEPCIONA EL DOCUMENTO

- **5 a 10 caracteres alfanuméricos**; puede tener cero inicial.

#### Paso 22 — APELLIDOS Y NOMBRES

- Máximo **50 caracteres**.

### 3.13 Recurso de RECONSIDERACIÓN (Pasos 23–31)

Bloque que se registra sobre una solicitud existente (no duplica el trámite):

| Paso | Campo | Regla |
|---|---|---|
| 23 | FECHA DE RECEPCIÓN | `DD/MM/YYYY` |
| 24 | Nº RESOLUCIÓN | 4 números (`12 → 0012`) |
| 25 | AÑO | año actual, editable |
| 26 | FECHA DE EMISIÓN | `DD/MM/YYYY` |
| 27 | DECISIÓN DE RESOLUCIÓN | `FUNDADO`, `INFUNDADO`, `EN PARTE` |
| 28 | FECHA DE NOTIFICACIÓN | `DD/MM/YYYY` |
| 29 | MEDIO DE COMUNICACIÓN | `CORREO`, `PRESENCIAL`, `VIRTUAL` |
| 30 | DNI QUIEN RECEPCIONA EL DOCUMENTO | 5–10 alfanuméricos |
| 31 | APELLIDOS Y NOMBRES | máx. 50 |

### 3.14 Recurso de APELACIÓN (Pasos 32–34)

| Paso | Campo | Regla |
|---|---|---|
| 32 | FECHA DE RECEPCIÓN | `DD/MM/YYYY` |
| 33 | Nº DE NOTA DE DERIVACIÓN A SGPE | **6 números** (`12 → 000012`, `5 → 000005`, `123456 → 123456`), texto |
| 34 | FECHA DE LA NOTA | `DD/MM/YYYY` |

### 3.15 Numeración global (regla de la empresa)

- Paso 1: proceso nuevo.
- Pasos 2–22: información principal (incluye la resolución del acto).
- Pasos 23–31: reconsideración.
- Pasos 32–34: apelación.
- **No cambiar esta lógica.**

---

## 4. Requerimientos transversales

### 4.1 Login
Pantalla `USUARIO` / `CONTRASEÑA` / `[INGRESAR]`. Autenticación segura; nunca almacenar contraseñas en texto plano.

### 4.2 Roles (RBAC)

| Rol | Capacidades |
|---|---|
| **SUPERADMIN** | crear/editar/activar/desactivar usuarios, asignar roles, administrar permisos, consultar/crear/modificar, backups, auditoría |
| **ADMIN** | gestionar operaciones, consultar/crear/modificar, reportes, determinadas operaciones administrativas |
| **OPERADOR** | registrar actos, consultar, registrar resoluciones, reconsideraciones, apelaciones, modificar según permisos |
| **CONSULTA** | buscar, consultar, visualizar. Sin modificar |

### 4.3 Usuarios
Pantalla `ADMINISTRACIÓN → USUARIOS`. Solo usuarios autorizados. SUPERADMIN puede crear usuario, asignar rol, activar/desactivar, modificar datos, cambiar permisos. **Nunca mostrar la contraseña almacenada.**

### 4.4 Auditoría
Registrar: `LOGIN`, `CREAR_SOLICITUD`, `EDITAR_SOLICITUD`, `CREAR_RESOLUCION`, `EDITAR_RESOLUCION`, `CREAR_RECONSIDERACION`, `CREAR_APELACION`, `CREAR_USUARIO`, `EDITAR_USUARIO`, `CAMBIAR_ROL`, `BACKUP`, etc.
Campos por registro: usuario, acción, fecha/hora, entidad, registro afectado, información anterior (cuando aplique), información nueva (cuando aplique).

### 4.5 Backups
Backup de PostgreSQL, respaldo periódico, almacenamiento seguro, política de retención, procedimiento de restauración, registro (log) de backups. Acceso restringido a autorizados. **Credenciales de Neon nunca en React.**

### 4.6 Migración histórica (`antes.xlsx`)
Analizar todas las columnas, **no** eliminar las columnas históricas aunque no estén en los 33 campos nuevos. Incluir al menos: Correo, Teléfono, Comunicado vía WhatsApp, Autorización Expresa, Dirección, Distrito, Provincia, Departamento, N° Sobre, Fecha de Sobre, Fecha de Notificación, Estado de Notificación, Rótulo de FILE, Tipo Subsidio, RUC/DNI, Monto, Motivo, Observaciones, Plazo de Espera, Fecha de derivación al calificador, Fecha de entrega al calificador.

Pipeline obligatorio: `Excel → Lectura → Análisis → Normalización → Validación → Detección de duplicados → Vista previa → Confirmación → Importación`, con modo **DRY RUN** que no inserta datos.

### 4.7 Consulta / búsqueda (Proceso nuevo = NO)
Criterios: **NIT**, **EXP SGD**, **DNI/C.E.**, **ASEGURADO TITULAR**.
- Respeta las validaciones del criterio.
- Resultados en tabla con al menos: NIT, EXP SGD, Fecha de recepción, RUC, Entidad empleadora, DNI/C.E., Asegurado titular, Tipo de trámite, Riesgo, Decisión, Nº Resolución, Año.
- Fila seleccionable, resaltada y claramente identificada, con botón **CONTINUAR**.
- No cargar toda la BD en el navegador: paginación, filtros, búsqueda, ordenamiento.

### 4.8 Recursos sobre trámite existente
Tras seleccionar un trámite, continuar con **RECURSO DE RECONSIDERACIÓN** o **RECURSO DE APELACIÓN**. No crear trámite duplicado; el recurso queda relacionado al trámite/acto seleccionado.

### 4.9 Reportes y Dashboard
- Reportes con filtros (fechas, tipo de trámite, riesgo, decisión, año, medio de comunicación); exportación Excel/CSV/PDF (cuando corresponda). No deben alterar el flujo solicitado.
- Dashboard informativo con cantidades reales desde PostgreSQL (solicitudes, Seguro, Subsidio, resoluciones, reconsideraciones, apelaciones). Prohibidos valores ficticios.

---

## 5. Requerimientos no funcionales y de seguridad

- HTTPS en producción.
- Password hashing; JWT access + refresh.
- RBAC verificable **desde backend** (no solo UI).
- CORS restringido; rate limiting en login; validación de entradas; protección contra SQL injection; manejo seguro de secretos; cookies seguras cuando apliquen; expiración de sesión.
- Validación duplicada backend (reglas no saltables vía Postman/cURL/browser/llamadas directas).
- Variables de entorno: `DATABASE_URL`, `JWT_SECRET_KEY`, `JWT_REFRESH_SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`, `CORS_ORIGINS`, `ENVIRONMENT`. Nunca valores reales en el repositorio.
- API versionada: `/api/v1/{auth,users,solicitudes,resoluciones,reconsideraciones,apelaciones,consultas,auditoria,backups,importaciones}`.
- Backend estructurado con routers/schemas/models/services/repositories/seguridad; frontend con components/layouts/pages/features/services/hooks/schemas/types/utils.
- Integridad de BD: foreign keys, índices, constraints, transacciones. Sin restricciones que bloqueen la migración histórica antes de analizar los datos.
- Testing obligatorio de: NIT, EXP SGD, RUC, DNI/C.E., Resolución (`12→0012`, `5→0005`, `123→0123`, `1234→1234`), Nota de derivación (`12→000012`, `5→000005`, `123456→123456`), tipo de trámite, riesgos, decisiones, recursos, roles (permisos reales en backend).

---

## 6. DECISIONES PENDIENTES (requieren confirmación del cliente)

> Regla del manejo de cambios: ante inconsistencia no se cambia el requerimiento; se registra `DECISIÓN PENDIENTE` con original, problema, impacto, opciones y solicitud de decisión.

| ID | Requerimiento original | Problema detectado | Impacto | Opciones | ¿Qué hace el sistema mientras tanto? |
|---|---|---|---|---|---|
| DP-01 | NIT formato `XXXX-XXXX-NIT-XXXXXXX` | Histórico usa `0947-2025-1421` y `260E400175` | Validación/búsqueda de históricos | (a) solo validar formato en registros nuevos; (b) almacenar original+normalizado | Validar formato sólo en entradas nuevas; conservar histórico intacto |
| DP-02 | Nº Resolución = 4 números | Histórico tiene 6 dígitos (`000251`) | Migración/lectura histórica | (a) campo texto flexible; (b) nuevo campo 4 dígitos + campo histórico aparte | Campo texto (no INT); no truncar históricos |
| DP-03 | Dos campos MOTIVO (pasos 12 y 15) | El flujo SEGURO documentado salta del paso 11 al 16 (no menciona MOTIVO); el Excel sí tiene MOTIVO en ambas ramas | Qué campo pide el form en flujo SEGURO | (a) MOTIVO sólo en SUBSIDIO; (b) MOTIVO en ambos flujos | Mantener ambos campos en el modelo; en el formulario SEGURO el MOTIVO se presenta sin obligatoriedad hasta confirmación |
| DP-04 | Ningún campo de "Estado de Notificación" en el nuevo form | Histórico tiene `Estado de Notificación` libre (NOTIFICADO, NOTIFICADO Bajo Puerta, CARGO DEVUELTO…) | Conservación de info histórica | (a) tabla histórica aparte; (b) incorporar catálogo al sistema | Conservar en módulo de migración, sin forzar al form nuevo |
| DP-05 | Decisiones nuevo catálogo | Histórico usa valores combinados (`RECONSIDERACIÓN INFUNDADO`, `PROCEDENTE EN PARTE`, `REINTEGRO/PROCEDENTE`, `IMPROCEDENTE`) | Mapeo de valores históricos a catálogo | (a) trascripción literal; (b) mapeo manual aprobado | Trascripción literal hasta decisión del cliente |
| DP-06 | Riesgo SUBSIDIO en catálogo completo | Histórico `Riego` = `EN`, `MA` (abreviaciones) | Interpretación histórica | (a) asumir EN=ENFERMEDAD, MA=MATERNIDAD con registro de mapeo; (b) conservar literal + campo abreviado | Conservar literal + registrar mapeo supuesto en el log de migración |
| DP-07 | Columnas históricas adicionales (Correo, Telef, WhatsApp, Autorización, Dirección, Distrito, Provincia, Dpto, Sobre, Rótulo FILE, Monto, Tipo Subsidio, RUC/DNI, Motivo, Observaciones, Plazos, fechas calificador) | No forman parte de los 33 campos | Dónde alojarlas en la BD | (a) tabla `datos_historicos` extendida; (b) columnas adicionales | Diseñar tabla de extensión histórica que preserva todo |
| DP-08 | Reconsideración/Apelación como bloques propios | Histórico no tiene bloques separados; a veces el tipo de recurso va dentro de la decisión | ¿Existen recursos históricos a registrar? | (a) migrar solo solicitudes; (b) detectar recursos desde la decisión con borrador | No inferir recursos automáticamente; dejar en tarea de importación |
| DP-09 | La "resolución" forma parte del acto (pasos 16–22) y los recursos son bloques sucesivos | La relación conceptual (Solicitud→Resolución→Recurso) es normalizable en BD | Diseño de tablas | (a) 1 solicitud = 1 resolución + 1 reconsideración + 1 apelación (tablas separadas, FK única); (b) todo en una fila | Normalizar sin perder datos (ver BASE_DATOS.md) |
| DP-10 | Encabezado `Fecha de Sobre` | En el histórico el encabezado es `Fecha de Sobre NIT en el SIAD para Tramite Central` | Nomenclatura de migración | (a) renombrar a `Fecha de Sobre`; (b) conservar encabezado original | Conservar encabezado original en el mapeo |
| DP-11 | Historias sin título | Columna 25 del histórico está sin encabezado y contiene notas de cargo | Mapeo de columnas | (a) nombrarla `NOTA_CARGO`; (b) fusión a Observaciones | Nombrarla internamente `NOTA_CARGO`, atributo de solo migración |

---

## 7. Criterio de aceptación resumido

Correcto si cumple: 33 campos, validaciones, flujo de Proceso Nuevo, búsquedas (NIT, EXP SGD, DNI/C.E., Asegurado Titular), selección resaltada + CONTINUAR, registro de Seguro/Subsidio/Resolución/Reconsideración/Apelación, login, roles, usuarios, auditoría, backups, PostgreSQL en Neon, FastAPI/Python, React/TS, info histórica íntegra, seguro y mantenible.