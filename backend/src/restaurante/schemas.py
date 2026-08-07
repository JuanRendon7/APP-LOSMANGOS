from datetime import datetime

from pydantic import BaseModel, Field


class PedidoItemCreate(BaseModel):
    id_producto: int
    cantidad: int = Field(gt=0)
    nota: str | None = Field(default=None, max_length=255)


class PedidoItemResponse(BaseModel):
    id_item: int
    id_producto: int
    nombre_producto: str
    cantidad: int
    precio_unitario: int
    nota: str | None

    model_config = {"from_attributes": True}


class PedidoCreate(BaseModel):
    id_mesa: int


class PedidoResponse(BaseModel):
    id_pedido: int
    id_mesa: int
    nombre_mesa: str
    estado: str
    items: list[PedidoItemResponse]
    total: int
    enviado_cocina_en: datetime | None
    cerrado_en: datetime | None
    creado_en: datetime

    model_config = {"from_attributes": True}


class MesaBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=50)
    capacidad: int = Field(gt=0)


class MesaCreate(MesaBase):
    pos_x: float = Field(default=50, ge=0, le=100)
    pos_y: float = Field(default=50, ge=0, le=100)


class MesaUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=50)
    capacidad: int | None = Field(default=None, gt=0)
    pos_x: float | None = Field(default=None, ge=0, le=100)
    pos_y: float | None = Field(default=None, ge=0, le=100)
    activo: bool | None = None


class MesaResponse(BaseModel):
    id_mesa: int
    nombre: str
    capacidad: int
    pos_x: float
    pos_y: float
    estado: str
    activo: bool
    pedido_activo: PedidoResponse | None = None

    model_config = {"from_attributes": True}
