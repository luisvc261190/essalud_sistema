"""Normalizacion y validacion de formato de los campos del cliente.

Reglas (requerimientos funcionales):
- NIT              -> XXXX-XXXX-NIT-XXXXXXX, ultimo grupo con ceros a la izquierda
- EXP SGD          -> 16 numeros, inicia en 0
- RUC              -> 11 numeros
- DNI/C.E.         -> 5-10 caracteres alfanumericos (cero inicial permitido)
- Nro Resolucion   -> 4 numeros (12 -> 0012)
- Nro Nota de      -> 6 numeros (12 -> 000012)
  derivacion a SGPE
"""
from __future__ import annotations

import re

from app.core.constants import (
    DNI_CE_MAX,
    DNI_CE_MIN,
    EXP_SGD_LONGITUD,
    NUMERO_NOTA_DERIVACION_LONGITUD,
    NUMERO_RESOLUCION_LONGITUD,
    RUC_LONGITUD,
)
from app.errors import AppError

_NIT_FULL = re.compile(r"^(\d{4})-(\d{4})-NIT-(\d{7})$")
_NIT_PARTIAL = re.compile(r"^(\d{1,4})-(\d{1,4})-NIT-(\d{1,7})$")


def formatear_nit(entrada: str) -> str:
    """Normaliza un NIT al formato XXXX-XXXX-NIT-XXXXXXX.

    Acepta el formato completo, un formato parcial (el ultimo grupo se
    completa con ceros a la izquierda) o 15 digitos consecutivos.
    """
    s = entrada.strip()
    if _NIT_FULL.fullmatch(s):
        return s
    m = _NIT_PARTIAL.fullmatch(s)
    if m:
        g1, g2, g3 = (m.group(i) for i in (1, 2, 3))
        return f"{g1.zfill(4)}-{g2.zfill(4)}-NIT-{g3.zfill(7)}"
    digitos = re.sub(r"[^0-9]", "", s)
    if len(digitos) != 15:
        raise AppError(400, "NIT invalido: debe constar de 15 digitos (XXXX-XXXX-NIT-XXXXXXX).")
    return f"{digitos[:4]}-{digitos[4:8]}-NIT-{digitos[8:15]}"


def validar_nit(nit: str) -> bool:
    return bool(_NIT_FULL.fullmatch(nit.strip()))


def normalizar_exp_sgd(exp: str) -> str:
    s = exp.strip()
    if len(s) != EXP_SGD_LONGITUD or not s.isdigit() or not s.startswith("0"):
        raise AppError(
            400,
            "EXP SGD invalido: exactamente 16 numeros, siempre iniciando en 0 (ej. 0048220250000824).",
        )
    return s


def normalizar_ruc(ruc: str) -> str:
    s = ruc.strip()
    if len(s) != RUC_LONGITUD or not s.isdigit():
        raise AppError(400, "RUC invalido: exactamente 11 numeros (ej. 20225634085).")
    return s


def normalizar_dni_ce(dni: str) -> str:
    s = dni.strip()
    if not (DNI_CE_MIN <= len(s) <= DNI_CE_MAX) or not s.isalnum():
        raise AppError(400, f"DNI/C.E. invalido: entre {DNI_CE_MIN} y {DNI_CE_MAX} caracteres alfanumericos.")
    return s


def formatear_numero(numero: str, longitud: int, nombre_campo: str) -> str:
    """Rellena con ceros a la izquierda un numero de longitud fija (texto)."""
    s = numero.strip()
    if not s.isdigit() or not (1 <= len(s) <= longitud):
        raise AppError(400, f"{nombre_campo} invalido: debe ser numerico de 1 a {longitud} digitos.")
    return s.zfill(longitud)


def formatear_numero_resolucion(numero: str) -> str:
    return formatear_numero(numero, NUMERO_RESOLUCION_LONGITUD, "Numero de resolucion")


def formatear_numero_nota_derivacion(numero: str) -> str:
    return formatear_numero(numero, NUMERO_NOTA_DERIVACION_LONGITUD, "Numero de nota de derivacion")