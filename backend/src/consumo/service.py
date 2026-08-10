from src.consumo.models import ConsumoItem
from src.consumo.repository import ConsumoRepository
from src.consumo.schemas import ConsumoItemCreate
from src.hospedaje.repository import HospedajeRepository
from src.productos.service import ProductosService
from src.shared.exceptions import BusinessRuleError, NotFoundError


class ConsumoService:
    def __init__(
        self,
        repository: ConsumoRepository,
        hospedaje_repository: HospedajeRepository,
        productos_service: ProductosService,
    ) -> None:
        self.repository = repository
        self.hospedaje_repository = hospedaje_repository
        self.productos_service = productos_service

    def listar_por_reserva(self, id_reserva: int) -> list[ConsumoItem]:
        return self.repository.listar_por_reserva(id_reserva)

    def agregar_item(
        self, datos: ConsumoItemCreate, creado_por: int | None
    ) -> ConsumoItem:
        reserva = self.hospedaje_repository.obtener_reserva(datos.id_reserva)
        if reserva is None:
            raise NotFoundError("Reserva no encontrada")
        if reserva.estado != "CHECK_IN":
            raise BusinessRuleError(
                "Solo se puede cargar consumo a una habitacion con check-in activo"
            )

        if datos.origen == "BAR":
            producto = self.productos_service.obtener_bar(datos.id_producto)
            if not producto.activo:
                raise BusinessRuleError("El producto no esta activo")
            self.productos_service.ajustar_stock_bar(
                datos.id_producto, -datos.cantidad
            )
            item = ConsumoItem(
                id_reserva=datos.id_reserva,
                origen="BAR",
                id_producto_bar=datos.id_producto,
                cantidad=datos.cantidad,
                precio_unitario=producto.precio_venta,
                creado_por=creado_por,
            )
        elif datos.origen == "RESTAURANTE":
            producto = self.productos_service.obtener_restaurante(datos.id_producto)
            if not producto.activo:
                raise BusinessRuleError("El producto no esta activo")
            item = ConsumoItem(
                id_reserva=datos.id_reserva,
                origen="RESTAURANTE",
                id_producto_restaurante=datos.id_producto,
                cantidad=datos.cantidad,
                precio_unitario=producto.precio_venta,
                creado_por=creado_por,
            )
        else:
            raise BusinessRuleError(f"Origen '{datos.origen}' invalido")

        return self.repository.crear(item)

    def eliminar_item(self, id_consumo: int) -> None:
        item = self.repository.obtener(id_consumo)
        if item is None:
            raise NotFoundError("Item de consumo no encontrado")
        if item.id_venta is not None:
            raise BusinessRuleError("No se puede quitar un consumo que ya fue cobrado")
        if item.origen == "BAR" and item.id_producto_bar is not None:
            self.productos_service.ajustar_stock_bar(
                item.id_producto_bar, item.cantidad
            )
        self.repository.eliminar(item)
