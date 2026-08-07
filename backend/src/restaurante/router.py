from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.auth.dependencies import requiere_permiso
from src.auth.schemas import UsuarioActual
from src.restaurante.dependencies import get_restaurante_service
from src.restaurante.models import Mesa, Pedido, PedidoItem
from src.restaurante.schemas import (
    MesaCreate,
    MesaResponse,
    MesaUpdate,
    PedidoCreate,
    PedidoItemCreate,
    PedidoItemResponse,
    PedidoResponse,
)
from src.restaurante.service import RestauranteService
from src.shared.database import get_db
from src.shared.exceptions import BusinessRuleError, NotFoundError


def _item_response(item: PedidoItem) -> PedidoItemResponse:
    return PedidoItemResponse(
        id_item=item.id_item,
        id_producto=item.id_producto,
        nombre_producto=item.producto.nombre,
        cantidad=item.cantidad,
        precio_unitario=item.precio_unitario,
        nota=item.nota,
    )


def _pedido_response(pedido: Pedido) -> PedidoResponse:
    items = [_item_response(item) for item in pedido.items]
    total = sum(item.cantidad * item.precio_unitario for item in pedido.items)
    return PedidoResponse(
        id_pedido=pedido.id_pedido,
        id_mesa=pedido.id_mesa,
        nombre_mesa=pedido.mesa.nombre,
        estado=pedido.estado,
        items=items,
        total=total,
        enviado_cocina_en=pedido.enviado_cocina_en,
        cerrado_en=pedido.cerrado_en,
        creado_en=pedido.creado_en,
    )


def _mesa_response(mesa: Mesa, pedido_activo: Pedido | None) -> MesaResponse:
    return MesaResponse(
        id_mesa=mesa.id_mesa,
        nombre=mesa.nombre,
        capacidad=mesa.capacidad,
        pos_x=mesa.pos_x,
        pos_y=mesa.pos_y,
        estado=mesa.estado,
        activo=mesa.activo,
        pedido_activo=_pedido_response(pedido_activo) if pedido_activo else None,
    )


mesas_router = APIRouter(prefix="/mesas", tags=["mesas"])


@mesas_router.get("", response_model=list[MesaResponse])
def listar_mesas(
    servicio: RestauranteService = Depends(get_restaurante_service),
    _: UsuarioActual = Depends(requiere_permiso("MESAS", "VER")),
):
    return [_mesa_response(m, p) for m, p in servicio.listar_mesas()]


@mesas_router.post("", response_model=MesaResponse, status_code=status.HTTP_201_CREATED)
def crear_mesa(
    datos: MesaCreate,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("MESAS", "CREAR")),
    servicio: RestauranteService = Depends(get_restaurante_service),
):
    mesa = servicio.crear_mesa(datos)
    db.commit()
    db.refresh(mesa)
    return _mesa_response(mesa, None)


@mesas_router.patch("/{id_mesa}", response_model=MesaResponse)
def actualizar_mesa(
    id_mesa: int,
    datos: MesaUpdate,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("MESAS", "EDITAR")),
    servicio: RestauranteService = Depends(get_restaurante_service),
):
    try:
        mesa = servicio.actualizar_mesa(id_mesa, datos)
        db.commit()
    except NotFoundError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    db.refresh(mesa)
    return _mesa_response(mesa, None)


pedidos_router = APIRouter(prefix="/pedidos", tags=["pedidos"])


@pedidos_router.get("", response_model=list[PedidoResponse])
def listar_pedidos(
    id_mesa: int | None = Query(default=None),
    estado: str | None = Query(default=None),
    servicio: RestauranteService = Depends(get_restaurante_service),
    _: UsuarioActual = Depends(requiere_permiso("PEDIDOS", "VER")),
):
    return [_pedido_response(p) for p in servicio.listar_pedidos(id_mesa, estado)]


@pedidos_router.get("/{id_pedido}", response_model=PedidoResponse)
def obtener_pedido(
    id_pedido: int,
    servicio: RestauranteService = Depends(get_restaurante_service),
    _: UsuarioActual = Depends(requiere_permiso("PEDIDOS", "VER")),
):
    try:
        return _pedido_response(servicio.obtener_pedido(id_pedido))
    except NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


@pedidos_router.post(
    "", response_model=PedidoResponse, status_code=status.HTTP_201_CREATED
)
def crear_pedido(
    datos: PedidoCreate,
    db: Session = Depends(get_db),
    actor: UsuarioActual = Depends(requiere_permiso("PEDIDOS", "CREAR")),
    servicio: RestauranteService = Depends(get_restaurante_service),
):
    try:
        pedido = servicio.crear_pedido(datos.id_mesa, creado_por=actor.id_usuario)
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
    db.refresh(pedido)
    return _pedido_response(servicio.obtener_pedido(pedido.id_pedido))


def _manejar_accion_pedido(accion, db: Session, id_pedido: int) -> PedidoResponse:
    try:
        pedido = accion(id_pedido)
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
    db.refresh(pedido)
    return _pedido_response(pedido)


@pedidos_router.post("/{id_pedido}/items", response_model=PedidoResponse)
def agregar_item(
    id_pedido: int,
    datos: PedidoItemCreate,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("PEDIDOS", "EDITAR")),
    servicio: RestauranteService = Depends(get_restaurante_service),
):
    return _manejar_accion_pedido(
        lambda id_p: servicio.agregar_item(id_p, datos), db, id_pedido
    )


@pedidos_router.delete("/{id_pedido}/items/{id_item}", response_model=PedidoResponse)
def eliminar_item(
    id_pedido: int,
    id_item: int,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("PEDIDOS", "EDITAR")),
    servicio: RestauranteService = Depends(get_restaurante_service),
):
    return _manejar_accion_pedido(
        lambda id_p: servicio.eliminar_item(id_p, id_item), db, id_pedido
    )


@pedidos_router.post("/{id_pedido}/enviar-cocina", response_model=PedidoResponse)
def enviar_a_cocina(
    id_pedido: int,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("PEDIDOS", "EDITAR")),
    servicio: RestauranteService = Depends(get_restaurante_service),
):
    return _manejar_accion_pedido(servicio.enviar_a_cocina, db, id_pedido)


@pedidos_router.post("/{id_pedido}/avanzar", response_model=PedidoResponse)
def avanzar_estado(
    id_pedido: int,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("PEDIDOS", "EDITAR")),
    servicio: RestauranteService = Depends(get_restaurante_service),
):
    return _manejar_accion_pedido(servicio.avanzar_estado, db, id_pedido)


@pedidos_router.post("/{id_pedido}/cerrar", response_model=PedidoResponse)
def cerrar_pedido(
    id_pedido: int,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_permiso("PEDIDOS", "EDITAR")),
    servicio: RestauranteService = Depends(get_restaurante_service),
):
    return _manejar_accion_pedido(servicio.cerrar_pedido, db, id_pedido)
