from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.auth.dependencies import requiere_permiso
from src.auth.schemas import UsuarioActual
from src.productos.dependencies import get_productos_service
from src.productos.models import ProductoBar, ProductoRestaurante
from src.productos.schemas import (
    AjusteStockInput,
    ProductoBarCreate,
    ProductoBarResponse,
    ProductoBarUpdate,
    ProductoRestauranteCreate,
    ProductoRestauranteResponse,
    ProductoRestauranteUpdate,
)
from src.productos.service import ProductosService
from src.shared.database import get_db
from src.shared.exceptions import BusinessRuleError, ConflictError, NotFoundError


def _restaurante_response(producto: ProductoRestaurante) -> ProductoRestauranteResponse:
    return ProductoRestauranteResponse.model_validate(producto)


def _bar_response(producto: ProductoBar, actor: UsuarioActual) -> ProductoBarResponse:
    ver_costos = actor.tiene_permiso("PRODUCTOS_BAR", "VER_COSTOS")
    margen = None
    margen_porcentaje = None
    if ver_costos:
        margen = producto.precio_venta - producto.precio_costo
        if producto.precio_costo > 0:
            margen_porcentaje = round(margen / producto.precio_costo * 100, 2)
    return ProductoBarResponse(
        id_producto=producto.id_producto,
        nombre=producto.nombre,
        codigo_barras=producto.codigo_barras,
        precio_venta=producto.precio_venta,
        stock=producto.stock,
        umbral_stock_bajo=producto.umbral_stock_bajo,
        activo=producto.activo,
        precio_costo=producto.precio_costo if ver_costos else None,
        margen=margen,
        margen_porcentaje=margen_porcentaje,
    )


productos_restaurante_router = APIRouter(
    prefix="/productos-restaurante", tags=["productos-restaurante"]
)


@productos_restaurante_router.get("", response_model=list[ProductoRestauranteResponse])
def listar_productos_restaurante(
    servicio: ProductosService = Depends(get_productos_service),
    _: UsuarioActual = Depends(requiere_permiso("PRODUCTOS_RESTAURANTE", "VER")),
):
    return [_restaurante_response(p) for p in servicio.listar_restaurante()]


@productos_restaurante_router.post(
    "", response_model=ProductoRestauranteResponse, status_code=status.HTTP_201_CREATED
)
def crear_producto_restaurante(
    datos: ProductoRestauranteCreate,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("PRODUCTOS_RESTAURANTE", "CREAR")),
    servicio: ProductosService = Depends(get_productos_service),
):
    producto = servicio.crear_restaurante(datos)
    db.commit()
    db.refresh(producto)
    return _restaurante_response(producto)


@productos_restaurante_router.patch(
    "/{id_producto}", response_model=ProductoRestauranteResponse
)
def actualizar_producto_restaurante(
    id_producto: int,
    datos: ProductoRestauranteUpdate,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("PRODUCTOS_RESTAURANTE", "EDITAR")),
    servicio: ProductosService = Depends(get_productos_service),
):
    try:
        producto = servicio.actualizar_restaurante(id_producto, datos)
        db.commit()
    except NotFoundError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    db.refresh(producto)
    return _restaurante_response(producto)


productos_bar_router = APIRouter(prefix="/productos-bar", tags=["productos-bar"])


@productos_bar_router.get("", response_model=list[ProductoBarResponse])
def listar_productos_bar(
    servicio: ProductosService = Depends(get_productos_service),
    actor: UsuarioActual = Depends(requiere_permiso("PRODUCTOS_BAR", "VER")),
):
    return [_bar_response(p, actor) for p in servicio.listar_bar()]


@productos_bar_router.post(
    "", response_model=ProductoBarResponse, status_code=status.HTTP_201_CREATED
)
def crear_producto_bar(
    datos: ProductoBarCreate,
    db: Session = Depends(get_db),
    actor: UsuarioActual = Depends(requiere_permiso("PRODUCTOS_BAR", "CREAR")),
    servicio: ProductosService = Depends(get_productos_service),
):
    try:
        producto = servicio.crear_bar(datos)
        db.commit()
    except ConflictError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc
    db.refresh(producto)
    return _bar_response(producto, actor)


@productos_bar_router.patch("/{id_producto}", response_model=ProductoBarResponse)
def actualizar_producto_bar(
    id_producto: int,
    datos: ProductoBarUpdate,
    db: Session = Depends(get_db),
    actor: UsuarioActual = Depends(requiere_permiso("PRODUCTOS_BAR", "EDITAR")),
    servicio: ProductosService = Depends(get_productos_service),
):
    try:
        producto = servicio.actualizar_bar(id_producto, datos)
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
    db.refresh(producto)
    return _bar_response(producto, actor)


@productos_bar_router.post(
    "/{id_producto}/ajustar-stock", response_model=ProductoBarResponse
)
def ajustar_stock_producto_bar(
    id_producto: int,
    datos: AjusteStockInput,
    db: Session = Depends(get_db),
    actor: UsuarioActual = Depends(requiere_permiso("PRODUCTOS_BAR", "EDITAR")),
    servicio: ProductosService = Depends(get_productos_service),
):
    try:
        producto = servicio.ajustar_stock_bar(id_producto, datos.cantidad)
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
    db.refresh(producto)
    return _bar_response(producto, actor)
