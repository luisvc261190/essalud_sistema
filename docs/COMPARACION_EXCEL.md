# COMPARACIÓN DE FUENTES EXCEL — SISTEMA DE GESTIÓN DE ACTOS ADMINISTRATIVOS

> Estado: **FASE 1 — ANÁLISIS** | Fecha: 2026-09-24
> Fuentes comparadas:
> - **Requerimientos**: documento de requerimientos funcionales de la empresa (prompt maestro).
> - **`BD_ACTOS.xlsm`**: estructura funcional nueva (hoja `Hoja3`, 33 columnas).
> - **`antes.xlsx`**: información histórica (hoja `Control Resoluciones`, 35 columnas).

**Regla aplicada:** el Excel histórico NO puede modificar los requerimientos de la empresa. Los datos históricos se conservan íntegros; la comparación identifica coincidencias, diferencias y formatos distintos.

---

## 1. Estructura leída de `BD_ACTOS.xlsm`

Archivo: `BD_ACTOS.xlsm` — Hoja: `Hoja3` — `A1:AG1` (solo fila de encabezados; sin datos, sin validaciones de Excel, sin fórmulas, sin celdas combinadas).

| Col | Encabezado (tal cual) | Paso (requerimiento) | Bloque |
|---|---|---|---|
| 1 (A) | NIT | 2 | Principal |
| 2 (B) | EXP SGD | 3 | Principal |
| 3 (C) | FECHA DE RECEPCION | 4 | Principal |
| 4 (D) | RUC | 5 | Principal |
| 5 (E) | ENTIDAD EMPLEADORA | 6 | Principal |
| 6 (F) | DNI/C.E. | 7 | Principal |
| 7 (G) | ASEGURADO TITULAR | 8 | Principal |
| 8 (H) | TIPO DE TRAMITE | 9 | Principal |
| 9 (I) | RIESGO SEGURO | 10 | Seguro |
| 10 (J) | DECISION DE RESOLUCION | 11 | Seguro |
| 11 (K) | MOTIVO | 12 | Seguro |
| 12 (L) | RIESGO SUBSIDIO | 13 | Subsidio |
| 13 (M) | DECISION DE RESOLUCION | 14 | Subsidio |
| 14 (N) | MOTIVO | 15 | Subsidio |
| 15 (O) | Nº RESOLUCION | 16 | Resolución |
| 16 (P) | AÑO | 17 | Resolución |
| 17 (Q) | FECHA DE EMISION | 18 | Resolución |
| 18 (R) | FECHA DE NOTIFICACION | 19 | Resolución |
| 19 (S) | MEDIO DE COMUNICACIÓN | 20 | Resolución |
| 20 (T) | DNI QUIEN RECEPCIONA | 21 | Resolución |
| 21 (U) | APELLIDOS Y NOMBRES | 22 | Resolución |
| 22 (V) | FECHA DE RECEPCION | 23 | Reconsideración |
| 23 (W) | Nº RESOLUCION | 24 | Reconsideración |
| 24 (X) | AÑO | 25 | Reconsideración |
| 25 (Y) | FECHA DE EMISION | 26 | Reconsideración |
| 26 (Z) | DECISION DE RESOLUCION | 27 | Reconsideración |
| 27 (AA) | FECHA DE NOTIFICACION | 28 | Reconsideración |
| 28 (AB) | MEDIO DE COMUNICACIÓN | 29 | Reconsideración |
| 29 (AC) | DNI QUIEN RECEPCIONA | 30 | Reconsideración |
| 30 (AD) | APELLIDOS Y NOMBRES | 31 | Reconsideración |
| 31 (AE) | FECHA DE RECEPCION | 32 | Apelación |
| 32 (AF) | Nº NOTA DE DERIVACION | 33 | Apelación |
| 33 (AG) | FECHA DE NOTA | 34 | Apelación |

**Observaciones sobre `BD_ACTOS.xlsm`:**
- Los 33 encabezados son exactamente los 33 campos del formulario nuevo. Coincidencia 100% con los pasos 2–34.
- El encabezado **se repite en varias posiciones**: `DECISION DE RESOLUCION` (cols 10, 13, 26), `MOTIVO` (cols 11, 14), `FECHA DE RECEPCION` (cols 3, 22, 31), `Nº RESOLUCION` (cols 15, 23), `AÑO` (cols 16, 24), `FECHA DE EMISION` (cols 17, 25), `FECHA DE NOTIFICACION` (cols 18, 27), `MEDIO DE COMUNICACIÓN` (cols 19, 28), `DNI QUIEN RECEPCIONA` (cols 20, 29), `APELLIDOS Y NOMBRES` (cols 21, 30).
  → **Impacto para importación y API:** los nombres no son únicos; la identificación debe ser por **posición de columna**, nunca por nombre.

