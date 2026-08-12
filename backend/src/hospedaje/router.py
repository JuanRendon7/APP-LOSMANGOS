from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.auth.dependencies import requiere_permiso
from src.auth.schemas import UsuarioActual
from src.hospedaje.dependencies import get_hospedaje_service
from src.hospedaje.models import Habitacion, Huesped, Reserva
from src.hospedaje.schemas import (
    HabitacionCreate,
    HabitacionInfoUpdate,
    HabitacionResponse,
    HabitacionUpdate,
    HuespedResponse,
    ReservaCambiarHabitacion,
    ReservaCreate,
    ReservaResponse,
    ReservaUpdate,
)
from src.hospedaje.service import HospedajeService
from src.shared.database import get_db
from src.shared.exceptions import BusinessRuleError, ConflictError, NotFoundError


def _huesped_response(huesped: Huesped) -> HuespedResponse:
    return HuespedResponse.model_validate(huesped)


def _reserva_response(reserva: Reserva) -> ReservaResponse:
    return ReservaResponse(
        id_reserva=reserva.id_reserva,
        id_habitacion=reserva.id_habitacion,
        id_huesped=reserva.id_huesped,
        huesped=_huesped_response(reserva.huesped),
        fecha_checkin_prevista=reserva.fecha_checkin_prevista,
        fecha_checkout_prevista=reserva.fecha_checkout_prevista,
        fecha_checkin_real=reserva.fecha_checkin_real,
        fecha_checkout_real=reserva.fecha_checkout_real,
        estado=reserva.estado,
        precio_total=reserva.precio_total,
        pagada=reserva.pagada,
        origen=reserva.origen,
    )


def _habitacion_response(
    habitacion: Habitacion, reserva_activa: Reserva | None
) -> HabitacionResponse:
    return HabitacionResponse(
        id_habitacion=habitacion.id_habitacion,
        numero=habitacion.numero,
        piso=habitacion.piso,
        tipo=habitacion.tipo,
        estado=habitacion.estado,
        reserva_activa=_reserva_response(reserva_activa) if reserva_activa else None,
    )


habitaciones_router = APIRouter(prefix="/habitaciones", tags=["habitaciones"])


@habitaciones_router.get("", response_model=list[HabitacionResponse])
def listar_habitaciones(
    servicio: HospedajeService = Depends(get_hospedaje_service),
    _: UsuarioActual = Depends(requiere_permiso("HABITACIONES", "VER")),
):
    return [_habitacion_response(h, r) for h, r in servicio.listar_habitaciones()]


@habitaciones_router.patch("/{id_habitacion}", response_model=HabitacionResponse)
def actualizar_habitacion(
    id_habitacion: int,
    datos: HabitacionUpdate,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("HABITACIONES", "EDITAR")),
    servicio: HospedajeService = Depends(get_hospedaje_service),
):
    try:
        habitacion = servicio.actualizar_habitacion_estado(id_habitacion, datos.estado)
        db.commit()
    except NotFoundError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except BusinessRuleError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    db.refresh(habitacion)
    # Las transiciones manuales nunca dejan la habitacion en OCUPADA.
    return _habitacion_response(habitacion, None)


@habitaciones_router.post(
    "", response_model=HabitacionResponse, status_code=status.HTTP_201_CREATED
)
def crear_habitacion(
    datos: HabitacionCreate,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("HABITACIONES", "CREAR")),
    servicio: HospedajeService = Depends(get_hospedaje_service),
):
    try:
        habitacion = servicio.crear_habitacion(datos)
        db.commit()
    except ConflictError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc
    db.refresh(habitacion)
    return _habitacion_response(habitacion, None)


@habitaciones_router.patch("/{id_habitacion}/info", response_model=HabitacionResponse)
def actualizar_habitacion_info(
    id_habitacion: int,
    datos: HabitacionInfoUpdate,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("HABITACIONES", "EDITAR_CATALOGO")),
    servicio: HospedajeService = Depends(get_hospedaje_service),
):
    try:
        habitacion = servicio.actualizar_habitacion_info(id_habitacion, datos)
        db.commit()
    except NotFoundError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except ConflictError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc
    db.refresh(habitacion)
    return _habitacion_response(habitacion, None)


huespedes_router = APIRouter(prefix="/huespedes", tags=["huespedes"])


