from datetime import UTC, date, datetime

from src.caja.models import METODOS_PAGO, Gasto, TurnoCaja, Venta, VentaItem
from src.caja.repository import CajaRepository
from src.caja.schemas import GastoCreate, GastoUpdate, VentaMostradorItemInput
from src.consumo.repository import ConsumoRepository
from src.hospedaje.service import HospedajeService
from src.productos.service import ProductosService
from src.restaurante.service import RestauranteService
from src.shared.exceptions import BusinessRuleError, NotFoundError


class CajaService:
    def __init__(
        self,
        repository: CajaRepository,
        consumo_repository: ConsumoRepository,
        hospedaje_service: HospedajeService,
        restaurante_service: RestauranteService,
        productos_service: ProductosService,
    ) -> None:
        self.repository = repository
        self.consumo_repository = consumo_repository
        self.hospedaje_service = hospedaje_service
        self.restaurante_service = restaurante_service
        self.productos_service = productos_service

    # Turnos

    def turno_actual(self) -> TurnoCaja | None:
        return self.repository.obtener_turno_abierto()

    def listar_turnos(
        self,
        id_usuario: int | None,
        estado: str | None,
        desde: date | None = None,
        hasta: date | None = None,
    ) -> list[TurnoCaja]:
        return self.repository.listar_turnos(id_usuario, estado, desde, hasta)

    def abrir_turno(self, id_usuario: int, monto_apertura: int) -> TurnoCaja:
        turno_abierto = self.repository.obtener_turno_abierto()
        if turno_abierto is not None:
            raise BusinessRuleError(
                f"Ya hay una caja abierta (por {turno_abierto.usuario.nombre}). "
                "Debe cerrarse antes de abrir una nueva."
            )
        turno = TurnoCaja(id_usuario=id_usuario, monto_apertura=monto_apertura)
        return self.repository.crear_turno(turno)

    def cerrar_turno(self, id_turno: int, monto_cierre_real: int) -> TurnoCaja:
        turno = self.repository.obtener_turno(id_turno)
        if turno is None:
            raise NotFoundError("Turno de caja no encontrado")
        if turno.estado == "CERRADO":
            raise BusinessRuleError("La caja ya esta cerrada")
        turno.estado = "CERRADO"
        turno.monto_cierre_real = monto_cierre_real
        turno.fecha_cierre = datetime.now(UTC)
        return turno

    def _turno_abierto(self) -> TurnoCaja:
        turno = self.repository.obtener_turno_abierto()
        if turno is None:
            raise BusinessRuleError("No hay una caja abierta, abrela primero")
        return turno

    # Gastos

    def listar_gastos(self, id_turno: int | None) -> list[Gasto]:
        return self.repository.listar_gastos(id_turno)

    def registrar_gasto(self, id_usuario: int, datos: GastoCreate) -> Gasto:
        turno = self._turno_abierto()
        gasto = Gasto(
            id_turno_caja=turno.id_turno,
            concepto=datos.concepto,
            monto=datos.monto,
            creado_por=id_usuario,
        )
        return self.repository.crear_gasto(gasto)

    def actualizar_gasto(self, id_gasto: int, datos: GastoUpdate) -> Gasto:
        gasto = self.repository.obtener_gasto(id_gasto)
        if gasto is None:
            raise NotFoundError("Gasto no encontrado")
        if datos.concepto is not None:
            gasto.concepto = datos.concepto
        if datos.monto is not None:
            gasto.monto = datos.monto
        return gasto

    def eliminar_gasto(self, id_gasto: int) -> None:
        gasto = self.repository.obtener_gasto(id_gasto)
        if gasto is None:
            raise NotFoundError("Gasto no encontrado")
        self.repository.eliminar_gasto(gasto)

    # Ventas

    def listar_ventas(
        self,
        id_turno: int | None,
        metodo_pago: str | None,
        origen: str | None,
        desde: date | None = None,
        hasta: date | None = None,
    ) -> list[Venta]:
        return self.repository.listar_ventas(
            id_turno, metodo_pago, origen, desde, hasta
        )

    def _validar_metodo_pago(self, metodo_pago: str) -> None:
        if metodo_pago not in METODOS_PAGO:
            raise BusinessRuleError(f"Metodo de pago '{metodo_pago}' invalido")

    def cobrar_habitacion(
        self, id_usuario: int, id_reserva: int, metodo_pago: str
    ) -> Venta:
        self._validar_metodo_pago(metodo_pago)
        turno = self._turno_abierto()
        reserva = self.hospedaje_service.obtener_reserva(id_reserva)
        if reserva.estado == "CANCELADA":
            raise BusinessRuleError("La reserva esta cancelada")
        consumo_pendiente = self.consumo_repository.listar_no_facturados(id_reserva)
        total_consumo = sum(i.cantidad * i.precio_unitario for i in consumo_pendiente)
        monto_habitacion = 0 if reserva.pagada else reserva.precio_total
        if monto_habitacion == 0 and total_consumo == 0:
            raise BusinessRuleError("No hay nada pendiente por cobrar en esta reserva")
        venta = Venta(
            id_turno_caja=turno.id_turno,
            origen="HABITACION",
            id_reserva=id_reserva,
            metodo_pago=metodo_pago,
            monto=monto_habitacion + total_consumo,
            creado_por=id_usuario,
        )
        venta = self.repository.crear_venta(venta)
        reserva.pagada = True
        self.consumo_repository.marcar_facturados(consumo_pendiente, venta.id_venta)
        return venta

    def cobrar_pedido(self, id_usuario: int, id_pedido: int, metodo_pago: str) -> Venta:
        self._validar_metodo_pago(metodo_pago)
        turno = self._turno_abierto()
        pedido = self.restaurante_service.obtener_pedido(id_pedido)
        total = sum(item.cantidad * item.precio_unitario for item in pedido.items)
        if total == 0:
            raise BusinessRuleError("El pedido no tiene productos")
        self.restaurante_service.cerrar_pedido(id_pedido)
        venta = Venta(
            id_turno_caja=turno.id_turno,
            origen="MESA",
            id_pedido=id_pedido,
            metodo_pago=metodo_pago,
            monto=total,
            creado_por=id_usuario,
        )
        return self.repository.crear_venta(venta)

    def venta_mostrador(
        self,
        id_usuario: int,
        items: list[VentaMostradorItemInput],
        metodo_pago: str,
    ) -> Venta:
        self._validar_metodo_pago(metodo_pago)
        turno = self._turno_abierto()
        if not items:
            raise BusinessRuleError("La venta debe tener al menos un producto")

        venta = Venta(
            id_turno_caja=turno.id_turno,
            origen="MOSTRADOR",
            metodo_pago=metodo_pago,
            monto=0,
            creado_por=id_usuario,
        )
        venta = self.repository.crear_venta(venta)

        total = 0
        for entrada in items:
            if entrada.origen == "BAR":
                producto = self.productos_service.obtener_bar(entrada.id_producto)
                if not producto.activo:
                    raise BusinessRuleError("El producto no esta activo")
                self.productos_service.ajustar_stock_bar(
                    entrada.id_producto, -entrada.cantidad
                )
                venta_item = VentaItem(
                    id_venta=venta.id_venta,
                    id_producto_bar=entrada.id_producto,
                    cantidad=entrada.cantidad,
                    precio_unitario=producto.precio_venta,
                )
            elif entrada.origen == "RESTAURANTE":
                producto = self.productos_service.obtener_restaurante(
                    entrada.id_producto
                )
                if not producto.activo:
                    raise BusinessRuleError("El producto no esta activo")
                venta_item = VentaItem(
                    id_venta=venta.id_venta,
                    id_producto_restaurante=entrada.id_producto,
                    cantidad=entrada.cantidad,
                    precio_unitario=producto.precio_venta,
                )
            else:
                raise BusinessRuleError(f"Origen '{entrada.origen}' invalido")

            self.repository.agregar_venta_item(venta_item)
            total += entrada.cantidad * venta_item.precio_unitario

        venta.monto = total
        return venta

    def deshacer_ultima_venta(self) -> Venta:
        turno = self._turno_abierto()
        ventas = self.repository.listar_ventas(turno.id_turno, None, None)
        if not ventas:
            raise BusinessRuleError("No hay ventas para deshacer en este turno")
        ultima = ventas[0]
        if ultima.origen != "MOSTRADOR":
            raise BusinessRuleError(
                "Solo se pueden deshacer ventas de mostrador; los cobros de "
                "habitacion o mesa se corrigen desde su propia pantalla"
            )
        for item in ultima.items:
            if item.id_producto_bar is not None:
                self.productos_service.ajustar_stock_bar(
                    item.id_producto_bar, item.cantidad
                )
        self.repository.eliminar_venta(ultima)
        return ultima
