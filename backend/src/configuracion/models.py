from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from src.shared.database import Base, TimestampMixin


class ConfiguracionApp(Base, TimestampMixin):
    __tablename__ = "configuracion_app"

    clave: Mapped[str] = mapped_column(String(50), primary_key=True)
    valor: Mapped[str] = mapped_column(String(100))
