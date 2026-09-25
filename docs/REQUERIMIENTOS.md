# REQUERIMIENTOS FUNCIONALES ORIGINALES DE LA EMPRESA

> Este documento conserva **íntegramente** el texto original de los requerimientos entregados por la empresa (prompt maestro).
> **NO es una interpretación técnica** y **NO debe reemplazarse**.
> Cualquier análisis o propuesta derivada vive en `ANALISIS_REQUERIMIENTOS.md`, `COMPARACION_EXCEL.md`, `FLUJO_PROCESO.md`, `BASE_DATOS.md`, `RBAC.md`, `MIGRACION.md` y `BACKUPS.md`.

---

# PROMPT MAESTRO DEFINITIVO

# SISTEMA WEB DE GESTIÓN DE ACTOS ADMINISTRATIVOS

## 1. INSTRUCCIÓN PRINCIPAL

Debes desarrollar un sistema web empresarial para la gestión de **Actos Administrativos**, siguiendo EXACTAMENTE los requerimientos funcionales proporcionados por la empresa.

### REGLA FUNDAMENTAL

Los requerimientos funcionales que aparecen en este documento son los requerimientos oficiales del cliente.

NO debes:

- cambiar el significado de los campos;
- eliminar campos;
- agregar reglas de negocio inventadas;
- cambiar los valores permitidos;
- cambiar el flujo solicitado;
- reinterpretar los pasos;
- sustituir campos por otros;
- eliminar información solicitada;
- decidir que un campo "no es necesario";
- modificar silenciosamente datos históricos.

Puedes proponer mejoras técnicas o visuales, pero **NO puedes alterar los requerimientos funcionales**.

Cuando exista una ambigüedad o contradicción, debes señalarla y mantener el requerimiento original hasta que sea confirmado por el cliente.

---

# 2. TECNOLOGÍAS OBLIGATORIAS

El sistema debe desarrollarse utilizando:

### Backend

- Python
- FastAPI
- SQLAlchemy
- Alembic
- Pydantic
- PostgreSQL

### Base de datos

- PostgreSQL
- Neon como proveedor de base de datos

### Frontend

- React
- TypeScript
- Vite

### Validaciones

- React Hook Form
- Zod

### Seguridad

- JWT
- Password hashing seguro
- RBAC
- Auditoría

### Testing

- Pytest
- Vitest
- React Testing Library
- Playwright cuando corresponda

---

# 3. DOCUMENTOS PROPORCIONADOS POR EL CLIENTE

El cliente proporcionó dos archivos.

## ARCHIVO 1

`BD_ACTOS.xlsm`

Este archivo representa la estructura funcional nueva solicitada.

Tiene 33 campos.

Debe utilizarse como referencia principal para el formulario de ingreso de Actos Administrativos.

## ARCHIVO 2

`antes.xlsx`

Contiene información histórica de resoluciones.

Tiene 35 columnas.

Debe utilizarse como:

- información histórica;
- referencia para migración;
- referencia para analizar datos existentes;
- fuente de datos que podría requerir migración al nuevo sistema.

NO debe reemplazar los requerimientos funcionales.

---

# 4. PRIORIDAD DE LAS FUENTES

Cuando exista una diferencia entre fuentes, aplicar este orden:

1. Requerimientos escritos por la empresa.
2. Estructura de `BD_ACTOS.xlsm`.
3. Información histórica de `antes.xlsx`.
4. Decisiones técnicas del desarrollador.

El desarrollador NO puede utilizar el Excel histórico para cambiar los requerimientos de la empresa.

---

# 5. OBJETIVO DEL SISTEMA

El sistema debe permitir:

- registrar Actos Administrativos;
- consultar solicitudes;
- buscar por diferentes criterios;
- registrar información de Seguro;
- registrar información de Subsidio;
- registrar resoluciones;
- registrar recursos de reconsideración;
- registrar recursos de apelación;
- administrar usuarios;
- manejar roles;
- auditar operaciones;
- generar respaldos;
- consultar información histórica;
- migrar información histórica cuando corresponda.

---

# 6. FLUJO PRINCIPAL

El primer paso del sistema debe ser:

# 1. PROCESO NUEVO

Mostrar:

```text
¿PROCESO NUEVO?

○ SI
○ NO
```

---

# 7. SI PROCESO NUEVO = SI

