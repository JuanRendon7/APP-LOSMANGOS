from datetime import UTC, date, datetime, time
from zoneinfo import ZoneInfo

from src.caja.models import (
    FUENTES_PAGO_GASTO,
    METODOS_PAGO,
    TIPOS_TURNO,
    Gasto,
    TurnoCaja,
    Venta,
    VentaItem,
)
from src.caja.repository import CajaRepository
from src.caja.schemas import GastoCreate, GastoUpdate, VentaMostradorItemInput
from src.consumo.repository import ConsumoRepository
from src.hospedaje.service import HospedajeService
from src.productos.service import ProductosService
from src.proveedores.repository import ProveedoresRepository
from src.restaurante.service import RestauranteService
from src.shared.exceptions import BusinessRuleError, NotFoundError

# El turno nocturno solo puede abrirse dentro de este rango horario (hora de
# Colombia); no cierra automaticamente al llegar la hora limite, solo se
# restringe cuando se puede ABRIR uno nuevo.
ZONA_HOTEL = ZoneInfo("America/Bogota")
HORA_INICIO_NOCTURNO = time(18, 0)
HORA_FIN_NOCTURNO = time(6, 0)


class CajaService:
    def __init__(
        self,
        repository: CajaRepository,
        consumo_repository: ConsumoRepository,
        hospedaje_service: HospedajeService,
        restaurante_service: RestauranteService,
        productos_service: ProductosService,
        proveedores_repository: ProveedoresRepository,
    ) -> None:
        self.repository = repository
        self.consumo_repository = consumo_repository
        self.hospedaje_service = hospedaje_service
        self.restaurante_service = restaurante_service
        self.productos_service = productos_service
        self.proveedores_repository = proveedores_repository

    # Turnos

    def turno_actual(self, tipo: str) -> TurnoCaja | None:
        return self.repository.obtener_turno_abierto(tipo)

    def turnos_abiertos(self) -> list[TurnoCaja]:
        return self.repository.listar_turnos_abiertos()

    def listar_turnos(
        self,
        id_usuario: int | None,
        estado: str | None,
        desde: date | None = None,
        hasta: date | None = None,
        tipo: str | None = None,
    ) -> list[TurnoCaja]:
        return self.repository.listar_turnos(id_usuario, estado, desde, hasta, tipo)

    def _dentro_horario_nocturno(self) -> bool:
        ahora = datetime.now(ZONA_HOTEL).time()
        return ahora >= HORA_INICIO_NOCTURNO or ahora < HORA_FIN_NOCTURNO

    def abrir_turno(self, id_usuario: int, monto_apertura: int, tipo: str) -> TurnoCaja:
        if tipo not in TIPOS_TURNO:
            raise BusinessRuleError(f"Tipo de turno '{tipo}' invalido")
        if tipo == "NOCTURNO" and not self._dentro_horario_nocturno():
            raise BusinessRuleError(
                "El turno nocturno solo puede abrirse entre las 6:00 pm y las 6:00 am"
            )
        turno_abierto = self.repository.obtener_turno_abierto(tipo)
        if turno_abierto is not None:
            raise BusinessRuleError(
                f"Ya hay una caja {tipo.lower()} abierta (por "
                f"{turno_abierto.usuario.nombre}). Debe cerrarse antes de "
                "abrir una nueva."
            )
        turno = TurnoCaja(
            id_usuario=id_usuario, monto_apertura=monto_apertura, tipo=tipo
        )
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

    def _resolver_turno(self, id_turno: int | None) -> TurnoCaja:
        """Decide sobre que turno abierto se registra un movimiento. Si hay
        un unico turno abierto (el caso normal), se usa ese sin preguntar. Si
        hay mas de uno abierto a la vez (diurno y nocturno simultaneos), el
        llamador debe indicar explicitamente id_turno."""
        abiertos = self.repository.listar_turnos_abiertos()
        if not abiertos:
            raise BusinessRuleError("No hay una caja abierta, abrela primero")
        if id_turno is not None:
            turno = next((t for t in abiertos if t.id_turno == id_turno), None)
            if turno is None:
                raise BusinessRuleError("La caja indicada no esta abierta")
            return turno
        if len(abiertos) > 1:
            raise BusinessRuleError(
                "Hay mas de una caja abierta; debes indicar a cual "
                "registrar el movimiento"
            )
        return abiertos[0]

    # Gastos

    def listar_gastos(self, id_turno: int | None) -> list[Gasto]:
        return self.repository.listar_gastos(id_turno)

    def _validar_fuente_pago(self, fuente_pago: str) -> None:
        if fuente_pago not in FUENTES_PAGO_GASTO:
            raise BusinessRuleError(f"Fuente de pago '{fuente_pago}' invalida")

    def _validar_proveedor(self, id_proveedor: int | None) -> None:
        if id_proveedor is None:
            return
        if self.proveedores_repository.obtener(id_proveedor) is None:
            raise NotFoundError("Proveedor no encontrado")

    def registrar_gasto(self, id_usuario: int, datos: GastoCreate) -> Gasto:
        turno = self._resolver_turno(datos.id_turno)
        self._validar_fuente_pago(datos.fuente_pago)
        self._validar_proveedor(datos.id_proveedor)
        gasto = Gasto(
            id_turno_caja=turno.id_turno,
            concepto=datos.concepto,
            monto=datos.monto,
            id_proveedor=datos.id_proveedor,
            fuente_pago=datos.fuente_pago,
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
        if datos.fuente_pago is not None:
            self._validar_fuente_pago(datos.fuente_pago)
            gasto.fuente_pago = datos.fuente_pago
        if datos.id_proveedor is not None:
            self._validar_proveedor(datos.id_proveedor)
            gasto.id_proveedor = datos.id_proveedor
        return gasto

    def eliminar_gasto(self, id_gasto: int) -> None:
        gasto = self.repository.obtener_gasto(id_gasto)
        if gasto is None:
            raise NotFoundError("Gasto no encontrado")
        self.repository.eliminar_gasto(gasto)

    # Ventas

    def obtener_venta(self, id_venta: int) -> Venta:
        venta = self.repository.obtener_venta(id_venta)
        if venta is None:
            raise NotFoundError("Venta no encontrada")
        return venta

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
        self,
        id_usuario: int,
        id_reserva: int,
        metodo_pago: str,
        id_turno: int | None = None,
    ) -> Venta:
        self._validar_metodo_pago(metodo_pago)
        turno = self._resolver_turno(id_turno)
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
        for consumo in consumo_pendiente:
            venta_item = VentaItem(
                id_venta=venta.id_venta,
                id_producto_bar=consumo.id_producto_bar,
                id_producto_restaurante=consumo.id_producto_restaurante,
                cantidad=consumo.cantidad,
                precio_unitario=consumo.precio_unitario,
            )
            self.repository.agregar_venta_item(venta_item)
        return venta

    def cobrar_pedido(
        self,
        id_usuario: int,
        id_pedido: int,
        metodo_pago: str,
        id_turno: int | None = None,
    ) -> Venta:
        self._validar_metodo_pago(metodo_pago)
        turno = self._resolver_turno(id_turno)
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
        venta = self.repository.crear_venta(venta)
        for item in pedido.items:
            venta_item = VentaItem(
                id_venta=venta.id_venta,
                id_producto_bar=item.id_producto_bar,
                id_producto_restaurante=item.id_producto_restaurante,
                cantidad=item.cantidad,
                precio_unitario=item.precio_unitario,
            )
            self.repository.agregar_venta_item(venta_item)
        return venta

    def venta_mostrador(
        self,
        id_usuario: int,
        items: list[VentaMostradorItemInput],
        metodo_pago: str,
        id_turno: int | None = None,
    ) -> Venta:
        self._validar_metodo_pago(metodo_pago)
        turno = self._resolver_turno(id_turno)
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

    def deshacer_ultima_venta(self, id_turno: int | None = None) -> Venta:
        turno = self._resolver_turno(id_turno)
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
