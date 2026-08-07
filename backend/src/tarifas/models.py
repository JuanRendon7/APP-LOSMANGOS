from datetime import date

from sqlalchemy import Boolean, Date, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column

from src.shared.database import Base, TimestampMixin


class Temporada(Base, TimestampMixin):
    __tablename__ = "temporada"

    id_temporada: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100))
    fecha_inicio: Mapped[date] = mapped_column(Date)
    fecha_fin: Mapped[date] = mapped_column(Date)
    precio_noche: Mapped[int] = mapped_column(Integer)
    activa: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
