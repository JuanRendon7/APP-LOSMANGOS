from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from src.shared.database import Base, TimestampMixin


class LiquidacionEmpleado(Base, TimestampMixin):
    __tablename__ = "liquidacion_empleado"

    id_liquidacion: Mapped[int] = mapped_column(primary_key=True)
    # Nombre digitado a mano: no todo empleado pagado tiene cuenta en el sistema.
    nombre_empleado: Mapped[str] = mapped_column(String(150))
    # Texto libre: puede ser un mes, un rango de fechas o cualquier descripcion
    # del periodo que cubre el pago -- no se exige un formato fijo.
    periodo: Mapped[str] = mapped_column(String(100), index=True)
    monto: Mapped[int] = mapped_column(Integer)
    concepto: Mapped[str | None] = mapped_column(String(255), default=None)
    fecha_pago: Mapped[date] = mapped_column(Date)
    creado_por: Mapped[int | None] = mapped_column(
        ForeignKey("hotel.usuario.id_usuario"), default=None
    )
