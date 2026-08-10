import re
from datetime import date

from pydantic import BaseModel, Field, field_validator

PATRON_PERIODO = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


class LiquidacionEmpleadoCreate(BaseModel):
    id_usuario: int
    periodo: str
    monto: int = Field(gt=0)
    concepto: str | None = Field(default=None, max_length=255)
    fecha_pago: date

    @field_validator("periodo")
    @classmethod
    def _periodo_valido(cls, valor: str) -> str:
        if not PATRON_PERIODO.match(valor):
            raise ValueError("El periodo debe tener el formato 'YYYY-MM'")
        return valor


class LiquidacionEmpleadoUpdate(BaseModel):
    monto: int | None = Field(default=None, gt=0)
    concepto: str | None = Field(default=None, max_length=255)
    fecha_pago: date | None = None


class LiquidacionEmpleadoResponse(BaseModel):
    id_liquidacion: int
    id_usuario: int
    nombre_empleado: str
    periodo: str
    monto: int
    concepto: str | None
    fecha_pago: date

    model_config = {"from_attributes": True}
