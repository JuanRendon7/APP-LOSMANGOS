from sqlalchemy import Boolean, String, text
from sqlalchemy.orm import Mapped, mapped_column

from src.shared.database import Base, TimestampMixin


class Proveedor(Base, TimestampMixin):
    __tablename__ = "proveedor"

    id_proveedor: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150))
    nit_cedula: Mapped[str | None] = mapped_column(String(30), unique=True, index=True)
    contacto: Mapped[str | None] = mapped_column(String(100))
    categoria: Mapped[str | None] = mapped_column(String(100))
    notas: Mapped[str | None] = mapped_column(String(255))
    activo: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
