from datetime import date, datetime

from pydantic import BaseModel, Field


class HuespedResponse(BaseModel):
    id_huesped: int
    nombre: str
    cedula: str
    contacto: str
    placa: str | None

    model_config = {"from_attributes": True}


class ReservaResponse(BaseModel):
    id_reserva: int
    id_habitacion: int
    id_huesped: int
    huesped: HuespedResponse
    fecha_checkin_prevista: date
    fecha_checkout_prevista: date
    fecha_checkin_real: datetime | None
    fecha_checkout_real: datetime | None
    estado: str
    precio_total: int
    origen: str

    model_config = {"from_attributes": True}


class HabitacionResponse(BaseModel):
    id_habitacion: int
    numero: str
    piso: int
    estado: str
    reserva_activa: ReservaResponse | None = None

    model_config = {"from_attributes": True}


class HabitacionUpdate(BaseModel):
    estado: str


class ReservaCreate(BaseModel):
    id_habitacion: int
    fecha_checkin_prevista: date
    fecha_checkout_prevista: date
    nombre: str = Field(min_length=1, max_length=150)
    cedula: str = Field(min_length=1, max_length=30)
    contacto: str = Field(min_length=1, max_length=100)
    placa: str | None = Field(default=None, max_length=20)


class ReservaUpdate(BaseModel):
    fecha_checkin_prevista: date | None = None
    fecha_checkout_prevista: date | None = None
