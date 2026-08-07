from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.auth.dependencies import requiere_permiso
from src.auth.schemas import UsuarioActual
from src.consumo.dependencies import get_consumo_service
from src.consumo.models import ConsumoItem
from src.consumo.schemas import (
    ConsumoItemCreate,
    ConsumoItemResponse,
    ConsumoResumenResponse,
)
from src.consumo.service import ConsumoService
from src.shared.database import get_db
from src.shared.exceptions import BusinessRuleError, NotFoundError

router = APIRouter(prefix="/consumo", tags=["consumo"])


def _item_response(item: ConsumoItem) -> ConsumoItemResponse:
    return ConsumoItemResponse(
        id_consumo=item.id_consumo,
        id_reserva=item.id_reserva,
        origen=item.origen,
        nombre_producto=item.nombre_producto,
        cantidad=item.cantidad,
        precio_unitario=item.precio_unitario,
    )


@router.get("", response_model=ConsumoResumenResponse)
def listar_consumo(
    id_reserva: int = Query(...),
    servicio: ConsumoService = Depends(get_consumo_service),
    _: UsuarioActual = Depends(requiere_permiso("VENTAS", "VER")),
):
    items = [_item_response(i) for i in servicio.listar_por_reserva(id_reserva)]
    total = sum(item.cantidad * item.precio_unitario for item in items)
    return ConsumoResumenResponse(items=items, total=total)


@router.post(
    "", response_model=ConsumoItemResponse, status_code=status.HTTP_201_CREATED
)
def agregar_consumo(
    datos: ConsumoItemCreate,
    db: Session = Depends(get_db),
    actor: UsuarioActual = Depends(requiere_permiso("VENTAS", "CREAR")),
    servicio: ConsumoService = Depends(get_consumo_service),
):
    try:
        item = servicio.agregar_item(datos, creado_por=actor.id_usuario)
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
    db.refresh(item)
    return _item_response(item)


@router.delete("/{id_consumo}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_consumo(
    id_consumo: int,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("VENTAS", "EDITAR")),
    servicio: ConsumoService = Depends(get_consumo_service),
):
    try:
        servicio.eliminar_item(id_consumo)
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
