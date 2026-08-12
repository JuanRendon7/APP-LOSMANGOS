from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.auth.dependencies import requiere_permiso
from src.auth.schemas import UsuarioActual
from src.proveedores.dependencies import get_proveedores_service
from src.proveedores.schemas import ProveedorCreate, ProveedorResponse, ProveedorUpdate
from src.proveedores.service import ProveedoresService
from src.shared.database import get_db
from src.shared.exceptions import ConflictError, NotFoundError

proveedores_router = APIRouter(prefix="/proveedores", tags=["proveedores"])


@proveedores_router.get("", response_model=list[ProveedorResponse])
def listar_proveedores(
    servicio: ProveedoresService = Depends(get_proveedores_service),
    _: UsuarioActual = Depends(requiere_permiso("PROVEEDORES", "VER")),
):
    return [ProveedorResponse.model_validate(p) for p in servicio.listar()]


@proveedores_router.post(
    "", response_model=ProveedorResponse, status_code=status.HTTP_201_CREATED
)
def crear_proveedor(
    datos: ProveedorCreate,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("PROVEEDORES", "CREAR")),
    servicio: ProveedoresService = Depends(get_proveedores_service),
):
    try:
        proveedor = servicio.crear(datos)
        db.commit()
    except ConflictError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc
    db.refresh(proveedor)
    return ProveedorResponse.model_validate(proveedor)


@proveedores_router.patch("/{id_proveedor}", response_model=ProveedorResponse)
def actualizar_proveedor(
    id_proveedor: int,
    datos: ProveedorUpdate,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("PROVEEDORES", "EDITAR")),
    servicio: ProveedoresService = Depends(get_proveedores_service),
):
    try:
        proveedor = servicio.actualizar(id_proveedor, datos)
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
    db.refresh(proveedor)
    return ProveedorResponse.model_validate(proveedor)
