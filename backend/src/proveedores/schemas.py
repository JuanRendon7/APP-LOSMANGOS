from pydantic import BaseModel, Field, field_validator


class ProveedorBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=150)
    nit_cedula: str | None = Field(default=None, max_length=30)
    contacto: str | None = Field(default=None, max_length=100)
    categoria: str | None = Field(default=None, max_length=100)
    notas: str | None = Field(default=None, max_length=255)

    @field_validator("nit_cedula", "contacto", "categoria", "notas")
    @classmethod
    def _vacio_es_nulo(cls, valor: str | None) -> str | None:
        return valor.strip() or None if valor is not None else None


class ProveedorCreate(ProveedorBase):
    pass


class ProveedorUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=150)
    nit_cedula: str | None = Field(default=None, max_length=30)
    contacto: str | None = Field(default=None, max_length=100)
    categoria: str | None = Field(default=None, max_length=100)
    notas: str | None = Field(default=None, max_length=255)
    activo: bool | None = None

    @field_validator("nit_cedula", "contacto", "categoria", "notas")
    @classmethod
    def _vacio_es_nulo(cls, valor: str | None) -> str | None:
        return valor.strip() or None if valor is not None else None


class ProveedorResponse(ProveedorBase):
    id_proveedor: int
    activo: bool

    model_config = {"from_attributes": True}
