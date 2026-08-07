from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.productos.models import ProductoBar, ProductoRestaurante
from src.shared.database import Base, TimestampMixin

ESTADOS_TURNO = ["ABIERTO", "CERRADO"]
METODOS_PAGO = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "QR"]
ORIGENES_VENTA = ["HABITACION", "MESA", "MOSTRADOR"]


class TurnoCaja(Base, TimestampMixin):
    __tablename__ = "turno_caja"

    id_turno: Mapped[int] = mapped_column(primary_key=True)
    id_usuario: Mapped[int] = mapped_column(ForeignKey("hotel.usuario.id_usuario"))
    estado: Mapped[str] = mapped_column(
        SAEnum(*ESTADOS_TURNO, name="estado_turno_caja", native_enum=False),
        server_default="ABIERTO",
    )
    monto_apertura: Mapped[int] = mapped_column(Integer)
    monto_cierre_real: Mapped[int | None] = mapped_column(Integer, default=None)
    fecha_cierre: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )

    ventas: Mapped[list["Venta"]] = relationship(back_populates="turno")
    gastos: Mapped[list["Gasto"]] = relationship(back_populates="turno")


class Gasto(Base, TimestampMixin):
    __tablename__ = "gasto"

    id_gasto: Mapped[int] = mapped_column(primary_key=True)
    id_turno_caja: Mapped[int] = mapped_column(
        ForeignKey("hotel.turno_caja.id_turno")
    )
    concepto: Mapped[str] = mapped_column(String(255))
    monto: Mapped[int] = mapped_column(Integer)
    creado_por: Mapped[int | None] = mapped_column(
        ForeignKey("hotel.usuario.id_usuario"), default=None
    )

    turno: Mapped["TurnoCaja"] = relationship(back_populates="gastos")


class Venta(Base, TimestampMixin):
    __tablename__ = "venta"

    id_venta: Mapped[int] = mapped_column(primary_key=True)
    id_turno_caja: Mapped[int] = mapped_column(
        ForeignKey("hotel.turno_caja.id_turno")
    )
    origen: Mapped[str] = mapped_column(
        SAEnum(*ORIGENES_VENTA, name="origen_venta", native_enum=False)
    )
    id_reserva: Mapped[int | None] = mapped_column(
        ForeignKey("hotel.reserva.id_reserva"), default=None
    )
    id_pedido: Mapped[int | None] = mapped_column(
        ForeignKey("hotel.pedido.id_pedido"), default=None
    )
    metodo_pago: Mapped[str] = mapped_column(
        SAEnum(*METODOS_PAGO, name="metodo_pago", native_enum=False)
    )
    monto: Mapped[int] = mapped_column(Integer)
    creado_por: Mapped[int | None] = mapped_column(
        ForeignKey("hotel.usuario.id_usuario"), default=None
    )

    turno: Mapped["TurnoCaja"] = relationship(back_populates="ventas")
    items: Mapped[list["VentaItem"]] = relationship(
        back_populates="venta", order_by="VentaItem.id_venta_item"
    )


class VentaItem(Base, TimestampMixin):
    __tablename__ = "venta_item"

    id_venta_item: Mapped[int] = mapped_column(primary_key=True)
    id_venta: Mapped[int] = mapped_column(ForeignKey("hotel.venta.id_venta"))
    id_producto_bar: Mapped[int | None] = mapped_column(
        ForeignKey("hotel.producto_bar.id_producto"), default=None
    )
    id_producto_restaurante: Mapped[int | None] = mapped_column(
        ForeignKey("hotel.producto_restaurante.id_producto"), default=None
    )
    cantidad: Mapped[int] = mapped_column(Integer)
    precio_unitario: Mapped[int] = mapped_column(Integer)

    venta: Mapped["Venta"] = relationship(back_populates="items")
    producto_bar: Mapped[ProductoBar | None] = relationship()
    producto_restaurante: Mapped[ProductoRestaurante | None] = relationship()

    @property
    def nombre_producto(self) -> str:
        if self.producto_bar is not None:
            return self.producto_bar.nombre
        if self.producto_restaurante is not None:
            return self.producto_restaurante.nombre
        return "Producto eliminado"