Debe comenzar el ingreso de datos del Acto Administrativo.

Los campos deben aparecer respetando el orden funcional solicitado por la empresa.

---

# 8. CAMPO 2 — NIT

El NIT debe cumplir el formato:

```text
XXXX-XXXX-NIT-XXXXXXX
```

Las X corresponden a números.

La última parte debe completarse con ceros a la izquierda cuando el usuario ingrese menos dígitos.

Ejemplo:

Usuario ingresa:

```text
12
```

El sistema debe mostrar:

```text
0000012
```

El formateo puede realizarse automáticamente mientras el usuario escribe o al salir del campo.

La validación definitiva debe realizarse también en backend.

## IMPORTANTE

En los datos históricos de `antes.xlsx` existen valores con formatos diferentes, por ejemplo:

```text
0947-2025-1421
```

NO modificar esos datos históricos automáticamente.

Debe conservarse el valor original.

La discrepancia debe documentarse como una diferencia entre:

- formato solicitado actualmente;
- formato utilizado históricamente.

NO inventar una conversión que pueda destruir información.

---

# 9. CAMPO 3 — EXP SGD

Debe contener:

- exactamente 16 números;
- siempre comenzar con cero.

Ejemplo:

```text
0048220250000824
```

No aceptar letras.

No aceptar menos de 16 caracteres.

No aceptar más de 16 caracteres.

Guardar como texto, no como número.

---

# 10. CAMPO 4 — FECHA DE RECEPCIÓN

Formato:

```text
DD/MM/YYYY
```

En PostgreSQL debe almacenarse como `DATE`.

No almacenar fechas como VARCHAR.

---

# 11. CAMPO 5 — RUC

Debe contener:

```text
11 números
```

Ejemplo:

```text
20225634085
```

Debe conservarse como texto para evitar pérdida de ceros.

---

# 12. CAMPO 6 — ENTIDAD EMPLEADORA

Máximo:

```text
50 caracteres
```

---

# 13. CAMPO 7 — DNI/C.E.

Debe contener:

```text
5 a 10 caracteres alfanuméricos
```

Puede contener cero al lado izquierdo.

Ejemplos válidos:

```text
10366944
00012345
ABC123
```

No convertirlo a número.

---

# 14. CAMPO 8 — ASEGURADO TITULAR

Máximo:

```text
50 caracteres
```

---

# 15. CAMPO 9 — TIPO DE TRÁMITE

Sólo existen dos alternativas:

```text
SEGURO
SUBSIDIO
```

No permitir otros valores.

---

# 16. FLUJO SEGURO

Si:

```text
TIPO DE TRÁMITE = SEGURO
```

debe pasar por:

- Paso 10
- Paso 11

y posteriormente continuar con:

- Paso 16 en adelante.

Los campos correspondientes a SUBSIDIO no deben ser solicitados como obligatorios en este flujo.

---

# 17. PASO 10 — RIESGO SEGURO

Sólo permitir:

```text
ALTA TITULAR
ALTA DERECHOHABIENTE
CONDICION DEL ASEGURADO
AUDITORIA
FISCALIZACION POSTERIOR
BAJA TITULAR
BAJA DERECHOHABIENTE
LACTANCIA
ENFERMEDAD
```

No permitir valores diferentes.

---

# 18. PASO 11 — DECISIÓN DE RESOLUCIÓN PARA SEGURO

Sólo permitir:

```text
BAJA DE OFICIO
RESOLUCION DE MULTA
```

No permitir valores diferentes.

---

# 19. PASO 12 — MOTIVO

Cuando corresponda según el flujo solicitado:

Máximo:

```text
100 caracteres
```

Debe permitir únicamente caracteres alfanuméricos según la especificación del cliente.

No superar 100 caracteres.

---

# 20. FLUJO SUBSIDIO

Si:

```text
TIPO DE TRÁMITE = SUBSIDIO
```

debe pasar por:

- Paso 12
- Paso 13
- Paso 14

y posteriormente continuar con:

- Paso 16 en adelante.

---

# 21. PASO 13 — RIESGO SUBSIDIO

Sólo permitir:

```text
LACTANCIA
ENFERMEDAD
MATERNIDAD
SEPELIO
REINTEGRO
FISCALIZACION POSTERIOR
```

No permitir otros valores.