@huespedes_router.get("", response_model=list[HuespedResponse])
def buscar_huespedes(
    q: str | None = Query(default=None),
    servicio: HospedajeService = Depends(get_hospedaje_service),
    _: UsuarioActual = Depends(requiere_permiso("HUESPEDES", "VER")),
):
    return [_huesped_response(h) for h in servicio.buscar_huespedes(q)]


@huespedes_router.get("/{id_huesped}", response_model=HuespedResponse)
def obtener_huesped(
    id_huesped: int,
    servicio: HospedajeService = Depends(get_hospedaje_service),
    _: UsuarioActual = Depends(requiere_permiso("HUESPEDES", "VER")),
):
    try:
        return _huesped_response(servicio.obtener_huesped(id_huesped))
    except NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


reservas_router = APIRouter(prefix="/reservas", tags=["reservas"])


@reservas_router.get("", response_model=list[ReservaResponse])
def listar_reservas(
    id_habitacion: int | None = Query(default=None),
    estado: str | None = Query(default=None),
    desde: date | None = Query(default=None),
    hasta: date | None = Query(default=None),
    servicio: HospedajeService = Depends(get_hospedaje_service),
    _: UsuarioActual = Depends(requiere_permiso("RESERVAS", "VER")),
):
    reservas = servicio.listar_reservas(id_habitacion, estado, desde, hasta)
    return [_reserva_response(r) for r in reservas]


@reservas_router.post(
    "", response_model=ReservaResponse, status_code=status.HTTP_201_CREATED
)
def crear_reserva(
    datos: ReservaCreate,
    db: Session = Depends(get_db),
    actor: UsuarioActual = Depends(requiere_permiso("RESERVAS", "CREAR")),
    servicio: HospedajeService = Depends(get_hospedaje_service),
):
    try:
        reserva = servicio.crear_reserva(datos, creado_por=actor.id_usuario)
        db.commit()
    except NotFoundError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except ConflictError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc
    except BusinessRuleError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    db.refresh(reserva)
    return _reserva_response(reserva)


@reservas_router.patch("/{id_reserva}", response_model=ReservaResponse)
def actualizar_reserva(
    id_reserva: int,
    datos: ReservaUpdate,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("RESERVAS", "EDITAR")),
    servicio: HospedajeService = Depends(get_hospedaje_service),
):
    try:
        reserva = servicio.actualizar_reserva(id_reserva, datos)
        db.commit()
    except NotFoundError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except ConflictError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc
    except BusinessRuleError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    db.refresh(reserva)
    return _reserva_response(reserva)


@reservas_router.post("/{id_reserva}/check-in", response_model=ReservaResponse)
def check_in(
    id_reserva: int,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("RESERVAS", "EDITAR")),
    servicio: HospedajeService = Depends(get_hospedaje_service),
):
    try:
        reserva = servicio.check_in(id_reserva)
        db.commit()
    except NotFoundError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except BusinessRuleError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    db.refresh(reserva)
    return _reserva_response(reserva)


@reservas_router.post("/{id_reserva}/check-out", response_model=ReservaResponse)
def check_out(
    id_reserva: int,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("RESERVAS", "EDITAR")),
    servicio: HospedajeService = Depends(get_hospedaje_service),
):
    try:
        reserva = servicio.check_out(id_reserva)
        db.commit()
    except NotFoundError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except BusinessRuleError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    db.refresh(reserva)
    return _reserva_response(reserva)


@reservas_router.post(
    "/{id_reserva}/cambiar-habitacion", response_model=ReservaResponse
)
def cambiar_habitacion(
    id_reserva: int,
    datos: ReservaCambiarHabitacion,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("RESERVAS", "EDITAR")),
    servicio: HospedajeService = Depends(get_hospedaje_service),
):
    try:
        reserva = servicio.cambiar_habitacion(id_reserva, datos.id_habitacion_destino)
        db.commit()
    except NotFoundError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except ConflictError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc
    except BusinessRuleError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    db.refresh(reserva)
    return _reserva_response(reserva)


@reservas_router.post("/{id_reserva}/cancelar", response_model=ReservaResponse)
def cancelar_reserva(
    id_reserva: int,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("RESERVAS", "EDITAR")),
    servicio: HospedajeService = Depends(get_hospedaje_service),
):
    try:
        reserva = servicio.cancelar_reserva(id_reserva)
        db.commit()
    except NotFoundError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except BusinessRuleError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    db.refresh(reserva)
    return _reserva_response(reserva)
