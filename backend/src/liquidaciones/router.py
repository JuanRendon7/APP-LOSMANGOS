from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.auth.dependencies import requiere_permiso
from src.auth.schemas import UsuarioActual
from src.liquidaciones.dependencies import get_liquidaciones_service
from src.liquidaciones.models import LiquidacionEmpleado
from src.liquidaciones.schemas import (
    LiquidacionEmpleadoCreate,
    LiquidacionEmpleadoResponse,
    LiquidacionEmpleadoUpdate,
)
from src.liquidaciones.service import LiquidacionesService
from src.shared.database import get_db
from src.shared.exceptions import NotFoundError

router = APIRouter(prefix="/liquidaciones", tags=["liquidaciones"])


def _response(liquidacion: LiquidacionEmpleado) -> LiquidacionEmpleadoResponse:
    return LiquidacionEmpleadoResponse(
        id_liquidacion=liquidacion.id_liquidacion,
        nombre_empleado=liquidacion.nombre_empleado,
        periodo=liquidacion.periodo,
        monto=liquidacion.monto,
        concepto=liquidacion.concepto,
        fecha_pago=liquidacion.fecha_pago,
    )


@router.get("", response_model=list[LiquidacionEmpleadoResponse])
def listar_liquidaciones(
    periodo: str | None = Query(default=None),
    nombre_empleado: str | None = Query(default=None),
    servicio: LiquidacionesService = Depends(get_liquidaciones_service),
    _: UsuarioActual = Depends(requiere_permiso("LIQUIDACIONES", "VER")),
):
    return [_response(l) for l in servicio.listar(periodo, nombre_empleado)]


@router.post("", response_model=LiquidacionEmpleadoResponse, status_code=status.HTTP_201_CREATED)
def crear_liquidacion(
    datos: LiquidacionEmpleadoCreate,
    db: Session = Depends(get_db),
    actor: UsuarioActual = Depends(requiere_permiso("LIQUIDACIONES", "CREAR")),
    servicio: LiquidacionesService = Depends(get_liquidaciones_service),
):
    liquidacion = servicio.crear(datos, creado_por=actor.id_usuario)
    db.commit()
    db.refresh(liquidacion)
    return _response(liquidacion)


@router.patch("/{id_liquidacion}", response_model=LiquidacionEmpleadoResponse)
def actualizar_liquidacion(
    id_liquidacion: int,
    datos: LiquidacionEmpleadoUpdate,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("LIQUIDACIONES", "EDITAR")),
    servicio: LiquidacionesService = Depends(get_liquidaciones_service),
):
    try:
        liquidacion = servicio.actualizar(id_liquidacion, datos)
        db.commit()
    except NotFoundError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    db.refresh(liquidacion)
    return _response(liquidacion)


@router.delete("/{id_liquidacion}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_liquidacion(
    id_liquidacion: int,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("LIQUIDACIONES", "ELIMINAR")),
    servicio: LiquidacionesService = Depends(get_liquidaciones_service),
):
    try:
        servicio.eliminar(id_liquidacion)
        db.commit()
    except NotFoundError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
