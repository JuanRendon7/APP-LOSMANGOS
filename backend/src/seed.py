"""Seed idempotente de RBAC (recursos/permisos/roles) y usuario administrador inicial.

Uso: `uv run python -m src.seed`
"""

from src.auth.models import Permiso, Recurso, Rol, RolPermiso, Usuario, UsuarioRol
from src.configuracion.models import ConfiguracionApp
from src.hospedaje.models import Habitacion
from src.shared.config import get_settings
from src.shared.database import SessionLocal
from src.shared.security import hash_password

HABITACIONES = [(numero, 1) for numero in range(102, 109)] + [
    (numero, 2) for numero in range(201, 211)
]

RECURSOS_ACCIONES = {
    "HABITACIONES": ["VER", "CREAR", "EDITAR", "ELIMINAR"],
    "RESERVAS": ["VER", "CREAR", "EDITAR", "ELIMINAR"],
    "HUESPEDES": ["VER", "CREAR", "EDITAR", "ELIMINAR"],
    "TARIFAS": ["VER", "CREAR", "EDITAR", "ELIMINAR"],
    "PRODUCTOS_RESTAURANTE": ["VER", "CREAR", "EDITAR", "ELIMINAR"],
    "PRODUCTOS_BAR": ["VER", "CREAR", "EDITAR", "ELIMINAR", "VER_COSTOS"],
    "MESAS": ["VER", "CREAR", "EDITAR", "ELIMINAR"],
    "PEDIDOS": ["VER", "CREAR", "EDITAR", "ELIMINAR"],
    "VENTAS": ["VER", "CREAR", "EDITAR"],
    "CAJA": ["VER", "CREAR", "CERRAR"],
    "GASTOS": ["VER", "CREAR", "EDITAR", "ELIMINAR"],
    "REPORTES": ["VER"],
    "USUARIOS": ["VER", "CREAR", "EDITAR", "ELIMINAR"],
    "ROLES": ["VER", "EDITAR"],
    "BOOKING_SYNC": ["VER", "CREAR", "EDITAR"],
    "CONFIGURACION": ["VER", "EDITAR"],
}

EMPLEADO_PERMISOS = {
    "HABITACIONES": ["VER", "CREAR", "EDITAR"],
    "RESERVAS": ["VER", "CREAR", "EDITAR"],
    "HUESPEDES": ["VER", "CREAR", "EDITAR"],
    "PRODUCTOS_RESTAURANTE": ["VER"],
    "PRODUCTOS_BAR": ["VER"],
    "MESAS": ["VER"],
    "PEDIDOS": ["VER", "CREAR", "EDITAR"],
    "VENTAS": ["VER", "CREAR"],
    "CAJA": ["VER", "CREAR", "CERRAR"],
    "GASTOS": ["VER", "CREAR"],
    "CONFIGURACION": ["VER"],
}

CONFIGURACION_POR_DEFECTO = {
    "sonido_notificacion": "campana",
}


def seed() -> None:
    settings = get_settings()
    db = SessionLocal()
    try:
        recursos_por_codigo: dict[str, Recurso] = {}
        for codigo in RECURSOS_ACCIONES:
            recurso = db.query(Recurso).filter(Recurso.codigo == codigo).one_or_none()
            if recurso is None:
                recurso = Recurso(
                    codigo=codigo, nombre=codigo.replace("_", " ").title()
                )
                db.add(recurso)
                db.flush()
            recursos_por_codigo[codigo] = recurso

        permisos_por_clave: dict[tuple[str, str], Permiso] = {}
        for codigo, acciones in RECURSOS_ACCIONES.items():
            recurso = recursos_por_codigo[codigo]
            for accion in acciones:
                permiso = (
                    db.query(Permiso)
                    .filter(
                        Permiso.id_recurso == recurso.id_recurso,
                        Permiso.accion == accion,
                    )
                    .one_or_none()
                )
                if permiso is None:
                    permiso = Permiso(id_recurso=recurso.id_recurso, accion=accion)
                    db.add(permiso)
                    db.flush()
                permisos_por_clave[(codigo, accion)] = permiso

        rol_admin = db.query(Rol).filter(Rol.codigo == "ADMINISTRADOR").one_or_none()
        if rol_admin is None:
            rol_admin = Rol(
                codigo="ADMINISTRADOR",
                nombre="Administrador",
                descripcion="Acceso total",
            )
            db.add(rol_admin)
            db.flush()

        rol_empleado = db.query(Rol).filter(Rol.codigo == "EMPLEADO").one_or_none()
        if rol_empleado is None:
            rol_empleado = Rol(
                codigo="EMPLEADO",
                nombre="Empleado",
                descripcion="Acceso operativo restringido",
            )
            db.add(rol_empleado)
            db.flush()

        def asegurar_rol_permiso(id_rol: int, permiso: Permiso) -> None:
            existe = (
                db.query(RolPermiso)
                .filter(
                    RolPermiso.id_rol == id_rol,
                    RolPermiso.id_permiso == permiso.id_permiso,
                )
                .one_or_none()
            )
            if existe is None:
                db.add(RolPermiso(id_rol=id_rol, id_permiso=permiso.id_permiso))

        for permiso in permisos_por_clave.values():
            asegurar_rol_permiso(rol_admin.id_rol, permiso)

        for codigo, acciones in EMPLEADO_PERMISOS.items():
            for accion in acciones:
                asegurar_rol_permiso(
                    rol_empleado.id_rol, permisos_por_clave[(codigo, accion)]
                )

        admin = (
            db.query(Usuario)
            .filter(Usuario.email == settings.admin_email)
            .one_or_none()
        )
        if admin is None:
            admin = Usuario(
                nombre=settings.admin_nombre,
                cedula=settings.admin_cedula,
                celular=settings.admin_celular,
                email=settings.admin_email,
                password_hash=hash_password(settings.admin_password),
            )
            db.add(admin)
            db.flush()

        tiene_rol_admin = (
            db.query(UsuarioRol)
            .filter(
                UsuarioRol.id_usuario == admin.id_usuario,
                UsuarioRol.id_rol == rol_admin.id_rol,
            )
            .one_or_none()
        )
        if tiene_rol_admin is None:
            db.add(UsuarioRol(id_usuario=admin.id_usuario, id_rol=rol_admin.id_rol))

        for clave, valor in CONFIGURACION_POR_DEFECTO.items():
            existe = (
                db.query(ConfiguracionApp)
                .filter(ConfiguracionApp.clave == clave)
                .one_or_none()
            )
            if existe is None:
                db.add(ConfiguracionApp(clave=clave, valor=valor))

        for numero, piso in HABITACIONES:
            existe = (
                db.query(Habitacion)
                .filter(Habitacion.numero == str(numero))
                .one_or_none()
            )
            if existe is None:
                db.add(Habitacion(numero=str(numero), piso=piso))

        db.commit()
        print("Seed de RBAC completo.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
