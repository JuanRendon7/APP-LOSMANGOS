from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.shared.database import Base, TimestampMixin


class Usuario(Base, TimestampMixin):
    __tablename__ = "usuario"

    id_usuario: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150))
    cedula: Mapped[str] = mapped_column(String(20), unique=True)
    celular: Mapped[str] = mapped_column(String(20))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    activo: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))

    roles: Mapped[list["UsuarioRol"]] = relationship(
        back_populates="usuario", foreign_keys="UsuarioRol.id_usuario"
    )


class Rol(Base, TimestampMixin):
    __tablename__ = "rol"

    id_rol: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(50), unique=True)
    nombre: Mapped[str] = mapped_column(String(100))
    descripcion: Mapped[str | None] = mapped_column(String(255), default=None)
    activo: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))


class UsuarioRol(Base):
    __tablename__ = "usuario_rol"

    id_usuario: Mapped[int] = mapped_column(
        ForeignKey("hotel.usuario.id_usuario"), primary_key=True
    )
    id_rol: Mapped[int] = mapped_column(
        ForeignKey("hotel.rol.id_rol"), primary_key=True
    )
    asignado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    asignado_por: Mapped[int | None] = mapped_column(
        ForeignKey("hotel.usuario.id_usuario"), default=None
    )

    usuario: Mapped["Usuario"] = relationship(
        back_populates="roles", foreign_keys=[id_usuario]
    )
    rol: Mapped["Rol"] = relationship()


class Recurso(Base, TimestampMixin):
    __tablename__ = "recurso"

    id_recurso: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(50), unique=True)
    nombre: Mapped[str] = mapped_column(String(100))


class Permiso(Base, TimestampMixin):
    __tablename__ = "permiso"
    __table_args__ = (UniqueConstraint("id_recurso", "accion"),)

    id_permiso: Mapped[int] = mapped_column(primary_key=True)
    id_recurso: Mapped[int] = mapped_column(ForeignKey("hotel.recurso.id_recurso"))
    accion: Mapped[str] = mapped_column(String(50))
    descripcion: Mapped[str | None] = mapped_column(String(255), default=None)

    recurso: Mapped["Recurso"] = relationship()


class RolPermiso(Base):
    __tablename__ = "rol_permiso"

    id_rol: Mapped[int] = mapped_column(
        ForeignKey("hotel.rol.id_rol"), primary_key=True
    )
    id_permiso: Mapped[int] = mapped_column(
        ForeignKey("hotel.permiso.id_permiso"), primary_key=True
    )
