from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.rbac import require_any_permission
from app.schemas.users import RoleOut
from app.services.user_service import list_roles, rol_out_payload

router = APIRouter(
    prefix="/roles",
    tags=["roles"],
    dependencies=[
        Depends(require_any_permission("GESTIONAR_USUARIOS", "CREAR_USUARIOS"))
    ],
)


@router.get("", response_model=list[RoleOut])
def listar_roles(db: Session = Depends(get_db)):
    return [rol_out_payload(r) for r in list_roles(db)]