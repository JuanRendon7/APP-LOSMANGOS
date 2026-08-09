from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.auth.dependencies import requiere_permiso
from src.auth.schemas import UsuarioActual
from src.configuracion.dependencies import get_configuracion_service
from src.configuracion.schemas import ConfiguracionResponse, ConfiguracionUpdate
from src.configuracion.service import ConfiguracionService
from src.shared.database import get_db
from src.shared.exceptions import BusinessRuleError

router = APIRouter(prefix="/configuracion", tags=["configuracion"])


@router.get("", response_model=list[ConfiguracionResponse])
def listar_configuracion(
    servicio: ConfiguracionService = Depends(get_configuracion_service),
    _: UsuarioActual = Depends(requiere_permiso("CONFIGURACION", "VER")),
):
    return servicio.listar()


@router.patch("/{clave}", response_model=ConfiguracionResponse)
def actualizar_configuracion(
    clave: str,
    datos: ConfiguracionUpdate,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("CONFIGURACION", "EDITAR")),
    servicio: ConfiguracionService = Depends(get_configuracion_service),
):
    try:
        configuracion = servicio.actualizar(clave, datos.valor)
        db.commit()
    except BusinessRuleError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    db.refresh(configuracion)
    return configuracion
