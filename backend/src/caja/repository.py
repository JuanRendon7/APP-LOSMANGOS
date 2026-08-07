from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.caja.models import Gasto, TurnoCaja, Venta, VentaItem


class CajaRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # Turnos

    def obtener_turno(self, id_turno: int) -> TurnoCaja | None:
        stmt = (
            select(TurnoCaja)
            .where(TurnoCaja.id_turno == id_turno)
            .options(
                selectinload(TurnoCaja.ventas),
                selectinload(TurnoCaja.gastos),
            )
        )
        return self.db.scalar(stmt)

    def obtener_turno_abierto(self, id_usuario: int) -> TurnoCaja | None:
        stmt = (
            select(TurnoCaja)
            .where(TurnoCaja.id_usuario == id_usuario, TurnoCaja.estado == "ABIERTO")
            .options(
                selectinload(TurnoCaja.ventas),
                selectinload(TurnoCaja.gastos),
            )
        )
        return self.db.scalar(stmt)

    def listar_turnos(
        self, id_usuario: int | None, estado: str | None
    ) -> list[TurnoCaja]:
        stmt = select(TurnoCaja).options(
            selectinload(TurnoCaja.ventas), selectinload(TurnoCaja.gastos)
        )
        if id_usuario is not None:
            stmt = stmt.where(TurnoCaja.id_usuario == id_usuario)
        if estado is not None:
            stmt = stmt.where(TurnoCaja.estado == estado)
        return list(self.db.scalars(stmt.order_by(TurnoCaja.creado_en.desc())))

    def crear_turno(self, turno: TurnoCaja) -> TurnoCaja:
        self.db.add(turno)
        self.db.flush()
        return turno

    # Gastos

    def obtener_gasto(self, id_gasto: int) -> Gasto | None:
        return self.db.get(Gasto, id_gasto)

    def listar_gastos(self, id_turno: int | None) -> list[Gasto]:
        stmt = select(Gasto)
        if id_turno is not None:
            stmt = stmt.where(Gasto.id_turno_caja == id_turno)
        return list(self.db.scalars(stmt.order_by(Gasto.creado_en.desc())))

    def crear_gasto(self, gasto: Gasto) -> Gasto:
        self.db.add(gasto)
        self.db.flush()
        return gasto

    def eliminar_gasto(self, gasto: Gasto) -> None:
        self.db.delete(gasto)

    # Ventas

    def obtener_venta(self, id_venta: int) -> Venta | None:
        stmt = (
            select(Venta)
            .where(Venta.id_venta == id_venta)
            .options(
                selectinload(Venta.items).selectinload(VentaItem.producto_bar),
                selectinload(Venta.items).selectinload(VentaItem.producto_restaurante),
            )
        )
        return self.db.scalar(stmt)

    def listar_ventas(
        self,
        id_turno: int | None,
        metodo_pago: str | None,
        origen: str | None,
    ) -> list[Venta]:
        stmt = select(Venta).options(
            selectinload(Venta.items).selectinload(VentaItem.producto_bar),
            selectinload(Venta.items).selectinload(VentaItem.producto_restaurante),
        )
        if id_turno is not None:
            stmt = stmt.where(Venta.id_turno_caja == id_turno)
        if metodo_pago is not None:
            stmt = stmt.where(Venta.metodo_pago == metodo_pago)
        if origen is not None:
            stmt = stmt.where(Venta.origen == origen)
        return list(self.db.scalars(stmt.order_by(Venta.creado_en.desc())))

    def crear_venta(self, venta: Venta) -> Venta:
        self.db.add(venta)
        self.db.flush()
        return venta

    def agregar_venta_item(self, item: VentaItem) -> VentaItem:
        self.db.add(item)
        self.db.flush()
        return item

    def eliminar_venta(self, venta: Venta) -> None:
        self.db.delete(venta)
