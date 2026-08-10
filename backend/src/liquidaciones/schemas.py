from datetime import date

from pydantic import BaseModel, Field


class LiquidacionEmpleadoCreate(BaseModel):
    nombre_empleado: str = Field(min_length=1, max_length=150)
    periodo: str = Field(min_length=1, max_length=100)
    monto: int = Field(gt=0)
    concepto: str | None = Field(default=None, max_length=255)
    fecha_pago: date


class LiquidacionEmpleadoUpdate(BaseModel):
    nombre_empleado: str | None = Field(default=None, min_length=1, max_length=150)
    periodo: str | None = Field(default=None, min_length=1, max_length=100)
    monto: int | None = Field(default=None, gt=0)
    concepto: str | None = Field(default=None, max_length=255)
    fecha_pago: date | None = None


class LiquidacionEmpleadoResponse(BaseModel):
    id_liquidacion: int
    nombre_empleado: str
    periodo: str
    monto: int
    concepto: str | None
    fecha_pago: date

    model_config = {"from_attributes": True}
