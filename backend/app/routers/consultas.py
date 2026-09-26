from __future__ import annotations

import re
from typing import Callable

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.sql.elements import ColumnElement

from app.core.database import get_db
from app.dependencies.rbac import require_permission
from app.models.actos import Solicitud
from app.schemas.solicitudes import PaginatedResumen, SolicitudOut
from app.services.solicitud_service import solicitud_out, solicitud_resumen_out

router = APIRouter(prefix="/consultas", tags=["consultas"])

CAMPOS_ORDEN = {
    "fecha_recepcion",
    "exp_sgd",
    "nit",
    "asegurado_titular",
    "dni_ce",
    "tipo_tramite",
}

# Longitud minima por criterio. Tres caracteres es el minimo que aprovecha un
# indice GIN de trigramas (pg_trgm) y, sobre todo, evita que el buscador en
# tiempo real devuelva el padron completo con una o dos teclas pulsadas.
MIN_DIGITOS = 3
MIN_CARACTERES = 3

# Numero total de digitos de un NIT completo (XXXX-XXXX-NIT-XXXXXXX).
NIT_DIGITOS = 15

# Caracteres que significan algo dentro de un patron LIKE. Si el usuario los
# escribe hay que escaparlos: con "__" el patron "%__%" coincide con todas las
# filas y obliga a recorrer la tabla entera en cada pulsacion.
_CARACTERES_LIKE = ("\\", "%", "_")


def _solo_digitos(valor: str) -> str:
    return re.sub(r"\D", "", valor or "")


def _solo_alfanumericos(valor: str) -> str:
    return re.sub(r"[^0-9A-Za-z]", "", valor or "").upper()


def _escapar_like(texto: str) -> str:
    """Neutraliza `%`, `_` y `\\` para que se comparen como texto literal."""
    for caracter in _CARACTERES_LIKE:
        texto = texto.replace(caracter, "\\" + caracter)
    return texto


def _contiene(columna, valor: str) -> ColumnElement:
    """`columna` contiene `valor` en cualquier posicion, con el texto literal."""
    return columna.like(f"%{_escapar_like(valor)}%", escape="\\")


def _sin_guiones_nit() -> ColumnElement:
    """NIT normalizado a solo digitos: quita guiones y el literal "NIT".

    Asi el texto buscado y el almacenado son comparables aunque el NIT se
    haya registrado con o sin formato, o en mayusculas/minusculas.

    El indice `ix_solicitudes_nit_digitos_trgm` se crea sobre ESTA MISMA
    expresion, de modo que la busqueda no tiene que recorrer la tabla.
    """
    sin_guiones = func.replace(Solicitud.nit, "-", "")
    return func.replace(sin_guiones, "NIT", "")


def _coincide_nit(valor: str) -> ColumnElement | None:
    """Busqueda por NIT tolerante a formatos parciales.

    Acepta el NIT completo (`0000-0000-NIT-0000002`), solo digitos o el ultimo
    grupo, ya que ambos lados se reducen a sus digitos antes de comparar.
    """
    digitos = _solo_digitos(valor)[:NIT_DIGITOS]
    if len(digitos) < MIN_DIGITOS:
        return None
    return _sin_guiones_nit().like(f"%{_escapar_like(digitos)}%", escape="\\")


def _coincide_exp_sgd(valor: str) -> ColumnElement | None:
    """Busqueda por EXP SGD: siempre son 16 digitos, se ignoran los no numericos."""
    digitos = _solo_digitos(valor)
    if len(digitos) < MIN_DIGITOS:
        return None
    return _contiene(Solicitud.exp_sgd, digitos)


def _coincide_dni_ce(valor: str) -> ColumnElement | None:
    documento = _solo_alfanumericos(valor)
    if len(documento) < MIN_CARACTERES:
        return None
    return _contiene(Solicitud.dni_ce, documento)


def _coincide_asegurado(valor: str) -> ColumnElement | None:
    nombre = (valor or "").strip()
    if len(nombre) < MIN_CARACTERES:
        return None
    return Solicitud.asegurado_titular.ilike(
        f"%{_escapar_like(nombre)}%", escape="\\"
    )


CRITERIOS: dict[str, Callable[[str], ColumnElement | None]] = {
    "nit": _coincide_nit,
    "exp_sgd": _coincide_exp_sgd,
    "dni_ce": _coincide_dni_ce,
    "asegurado_titular": _coincide_asegurado,
}


