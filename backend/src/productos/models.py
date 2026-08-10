from sqlalchemy import Boolean, Enum as SAEnum, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column

from src.shared.database import Base, TimestampMixin

CATEGORIAS_PRODUCTO_RESTAURANTE = ("DESAYUNO", "ALMUERZO", "CENA", "ADICIONALES")


class ProductoRestaurante(Base, TimestampMixin):
    __tablename__ = "producto_restaurante"

    id_producto: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150))
    categoria: Mapped[str] = mapped_column(
        SAEnum(*CATEGORIAS_PRODUCTO_RESTAURANTE, name="categoria_producto_restaurante", native_enum=False),
        server_default="ALMUERZO",
    )
    precio_venta: Mapped[int] = mapped_column(Integer)
    activo: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))


class ProductoBar(Base, TimestampMixin):
    __tablename__ = "producto_bar"

    id_producto: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150))
    codigo_barras: Mapped[str | None] = mapped_column(String(50), unique=True, index=True)
    precio_costo: Mapped[int] = mapped_column(Integer)
    precio_venta: Mapped[int] = mapped_column(Integer)
    stock: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    umbral_stock_bajo: Mapped[int] = mapped_column(Integer, server_default=text("5"))
    activo: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
