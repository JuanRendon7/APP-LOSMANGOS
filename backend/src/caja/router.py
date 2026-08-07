from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.auth.dependencies import requiere_permiso
from src.auth.schemas import UsuarioActual
from src.caja.dependencies import get_caja_service
from src.caja.models import TurnoCaja, Venta
from src.caja.schemas import (
    GastoCreate,
    GastoResponse,
    GastoUpdate,
    TurnoCajaAbrir,
    TurnoCajaCerrar,
    TurnoCajaResponse,
    VentaHabitacionInput,
    VentaItemResponse,
    VentaMostradorInput,
    VentaPedidoInput,
    VentaResponse,
)
from src.caja.service import CajaService
from src.shared.database import get_db
from src.shared.exceptions import BusinessRuleError, NotFoundError


def _turno_response(turno: TurnoCaja) -> TurnoCajaResponse:
    total_efectivo = sum(v.monto for v in turno.ventas if v.metodo_pago == "EFECTIVO")
    total_tarjeta = sum(v.monto for v in turno.ventas if v.metodo_pago == "TARJETA")
    total_transferencia = sum(
        v.monto for v in turno.ventas if v.metodo_pago == "TRANSFERENCIA"
    )
    total_qr = sum(v.monto for v in turno.ventas if v.metodo_pago == "QR")
    total_gastos = sum(g.monto for g in turno.gastos)
    monto_esperado_efectivo = turno.monto_apertura + total_efectivo - total_gastos
    diferencia = (
        turno.monto_cierre_real - monto_esperado_efectivo
        if turno.monto_cierre_real is not None
        else None
    )
    return TurnoCajaResponse(
        id_turno=turno.id_turno,
        id_usuario=turno.id_usuario,
        estado=turno.estado,
        monto_apertura=turno.monto_apertura,
        monto_cierre_real=turno.monto_cierre_real,
        creado_en=turno.creado_en,
        fecha_cierre=turno.fecha_cierre,
        total_efectivo=total_efectivo,
        total_tarjeta=total_tarjeta,
        total_transferencia=total_transferencia,
        total_qr=total_qr,
        total_gastos=total_gastos,
        monto_esperado_efectivo=monto_esperado_efectivo,
        diferencia=diferencia,
    )


def _venta_response(venta: Venta) -> VentaResponse:
    return VentaResponse(
        id_venta=venta.id_venta,
        id_turno_caja=venta.id_turno_caja,
        origen=venta.origen,
        id_reserva=venta.id_reserva,
        id_pedido=venta.id_pedido,
        metodo_pago=venta.metodo_pago,
        monto=venta.monto,
        creado_en=venta.creado_en,
        items=[
            VentaItemResponse(
                id_venta_item=item.id_venta_item,
                nombre_producto=item.nombre_producto,
                cantidad=item.cantidad,
                precio_unitario=item.precio_unitario,
            )
            for item in venta.items
        ],
    )


turnos_router = APIRouter(prefix="/caja/turnos", tags=["caja"])


@turnos_router.get("/actual", response_model=TurnoCajaResponse | None)
def turno_actual(
    actor: UsuarioActual = Depends(requiere_permiso("CAJA", "VER")),
    servicio: CajaService = Depends(get_caja_service),
):
    turno = servicio.turno_actual(actor.id_usuario)
    return _turno_response(turno) if turno else None


@turnos_router.get("", response_model=list[TurnoCajaResponse])
def listar_turnos(
    id_usuario: int | None = Query(default=None),
    estado: str | None = Query(default=None),
    servicio: CajaService = Depends(get_caja_service),
    _: UsuarioActual = Depends(requiere_permiso("CAJA", "VER")),
):
    return [_turno_response(t) for t in servicio.listar_turnos(id_usuario, estado)]


@turnos_router.post(
    "", response_model=TurnoCajaResponse, status_code=status.HTTP_201_CREATED
)
def abrir_turno(
    datos: TurnoCajaAbrir,
    db: Session = Depends(get_db),
    actor: UsuarioActual = Depends(requiere_permiso("CAJA", "CREAR")),
    servicio: CajaService = Depends(get_caja_service),
):
    try:
        turno = servicio.abrir_turno(actor.id_usuario, datos.monto_apertura)
        db.commit()
    except BusinessRuleError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    db.refresh(turno)
    return _turno_response(turno)


