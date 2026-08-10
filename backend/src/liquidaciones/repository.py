from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.liquidaciones.models import LiquidacionEmpleado


class LiquidacionesRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def listar(
        self, id_usuario: int | None = None, periodo: str | None = None
    ) -> list[LiquidacionEmpleado]:
        stmt = select(LiquidacionEmpleado).options(
            selectinload(LiquidacionEmpleado.usuario)
        )
        if id_usuario is not None:
            stmt = stmt.where(LiquidacionEmpleado.id_usuario == id_usuario)
        if periodo is not None:
            stmt = stmt.where(LiquidacionEmpleado.periodo == periodo)
        stmt = stmt.order_by(
            LiquidacionEmpleado.periodo.desc(), LiquidacionEmpleado.fecha_pago.desc()
        )
        return list(self.db.scalars(stmt))

    def obtener(self, id_liquidacion: int) -> LiquidacionEmpleado | None:
        stmt = (
            select(LiquidacionEmpleado)
            .where(LiquidacionEmpleado.id_liquidacion == id_liquidacion)
            .options(selectinload(LiquidacionEmpleado.usuario))
        )
        return self.db.scalar(stmt)

    def crear(self, liquidacion: LiquidacionEmpleado) -> LiquidacionEmpleado:
        self.db.add(liquidacion)
        self.db.flush()
        return liquidacion

    def eliminar(self, liquidacion: LiquidacionEmpleado) -> None:
        self.db.delete(liquidacion)
