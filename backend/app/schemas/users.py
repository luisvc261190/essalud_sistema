from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class PermissionOut(BaseModel):
    id: int
    codigo: str
    descripcion: str | None = None

    model_config = ConfigDict(from_attributes=True)


class RoleOut(BaseModel):
    id: int
    nombre: str
    descripcion: str | None = None
    permissions: list[str] = []

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    usuario: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=128)
    nombres: str | None = Field(default=None, max_length=100)
    apellidos: str | None = Field(default=None, max_length=100)
    email: EmailStr | None = None
    is_active: bool = True
    role_ids: list[int] = []
    max_usuarios: int | None = Field(default=None, ge=0)

    model_config = ConfigDict(str_strip_whitespace=True)


class UserUpdate(BaseModel):
    nombres: str | None = None
    apellidos: str | None = None  
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    max_usuarios: int | None = Field(default=None, ge=0)

    model_config = ConfigDict(str_strip_whitespace=True)


class UserRoleAssign(BaseModel):
    role_id: int


class UserOut(BaseModel):
    id: int
    usuario: str
    nombres: str | None = None
    apellidos: str | None = None
    email: str | None = None
    is_active: bool
    roles: list[str] = []
    max_usuarios: int | None = None
    usuarios_creados: int = 0
    usuario_creador_id: int | None = None
    usuario_creador: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedUsers(BaseModel):
    items: list[UserOut]
    total: int
    page: int
    page_size: int