@turnos_router.post("/{id_turno}/cerrar", response_model=TurnoCajaResponse)
def cerrar_turno(
    id_turno: int,
    datos: TurnoCajaCerrar,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("CAJA", "CERRAR")),
    servicio: CajaService = Depends(get_caja_service),
):
    try:
        turno = servicio.cerrar_turno(id_turno, datos.monto_cierre_real)
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
    db.refresh(turno)
    return _turno_response(turno)


gastos_router = APIRouter(prefix="/caja/gastos", tags=["caja"])


@gastos_router.get("", response_model=list[GastoResponse])
def listar_gastos(
    id_turno: int | None = Query(default=None),
    servicio: CajaService = Depends(get_caja_service),
    _: UsuarioActual = Depends(requiere_permiso("GASTOS", "VER")),
):
    return [GastoResponse.model_validate(g) for g in servicio.listar_gastos(id_turno)]


@gastos_router.post(
    "", response_model=GastoResponse, status_code=status.HTTP_201_CREATED
)
def registrar_gasto(
    datos: GastoCreate,
    db: Session = Depends(get_db),
    actor: UsuarioActual = Depends(requiere_permiso("GASTOS", "CREAR")),
    servicio: CajaService = Depends(get_caja_service),
):
    try:
        gasto = servicio.registrar_gasto(actor.id_usuario, datos)
        db.commit()
    except BusinessRuleError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    db.refresh(gasto)
    return GastoResponse.model_validate(gasto)


@gastos_router.patch("/{id_gasto}", response_model=GastoResponse)
def actualizar_gasto(
    id_gasto: int,
    datos: GastoUpdate,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("GASTOS", "EDITAR")),
    servicio: CajaService = Depends(get_caja_service),
):
    try:
        gasto = servicio.actualizar_gasto(id_gasto, datos)
        db.commit()
    except NotFoundError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    db.refresh(gasto)
    return GastoResponse.model_validate(gasto)


@gastos_router.delete("/{id_gasto}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_gasto(
    id_gasto: int,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("GASTOS", "ELIMINAR")),
    servicio: CajaService = Depends(get_caja_service),
):
    try:
        servicio.eliminar_gasto(id_gasto)
        db.commit()
    except NotFoundError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


ventas_router = APIRouter(prefix="/caja/ventas", tags=["caja"])


@ventas_router.get("", response_model=list[VentaResponse])
def listar_ventas(
    id_turno: int | None = Query(default=None),
    metodo_pago: str | None = Query(default=None),
    origen: str | None = Query(default=None),
    servicio: CajaService = Depends(get_caja_service),
    _: UsuarioActual = Depends(requiere_permiso("VENTAS", "VER")),
):
    ventas = servicio.listar_ventas(id_turno, metodo_pago, origen)
    return [_venta_response(v) for v in ventas]


@ventas_router.post(
    "/habitacion", response_model=VentaResponse, status_code=status.HTTP_201_CREATED
)
def cobrar_habitacion(
    datos: VentaHabitacionInput,
    db: Session = Depends(get_db),
    actor: UsuarioActual = Depends(requiere_permiso("VENTAS", "CREAR")),
    servicio: CajaService = Depends(get_caja_service),
):
    try:
        venta = servicio.cobrar_habitacion(
            actor.id_usuario, datos.id_reserva, datos.metodo_pago
        )
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
    db.refresh(venta)
    return _venta_response(venta)


@ventas_router.post(
    "/pedido", response_model=VentaResponse, status_code=status.HTTP_201_CREATED
)
def cobrar_pedido(
    datos: VentaPedidoInput,
    db: Session = Depends(get_db),
    actor: UsuarioActual = Depends(requiere_permiso("VENTAS", "CREAR")),
    servicio: CajaService = Depends(get_caja_service),
):
    try:
        venta = servicio.cobrar_pedido(
            actor.id_usuario, datos.id_pedido, datos.metodo_pago
        )
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
    db.refresh(venta)
    return _venta_response(venta)


@ventas_router.post(
    "/mostrador", response_model=VentaResponse, status_code=status.HTTP_201_CREATED
)
def venta_mostrador(
    datos: VentaMostradorInput,
    db: Session = Depends(get_db),
    actor: UsuarioActual = Depends(requiere_permiso("VENTAS", "CREAR")),
    servicio: CajaService = Depends(get_caja_service),
):
    try:
        venta = servicio.venta_mostrador(
            actor.id_usuario, datos.items, datos.metodo_pago
        )
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
    db.refresh(venta)
    return _venta_response(venta)
