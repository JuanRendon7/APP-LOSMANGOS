from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.auth.dependencies import get_auth_service, get_current_user, requiere_rol
from src.auth.repository import AuthRepository
from src.auth.schemas import (
    LoginRequest,
    RolResponse,
    TokenResponse,
    UsuarioActual,
    UsuarioCreate,
    UsuarioResponse,
    UsuarioUpdate,
)
from src.auth.service import AuthService
from src.shared.database import get_db
from src.shared.exceptions import BusinessRuleError, ConflictError, NotFoundError
from src.shared.pagination import ParametrosPaginacion, parametros_paginacion

router = APIRouter(prefix="/auth", tags=["auth"])


def _usuario_response(usuario) -> UsuarioResponse:
    return UsuarioResponse(
        id_usuario=usuario.id_usuario,
        nombre=usuario.nombre,
        cedula=usuario.cedula,
        celular=usuario.celular,
        email=usuario.email,
        activo=usuario.activo,
        roles=[ur.rol.codigo for ur in usuario.roles],
    )


@router.post("/login", response_model=TokenResponse)
def login(datos: LoginRequest, servicio: AuthService = Depends(get_auth_service)):
    try:
        token, _ = servicio.autenticar(datos.email, datos.password)
    except BusinessRuleError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UsuarioActual)
def me(usuario: UsuarioActual = Depends(get_current_user)):
    return usuario


usuarios_router = APIRouter(prefix="/usuarios", tags=["usuarios"])


@usuarios_router.get("", response_model=list[UsuarioResponse])
def listar_usuarios(
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_rol("ADMINISTRADOR")),
    __: ParametrosPaginacion = Depends(parametros_paginacion),
):
    repo = AuthRepository(db)
    usuarios = db.scalars(repo.listar_stmt()).unique().all()
    return [_usuario_response(u) for u in usuarios]


@usuarios_router.post(
    "", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED
)
def crear_usuario(
    datos: UsuarioCreate,
    db: Session = Depends(get_db),
    actor: UsuarioActual = Depends(requiere_rol("ADMINISTRADOR")),
    servicio: AuthService = Depends(get_auth_service),
):
    try:
        usuario = servicio.crear_usuario(datos, creado_por=actor.id_usuario)
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
    db.refresh(usuario)
    return _usuario_response(usuario)


@usuarios_router.patch("/{id_usuario}", response_model=UsuarioResponse)
def actualizar_usuario(
    id_usuario: int,
    datos: UsuarioUpdate,
    db: Session = Depends(get_db),
    _: UsuarioActual = Depends(requiere_rol("ADMINISTRADOR")),
    servicio: AuthService = Depends(get_auth_service),
):
    try:
        usuario = servicio.actualizar_usuario(id_usuario, datos)
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
    db.refresh(usuario)
    return _usuario_response(usuario)


roles_router = APIRouter(prefix="/roles", tags=["roles"])


@roles_router.get("", response_model=list[RolResponse])
def listar_roles(
    _: UsuarioActual = Depends(requiere_rol("ADMINISTRADOR")),
    servicio: AuthService = Depends(get_auth_service),
):
    return [
        RolResponse(
            id_rol=rol.id_rol,
            codigo=rol.codigo,
            nombre=rol.nombre,
            descripcion=rol.descripcion,
            permisos=permisos,
        )
        for rol, permisos in servicio.listar_roles()
    ]
