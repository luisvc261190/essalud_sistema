# MIGRACIÓN DE INFORMACIÓN HISTÓRICA (`antes.xlsx`)

> Estado: **FASE 1 — ANÁLISIS / diseño propuesto** | Fecha: 2026-09-24
> Regla absoluta: **nunca modificar silenciosamente un dato histórico.** Si hay diferencia de formato (dato original vs normalizado) se pueden conservar ambos cuando sea necesario. No se inventan conversiones que puedan destruir información.

---

## 1. Fuente

`antes.xlsx` — hoja `Control Resoluciones` — 35 columnas. Muestra analizada: 5 filas de datos (el archivo del cliente puede ampliarse; el proceso es agnóstico al tamaño).

Consulta en `COMPARACION_EXCEL.md` §2 y §4 el detalle por columna.

## 2. Objetivo

- Incorporar los trámites históricos al nuevo sistema **sin** convertirlos en requisito de diseño.
- Conservar **todas** las columnas del histórico (incluidas las que no existen en el formulario de 33 campos).
- Permitir consulta por NIT, EXP SGD, DNI/C.E. y Asegurado Titular sobre datos históricos.
- Documentar las discrepancias con el formato nuevo.

## 3. Pipeline obligatorio

```
Excel ──> Lectura ──> Análisis ──> Normalización ──> Validación ──> Detección de duplicados ──> Vista previa ──> Confirmación ──> Importación
```

Con **DRY RUN**: ejecuta todo el proceso de validación sin insertar datos.

Estados por importación (tabla `importaciones` y `importacion_registros`, ver `BASE_DATOS.md` §3.3):
`ANALIZADO → VALIDADO → PREVISTO → IMPORTADO | CANCELADO`.

## 4. Reglas de normalización por campo (solo para INSERTAR en el núcleo)

Las normalizaciones siguientes **no** modifican archivos fuente: se aplican sobre una copia en memoria y el valor original se conserva en `datos_historicos`.

| Campo `antes.xlsx` | Normalización al núcleo | Conservación original |
|---|---|---|
| NIT | Si cumple `XXXX-XXXX-NIT-XXXXXXX` → directo. Si no, **no** se reformatea; el valor literal se guarda en `datos_historicos.nit_original` (DP-01) | ✅ sí |
| Exp. SGD | A texto (16 dígitos); se valida que comience en 0; no truncar | ✅ |
| F_Recepcion | `datetime` → `DATE` (eliminar hora `00:00:00`) | ✅ |
| RUC | **Numérico → texto** con 11 dígitos (evita pérdida de ceros); si tiene menos dígitos se conserva literal en histórico y se registra advertencia | ✅ |
| Entidad Empleadora | `strip()` | ✅ |
| Asegurado | `strip()` | ✅ |
| DNI/CE | A texto conservando ceros (`08558356`); si es numérico (10366944) se formatea a texto sin pérdida | ✅ |
| Decisión Resolución | No se traduce automáticamente. Se guarda literal. El mapeo a catálogo (`IMPROCEDENTE`, `RECONSIDERACIÓN INFUNDADO`, `PROCEDENTE EN PARTE`, `REINTEGRO/PROCEDENTE`) requiere aprobación (DP-05) | ✅ |
| Riego | Se guarda literal (`EN`, `MA`). Registro de mapeo supuesto `EN=ENFERMEDAD`, `MA=MATERNIDAD` como dato informativo, sin alterar el original (DP-06) | ✅ |
| N° Resolución | Se guarda literal (6 dígitos). No se recorta a 4 (DP-02) | ✅ |
| AÑO | SMALLINT | ✅ |
| F_Resolución | → DATE | ✅ |
| Fecha de Notificación | → DATE | ✅ |
| Col 34 fórmula (derivarse calificador) | Se lee el **valor calculado** (`data_only`) y se guarda como fecha | ✅ |
| Columnas adicionales | Todo el resto → `datos_historicos` (tabla de extensión) | ✅ |

### Valores de decisión y riesgos históricos observados

| Campo | Valores vistos en la muestra |
|---|---|
| Decisión Resolución | `IMPROCEDENTE`, `RECONSIDERACIÓN INFUNDADO` |
| Riego | `EN`, `MA` |
| (fórmula col 34 referencia) | `PROCEDENTE EN PARTE`, `RECONSIDERACIÓN FUNDADO`, `REINTEGRO/PROCEDENTE EN PARTE`, `REINTEGRO/PROCEDENTE` |

Estos valores no pertenecen al catálogo nuevo en su totalidad → ninguno se fuerza; se registran literales (DP-05/DP-06).

## 5. Detección de duplicados

Claves posibles por orden de fiabilidad:
1. `EXP SGD` (identificador único del trámite).
2. `NIT` + `F_RECEPCION` + `ASEGURADO`.
3. Tolerancia a espacios, mayúsculas y ceros.

Comportamiento en DRY RUN: se lista cada duplicado con la fila de origen y el motivo; **ninguna** inserción ocurre sin la vista previa y confirmación.

## 6. Dato original vs normalizado

Cuando difieran (NIT, Nº Resolución, RUC numérico, DNI numérico, decisión, riesgo), el sistema conserva **ambos**:
- El literal en `datos_historicos.nit_original`, etc.
- El valor de trabajo en la columna correspondiente del núcleo **solo si** la normalización no cambia el significado (fechas→DATE, números→texto).

## 7. Registro de errores y advertencias

Por cada fila leída se guarda en `importacion_registros`:
- `estado`: `OK` / `ADVERTENCIA` / `ERROR`.
- Mensajes legibles (ej. "NIT con formato distinto; conservado literal", "RUC numérico convertido a texto 11 dígitos").
- No se descarta una fila solo por discrepancias de formato; se importa con su original intacto.

## 8. Vista previa y confirmación

- El DRY RUN genera una vista previa por pantalla (filas a insertar, filas con advertencia, duplicados).
- La **confirmación** solo la puede ejecutar un usuario con permiso `GESTIONAR_IMPORTACIONES` (SUPERADMIN/ADMIN según matriz final; ver `RBAC.md`).
- La importación definitiva trabaja en una **transacción** sobre una copia del archivo (hash para detectar reimportaciones).

## 9. Proyección a la base (destino)

- Núcleo: `solicitudes` + `datos_seguro`/`datos_subsidio`/`resoluciones` cuando hay mapeo seguro.
- Extensión: `datos_historicos` (siempre, sin excepción).
- Los bloques de reconsideración/apelación **no** se deducen del histórico sin aprobación del cliente (DP-08).

## 10. Decisiones pendientes que afectan la migración

Ver `ANALISIS_REQUERIMIENTOS.md` §6:
- DP-01 formato NIT; DP-02 Nº Resolución; DP-04 Estado de Notificación; DP-05 decisiones; DP-06 riesgo abreviado; DP-07 columnas adicionales; DP-08 recursos históricos; DP-10 encabezado extendido; DP-11 columna sin título.