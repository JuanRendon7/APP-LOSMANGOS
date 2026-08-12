from datetime import datetime

from pydantic import BaseModel, Field


class ConsumoItemCreate(BaseModel):
    id_reserva: int
    origen: str
    id_producto: int
    cantidad: int = Field(gt=0)


class ConsumoItemResponse(BaseModel):
    id_consumo: int
    id_reserva: int
    origen: str
    nombre_producto: str
    cantidad: int
    precio_unitario: int
    facturado: bool
    enviado_cocina_en: datetime | None

    model_config = {"from_attributes": True}


class ConsumoResumenResponse(BaseModel):
    items: list[ConsumoItemResponse]
    total: int


class ComandaConsumoResponse(BaseModel):
    numero_habitacion: str
    nombre_huesped: str
    items: list[ConsumoItemResponse]