---

# 22. PASO 14 — DECISIÓN DE RESOLUCIÓN PARA SUBSIDIO

Sólo permitir:

```text
BAJA DE OFICIO
DENEGATORIA
IMPROCEDENTE
EN PARTE
```

No permitir otros valores.

---

# 23. PASO 15 — MOTIVO

Máximo:

```text
100 caracteres
```

Debe cumplir la regla de caracteres establecida por la empresa.

---

# 24. PASO 16 — Nº RESOLUCIÓN

Debe contener exactamente:

```text
4 números
```

Si el usuario introduce:

```text
12
```

mostrar:

```text
0012
```

Si introduce:

```text
5
```

mostrar:

```text
0005
```

Si introduce:

```text
123
```

mostrar:

```text
0123
```

Debe almacenarse como texto.

No utilizar INTEGER para este campo.

---

# 25. PASO 17 — AÑO

Debe mostrar automáticamente:

```text
año actual
```

Ejemplo:

```text
2026
```

Debe ser editable.

---

# 26. PASO 18 — FECHA DE EMISIÓN

Formato:

```text
DD/MM/YYYY
```

---

# 27. PASO 19 — FECHA DE NOTIFICACIÓN

Formato:

```text
DD/MM/YYYY
```

---

# 28. PASO 20 — MEDIO DE COMUNICACIÓN

Sólo permitir:

```text
CORREO
PRESENCIAL
VIRTUAL
```

---

# 29. PASO 21 — DNI QUIEN RECEPCIONA EL DOCUMENTO

Debe contener:

```text
5 a 10 caracteres alfanuméricos
```

Puede contener cero inicial.

---

# 30. PASO 22 — APELLIDOS Y NOMBRES

Máximo:

```text
50 caracteres
```

---

# 31. PROCESO NUEVO = NO

Cuando el usuario seleccione:

```text
NO
```

NO debe iniciar un nuevo registro.

Debe mostrar:

# BUSCAR SOLICITUDES DEL TRÁMITE

La búsqueda debe poder realizarse por:

1. NIT
2. EXP SGD
3. DNI/C.E.
4. ASEGURADO TITULAR

---

# 32. BÚSQUEDA

El usuario debe poder seleccionar el criterio:

```text
NIT
EXP SGD
DNI/C.E.
ASEGURADO TITULAR
```

y posteriormente ingresar el valor.

Debe respetar las validaciones correspondientes.

---

# 33. RESULTADOS DE BÚSQUEDA

El sistema debe mostrar las filas que coincidan con el criterio.

La información debe aparecer en una tabla.

Como mínimo mostrar información que permita identificar claramente el trámite:

- NIT
- EXP SGD
- Fecha de recepción
- RUC
- Entidad empleadora
- DNI/C.E.
- Asegurado titular
- Tipo de trámite
- Riesgo
- Decisión
- Nº Resolución
- Año

---

# 34. SELECCIÓN DE RESULTADO

Las filas deben poder seleccionarse.

La fila seleccionada debe quedar:

- resaltada;
- claramente identificada.

Debe existir un botón:

```text
CONTINUAR
```

Al seleccionar la fila, el sistema debe identificar el trámite correspondiente.

---

# 35. RECURSO DE RECONSIDERACIÓN O APELACIÓN

Cuando el proceso sea existente, el sistema debe permitir continuar según corresponda:

```text
RECURSO DE RECONSIDERACIÓN
```

o

```text
RECURSO DE APELACIÓN
```

No crear un nuevo trámite duplicado.

El recurso debe quedar relacionado con el trámite/acto administrativo seleccionado.

---

# 36. PARTE DEL ACTO ADMINISTRATIVO

# RECURSO DE RECONSIDERACIÓN

Debe contener exactamente los siguientes datos:

## 23. FECHA DE RECEPCIÓN

Formato:

```text
DD/MM/YYYY
```

## 24. Nº RESOLUCIÓN

Cuatro números.

Ejemplo:

```text
12 → 0012
```

## 25. AÑO

Mostrar año actual.

Debe ser editable.

## 26. FECHA DE EMISIÓN

Formato:

```text
DD/MM/YYYY
```

## 27. DECISIÓN DE RESOLUCIÓN

Sólo:

```text
FUNDADO
INFUNDADO
EN PARTE
```

