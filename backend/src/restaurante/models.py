from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.productos.models import ProductoBar, ProductoRestaurante
from src.shared.database import Base, TimestampMixin

ESTADOS_MESA = ["LIBRE", "OCUPADA"]
ESTADOS_PEDIDO = [
    "ABIERTO",
    "ENVIADO_COCINA",
    "EN_PREPARACION",
    "LISTO",
    "ENTREGADO",
    "CERRADO",
]
ORIGENES_PEDIDO_ITEM = ["BAR", "RESTAURANTE"]


class Mesa(Base, TimestampMixin):
    __tablename__ = "mesa"

    id_mesa: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(50))
    capacidad: Mapped[int] = mapped_column(Integer)
    pos_x: Mapped[float] = mapped_column(Float, server_default=text("50"))
    pos_y: Mapped[float] = mapped_column(Float, server_default=text("50"))
    estado: Mapped[str] = mapped_column(
        SAEnum(*ESTADOS_MESA, name="estado_mesa", native_enum=False),
        server_default="LIBRE",
    )
    activo: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))


class Pedido(Base, TimestampMixin):
    __tablename__ = "pedido"

    id_pedido: Mapped[int] = mapped_column(primary_key=True)
    id_mesa: Mapped[int] = mapped_column(ForeignKey("hotel.mesa.id_mesa"))
    estado: Mapped[str] = mapped_column(
        SAEnum(*ESTADOS_PEDIDO, name="estado_pedido", native_enum=False),
        server_default="ABIERTO",
    )
    creado_por: Mapped[int | None] = mapped_column(
        ForeignKey("hotel.usuario.id_usuario"), default=None
    )
    enviado_cocina_en: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )
    cerrado_en: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )

    mesa: Mapped["Mesa"] = relationship()
    items: Mapped[list["PedidoItem"]] = relationship(
        back_populates="pedido", order_by="PedidoItem.id_item"
    )


class PedidoItem(Base, TimestampMixin):
    __tablename__ = "pedido_item"

    id_item: Mapped[int] = mapped_column(primary_key=True)
    id_pedido: Mapped[int] = mapped_column(ForeignKey("hotel.pedido.id_pedido"))
    origen: Mapped[str] = mapped_column(
        SAEnum(*ORIGENES_PEDIDO_ITEM, name="origen_pedido_item", native_enum=False),
        server_default="RESTAURANTE",
    )
    id_producto_bar: Mapped[int | None] = mapped_column(
        ForeignKey("hotel.producto_bar.id_producto"), default=None
    )
    id_producto_restaurante: Mapped[int | None] = mapped_column(
        ForeignKey("hotel.producto_restaurante.id_producto"), default=None
    )
    cantidad: Mapped[int] = mapped_column(Integer)
    precio_unitario: Mapped[int] = mapped_column(Integer)
    nota: Mapped[str | None] = mapped_column(String(255), default=None)

    pedido: Mapped["Pedido"] = relationship(back_populates="items")
    producto_bar: Mapped[ProductoBar | None] = relationship()
    producto_restaurante: Mapped[ProductoRestaurante | None] = relationship()

    @property
    def nombre_producto(self) -> str:
        if self.producto_bar is not None:
            return self.producto_bar.nombre
        if self.producto_restaurante is not None:
            return self.producto_restaurante.nombre
        return "Producto eliminado"