---

## 2. Estructura leída de `antes.xlsx`

Archivo: `antes.xlsx` — Hoja: `Control Resoluciones` — `A1:AI8` (35 columnas; fila 1 encabezado; filas 2–6 con datos; filas 7–8 vacías).

| Col | Encabezado (tal cual) | Ejemplo de dato | Tipo observado |
|---|---|---|---|
| 1 (A) | NIT | `0947-2025-1421`; `260E400175`; `0947-2023-0238` | Texto |
| 2 (B) | Exp. SGD | `0048220250000824` (16 dígitos, inicia en 0) | Texto |
| 3 (C) | ` F_Recepcion \n(dd/mm/yyyy)` | `2025-11-28` | Fecha (con espacio inicial en el encabezado) |
| 4 (D) | Entidad Empleadora | `SERVICIOS BASICOS DE SALUD CHILCA-MALA` | Texto |
| 5 (E) | RUC | `20225634085` | Número (excel) |
| 6 (F) | Asegurado | `CHUMPITAZ CORDOVA ALBERTO HENRY` | Texto |
| 7 (G) | DNI/CE | `10366944`; `08558356` (con cero) | Mixto número/texto |
| 8 (H) | Decisión Resolución | `IMPROCEDENTE`; `RECONSIDERACIÓN INFUNDADO` | Texto (valores combinados) |
| 9 (I) | **Riego** (sic, "Riesgo") | `EN`; `MA` | Texto (abreviado) |
| 10 (J) | N° Resolución | `000251`–`000255` (6 dígitos) | Texto |
| 11 (K) | AÑO | `2025` | Número |
| 12 (L) | `F_Resolución\n(dd/mm/yyyy)` | `2025-12-28` | Fecha |
| 13 (M) | Correo | `bienestarsocialsbschilcamala@gmail.com` | Texto |
| 14 (N) | Telef | `51992442706` | Texto |
| 15 (O) | Comunicado vía Whatsapp | (vacío en las 5 filas) | — |
| 16 (P) | Autorizacion Expresa | (vacío en las 5 filas) | — |
| 17 (Q) | Dirección Formulario 1040 | (vacío en las 5 filas) | — |
| 18 (R) | DISTRITO | (vacío) | — |
| 19 (S) | PROVINCIA | (vacío) | — |
| 20 (T) | DPTO. | (vacío) | — |
| 21 (U) | N° Sobre | `SOBRE 16`…`SOBRE 34` | Texto |
| 22 (V) | `Fecha de Sobre NIT en el SIAD para Tramite Central` | `2026-01-05` | Fecha (encabezado con texto extra) |
| 23 (W) | `Fecha de Notificación\n(dd/mm/yyyy)` | `2026-04-21` | Fecha |
| 24 (X) | Estado de Notificación | `NOTIFICADO`; `NOTIFICADO Bajo Puerta` | Texto libre |
| 25 (Y) | *(sin encabezado)* | `CARGO DEVUELTO EL 05/02/2026 según SIAD` | Texto (notas de cargo) |
| 26 (Z) | Rotulo de FILE | `RESOLUCIONES IMPROCEDENCIA 2025 - TOMO 3`; `ONE DRIVE RESOLUCIONES` | Texto |
| 27 (AA) | Decisión Resolución | (vacío en las 5 filas) | — |
| 28 (AB) | Tipo Subsidio | (vacío) | — |
| 29 (AC) | `RUC / DNI \n(Empleador o beneficiario)` | (vacío) | — |
| 30 (AD) | Monto S/. | (vacío) | — |
| 31 (AE) | Motivo Resol. | (vacío) | — |
| 32 (AF) | Observaciones (Otros) | `Se informó de Notificación Expresa por Whatsapp - 20.03.2026 Grupo 1` | Texto |
| 33 (AG) | `Plazo de Espera Días Hábiles\n(Improc. En parte 15 días / Recons. Fundado 0 días)` | (vacío) | Texto (encabezado multilínea + leyenda) |
| 34 (AH) | FECHA A DERIVARSE AL CALIFICADOR | *(fórmula `IF(...WORKDAY.INTL...)`)* | Fórmula / derivado |
| 35 (AI) | FECHA QUE SE ENTREGÓ AL CALIFICADOR | (vacío) | Fecha |

