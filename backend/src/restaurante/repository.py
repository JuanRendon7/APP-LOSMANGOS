from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.restaurante.models import Mesa, Pedido, PedidoItem


class RestauranteRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # Mesas

    def listar_mesas(self) -> list[Mesa]:
        stmt = select(Mesa).order_by(Mesa.nombre)
        return list(self.db.scalars(stmt))

    def obtener_mesa(self, id_mesa: int) -> Mesa | None:
        return self.db.get(Mesa, id_mesa)

    def crear_mesa(self, mesa: Mesa) -> Mesa:
        self.db.add(mesa)
        self.db.flush()
        return mesa

    def pedidos_abiertos_por_mesa(self, ids_mesa: list[int]) -> dict[int, Pedido]:
        if not ids_mesa:
            return {}
        stmt = (
            select(Pedido)
            .where(Pedido.id_mesa.in_(ids_mesa), Pedido.estado != "CERRADO")
            .options(
                selectinload(Pedido.items).selectinload(PedidoItem.producto_bar),
                selectinload(Pedido.items).selectinload(PedidoItem.producto_restaurante),
            )
        )
        return {p.id_mesa: p for p in self.db.scalars(stmt)}

    # Pedidos

    def obtener_pedido(self, id_pedido: int) -> Pedido | None:
        stmt = (
            select(Pedido)
            .where(Pedido.id_pedido == id_pedido)
            .options(
                selectinload(Pedido.items).selectinload(PedidoItem.producto_bar),
                selectinload(Pedido.items).selectinload(PedidoItem.producto_restaurante),
            )
        )
        return self.db.scalar(stmt)

    def listar_pedidos(
        self, id_mesa: int | None = None, estado: str | None = None
    ) -> list[Pedido]:
        stmt = select(Pedido).options(
            selectinload(Pedido.items).selectinload(PedidoItem.producto_bar),
            selectinload(Pedido.items).selectinload(PedidoItem.producto_restaurante),
        )
        if id_mesa is not None:
            stmt = stmt.where(Pedido.id_mesa == id_mesa)
        if estado is not None:
            stmt = stmt.where(Pedido.estado == estado)
        return list(self.db.scalars(stmt.order_by(Pedido.creado_en.desc())))

    def crear_pedido(self, pedido: Pedido) -> Pedido:
        self.db.add(pedido)
        self.db.flush()
        return pedido

    def agregar_item(self, item: PedidoItem) -> PedidoItem:
        self.db.add(item)
        self.db.flush()
        return item

    def obtener_item(self, id_pedido: int, id_item: int) -> PedidoItem | None:
        stmt = select(PedidoItem).where(
            PedidoItem.id_item == id_item, PedidoItem.id_pedido == id_pedido
        )
        return self.db.scalar(stmt)

    def eliminar_item(self, item: PedidoItem) -> None:
        self.db.delete(item)
