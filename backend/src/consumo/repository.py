from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.consumo.models import ConsumoItem


class ConsumoRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def listar_por_reserva(self, id_reserva: int) -> list[ConsumoItem]:
        stmt = (
            select(ConsumoItem)
            .where(ConsumoItem.id_reserva == id_reserva)
            .options(
                selectinload(ConsumoItem.producto_bar),
                selectinload(ConsumoItem.producto_restaurante),
            )
            .order_by(ConsumoItem.creado_en)
        )
        return list(self.db.scalars(stmt))

    def obtener(self, id_consumo: int) -> ConsumoItem | None:
        stmt = (
            select(ConsumoItem)
            .where(ConsumoItem.id_consumo == id_consumo)
            .options(
                selectinload(ConsumoItem.producto_bar),
                selectinload(ConsumoItem.producto_restaurante),
            )
        )
        return self.db.scalar(stmt)

    def crear(self, item: ConsumoItem) -> ConsumoItem:
        self.db.add(item)
        self.db.flush()
        return item

    def eliminar(self, item: ConsumoItem) -> None:
        self.db.delete(item)
