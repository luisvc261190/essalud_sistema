from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.constants import (
    DECISION_RECONSIDERACION_VALORES,
    DECISION_SEGURO_VALORES,
    DECISION_SUBSIDIO_VALORES,
    MEDIO_COMUNICACION_VALORES,
    RIESGO_SEGURO_VALORES,
    RIESGO_SUBSIDIO_VALORES,
    TIPO_TRAMITE_VALORES,
    DNI_CE_MAX,
    DNI_CE_MIN,
    EXP_SGD_LONGITUD,
    NUMERO_NOTA_DERIVACION_LONGITUD,
    NUMERO_RESOLUCION_LONGITUD,
    RUC_LONGITUD,
)
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/catalogos", tags=["catalogos"])


@router.get("")
def obtener_catalogos(_=Depends(get_current_user)):
    return {
        "tipos_tramite": list(TIPO_TRAMITE_VALORES),
        "riesgos_seguro": list(RIESGO_SEGURO_VALORES),
        "decisiones_seguro": list(DECISION_SEGURO_VALORES),
        "riesgos_subsidio": list(RIESGO_SUBSIDIO_VALORES),
        "decisiones_subsidio": list(DECISION_SUBSIDIO_VALORES),
        "decisiones_reconsideracion": list(DECISION_RECONSIDERACION_VALORES),
        "medios_comunicacion": list(MEDIO_COMUNICACION_VALORES),
        "formatos": {
            "nit": "XXXX-XXXX-NIT-XXXXXXX",
            "exp_sgd_digitos": EXP_SGD_LONGITUD,
            "ruc_digitos": RUC_LONGITUD,
            "dni_ce_min": DNI_CE_MIN,
            "dni_ce_max": DNI_CE_MAX,
            "numero_resolucion_digitos": NUMERO_RESOLUCION_LONGITUD,
            "numero_nota_derivacion_digitos": NUMERO_NOTA_DERIVACION_LONGITUD,
        },
    }