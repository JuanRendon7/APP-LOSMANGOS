from src.auth.models import Usuario
from src.auth.repository import AuthRepository
from src.auth.schemas import UsuarioActual, UsuarioCreate, UsuarioUpdate
from src.shared.exceptions import BusinessRuleError, ConflictError, NotFoundError
from src.shared.security import crear_access_token, hash_password, verify_password


class AuthService:
    def __init__(self, repository: AuthRepository) -> None:
        self.repository = repository

    def _armar_usuario_actual(self, usuario: Usuario) -> UsuarioActual:
        codigos_rol = [ur.rol.codigo for ur in usuario.roles if ur.rol.activo]
        ids_rol = [ur.id_rol for ur in usuario.roles if ur.rol.activo]
        permisos = self.repository.permisos_de_roles(ids_rol)
        return UsuarioActual(
            id_usuario=usuario.id_usuario,
            nombre=usuario.nombre,
            email=usuario.email,
            roles=codigos_rol,
            permisos=permisos,
        )

    def autenticar(self, email: str, password: str) -> tuple[str, UsuarioActual]:
        usuario = self.repository.obtener_por_email(email)
        if usuario is None or not usuario.activo:
            raise BusinessRuleError("Credenciales invalidas")
        if not verify_password(password, usuario.password_hash):
            raise BusinessRuleError("Credenciales invalidas")
        token = crear_access_token(sub=str(usuario.id_usuario))
        return token, self._armar_usuario_actual(usuario)

    def usuario_actual(self, id_usuario: int) -> UsuarioActual:
        usuario = self.repository.obtener_por_id(id_usuario)
        if usuario is None or not usuario.activo:
            raise NotFoundError("Usuario no encontrado")
        return self._armar_usuario_actual(usuario)

    def _resolver_roles(self, codigos: list[str]):
        roles = []
        for codigo in codigos:
            rol = self.repository.obtener_rol_por_codigo(codigo)
            if rol is None:
                raise BusinessRuleError(f"Rol '{codigo}' no existe")
            roles.append(rol)
        return roles

    def crear_usuario(self, datos: UsuarioCreate, creado_por: int | None) -> Usuario:
        if self.repository.obtener_por_email(datos.email) is not None:
            raise ConflictError("Ya existe un usuario con ese email")
        roles = self._resolver_roles(datos.roles)
        usuario = Usuario(
            nombre=datos.nombre,
            email=datos.email,
            password_hash=hash_password(datos.password),
        )
        usuario = self.repository.crear(usuario)
        for rol in roles:
            self.repository.asignar_rol(usuario.id_usuario, rol.id_rol, creado_por)
        return usuario

    def actualizar_usuario(self, id_usuario: int, datos: UsuarioUpdate) -> Usuario:
        usuario = self.repository.obtener_por_id(id_usuario)
        if usuario is None:
            raise NotFoundError("Usuario no encontrado")
        if datos.nombre is not None:
            usuario.nombre = datos.nombre
        if datos.activo is not None:
            usuario.activo = datos.activo
        if datos.password:
            usuario.password_hash = hash_password(datos.password)
        if datos.roles is not None:
            roles = self._resolver_roles(datos.roles)
            self.repository.limpiar_roles(id_usuario)
            for rol in roles:
                self.repository.asignar_rol(id_usuario, rol.id_rol, None)
        return usuario

    def listar_roles(self):
        roles = self.repository.listar_roles()
        resultado = []
        for rol in roles:
            permisos = self.repository.permisos_de_roles([rol.id_rol])
            resultado.append((rol, permisos))
        return resultado
