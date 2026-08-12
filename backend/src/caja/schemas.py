from datetime import datetime

from pydantic import BaseModel, Field


class TurnoCajaAbrir(BaseModel):
    monto_apertura: int = Field(ge=0)
    tipo: str = Field(default="DIURNO")


class TurnoCajaCerrar(BaseModel):
    monto_cierre_real: int = Field(ge=0)


class TurnoCajaResponse(BaseModel):
    id_turno: int
    id_usuario: int
    nombre_usuario: str
    estado: str
    tipo: str
    monto_apertura: int
    monto_cierre_real: int | None
    creado_en: datetime
    fecha_cierre: datetime | None
    total_efectivo: int
    total_tarjeta: int
    total_transferencia: int
    total_qr: int
    total_gastos: int
    monto_esperado_efectivo: int
    diferencia: int | None


class GastoCreate(BaseModel):
    concepto: str = Field(min_length=1, max_length=255)
    monto: int = Field(gt=0)
    id_turno: int | None = Field(default=None)


class GastoUpdate(BaseModel):
    concepto: str | None = Field(default=None, min_length=1, max_length=255)
    monto: int | None = Field(default=None, gt=0)


class GastoResponse(BaseModel):
    id_gasto: int
    id_turno_caja: int
    concepto: str
    monto: int
    creado_en: datetime

    model_config = {"from_attributes": True}


class VentaHabitacionInput(BaseModel):
    id_reserva: int
    metodo_pago: str
    id_turno: int | None = Field(default=None)


class VentaPedidoInput(BaseModel):
    id_pedido: int
    metodo_pago: str
    id_turno: int | None = Field(default=None)


class VentaMostradorItemInput(BaseModel):
    origen: str
    id_producto: int
    cantidad: int = Field(gt=0)


class VentaMostradorInput(BaseModel):
    items: list[VentaMostradorItemInput]
    metodo_pago: str
    id_turno: int | None = Field(default=None)


class VentaItemResponse(BaseModel):
    id_venta_item: int
    nombre_producto: str
    id_producto_bar: int | None
    id_producto_restaurante: int | None
    cantidad: int
    precio_unitario: int


class VentaResponse(BaseModel):
    id_venta: int
    id_turno_caja: int
    origen: str
    id_reserva: int | None
    id_pedido: int | None
    nombre_mesa: str | None
    metodo_pago: str
    monto: int
    creado_en: datetime
    items: list[VentaItemResponse]