## 28. FECHA DE NOTIFICACIÓN

Formato:

```text
DD/MM/YYYY
```

## 29. MEDIO DE COMUNICACIÓN

Sólo:

```text
CORREO
PRESENCIAL
VIRTUAL
```

## 30. DNI QUIEN RECEPCIONA EL DOCUMENTO

5 a 10 caracteres alfanuméricos.

## 31. APELLIDOS Y NOMBRES

Máximo 50 caracteres.

---

# 37. TERCERA PARTE DEL ACTO ADMINISTRATIVO

# RECURSO DE APELACIÓN

Debe contener exactamente:

## 32. FECHA DE RECEPCIÓN

Formato:

```text
DD/MM/YYYY
```

## 33. Nº DE NOTA DE DERIVACIÓN A SGPE

Debe contener:

```text
6 números
```

Ejemplo:

```text
12 → 000012
```

## 34. FECHA DE LA NOTA

Formato:

```text
DD/MM/YYYY
```

---

# 38. IMPORTANTE SOBRE LA NUMERACIÓN

Aunque los requerimientos numeran hasta el paso 34, el documento tiene:

- Paso 1: Proceso nuevo.
- Pasos 2-22: información principal.
- Pasos 23-31: reconsideración.
- Pasos 32-34: apelación.

NO cambiar esta lógica.

---

# 39. BASE DE DATOS

La base de datos será PostgreSQL alojada en Neon.

La BD debe representar correctamente el proceso.

No es obligatorio que la BD tenga exactamente 34 columnas.

Puede normalizarse técnicamente siempre que:

- se mantengan todos los datos;
- se respete el flujo;
- no se pierda información;
- no se alteren los requerimientos.

Proponer una estructura relacional como:

```text
users
roles
permissions
user_roles

solicitudes
tramites_seguro
tramites_subsidio
resoluciones
recursos_reconsideracion
recursos_apelacion

audit_logs
backup_logs
```

La estructura definitiva debe justificarse técnicamente.

---

# 40. RELACIÓN PRINCIPAL

Conceptualmente:

```text
SOLICITUD
    │
    ├── TIPO SEGURO
    │      └── Datos Seguro
    │
    └── TIPO SUBSIDIO
           └── Datos Subsidio
    │
    └── RESOLUCIÓN
           │
           ├── RECONSIDERACIÓN
           │
           └── APELACIÓN
```

La información principal no debe duplicarse al crear un recurso.

---

# 41. LOGIN

El sistema debe tener login.

Pantalla:

```text
USUARIO
CONTRASEÑA
[ INGRESAR ]
```

Implementar autenticación segura.

Las contraseñas nunca deben almacenarse en texto plano.

---

# 42. ROLES

Implementar RBAC.

Como mínimo:

## SUPERADMIN

Puede:

- crear usuarios;
- editar usuarios;
- activar usuarios;
- desactivar usuarios;
- asignar roles;
- administrar permisos;
- consultar;
- crear;
- modificar;
- administrar backups;
- consultar auditoría.

## ADMIN

Puede:

- gestionar operaciones;
- consultar;
- crear;
- modificar;
- consultar reportes;
- gestionar determinadas operaciones administrativas.

## OPERADOR

Puede:

- registrar actos;
- consultar;
- registrar resoluciones;
- registrar reconsideraciones;
- registrar apelaciones;
- modificar información según permisos.

## CONSULTA

Puede:

- buscar;
- consultar;
- visualizar.

No puede modificar.

---

# 43. CREACIÓN DE USUARIOS

Debe existir una pantalla:

```text
ADMINISTRACIÓN
      ↓
USUARIOS
```

Sólo usuarios autorizados podrán crear usuarios.

El SUPERADMIN debe poder:

- crear usuario;
- asignar rol;
- activar/desactivar;
- modificar datos;
- cambiar permisos según diseño RBAC.

Nunca mostrar la contraseña almacenada.

---

# 44. AUDITORÍA

Registrar las operaciones importantes.

Por ejemplo:

```text
LOGIN
CREAR_SOLICITUD
EDITAR_SOLICITUD
CREAR_RESOLUCION
EDITAR_RESOLUCION
CREAR_RECONSIDERACION
CREAR_APELACION
CREAR_USUARIO
EDITAR_USUARIO
CAMBIAR_ROL
BACKUP
```

