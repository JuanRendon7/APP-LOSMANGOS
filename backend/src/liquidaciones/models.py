from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.auth.models import Usuario
from src.shared.database import Base, TimestampMixin


class LiquidacionEmpleado(Base, TimestampMixin):
    __tablename__ = "liquidacion_empleado"

    id_liquidacion: Mapped[int] = mapped_column(primary_key=True)
    id_usuario: Mapped[int] = mapped_column(
        ForeignKey("hotel.usuario.id_usuario"), index=True
    )
    # Mes que cubre el pago, formato 'YYYY-MM'.
    periodo: Mapped[str] = mapped_column(String(7), index=True)
    monto: Mapped[int] = mapped_column(Integer)
    concepto: Mapped[str | None] = mapped_column(String(255), default=None)
    fecha_pago: Mapped[date] = mapped_column(Date)
    creado_por: Mapped[int | None] = mapped_column(
        ForeignKey("hotel.usuario.id_usuario"), default=None
    )

    usuario: Mapped["Usuario"] = relationship(foreign_keys=[id_usuario])
