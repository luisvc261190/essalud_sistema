from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.indexes import asegurar_indices
from app.errors import AppError
from app.routers import (
    auditoria,
    auth,
    backups,
    catalogos,
    consultas,
    importaciones,
    reportes,
    roles,
    solicitudes,
    users,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    asegurar_indices()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Sistema web de gestion de Actos Administrativos.",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins_list, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.add_middleware(GZipMiddleware, minimum_size=500)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


API_V1 = "/api/v1"
app.include_router(auth.router, prefix=API_V1)
app.include_router(users.router, prefix=API_V1)
app.include_router(roles.router, prefix=API_V1)
app.include_router(solicitudes.router, prefix=API_V1)
app.include_router(consultas.router, prefix=API_V1)
app.include_router(catalogos.router, prefix=API_V1)
app.include_router(auditoria.router, prefix=API_V1)
app.include_router(backups.router, prefix=API_V1)
app.include_router(importaciones.router, prefix=API_V1)
app.include_router(reportes.router, prefix=API_V1)


@app.get("/health", tags=["sistema"])
def health():
    return {"status": "ok", "environment": settings.ENVIRONMENT, "app": settings.APP_NAME}