Registrar:

- usuario;
- acción;
- fecha/hora;
- entidad;
- registro afectado;
- información anterior cuando corresponda;
- información nueva cuando corresponda.

---

# 45. BACKUPS

El sistema debe contar con una estrategia de respaldo.

Debe existir la posibilidad de generar backups para proteger la información.

El acceso debe estar restringido a usuarios autorizados.

La solución debe contemplar:

- backup de PostgreSQL;
- respaldo periódico;
- almacenamiento seguro;
- política de retención;
- procedimiento de restauración;
- registro de backups realizados.

Las credenciales de Neon nunca deben estar en React.

---

# 46. MIGRACIÓN DEL ARCHIVO HISTÓRICO

Analizar `antes.xlsx`.

NO eliminar las columnas históricas simplemente porque no estén en los 33 campos nuevos.

El archivo histórico contiene información adicional.

Entre ellas:

- Correo
- Teléfono
- Comunicado vía WhatsApp
- Autorización Expresa
- Dirección
- Distrito
- Provincia
- Departamento
- N° Sobre
- Fecha de Sobre
- Fecha de Notificación
- Estado de Notificación
- Rótulo de FILE
- Tipo Subsidio
- RUC/DNI
- Monto
- Motivo
- Observaciones
- Plazo de Espera
- Fecha de derivación al calificador
- Fecha de entrega al calificador

Estas columnas deben analizarse antes de decidir cómo migrarlas.

---

# 47. REGLA DE MIGRACIÓN

Antes de importar:

```text
Excel
 ↓
Lectura
 ↓
Análisis
 ↓
Normalización
 ↓
Validación
 ↓
Detección de duplicados
 ↓
Vista previa
 ↓
Confirmación
 ↓
Importación
```

Debe existir un modo:

```text
DRY RUN
```

que permita comprobar los datos sin insertarlos.

---

# 48. DATOS HISTÓRICOS

Nunca modificar silenciosamente un dato histórico.

Si existe una diferencia de formato:

```text
dato original
dato normalizado
```

pueden conservarse ambos cuando sea necesario.

La información histórica debe mantenerse íntegra.

---

# 49. FORMATO DE CAMPOS

Los campos que tienen ceros iniciales deben ser `VARCHAR`/`CHAR`, NO INTEGER.

Esto aplica especialmente a:

- NIT;
- EXP SGD;
- DNI/C.E.;
- DNI receptor;
- Nº Resolución;
- Nº Nota de Derivación.

---

# 50. FRONTEND

Crear una interfaz profesional.

Debe incluir:

```text
Login
Dashboard
Actos Administrativos
Nueva Solicitud
Consulta
Resoluciones
Reconsideraciones
Apelaciones
Reportes
Usuarios
Auditoría
Backups
Perfil
Cerrar sesión
```

El menú debe cambiar según el rol.

---

# 51. FORMULARIO DE ACTO ADMINISTRATIVO

El formulario debe seguir el orden solicitado.

No presentar todos los campos de Seguro y Subsidio simultáneamente.

Cuando se seleccione:

```text
SEGURO
```

mostrar los campos correspondientes.

Cuando se seleccione:

```text
SUBSIDIO
```

mostrar los campos correspondientes.

La interfaz debe guiar al usuario paso a paso.

---

# 52. VALIDACIÓN FRONTEND

Implementar validaciones visuales.

Ejemplos:

```text
EXP SGD
Debe contener 16 números y comenzar con 0.
```

```text
RUC
Debe contener 11 números.
```

```text
DNI/C.E.
Debe contener entre 5 y 10 caracteres alfanuméricos.
```

```text
Nº RESOLUCIÓN
Debe contener 4 números.
```

```text
Nº NOTA DE DERIVACIÓN
Debe contener 6 números.
```

---

# 53. VALIDACIÓN BACKEND

Las mismas reglas deben validarse nuevamente en FastAPI.

El usuario no debe poder saltarse las reglas utilizando:

- Postman;
- cURL;
- herramientas del navegador;
- llamadas directas a la API.

---

# 54. CONSULTA

Crear módulo:

```text
CONSULTA
```

Permitir:

```text
NIT
EXP SGD
DNI/C.E.
ASEGURADO TITULAR
```

La búsqueda debe devolver los registros coincidentes.