**Observaciones sobre `antes.xlsx`:**
- La columna 34 (AH) es una **fórmula** que calcula la fecha de derivación usando `WORKDAY.INTL` sobre `Fecha de Notificación` y `Plazo de Espera`. Los valores finales dependen del cálculo; deben leerse con `data_only=True` (valores calculados) y documentarse.
- Formato de fechas configurado como `d/m/yyyy`; varias celdas llegan con hora `00:00:00` (deben tratarse como DATE).
- Los encabezados incluyen espacios (` F_Recepcion`), saltos de línea y textos de ayuda (col 33).
- Los datos son una muestra de solo 5 filas; **no** debe asumirse que representan la totalidad del histórico (puede haber más filas en la versión real).
- `RUC` y parte de `DNI/CE` están como valores numéricos en Excel; al migrar deben pasar a texto conservando ceros (ver MIGRACION.md).

---

## 3. Comparación por bloques

### 3.1 Requerimiento vs. `BD_ACTOS.xlsm`

| Resultado | Detalle |
|---|---|
| ✅ Coincidencia total | Los 33 encabezados del Excel corresponden 1:1 con los pasos 2–34 del requerimiento. |
| ✅ Orden | El orden de columnas respeta el orden funcional solicitado. |
| ⚠️ Nombres repetidos | `BD_ACTOS.xlsm` repite encabezados (decisión, motivo, fechas, etc.). Se resuelve por posición. |
| ⚠️ Acentos/ñ | Encabezados sin acentos (`TRAMITE`, `RESOLUCION`, `COMUNICACIÓN` con doble asiento). No afecta el modelo. |

### 3.2 `BD_ACTOS.xlsm` vs. `antes.xlsx` — campos equivalentes

| Campo nuevo (paso) | Campo histórico (`antes.xlsx`) | ¿Son iguales? | Nota |
|---|---|---|---|
| NIT (2) | NIT (A) | Equivalente conceptual | **Formato distinto**: nuevo `XXXX-XXXX-NIT-XXXXXXX`; histórico `0947-2025-1421`, `260E400175` → DP-01 |
| EXP SGD (3) | Exp. SGD (B) | ✅ Igual | 16 dígitos, inicia en 0: `0048220250000824` |
| FECHA DE RECEPCION (4) | F_Recepcion (C) | ✅ Igual | Fecha |
| RUC (5) | RUC (E) | ✅ Igual | Histórico como número; nuevo como texto (11 dígitos) |
| ENTIDAD EMPLEADORA (6) | Entidad Empleadora (D) | ✅ Igual | |
| DNI/C.E. (7) | DNI/CE (G) | ✅ Igual | Cuidar ceros a la izquierda (`08558356`) |
| ASEGURADO TITULAR (8) | Asegurado (F) | ✅ Igual (nombre distinto) | |
| TIPO DE TRAMITE (9) | — | ❌ No existe en histórico | Debe inferirse o quedar pendiente → DP-08 |
| RIESGO SEGURO (10) | — | ❌ No existe como tal | |
| DECISION RESOLUCION seg (11) | — | ❌ No existe | |
| MOTIVO seg (12) | Motivo Resol. (31) | Parcial | Columna histórica casi vacía en muestra |
| RIESGO SUBSIDIO (13) | Riego (I) | Parcial | Histórico abrevía: `EN`/`MA` → DP-06 |
| DECISION RESOLUCION sub (14) | Decisión Resolución (H) | Parcial | Histórico combina tipo de recurso (`RECONSIDERACIÓN INFUNDADO`) → DP-05 |
| MOTIVO sub (15) | Motivo Resol. (31) | Parcial | Columna histórica casi vacía |
| Nº RESOLUCION (16) | N° Resolución (J) | Parcial | Histórico **6 dígitos** (`000251`); nuevo **4 dígitos** (`0012`) → DP-02 |
| AÑO (17) | AÑO (K) | ✅ Igual | |
| FECHA DE EMISION (18) | F_Resolución (L) | ✅ Igual conceptual | Nombres distintos |
| FECHA DE NOTIFICACION (19) | Fecha de Notificación (W) | ✅ Igual | |
| MEDIO DE COMUNICACIÓN (20) | Correo/Telef/Whatsapp (M,N,O) | ⚠️ Diferente dimensión | Histórico registra canal directo; nuevo exige `CORREO/PRESENCIAL/VIRTUAL` → DP-07 |
| DNI QUIEN RECEPCIONA (21) | — | ❌ No existe en histórico | |
| APELLIDOS Y NOMBRES (22) | — | ❌ No existe en histórico | |
| Reconsideración (23–31) | — | ❌ No existe como bloque | En histórico el recurso puede estar implícito en la decisión → DP-08 |
| Apelación (32–34) | — | ❌ No existe | |

