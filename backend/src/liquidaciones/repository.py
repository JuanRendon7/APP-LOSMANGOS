from sqlalchemy import select
from sqlalchemy.orm import Session

from src.liquidaciones.models import LiquidacionEmpleado


class LiquidacionesRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def listar(
        self, periodo: str | None = None, nombre_empleado: str | None = None
    ) -> list[LiquidacionEmpleado]:
        stmt = select(LiquidacionEmpleado)
        if periodo:
            stmt = stmt.where(LiquidacionEmpleado.periodo.ilike(f"%{periodo}%"))
        if nombre_empleado:
            stmt = stmt.where(
                LiquidacionEmpleado.nombre_empleado.ilike(f"%{nombre_empleado}%")
            )
        stmt = stmt.order_by(
            LiquidacionEmpleado.fecha_pago.desc(), LiquidacionEmpleado.creado_en.desc()
        )
        return list(self.db.scalars(stmt))

    def obtener(self, id_liquidacion: int) -> LiquidacionEmpleado | None:
        stmt = select(LiquidacionEmpleado).where(
            LiquidacionEmpleado.id_liquidacion == id_liquidacion
        )
        return self.db.scalar(stmt)

    def crear(self, liquidacion: LiquidacionEmpleado) -> LiquidacionEmpleado:
        self.db.add(liquidacion)
        self.db.flush()
        return liquidacion

    def eliminar(self, liquidacion: LiquidacionEmpleado) -> None:
        self.db.delete(liquidacion)
