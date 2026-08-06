from collections.abc import Callable

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from src.auth.repository import AuthRepository
from src.auth.schemas import UsuarioActual
from src.auth.service import AuthService
from src.shared.database import get_db
from src.shared.exceptions import NotFoundError
from src.shared.security import decodificar_access_token

_bearer_scheme = HTTPBearer(auto_error=False)


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(AuthRepository(db))


def get_current_user(
    credenciales: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    servicio: AuthService = Depends(get_auth_service),
) -> UsuarioActual:
    if credenciales is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="No autenticado"
        )
    try:
        payload = decodificar_access_token(credenciales.credentials)
        id_usuario = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido"
        ) from exc

    try:
        return servicio.usuario_actual(id_usuario)
    except NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado"
        ) from exc


def requiere_permiso(recurso: str, accion: str) -> Callable[..., UsuarioActual]:
    def dependencia(
        usuario: UsuarioActual = Depends(get_current_user),
    ) -> UsuarioActual:
        if not usuario.tiene_permiso(recurso, accion):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requiere permiso {recurso}:{accion}",
            )
        return usuario

    return dependencia


def requiere_rol(*codigos: str) -> Callable[..., UsuarioActual]:
    def dependencia(
        usuario: UsuarioActual = Depends(get_current_user),
    ) -> UsuarioActual:
        if not usuario.tiene_rol(*codigos):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requiere rol {' o '.join(codigos)}",
            )
        return usuario

    return dependencia