### 3.3 Campos únicamente en `BD_ACTOS.xlsm` (12)

`TIPO DE TRAMITE`, `RIESGO SEGURO`, `DECISION DE RESOLUCION` (seg), `MOTIVO` (seg), `RIESGO SUBSIDIO`, `DECISION DE RESOLUCION` (sub), `MOTIVO` (sub), `MEDIO DE COMUNICACIÓN`, `DNI QUIEN RECEPCIONA`, `APELLIDOS Y NOMBRES` + los bloques completos de reconsideración y apelación.

### 3.4 Campos únicamente en `antes.xlsx` (16 adicionales históricos)

`Correo`, `Telef`, `Comunicado vía Whatsapp`, `Autorizacion Expresa`, `Dirección Formulario 1040`, `DISTRITO`, `PROVINCIA`, `DPTO.`, `N° Sobre`, `Fecha de Sobre NIT en el SIAD para Tramite Central`, `Estado de Notificación`, `Rotulo de FILE`, `Decisión Resolución` (2ª, vacía), `Tipo Subsidio`, `RUC / DNI (Empleador o beneficiario)`, `Monto S/.`, `Motivo Resol.`, `Observaciones (Otros)`, `Plazo de Espera`, `FECHA A DERIVARSE AL CALIFICADOR`, `FECHA QUE SE ENTREGÓ AL CALIFICADOR` y la columna sin encabezado (notas de cargo).

> **Estos campos NO se eliminan.** Se conservan en el módulo de migración (ver `MIGRACION.md`).

---

## 4. Tabla cruzada completa (mapeo para importación)