No cargar toda la base de datos en el navegador.

Implementar:

- paginación;
- filtros;
- búsqueda;
- ordenamiento.

---

# 55. RESULTADO DE CONSULTA

Ejemplo:

```text
┌────┬────────────┬───────────────┬─────────────────────────┐
│    │ NIT        │ EXP SGD       │ ASEGURADO TITULAR       │
├────┼────────────┼───────────────┼─────────────────────────┤
│ ○  │ ...        │ ...           │ ...                     │
│ ○  │ ...        │ ...           │ ...                     │
└────┴────────────┴───────────────┴─────────────────────────┘
```

La fila seleccionada debe quedar resaltada.

---

# 56. DISEÑO DE API

Utilizar:

```text
/api/v1/auth
/api/v1/users
/api/v1/solicitudes
/api/v1/resoluciones
/api/v1/reconsideraciones
/api/v1/apelaciones
/api/v1/consultas
/api/v1/auditoria
/api/v1/backups
/api/v1/importaciones
```

Separar:

- routers;
- schemas;
- models;
- services;
- repositories;
- seguridad.

---

# 57. ESTRUCTURA BACKEND

```text
backend/
├── app/
│   ├── main.py
│   ├── core/
│   ├── models/
│   ├── schemas/
│   ├── routers/
│   ├── services/
│   ├── repositories/
│   ├── dependencies/
│   ├── middleware/
│   └── utils/
├── alembic/
├── tests/
├── scripts/
├── requirements.txt
└── .env.example
```

---

# 58. ESTRUCTURA FRONTEND

```text
frontend/
├── src/
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   ├── features/
│   ├── services/
│   ├── hooks/
│   ├── schemas/
│   ├── types/
│   └── utils/
├── tests/
└── package.json
```

---

# 59. SEGURIDAD

Implementar:

- HTTPS en producción;
- password hashing;
- JWT;
- refresh token;
- control RBAC;
- CORS restringido;
- rate limiting para login;
- validación de entradas;
- protección contra SQL injection;
- auditoría;
- manejo seguro de secretos;
- cookies seguras cuando correspondan;
- expiración de sesión.

---

# 60. VARIABLES DE ENTORNO

Crear:

```env
DATABASE_URL=
JWT_SECRET_KEY=
JWT_REFRESH_SECRET_KEY=
ACCESS_TOKEN_EXPIRE_MINUTES=
REFRESH_TOKEN_EXPIRE_DAYS=
CORS_ORIGINS=
ENVIRONMENT=
```

Nunca subir valores reales al repositorio.

---

# 61. TESTING

Crear pruebas para todas las reglas del cliente.

Especialmente:

### NIT

### EXP SGD

### RUC

### DNI/C.E.

### Resolución

```text
12 → 0012
5 → 0005
123 → 0123
1234 → 1234
```

### Nota de derivación

```text
12 → 000012
5 → 000005
123456 → 123456
```

### Tipo de trámite

Verificar Seguro y Subsidio.

### Riesgos

Verificar exactamente las opciones solicitadas.

### Decisiones

Verificar exactamente las opciones solicitadas.

### Recursos

Verificar Reconsideración y Apelación.

### Roles

Verificar que los permisos funcionen realmente desde backend.

---

# 62. REPORTES

El sistema puede incluir reportes siempre que NO alteren el funcionamiento solicitado.

Los reportes deben poder utilizar filtros como:

- fechas;
- tipo de trámite;
- riesgo;
- decisión;
- año;
- medio de comunicación.

Exportación:

- Excel;
- CSV;
- PDF cuando corresponda.

---

# 63. DASHBOARD

Crear un dashboard informativo.

Puede mostrar:

- cantidad de solicitudes;
- Seguro;
- Subsidio;
- resoluciones;
- reconsideraciones;
- apelaciones.

Los datos deben obtenerse de PostgreSQL.

No utilizar valores ficticios.

---

# 64. DISEÑO DE BASE DE DATOS

La BD debe ser normalizada.

Pero la normalización NO debe alterar los requerimientos.

Por ejemplo:

```text
solicitudes
    ↓
resoluciones
    ↓
reconsideraciones
    ↓
apelaciones
```

Debe ser posible recuperar toda la información correspondiente a una solicitud.

---

# 65. INTEGRIDAD

Utilizar:

