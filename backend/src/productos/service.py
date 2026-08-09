from src.productos.models import ProductoBar, ProductoRestaurante
from src.productos.repository import ProductosRepository
from src.productos.schemas import (
    ProductoBarCreate,
    ProductoBarUpdate,
    ProductoRestauranteCreate,
    ProductoRestauranteUpdate,
)
from src.shared.exceptions import BusinessRuleError, ConflictError, NotFoundError


class ProductosService:
    def __init__(self, repository: ProductosRepository) -> None:
        self.repository = repository

    # Restaurante

    def listar_restaurante(self) -> list[ProductoRestaurante]:
        return self.repository.listar_restaurante()

    def obtener_restaurante(self, id_producto: int) -> ProductoRestaurante:
        producto = self.repository.obtener_restaurante(id_producto)
        if producto is None:
            raise NotFoundError("Producto no encontrado")
        return producto

    def crear_restaurante(
        self, datos: ProductoRestauranteCreate
    ) -> ProductoRestaurante:
        producto = ProductoRestaurante(
            nombre=datos.nombre, precio_venta=datos.precio_venta
        )
        return self.repository.crear_restaurante(producto)

    def actualizar_restaurante(
        self, id_producto: int, datos: ProductoRestauranteUpdate
    ) -> ProductoRestaurante:
        producto = self.obtener_restaurante(id_producto)
        if datos.nombre is not None:
            producto.nombre = datos.nombre
        if datos.precio_venta is not None:
            producto.precio_venta = datos.precio_venta
        if datos.activo is not None:
            producto.activo = datos.activo
        return producto

    # Bar

    def listar_bar(self) -> list[ProductoBar]:
        return self.repository.listar_bar()

    def obtener_bar(self, id_producto: int) -> ProductoBar:
        producto = self.repository.obtener_bar(id_producto)
        if producto is None:
            raise NotFoundError("Producto no encontrado")
        return producto

    def _validar_codigo_libre(
        self, codigo_barras: str, excluir_id: int | None = None
    ) -> None:
        existente = self.repository.obtener_bar_por_codigo(codigo_barras)
        if existente is not None and existente.id_producto != excluir_id:
            raise ConflictError("Ya existe un producto con ese codigo de barras")

    def crear_bar(self, datos: ProductoBarCreate) -> ProductoBar:
        self._validar_codigo_libre(datos.codigo_barras)
        producto = ProductoBar(
            nombre=datos.nombre,
            codigo_barras=datos.codigo_barras,
            precio_costo=datos.precio_costo,
            precio_venta=datos.precio_venta,
            stock=datos.stock,
            umbral_stock_bajo=datos.umbral_stock_bajo,
        )
        return self.repository.crear_bar(producto)

    def actualizar_bar(self, id_producto: int, datos: ProductoBarUpdate) -> ProductoBar:
        producto = self.obtener_bar(id_producto)
        nuevo_codigo = datos.codigo_barras
        if nuevo_codigo is not None and nuevo_codigo != producto.codigo_barras:
            self._validar_codigo_libre(nuevo_codigo, excluir_id=id_producto)
            producto.codigo_barras = nuevo_codigo
        if datos.nombre is not None:
            producto.nombre = datos.nombre
        if datos.precio_costo is not None:
            producto.precio_costo = datos.precio_costo
        if datos.precio_venta is not None:
            producto.precio_venta = datos.precio_venta
        if datos.umbral_stock_bajo is not None:
            producto.umbral_stock_bajo = datos.umbral_stock_bajo
        if datos.activo is not None:
            producto.activo = datos.activo
        return producto

    def ajustar_stock_bar(self, id_producto: int, cantidad: int) -> ProductoBar:
        producto = self.obtener_bar(id_producto)
        nuevo_stock = producto.stock + cantidad
        if nuevo_stock < 0:
            raise BusinessRuleError(
                f"El ajuste dejaria el stock en {nuevo_stock}, no puede ser negativo"
            )
        producto.stock = nuevo_stock
        return producto
