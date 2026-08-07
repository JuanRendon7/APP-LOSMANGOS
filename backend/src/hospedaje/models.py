from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.shared.database import Base, TimestampMixin

ESTADOS_HABITACION = ["DISPONIBLE", "OCUPADA", "LIMPIEZA", "MANTENIMIENTO"]
ESTADOS_RESERVA = ["RESERVADA", "CHECK_IN", "CHECK_OUT", "CANCELADA"]


class Habitacion(Base, TimestampMixin):
    __tablename__ = "habitacion"

    id_habitacion: Mapped[int] = mapped_column(primary_key=True)
    numero: Mapped[str] = mapped_column(String(10), unique=True, index=True)
    piso: Mapped[int] = mapped_column(Integer)
    estado: Mapped[str] = mapped_column(
        SAEnum(*ESTADOS_HABITACION, name="estado_habitacion", native_enum=False),
        server_default="DISPONIBLE",
    )


class Huesped(Base, TimestampMixin):
    __tablename__ = "huesped"

    id_huesped: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150))
    cedula: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    contacto: Mapped[str] = mapped_column(String(100))
    placa: Mapped[str | None] = mapped_column(String(20), default=None)


class Reserva(Base, TimestampMixin):
    __tablename__ = "reserva"

    id_reserva: Mapped[int] = mapped_column(primary_key=True)
    id_habitacion: Mapped[int] = mapped_column(
        ForeignKey("hotel.habitacion.id_habitacion")
    )
    id_huesped: Mapped[int] = mapped_column(ForeignKey("hotel.huesped.id_huesped"))
    fecha_checkin_prevista: Mapped[date] = mapped_column(Date)
    fecha_checkout_prevista: Mapped[date] = mapped_column(Date)
    fecha_checkin_real: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )
    fecha_checkout_real: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )
    estado: Mapped[str] = mapped_column(
        SAEnum(*ESTADOS_RESERVA, name="estado_reserva", native_enum=False),
        server_default="RESERVADA",
    )
    precio_total: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    origen: Mapped[str] = mapped_column(String(20), server_default=text("'DIRECTO'"))
    referencia_externa: Mapped[str | None] = mapped_column(String(255), default=None)
    creado_por: Mapped[int | None] = mapped_column(
        ForeignKey("hotel.usuario.id_usuario"), default=None
    )

    habitacion: Mapped["Habitacion"] = relationship()
    huesped: Mapped["Huesped"] = relationship()