- foreign keys;
- índices;
- constraints;
- transacciones;
- validaciones;
- relaciones correctamente definidas.

No imponer restricciones que puedan destruir o impedir la migración histórica sin haber analizado primero los datos.

---

# 66. DOCUMENTACIÓN

Crear:

```text
README.md
docs/
├── REQUERIMIENTOS.md
├── ARQUITECTURA.md
├── BASE_DATOS.md
├── RBAC.md
├── MIGRACION.md
├── BACKUPS.md
├── SEGURIDAD.md
└── DEPLOYMENT.md
```

En `REQUERIMIENTOS.md` copiar y conservar los requerimientos funcionales originales de la empresa.

NO reemplazarlos por una interpretación técnica.

---

# 67. MANEJO DE CAMBIOS

Si durante el desarrollo detectas una inconsistencia:

NO cambies el requerimiento.

Utiliza:

```text
DECISIÓN PENDIENTE
```

y documenta:

- requerimiento original;
- problema detectado;
- impacto;
- posibles soluciones;
- decisión requerida al cliente.

---

# 68. ORDEN DE DESARROLLO

## FASE 1

Analizar:

- requerimientos;
- BD_ACTOS.xlsm;
- antes.xlsx.

## FASE 2

Diseñar BD.

## FASE 3

Configurar Neon.

## FASE 4

Crear backend FastAPI.

## FASE 5

Crear autenticación.

## FASE 6

Crear roles.

## FASE 7

Crear usuarios.

## FASE 8

Crear módulo de Actos Administrativos.

## FASE 9

Crear búsqueda.

## FASE 10

Crear resoluciones.

## FASE 11

Crear reconsideraciones.

## FASE 12

Crear apelaciones.

## FASE 13

Crear auditoría.

## FASE 14

Crear backups.

## FASE 15

Crear migración Excel.

## FASE 16

Crear reportes.

## FASE 17

Testing.

## FASE 18

Seguridad.

## FASE 19

Deploy.

---

# 69. PRIMERA TAREA

Antes de escribir código:

Analiza completamente los dos archivos proporcionados.

Genera:

```text
docs/ANALISIS_REQUERIMIENTOS.md
docs/COMPARACION_EXCEL.md
docs/BASE_DATOS.md
docs/FLUJO_PROCESO.md
docs/RBAC.md
docs/MIGRACION.md
docs/BACKUPS.md
```

La comparación debe indicar:

### Requerimiento de la empresa

vs.

### BD_ACTOS.xlsm

vs.

### antes.xlsx

Identifica:

- campos iguales;
- campos diferentes;
- campos adicionales;
- campos históricos;
- posibles inconsistencias;
- formatos diferentes.

NO elimines información.

---

# 70. CRITERIO FINAL DE ACEPTACIÓN

El sistema será considerado correcto si:

- cumple todos los campos solicitados;
- cumple todas las validaciones;
- respeta el flujo de Proceso Nuevo;
- permite búsqueda por NIT;
- permite búsqueda por EXP SGD;
- permite búsqueda por DNI/C.E.;
- permite búsqueda por Asegurado Titular;
- muestra las coincidencias;
- permite seleccionar una fila;
- resalta la fila seleccionada;
- permite continuar al flujo correspondiente;
- permite registrar Seguro;
- permite registrar Subsidio;
- permite registrar Resolución;
- permite registrar Reconsideración;
- permite registrar Apelación;
- tiene Login;
- tiene roles;
- tiene creación de usuarios desde SUPERADMIN;
- tiene auditoría;
- tiene backups;
- utiliza PostgreSQL en Neon;
- utiliza Python/FastAPI;
- utiliza React/TypeScript;
- mantiene la información histórica;
- es seguro;
- es mantenible.

---

# 71. REGLA ABSOLUTA

Los requerimientos proporcionados por la empresa son la fuente principal.

NO conviertas el proyecto en otro sistema.

NO elimines funcionalidades porque técnicamente consideres que no son necesarias.

NO agregues funcionalidades que modifiquen el flujo solicitado.

Las mejoras visuales, arquitectónicas y de seguridad son bienvenidas siempre que mantengan intactos los requerimientos funcionales.

Si una mejora cambia el comportamiento solicitado, debe ser consultada/documentada antes de aplicarla.

---

# FIN DEL PROMPT