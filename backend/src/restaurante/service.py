from datetime import UTC, datetime

from src.productos.service import ProductosService
from src.restaurante.models import Mesa, Pedido, PedidoItem
from src.restaurante.repository import RestauranteRepository
from src.restaurante.schemas import MesaCreate, MesaUpdate, PedidoItemCreate
from src.shared.exceptions import BusinessRuleError, NotFoundError

TRANSICIONES_PEDIDO: dict[str, str] = {
    "ENVIADO_COCINA": "EN_PREPARACION",
    "EN_PREPARACION": "LISTO",
    "LISTO": "ENTREGADO",
}


class RestauranteService:
    def __init__(
        self,
        repository: RestauranteRepository,
        productos_service: ProductosService,
    ) -> None:
        self.repository = repository
        self.productos_service = productos_service

    # Mesas

    def listar_mesas(self) -> list[tuple[Mesa, Pedido | None]]:
        mesas = self.repository.listar_mesas()
        activos = self.repository.pedidos_abiertos_por_mesa(
            [m.id_mesa for m in mesas]
        )
        return [(m, activos.get(m.id_mesa)) for m in mesas]

    def obtener_mesa(self, id_mesa: int) -> Mesa:
        mesa = self.repository.obtener_mesa(id_mesa)
        if mesa is None:
            raise NotFoundError("Mesa no encontrada")
        return mesa

    def crear_mesa(self, datos: MesaCreate) -> Mesa:
        mesa = Mesa(
            nombre=datos.nombre,
            capacidad=datos.capacidad,
            pos_x=datos.pos_x,
            pos_y=datos.pos_y,
        )
        return self.repository.crear_mesa(mesa)

    def actualizar_mesa(self, id_mesa: int, datos: MesaUpdate) -> Mesa:
        mesa = self.obtener_mesa(id_mesa)
        if datos.nombre is not None:
            mesa.nombre = datos.nombre
        if datos.capacidad is not None:
            mesa.capacidad = datos.capacidad
        if datos.pos_x is not None:
            mesa.pos_x = datos.pos_x
        if datos.pos_y is not None:
            mesa.pos_y = datos.pos_y
        if datos.activo is not None:
            mesa.activo = datos.activo
        return mesa

    # Pedidos

    def obtener_pedido(self, id_pedido: int) -> Pedido:
        pedido = self.repository.obtener_pedido(id_pedido)
        if pedido is None:
            raise NotFoundError("Pedido no encontrado")
        return pedido

    def listar_pedidos(self, id_mesa: int | None, estado: str | None) -> list[Pedido]:
        return self.repository.listar_pedidos(id_mesa, estado)

    def crear_pedido(self, id_mesa: int, creado_por: int | None) -> Pedido:
        mesa = self.obtener_mesa(id_mesa)
        if mesa.estado != "LIBRE":
            raise BusinessRuleError("La mesa no esta libre")
        pedido = Pedido(id_mesa=id_mesa, creado_por=creado_por)
        pedido = self.repository.crear_pedido(pedido)
        mesa.estado = "OCUPADA"
        return pedido

    def agregar_item(self, id_pedido: int, datos: PedidoItemCreate) -> Pedido:
        pedido = self.obtener_pedido(id_pedido)
        if pedido.estado == "CERRADO":
            raise BusinessRuleError("El pedido esta cerrado")

        if datos.origen == "BAR":
            producto = self.productos_service.obtener_bar(datos.id_producto)
            if not producto.activo:
                raise BusinessRuleError("El producto no esta activo")
            self.productos_service.ajustar_stock_bar(datos.id_producto, -datos.cantidad)
            item = PedidoItem(
                id_pedido=id_pedido,
                origen="BAR",
                id_producto_bar=datos.id_producto,
                cantidad=datos.cantidad,
                precio_unitario=datos.precio_unitario
                if datos.precio_unitario is not None
                else producto.precio_venta,
                nota=datos.nota,
            )
        elif datos.origen == "RESTAURANTE":
            producto = self.productos_service.obtener_restaurante(datos.id_producto)
            if not producto.activo:
                raise BusinessRuleError("El producto no esta activo")
            item = PedidoItem(
                id_pedido=id_pedido,
                origen="RESTAURANTE",
                id_producto_restaurante=datos.id_producto,
                cantidad=datos.cantidad,
                precio_unitario=datos.precio_unitario
                if datos.precio_unitario is not None
                else producto.precio_venta,
                nota=datos.nota,
            )
        else:
            raise BusinessRuleError(f"Origen '{datos.origen}' invalido")

        self.repository.agregar_item(item)
        return self.obtener_pedido(id_pedido)

    def eliminar_item(self, id_pedido: int, id_item: int) -> Pedido:
        pedido = self.obtener_pedido(id_pedido)
        if pedido.estado == "CERRADO":
            raise BusinessRuleError("El pedido esta cerrado")
        item = self.repository.obtener_item(id_pedido, id_item)
        if item is None:
            raise NotFoundError("Item no encontrado")
        if item.origen == "BAR" and item.id_producto_bar is not None:
            self.productos_service.ajustar_stock_bar(item.id_producto_bar, item.cantidad)
        self.repository.eliminar_item(item)
        return self.obtener_pedido(id_pedido)

    def enviar_a_cocina(self, id_pedido: int) -> Pedido:
        pedido = self.obtener_pedido(id_pedido)
        if pedido.estado != "ABIERTO":
            raise BusinessRuleError("El pedido ya fue enviado a cocina")
        if not pedido.items:
            raise BusinessRuleError("El pedido no tiene productos")
        pedido.estado = "ENVIADO_COCINA"
        pedido.enviado_cocina_en = datetime.now(UTC)
        return pedido

    def avanzar_estado(self, id_pedido: int) -> Pedido:
        pedido = self.obtener_pedido(id_pedido)
        siguiente = TRANSICIONES_PEDIDO.get(pedido.estado)
        if siguiente is None:
            raise BusinessRuleError(
                f"No se puede avanzar el pedido desde el estado '{pedido.estado}'"
            )
        pedido.estado = siguiente
        return pedido

    def mover_pedido(self, id_pedido: int, id_mesa_destino: int) -> Pedido:
        pedido = self.obtener_pedido(id_pedido)
        if pedido.estado == "CERRADO":
            raise BusinessRuleError("El pedido esta cerrado")
        if pedido.id_mesa == id_mesa_destino:
            raise BusinessRuleError("El pedido ya esta en esa mesa")
        mesa_origen = self.obtener_mesa(pedido.id_mesa)
        mesa_destino = self.obtener_mesa(id_mesa_destino)
        if mesa_destino.estado != "LIBRE":
            raise BusinessRuleError("La mesa destino no esta libre")
        pedido.id_mesa = id_mesa_destino
        mesa_destino.estado = "OCUPADA"
        mesa_origen.estado = "LIBRE"
        return pedido

    def cerrar_pedido(self, id_pedido: int) -> Pedido:
        pedido = self.obtener_pedido(id_pedido)
        if pedido.estado == "CERRADO":
            raise BusinessRuleError("El pedido ya esta cerrado")
        pedido.estado = "CERRADO"
        pedido.cerrado_en = datetime.now(UTC)
        mesa = self.obtener_mesa(pedido.id_mesa)
        mesa.estado = "LIBRE"
        return pedido
