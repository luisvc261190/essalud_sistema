from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    APP_NAME: str = "Sistema de Gestion de Actos Administrativos"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"

    DATABASE_URL: str = ""

    JWT_SECRET_KEY: str = ""
    JWT_REFRESH_SECRET_KEY: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    CORS_ORIGINS: str = "http://localhost:5173"

    SEED_SUPERADMIN_USERNAME: str = ""
    SEED_SUPERADMIN_PASSWORD: str = ""
    SEED_SUPERADMIN_NOMBRES: str = "Super"
    SEED_SUPERADMIN_APELLIDOS: str = "Administrador"
    SEED_SUPERADMIN_EMAIL: str = ""

    BACKUP_RETENTION_DAYS: int = 7
    BACKUP_RETENTION_WEEKS: int = 4
    BACKUP_RETENTION_MONTHS: int = 6
    BACKUP_DIR: str = "backups"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()