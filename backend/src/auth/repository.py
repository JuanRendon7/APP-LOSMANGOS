from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from src.auth.models import Permiso, Recurso, Rol, RolPermiso, Usuario, UsuarioRol


class AuthRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def obtener_por_email(self, email: str) -> Usuario | None:
        stmt = (
            select(Usuario)
            .where(Usuario.email == email)
            .options(selectinload(Usuario.roles).selectinload(UsuarioRol.rol))
        )
        return self.db.scalar(stmt)

    def obtener_por_id(self, id_usuario: int) -> Usuario | None:
        stmt = (
            select(Usuario)
            .where(Usuario.id_usuario == id_usuario)
            .options(selectinload(Usuario.roles).selectinload(UsuarioRol.rol))
        )
        return self.db.scalar(stmt)

    def listar_stmt(self) -> Select:
        return select(Usuario).options(
            selectinload(Usuario.roles).selectinload(UsuarioRol.rol)
        )

    def crear(self, usuario: Usuario) -> Usuario:
        self.db.add(usuario)
        self.db.flush()
        return usuario

    def obtener_rol_por_codigo(self, codigo: str) -> Rol | None:
        return self.db.scalar(select(Rol).where(Rol.codigo == codigo))

    def listar_roles(self) -> list[Rol]:
        return list(self.db.scalars(select(Rol).where(Rol.activo.is_(True))))

    def permisos_de_roles(self, ids_rol: list[int]) -> list[str]:
        if not ids_rol:
            return []
        stmt = (
            select(Recurso.codigo, Permiso.accion)
            .join(Permiso, Permiso.id_recurso == Recurso.id_recurso)
            .join(RolPermiso, RolPermiso.id_permiso == Permiso.id_permiso)
            .where(RolPermiso.id_rol.in_(ids_rol))
            .distinct()
        )
        return [f"{recurso}:{accion}" for recurso, accion in self.db.execute(stmt)]

    def asignar_rol(
        self, id_usuario: int, id_rol: int, asignado_por: int | None
    ) -> None:
        self.db.add(
            UsuarioRol(id_usuario=id_usuario, id_rol=id_rol, asignado_por=asignado_por)
        )

    def limpiar_roles(self, id_usuario: int) -> None:
        self.db.query(UsuarioRol).filter(UsuarioRol.id_usuario == id_usuario).delete()
