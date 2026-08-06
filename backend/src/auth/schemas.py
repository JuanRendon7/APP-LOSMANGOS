from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UsuarioActual(BaseModel):
    id_usuario: int
    nombre: str
    email: str
    roles: list[str]
    permisos: list[str]

    def tiene_permiso(self, recurso: str, accion: str) -> bool:
        return f"{recurso}:{accion}" in self.permisos

    def tiene_rol(self, *codigos: str) -> bool:
        return any(codigo in self.roles for codigo in codigos)


class UsuarioBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=150)
    email: EmailStr


class UsuarioCreate(UsuarioBase):
    password: str = Field(min_length=8)
    roles: list[str] = Field(default_factory=list)


class UsuarioUpdate(BaseModel):
    nombre: str | None = None
    activo: bool | None = None
    roles: list[str] | None = None
    password: str | None = Field(default=None, min_length=8)


class UsuarioResponse(UsuarioBase):
    id_usuario: int
    activo: bool
    roles: list[str]

    model_config = {"from_attributes": True}


class RolResponse(BaseModel):
    id_rol: int
    codigo: str
    nombre: str
    descripcion: str | None
    permisos: list[str]

    model_config = {"from_attributes": True}
