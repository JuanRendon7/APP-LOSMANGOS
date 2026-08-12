from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.caja.models import Gasto, TurnoCaja, Venta, VentaItem

# El hotel opera en horario de Colombia; "hoy" en un filtro de fecha debe
# significar el dia calendario de Bogota, no el dia UTC del servidor (si no,
# los reportes pierden movimientos de la noche, la franja UTC 00:00-05:00
# donde el dia UTC ya cambio pero en Colombia todavia es "ayer").
ZONA_HOTEL = ZoneInfo("America/Bogota")


def _inicio_dia(dia: date) -> datetime:
    return datetime.combine(dia, time.min, tzinfo=ZONA_HOTEL)


def _fin_dia(dia: date) -> datetime:
    return datetime.combine(dia, time.max, tzinfo=ZONA_HOTEL)


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
                selectinload(TurnoCaja.usuario),
            )
        )
        return self.db.scalar(stmt)

    def obtener_turno_abierto(self, tipo: str) -> TurnoCaja | None:
        """Cada tipo de turno (DIURNO, NOCTURNO) es un cajon independiente:
        solo puede haber un turno abierto a la vez POR TIPO para todo el
        hotel (sin importar quien lo abrio); no es un turno por usuario."""
        stmt = (
            select(TurnoCaja)
            .where(TurnoCaja.estado == "ABIERTO", TurnoCaja.tipo == tipo)
            .options(
                selectinload(TurnoCaja.ventas),
                selectinload(TurnoCaja.gastos),
                selectinload(TurnoCaja.usuario),
            )
        )
        return self.db.scalar(stmt)

    def listar_turnos_abiertos(self) -> list[TurnoCaja]:
        """Todos los cajones abiertos en este momento, sin importar el tipo."""
        stmt = (
            select(TurnoCaja)
            .where(TurnoCaja.estado == "ABIERTO")
            .options(
                selectinload(TurnoCaja.ventas),
                selectinload(TurnoCaja.gastos),
                selectinload(TurnoCaja.usuario),
            )
        )
        return list(self.db.scalars(stmt))

    def listar_turnos(
        self,
        id_usuario: int | None,
        estado: str | None,
        desde: date | None = None,
        hasta: date | None = None,
        tipo: str | None = None,
    ) -> list[TurnoCaja]:
        stmt = select(TurnoCaja).options(
            selectinload(TurnoCaja.ventas),
            selectinload(TurnoCaja.gastos),
            selectinload(TurnoCaja.usuario),
        )
        if id_usuario is not None:
            stmt = stmt.where(TurnoCaja.id_usuario == id_usuario)
        if estado is not None:
            stmt = stmt.where(TurnoCaja.estado == estado)
        if tipo is not None:
            stmt = stmt.where(TurnoCaja.tipo == tipo)
        if desde is not None:
            stmt = stmt.where(TurnoCaja.creado_en >= _inicio_dia(desde))
        if hasta is not None:
            stmt = stmt.where(TurnoCaja.creado_en <= _fin_dia(hasta))
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
        desde: date | None = None,
        hasta: date | None = None,
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
        if desde is not None:
            stmt = stmt.where(Venta.creado_en >= _inicio_dia(desde))
        if hasta is not None:
            stmt = stmt.where(Venta.creado_en <= _fin_dia(hasta))
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
