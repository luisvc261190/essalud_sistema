from sqlalchemy import create_engine
from sqlalchemy.exc import InterfaceError, OperationalError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    pass


class SesionResiliente(Session):
    """Sesion que reintenta una sola vez la primera sentencia.

    Sustituye a `pool_pre_ping`. Ese ajuste comprueba la vida de la conexion al
    sacarla del pool, lo que cuesta un viaje de ida y vuelta a la base de datos
    en *cada* peticion; como la base esta en otra region, ese viaje por si solo
    es la mayor parte de la latencia del buscador en tiempo real.

    Aqui no se paga nada extra: si la conexion ya estaba cerrada por el servidor,
    falla la primera sentencia. Como todavia no se ejecuto nada, no hay
    transaccion que perder y se puede reintentar sobre una conexion nueva. A
    partir de la segunda sentencia ya no se reintenta: si la conexion se cae a
    mitad de una peticion, el error se propaga como antes.
    """

    def execute(self, statement, *args, **kwargs):
        if self.__dict__.get("_sentencia_ejecutada"):
            return super().execute(statement, *args, **kwargs)
        try:
            resultado = super().execute(statement, *args, **kwargs)
        except (OperationalError, InterfaceError):
            # La conexion del pool estaba muerta. Se descarta lo que quedara
            # abierto y se reintenta una unica vez.
            try:
                self.rollback()
            except Exception:  # noqa: BLE001 - la conexion muerta ya no responde
                pass
            resultado = super().execute(statement, *args, **kwargs)
        self.__dict__["_sentencia_ejecutada"] = True
        return resultado


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
            pool_pre_ping=settings.DB_POOL_PRE_PING,
            pool_size=10,
            max_overflow=20,
            pool_timeout=30,
            pool_recycle=settings.DB_POOL_RECYCLE,
        )
    return _engine


def get_sessionmaker():
    global _SessionFactory
    if _SessionFactory is None:
        _SessionFactory = sessionmaker(
            bind=get_engine(),
            autoflush=False,
            autocommit=False,
            class_=SesionResiliente,
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