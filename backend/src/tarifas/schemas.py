from datetime import date

from pydantic import BaseModel, Field


class TemporadaBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    fecha_inicio: date
    fecha_fin: date
    precio_noche: int = Field(gt=0)
    activa: bool = True


class TemporadaCreate(TemporadaBase):
    pass


class TemporadaUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    fecha_inicio: date | None = None
    fecha_fin: date | None = None
    precio_noche: int | None = Field(default=None, gt=0)
    activa: bool | None = None


class TemporadaResponse(TemporadaBase):
    id_temporada: int

    model_config = {"from_attributes": True}
