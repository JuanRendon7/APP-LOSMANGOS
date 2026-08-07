from sqlalchemy import select
from sqlalchemy.orm import Session

from src.productos.models import ProductoBar, ProductoRestaurante


class ProductosRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # Restaurante

    def listar_restaurante(self) -> list[ProductoRestaurante]:
        stmt = select(ProductoRestaurante).order_by(ProductoRestaurante.nombre)
        return list(self.db.scalars(stmt))

    def obtener_restaurante(self, id_producto: int) -> ProductoRestaurante | None:
        return self.db.get(ProductoRestaurante, id_producto)

    def crear_restaurante(self, producto: ProductoRestaurante) -> ProductoRestaurante:
        self.db.add(producto)
        self.db.flush()
        return producto

    # Bar

    def listar_bar(self) -> list[ProductoBar]:
        stmt = select(ProductoBar).order_by(ProductoBar.nombre)
        return list(self.db.scalars(stmt))

    def obtener_bar(self, id_producto: int) -> ProductoBar | None:
        return self.db.get(ProductoBar, id_producto)

    def obtener_bar_por_codigo(self, codigo_barras: str) -> ProductoBar | None:
        return self.db.scalar(
            select(ProductoBar).where(ProductoBar.codigo_barras == codigo_barras)
        )

    def crear_bar(self, producto: ProductoBar) -> ProductoBar:
        self.db.add(producto)
        self.db.flush()
        return producto