| Pos `BD_ACTOS` | Campo nuevo | Col `antes.xlsx` | Campo histórico | Relación | Acción sugerida de migración |
|---|---|---|---|---|---|
| 1 | NIT | A | NIT | Equiv. formato distinto | Conservar literal; registrar discrepancia (DP-01) |
| 2 | EXP SGD | B | Exp. SGD | Igual | Directo |
| 3 | FECHA DE RECEPCION | C | F_Recepcion | Igual | Fecha→DATE |
| 4 | RUC | E | RUC | Igual | Numérico→texto (ceros) |
| 5 | ENTIDAD EMPLEADORA | D | Entidad Empleadora | Igual | Directo |
| 6 | DNI/C.E. | G | DNI/CE | Igual | Conservar ceros |
| 7 | ASEGURADO TITULAR | F | Asegurado | Igual | Directo (trim) |
| 8 | TIPO DE TRAMITE | — | (no existe) | — | Inferencia optativa (DP-08) |
| 9 | RIESGO SEGURO | — | — | — | Vacío |
| 10 | DECISION seg | — | — | — | Vacío |
| 11 | MOTIVO seg | AE | Motivo Resol. | Parcial | Solo si aplica a rama Seguro (DP-03, DP-05) |
| 12 | RIESGO SUBSIDIO | I | Riego | Abreviado | Conservar literal + mapeo supuesto (DP-06) |
| 13 | DECISION sub | H | Decisión Resolución | Combinado | Conservar literal + análisis (DP-05) |
| 14 | MOTIVO sub | AE | Motivo Resol. | Parcial | Solo si aplica (DP-05) |
| 15 | Nº RESOLUCION | J | N° Resolución | Formato distinto | Conservar literal (6 dígitos) (DP-02) |
| 16 | AÑO | K | AÑO | Igual | Directo |
| 17 | FECHA DE EMISION | L | F_Resolución | Igual | Fecha→DATE |
| 18 | FECHA DE NOTIFICACION | W | Fecha de Notificación | Igual | Fecha→DATE |
| 19 | MEDIO DE COMUNICACIÓN | M/N/O | Correo/Telef/Whatsapp | Dimensión distinta | No deducir sin regla del cliente (DP-07) |
| 20 | DNI QUIEN RECEPCIONA | — | — | — | Vacío |
| 21 | APELLIDOS Y NOMBRES | — | — | — | Vacío |
| 22–30 | Reconsideración | — | — | — | No inferir (DP-08) |
| 31–33 | Apelación | — | — | — | No inferir (DP-08) |
| — | (no equivalente) | M | Correo | Histórico | Tabla histórica |
| — | (no equivalente) | N | Telef | Histórico | Tabla histórica |
| — | (no equivalente) | O | Comunicado vía Whatsapp | Histórico | Tabla histórica |
| — | (no equivalente) | P | Autorizacion Expresa | Histórico | Tabla histórica |
| — | (no equivalente) | Q | Dirección Formulario 1040 | Histórico | Tabla histórica |
| — | (no equivalente) | R/S/T | Distrito/Provincia/Dpto | Histórico | Tabla histórica |
| — | (no equivalente) | U | N° Sobre | Histórico | Tabla histórica |
| — | (no equivalente) | V | Fecha de Sobre | Histórico | Tabla histórica (encabezado extendido → DP-10) |
| — | (no equivalente) | X | Estado de Notificación | Histórico | Tabla histórica (libre) (DP-04) |
| — | (no equivalente) | Y | (sin título) notas de cargo | Histórico | `NOTA_CARGO` (DP-11) |
| — | (no equivalente) | Z | Rotulo de FILE | Histórico | Tabla histórica |
| — | (no equivalente) | AA | Decisión Resolución (2ª) | Histórico (vacío) | Tabla histórica |
| — | (no equivalente) | AB | Tipo Subsidio | Histórico | Tabla histórica |
| — | (no equivalente) | AC | RUC / DNI | Histórico | Tabla histórica |
| — | (no equivalente) | AD | Monto S/. | Histórico | Tabla histórica |
| — | (no equivalente) | AF | Observaciones | Histórico | Tabla histórica |
| — | (no equivalente) | AG | Plazo de Espera | Histórico | Tabla histórica |
| — | (no equivalente) | AH | FECHA A DERIVARSE AL CALIFICADOR | Histórico | Valor calculado (leer `data_only`) |
| — | (no equivalente) | AI | FECHA QUE SE ENTREGÓ AL CALIFICADOR | Histórico | Tabla histórica |

---

## 5. Diferencias y posibles inconsistencias (resumen)

| # | Diferencia | Fuente afectada | Severidad |
|---|---|---|---|
| 1 | Formato de NIT | Requerimiento (NIT-7 dígitos) vs histórico (`0947-2025-1421`, `260E400175`) | Alta (DP-01) |
| 2 | Nº Resolución 4 vs 6 dígitos | Requerimiento vs histórico | Alta (DP-02) |
| 3 | `Riego` abrevía riesgo de subsidio | Histórico (`EN`, `MA`) | Media (DP-06) |
| 4 | Decisiones combinadas | Histórico (`RECONSIDERACIÓN INFUNDADO`) | Media (DP-05) |
| 5 | Ausencia de `TIPO DE TRAMITE` en histórico | Histórico | Media (DP-08) |
| 6 | Dimensiones de medio de contacto vs `MEDIO DE COMUNICACIÓN` | Histórico vs requerimiento | Media (DP-07) |
| 7 | Columnas históricas adicionales | Histórico | Baja (se conservan) |
| 8 | Encabezados repetidos en ambos archivos | Estructural | Baja (se resuelve por posición) |
| 9 | Columna sin encabezado (25) | Histórico | Baja (DP-11) |
| 10 | Encabezado `Fecha de Sobre…` extendido | Histórico | Baja (DP-10) |
| 11 | Fechas con hora `00:00:00` y formatos `d/m/yyyy` | Histórico | Baja (DATE) |
| 12 | Fórmula derivada (col 34) | Histórico | Media (leer valor calculado) |

> Toda discrepancia se conserva y documenta; ninguna se resuelve con conversiones destructivas. Ver `ANALISIS_REQUERIMIENTOS.md` §6 y `MIGRACION.md`.