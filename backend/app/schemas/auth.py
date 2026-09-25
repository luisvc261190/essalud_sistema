from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class UserMe(BaseModel):
    id: int
    usuario: str
    nombres: str | None = None
    apellidos: str | None = None
    email: str | None = None
    roles: list[str] = []
    permissions: list[str] = []


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserMe


class RefreshRequest(BaseModel):
    refresh_token: str

    model_config = ConfigDict(str_strip_whitespace=True)