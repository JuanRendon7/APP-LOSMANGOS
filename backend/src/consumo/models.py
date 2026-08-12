from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.productos.models import ProductoBar, ProductoRestaurante
from src.shared.database import Base, TimestampMixin

ORIGENES_CONSUMO = ["BAR", "RESTAURANTE"]


class ConsumoItem(Base, TimestampMixin):
    __tablename__ = "consumo_item"

    id_consumo: Mapped[int] = mapped_column(primary_key=True)
    id_reserva: Mapped[int] = mapped_column(ForeignKey("hotel.reserva.id_reserva"))
    origen: Mapped[str] = mapped_column(
        SAEnum(*ORIGENES_CONSUMO, name="origen_consumo", native_enum=False)
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
    creado_por: Mapped[int | None] = mapped_column(
        ForeignKey("hotel.usuario.id_usuario"), default=None
    )
    # Se llena cuando el consumo ya se incluyo en un cobro; hasta entonces
    # queda pendiente por facturar.
    id_venta: Mapped[int | None] = mapped_column(
        ForeignKey("hotel.venta.id_venta"), default=None
    )
    # Se llena cuando el item ya se imprimio/envio en una comanda a cocina;
    # evita repetir en la siguiente comanda algo que ya se preparo.
    enviado_cocina_en: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )

    producto_bar: Mapped[ProductoBar | None] = relationship()
    producto_restaurante: Mapped[ProductoRestaurante | None] = relationship()

    @property
    def nombre_producto(self) -> str:
        if self.producto_bar is not None:
            return self.producto_bar.nombre
        if self.producto_restaurante is not None:
            return self.producto_restaurante.nombre
        return "Producto eliminado"
