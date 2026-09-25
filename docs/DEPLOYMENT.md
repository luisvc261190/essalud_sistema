# Despliegue

## Requisitos

- Python 3.11+ (backend) y Node 20+ (frontend).
- Base de datos PostgreSQL (este proyecto usa **Neon**).

## Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows; en Linux: source .venv/bin/activate
pip install -r requirements.txt
```

1. Configurar `backend/.env` con:
   - `DATABASE_URL` (cadena Neon/PostgreSQL).
   - Secretos JWT (`SECRET_KEY`, refresh) y claves de firma.
   - `BACKUP_DIR`, retención y herramientas `pg_dump`/`pg_restore`.
2. Aplicar esquema:
   ```bash
   alembic upgrade head
   python scripts/seed.py        # roles, permisos, superadmin (idempotente)
   ```
3. Ejecutar:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

## Frontend

```bash
cd frontend
npm install
npm run build                    # generar dist/
```

- Servir `dist/` detrás de un proxy que reenvíe `/api` y `/api/v1` al backend FastAPI (evita CORS en producción).
- Configuración base de API: `VITE_API_URL` (por defecto `/api/v1`).

## Entornos

| Variable | Uso |
|---|---|
| `ENVIRONMENT` | `development` / `production` (controla Swagger) |
| `VITE_API_URL` | Base URL de la API en el frontend |

## Deploy en la nube

### Backend → Render

Configuración lista en `render.yaml` (ubicado en la raíz del repo). Para usarla:

1. En Render: **New + → Blueprint**, conecta el repo y selecciona la rama `develop`.
2. Render creará el Web Service `essalud-backend` (raíz `backend`, Python, `uvicorn app.main:app`).
3. Antes del primer arranque exitoso, en **Environment** del servicio reemplaza:
   - `DATABASE_URL` → cadena de PostgreSQL/Neon.
   - `CORS_ORIGINS` → URL de tu sitio Netlify (ej. `https://essalud.netlify.app`).
   - `SEED_SUPERADMIN_PASSWORD` → contraseña real del superadmin.
   - `JWT_SECRET_KEY` y `JWT_REFRESH_SECRET_KEY` se generan solos (`generateValue`).
4. El hook `preDeployCommand` ejecuta `alembic upgrade head` en cada deploy.
5. Tras el primer deploy, corre una vez el seed desde **Render → Shell**:
   ```bash
   cd backend && python -m scripts.seed
   ```
   (crea roles, permisos y el SUPERADMIN; es idempotente).

> **Nota:** el módulo de respaldos usa `pg_dump`/`pg_restore`. En Render estos binarios pueden no estar disponibles; valida con un GET a `/api/v1/backups/estado-herramientas` desde un cliente autorizado.

### Frontend → Netlify

Configuración lista en `netlify.toml` (raíz del repo): base `frontend`, build `npm ci && npm run build`, publish `dist`, y redirects SPA.

1. En Netlify: **Add new site → Import an existing project**, conecta el repo y rama `develop`.
2. En **Site configuration → Build & deploy → Environment variables**:
   - `VITE_API_URL=https://TU-BACKEND.onrender.com/api/v1` (no olvides el sufijo `/api/v1`).
3. Netlify construye `frontend/` con Node 22 (definido en `netlify.toml`) y publica `dist/`.
4. Tras publicar, copia la URL final (ej. `https://essalud.netlify.app`) y pégala en `CORS_ORIGINS` del backend en Render, de lo contrario el navegador bloqueará las llamadas a la API.

## Notas de operación

- Ejecutar el seed al instalar y tras añadir nuevos permisos (idempotente).
- Los respaldos manuales requieren que `pg_dump`/`pg_restore` existan en el servidor (ver `docs/BACKUPS.md`).
- No exponer el `.env` ni credenciales de Neon al frontend.