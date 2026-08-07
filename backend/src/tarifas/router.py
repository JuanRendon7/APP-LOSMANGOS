from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.auth.dependencies import requiere_permiso
from src.auth.schemas import UsuarioActual
from src.shared.database import get_db
from src.shared.exceptions import BusinessRuleError, ConflictError, NotFoundError
from src.tarifas.dependencies import get_tarifas_service
from src.tarifas.schemas import TemporadaCreate, TemporadaResponse, TemporadaUpdate
from src.tarifas.service import TarifasService

temporadas_router = APIRouter(prefix="/temporadas", tags=["temporadas"])


@temporadas_router.get("", response_model=list[TemporadaResponse])
def listar_temporadas(
    servicio: TarifasService = Depends(get_tarifas_service),
    _: UsuarioActual = Depends(requiere_permiso("TARIFAS", "VER")),
):
    return servicio.listar_temporadas()


@temporadas_router.post(
    "", response_model=TemporadaResponse, status_code=status.HTTP_201_CREATED
)
def crear_temporada(
    datos: TemporadaCreate,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("TARIFAS", "CREAR")),
    servicio: TarifasService = Depends(get_tarifas_service),
):
    try:
        temporada = servicio.crear_temporada(datos)
        db.commit()
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
    db.refresh(temporada)
    return temporada


@temporadas_router.patch("/{id_temporada}", response_model=TemporadaResponse)
def actualizar_temporada(
    id_temporada: int,
    datos: TemporadaUpdate,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("TARIFAS", "EDITAR")),
    servicio: TarifasService = Depends(get_tarifas_service),
):
    try:
        temporada = servicio.actualizar_temporada(id_temporada, datos)
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
    db.refresh(temporada)
    return temporada


@temporadas_router.delete(
    "/{id_temporada}", status_code=status.HTTP_204_NO_CONTENT
)
def eliminar_temporada(
    id_temporada: int,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("TARIFAS", "ELIMINAR")),
    servicio: TarifasService = Depends(get_tarifas_service),
):
    try:
        servicio.eliminar_temporada(id_temporada)
        db.commit()
    except NotFoundError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
