from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


class Base(DeclarativeBase):
    pass


_engine = None
_SessionFactory = None


def get_engine():
    """Crea el engine de SQLAlchemy de forma perezosa (requiere DATABASE_URL)."""
    global _engine
    if _engine is None:
        from app.core.config import settings

        if not settings.DATABASE_URL:
            raise RuntimeError(
                "DATABASE_URL no configurada. Copia backend/.env.example a "
                "backend/.env e indica la cadena de conexion de Neon."
            )
        _engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            pool_timeout=30,
            pool_recycle=1800,
        )
    return _engine


def get_sessionmaker():
    global _SessionFactory
    if _SessionFactory is None:
        _SessionFactory = sessionmaker(
            bind=get_engine(), autoflush=False, autocommit=False
        )
    return _SessionFactory


def SessionLocal():
    return get_sessionmaker()()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()