def _condiciones(valores: dict[str, str | None]) -> list[ColumnElement]:
    """Traduce los criterios recibidos a condiciones SQL, ignorando los vacios."""
    condiciones: list[ColumnElement] = []
    for campo, valor in valores.items():
        if not valor or not valor.strip():
            continue
        constructor = CRITERIOS.get(campo)
        if constructor is None:
            continue
        condicion = constructor(valor)
        if condicion is not None:
            condiciones.append(condicion)
    return condiciones


def _condiciones_busqueda_libre(q: str) -> list[ColumnElement]:
    """`q` busca en los cuatro campos permitidos a la vez.

    Cada campo aporta su condicion solo si el termino ya es lo bastante largo
    para discriminarlo; si ninguno lo es, no se aplica filtro (se listan todos).
    """
    condiciones = [
        condicion
        for condicion in (constructor(q) for constructor in CRITERIOS.values())
        if condicion is not None
    ]
    return [or_(*condiciones)] if condiciones else []


@router.get("", response_model=PaginatedResumen)
def buscar_solicitudes(
    _=Depends(require_permission("CONSULTAR_SOLICITUDES")),
    nit: str | None = None,
    exp_sgd: str | None = None,
    dni_ce: str | None = None,
    asegurado_titular: str | None = None,
    q: str | None = None,
    page: int = 1,
    page_size: int = 20,
    orden_campo: str = "fecha_recepcion",
    orden_dir: str = "desc",
    db: Session = Depends(get_db),
):
    if page < 1:
        page = 1
    if page_size < 1 or page_size > 100:
        raise HTTPException(status_code=400, detail="page_size debe estar entre 1 y 100.")

    # Criterio explicito: un solo campo.
    condiciones = _condiciones(
        {
            "nit": nit,
            "exp_sgd": exp_sgd,
            "dni_ce": dni_ce,
            "asegurado_titular": asegurado_titular,
        }
    )

    # Busqueda libre: coincide con cualquiera de los cuatro campos permitidos.
    if q and q.strip():
        condiciones.extend(_condiciones_busqueda_libre(q))

    if orden_campo not in CAMPOS_ORDEN:
        orden_campo = "fecha_recepcion"
    columna = getattr(Solicitud, orden_campo)

    if condiciones:
        consulta = (
            db.query(Solicitud)
            .options(
                joinedload(Solicitud.datos_seguro),
                joinedload(Solicitud.datos_subsidio),
                joinedload(Solicitud.resolucion),
            )
            .filter(and_(*condiciones))
        )
    else:
        consulta = db.query(Solicitud).options(
            joinedload(Solicitud.datos_seguro),
            joinedload(Solicitud.datos_subsidio),
            joinedload(Solicitud.resolucion),
        )

    # El total viaja en la misma sentencia que la pagina (`count(*) OVER ()`):
    # la base de datos esta en otra region y cada viaje de ida y vuelta se paga.
    # Un viaje en lugar de dos. Las funciones de ventana se evaluan antes del
    # LIMIT, asi que el total corresponde a todos los registros coincidentes.
    consulta = consulta.add_columns(func.count(Solicitud.id).over().label("total"))
    filas = (
        consulta.order_by(
            columna.desc() if orden_dir == "desc" else columna.asc(), Solicitud.id.asc()
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    if filas:
        items = [solicitud_resumen_out(fila[0]) for fila in filas]
        total = int(filas[0][1])
    else:
        # Pagina fuera de rango: los datos no traen el total, hay que contarlos.
        # Solo ocurre al paginar mas alla del final, nunca en la busqueda en
        # tiempo real, asi que el viaje extra no se nota.
        conteo = db.query(func.count(Solicitud.id))
        if condiciones:
            conteo = conteo.filter(and_(*condiciones))
        total = conteo.scalar() or 0
        items = []

    return PaginatedResumen(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{solicitud_id}", response_model=SolicitudOut)
def detalle_solicitud(
    solicitud_id: int,
    _=Depends(require_permission("CONSULTAR_SOLICITUDES")),
    db: Session = Depends(get_db),
):
    solicitud = (
        db.query(Solicitud)
        .options(
            joinedload(Solicitud.datos_seguro),
            joinedload(Solicitud.datos_subsidio),
            joinedload(Solicitud.resolucion),
            joinedload(Solicitud.reconsideracion),
            joinedload(Solicitud.apelacion),
        )
        .filter(Solicitud.id == solicitud_id)
        .first()
    )
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud de tramite no encontrada.")
    return solicitud_out(solicitud)
