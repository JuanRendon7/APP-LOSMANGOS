from datetime import date

from sqlalchemy import Select, and_, or_, select
from sqlalchemy.orm import Session, selectinload

from src.hospedaje.models import Habitacion, Huesped, Reserva


class HospedajeRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # Habitaciones

    def listar_habitaciones(self) -> list[Habitacion]:
        stmt = select(Habitacion).order_by(Habitacion.piso, Habitacion.numero)
        return list(self.db.scalars(stmt))

    def obtener_habitacion(self, id_habitacion: int) -> Habitacion | None:
        return self.db.get(Habitacion, id_habitacion)

    def obtener_habitacion_por_numero(self, numero: str) -> Habitacion | None:
        return self.db.scalar(select(Habitacion).where(Habitacion.numero == numero))

    def crear_habitacion(self, habitacion: Habitacion) -> Habitacion:
        self.db.add(habitacion)
        self.db.flush()
        return habitacion

    def reservas_en_checkin_por_habitacion(
        self, ids_habitacion: list[int]
    ) -> dict[int, Reserva]:
        if not ids_habitacion:
            return {}
        stmt = (
            select(Reserva)
            .where(
                Reserva.id_habitacion.in_(ids_habitacion),
                Reserva.estado == "CHECK_IN",
            )
            .options(selectinload(Reserva.huesped))
        )
        return {r.id_habitacion: r for r in self.db.scalars(stmt)}

    # Huespedes

    def obtener_huesped_por_cedula(self, cedula: str) -> Huesped | None:
        return self.db.scalar(select(Huesped).where(Huesped.cedula == cedula))

    def obtener_huesped(self, id_huesped: int) -> Huesped | None:
        return self.db.get(Huesped, id_huesped)

    def crear_huesped(self, huesped: Huesped) -> Huesped:
        self.db.add(huesped)
        self.db.flush()
        return huesped

    def buscar_huespedes(self, q: str | None) -> list[Huesped]:
        stmt = select(Huesped).order_by(Huesped.nombre)
        if q:
            patron = f"%{q}%"
            stmt = stmt.where(
                or_(Huesped.cedula.ilike(patron), Huesped.nombre.ilike(patron))
            )
        return list(self.db.scalars(stmt))

    # Reservas

    def obtener_reserva(self, id_reserva: int) -> Reserva | None:
        stmt = (
            select(Reserva)
            .where(Reserva.id_reserva == id_reserva)
            .options(selectinload(Reserva.huesped))
        )
        return self.db.scalar(stmt)

    def listar_reservas_stmt(
        self,
        id_habitacion: int | None = None,
        estado: str | None = None,
        desde: date | None = None,
        hasta: date | None = None,
    ) -> Select:
        stmt = select(Reserva).options(selectinload(Reserva.huesped))
        if id_habitacion is not None:
            stmt = stmt.where(Reserva.id_habitacion == id_habitacion)
        if estado is not None:
            stmt = stmt.where(Reserva.estado == estado)
        if desde is not None:
            stmt = stmt.where(Reserva.fecha_checkout_prevista >= desde)
        if hasta is not None:
            stmt = stmt.where(Reserva.fecha_checkin_prevista <= hasta)
        return stmt.order_by(Reserva.fecha_checkin_prevista)

    def crear_reserva(self, reserva: Reserva) -> Reserva:
        self.db.add(reserva)
        self.db.flush()
        return reserva

    def existe_solapamiento(
        self,
        id_habitacion: int,
        checkin: date,
        checkout: date,
        excluir_id_reserva: int | None = None,
    ) -> bool:
        stmt = select(Reserva.id_reserva).where(
            Reserva.id_habitacion == id_habitacion,
            Reserva.estado.in_(["RESERVADA", "CHECK_IN"]),
            and_(
                Reserva.fecha_checkin_prevista < checkout,
                Reserva.fecha_checkout_prevista > checkin,
            ),
        )
        if excluir_id_reserva is not None:
            stmt = stmt.where(Reserva.id_reserva != excluir_id_reserva)
        return self.db.scalar(stmt) is not None
