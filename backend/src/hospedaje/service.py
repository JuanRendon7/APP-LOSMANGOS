from datetime import UTC, datetime

from src.hospedaje.models import ESTADOS_HABITACION, Habitacion, Huesped, Reserva
from src.hospedaje.repository import HospedajeRepository
from src.hospedaje.schemas import (
    HabitacionCreate,
    HabitacionInfoUpdate,
    ReservaCreate,
    ReservaUpdate,
)
from src.shared.exceptions import BusinessRuleError, ConflictError, NotFoundError
from src.tarifas.service import TarifasService

TRANSICIONES_HABITACION_PERMITIDAS: dict[str, set[str]] = {
    "DISPONIBLE": {"MANTENIMIENTO"},
    "LIMPIEZA": {"DISPONIBLE"},
    "MANTENIMIENTO": {"DISPONIBLE"},
    "OCUPADA": set(),
}


class HospedajeService:
    def __init__(
        self, repository: HospedajeRepository, tarifas_service: TarifasService
    ) -> None:
        self.repository = repository
        self.tarifas_service = tarifas_service

    # Habitaciones

    def listar_habitaciones(self) -> list[tuple[Habitacion, Reserva | None]]:
        habitaciones = self.repository.listar_habitaciones()
        activas = self.repository.reservas_en_checkin_por_habitacion(
            [h.id_habitacion for h in habitaciones]
        )
        return [(h, activas.get(h.id_habitacion)) for h in habitaciones]

    def actualizar_habitacion_estado(
        self, id_habitacion: int, nuevo_estado: str
    ) -> Habitacion:
        habitacion = self.repository.obtener_habitacion(id_habitacion)
        if habitacion is None:
            raise NotFoundError("Habitacion no encontrada")
        if nuevo_estado not in ESTADOS_HABITACION:
            raise BusinessRuleError(f"Estado '{nuevo_estado}' invalido")
        permitidos = TRANSICIONES_HABITACION_PERMITIDAS.get(habitacion.estado, set())
        if nuevo_estado not in permitidos:
            raise BusinessRuleError(
                f"No se puede pasar de '{habitacion.estado}' a '{nuevo_estado}'"
            )
        habitacion.estado = nuevo_estado
        return habitacion

    def _validar_numero_disponible(
        self, numero: str, excluir_id_habitacion: int | None = None
    ) -> None:
        existente = self.repository.obtener_habitacion_por_numero(numero)
        if existente is not None and existente.id_habitacion != excluir_id_habitacion:
            raise ConflictError(f"Ya existe una habitacion con el numero '{numero}'")

    def crear_habitacion(self, datos: HabitacionCreate) -> Habitacion:
        self._validar_numero_disponible(datos.numero)
        habitacion = Habitacion(numero=datos.numero, piso=datos.piso, tipo=datos.tipo)
        return self.repository.crear_habitacion(habitacion)

    def actualizar_habitacion_info(
        self, id_habitacion: int, datos: HabitacionInfoUpdate
    ) -> Habitacion:
        habitacion = self.repository.obtener_habitacion(id_habitacion)
        if habitacion is None:
            raise NotFoundError("Habitacion no encontrada")
        if datos.numero is not None and datos.numero != habitacion.numero:
            self._validar_numero_disponible(datos.numero, id_habitacion)
            habitacion.numero = datos.numero
        if datos.piso is not None:
            habitacion.piso = datos.piso
        if datos.tipo is not None:
            habitacion.tipo = datos.tipo
        return habitacion

    # Huespedes

    def buscar_huespedes(self, q: str | None) -> list[Huesped]:
        return self.repository.buscar_huespedes(q)

    def obtener_huesped(self, id_huesped: int) -> Huesped:
        huesped = self.repository.obtener_huesped(id_huesped)
        if huesped is None:
            raise NotFoundError("Huesped no encontrado")
        return huesped

    def _resolver_huesped(
        self, nombre: str, cedula: str, contacto: str, placa: str | None
    ) -> Huesped:
        huesped = self.repository.obtener_huesped_por_cedula(cedula)
        if huesped is None:
            return self.repository.crear_huesped(
                Huesped(nombre=nombre, cedula=cedula, contacto=contacto, placa=placa)
            )
        huesped.nombre = nombre
        huesped.contacto = contacto
        huesped.placa = placa
        return huesped

    # Reservas

    def listar_reservas(
        self,
        id_habitacion: int | None = None,
        estado: str | None = None,
        desde=None,
        hasta=None,
    ) -> list[Reserva]:
        stmt = self.repository.listar_reservas_stmt(id_habitacion, estado, desde, hasta)
        return list(self.repository.db.scalars(stmt))

    def obtener_reserva(self, id_reserva: int) -> Reserva:
        reserva = self.repository.obtener_reserva(id_reserva)
        if reserva is None:
            raise NotFoundError("Reserva no encontrada")
        return reserva

    def crear_reserva(self, datos: ReservaCreate, creado_por: int | None) -> Reserva:
        if datos.fecha_checkin_prevista >= datos.fecha_checkout_prevista:
            raise BusinessRuleError(
                "La fecha de checkout debe ser posterior a la de checkin"
            )
        habitacion = self.repository.obtener_habitacion(datos.id_habitacion)
        if habitacion is None:
            raise NotFoundError("Habitacion no encontrada")
        if habitacion.estado == "MANTENIMIENTO":
            raise BusinessRuleError("La habitacion esta en mantenimiento")
        if self.repository.existe_solapamiento(
            datos.id_habitacion,
            datos.fecha_checkin_prevista,
            datos.fecha_checkout_prevista,
        ):
            raise ConflictError(
                "La habitacion ya tiene una reserva en ese rango de fechas"
            )
        precio_total = (
            datos.precio_total
            if datos.precio_total is not None
            else self.tarifas_service.calcular_precio_total(
                datos.fecha_checkin_prevista, datos.fecha_checkout_prevista
            )
        )
        huesped = self._resolver_huesped(
            datos.nombre, datos.cedula, datos.contacto, datos.placa
        )
        reserva = Reserva(
            id_habitacion=datos.id_habitacion,
            id_huesped=huesped.id_huesped,
            fecha_checkin_prevista=datos.fecha_checkin_prevista,
            fecha_checkout_prevista=datos.fecha_checkout_prevista,
            precio_total=precio_total,
            creado_por=creado_por,
        )
        return self.repository.crear_reserva(reserva)

    def actualizar_reserva(self, id_reserva: int, datos: ReservaUpdate) -> Reserva:
        reserva = self.obtener_reserva(id_reserva)
        if reserva.estado != "RESERVADA":
            raise BusinessRuleError("Solo se pueden editar fechas antes del check-in")
        checkin = datos.fecha_checkin_prevista or reserva.fecha_checkin_prevista
        checkout = datos.fecha_checkout_prevista or reserva.fecha_checkout_prevista
        if checkin >= checkout:
            raise BusinessRuleError(
                "La fecha de checkout debe ser posterior a la de checkin"
            )
        if self.repository.existe_solapamiento(
            reserva.id_habitacion, checkin, checkout, excluir_id_reserva=id_reserva
        ):
            raise ConflictError(
                "La habitacion ya tiene una reserva en ese rango de fechas"
            )
        reserva.precio_total = (
            datos.precio_total
            if datos.precio_total is not None
            else self.tarifas_service.calcular_precio_total(checkin, checkout)
        )
        reserva.fecha_checkin_prevista = checkin
        reserva.fecha_checkout_prevista = checkout
        return reserva

    def check_in(self, id_reserva: int) -> Reserva:
        reserva = self.obtener_reserva(id_reserva)
        if reserva.estado != "RESERVADA":
            raise BusinessRuleError("La reserva no esta en estado 'RESERVADA'")
        habitacion = self.repository.obtener_habitacion(reserva.id_habitacion)
        if habitacion is None:
            raise NotFoundError("Habitacion no encontrada")
        if habitacion.estado == "MANTENIMIENTO":
            raise BusinessRuleError("La habitacion esta en mantenimiento")
        reserva.fecha_checkin_real = datetime.now(UTC)
        reserva.estado = "CHECK_IN"
        habitacion.estado = "OCUPADA"
        return reserva

    def check_out(self, id_reserva: int) -> Reserva:
        reserva = self.obtener_reserva(id_reserva)
        if reserva.estado != "CHECK_IN":
            raise BusinessRuleError("La reserva no esta en estado 'CHECK_IN'")
        habitacion = self.repository.obtener_habitacion(reserva.id_habitacion)
        if habitacion is None:
            raise NotFoundError("Habitacion no encontrada")
        reserva.fecha_checkout_real = datetime.now(UTC)
        reserva.estado = "CHECK_OUT"
        habitacion.estado = "LIMPIEZA"
        return reserva

    def cambiar_habitacion(
        self, id_reserva: int, id_habitacion_destino: int
    ) -> Reserva:
        reserva = self.obtener_reserva(id_reserva)
        if reserva.estado != "CHECK_IN":
            raise BusinessRuleError(
                "Solo se puede cambiar de habitacion una reserva con check-in activo"
            )
        if id_habitacion_destino == reserva.id_habitacion:
            raise BusinessRuleError("La reserva ya esta en esa habitacion")
        habitacion_destino = self.repository.obtener_habitacion(id_habitacion_destino)
        if habitacion_destino is None:
            raise NotFoundError("Habitacion no encontrada")
        if habitacion_destino.estado != "DISPONIBLE":
            raise BusinessRuleError("La habitacion destino no esta disponible")
        if self.repository.existe_solapamiento(
            id_habitacion_destino,
            reserva.fecha_checkin_prevista,
            reserva.fecha_checkout_prevista,
            excluir_id_reserva=id_reserva,
        ):
            raise ConflictError(
                "La habitacion destino ya tiene una reserva en ese rango de fechas"
            )
        habitacion_origen = self.repository.obtener_habitacion(reserva.id_habitacion)
        reserva.id_habitacion = id_habitacion_destino
        habitacion_destino.estado = "OCUPADA"
        if habitacion_origen is not None:
            habitacion_origen.estado = "LIMPIEZA"
        return reserva

    def cancelar_reserva(self, id_reserva: int) -> Reserva:
        reserva = self.obtener_reserva(id_reserva)
        if reserva.estado != "RESERVADA":
            raise BusinessRuleError(
                "Solo se pueden cancelar reservas en estado 'RESERVADA'"
            )
        reserva.estado = "CANCELADA"
        return reserva
