from src.liquidaciones.models import LiquidacionEmpleado
from src.liquidaciones.repository import LiquidacionesRepository
from src.liquidaciones.schemas import LiquidacionEmpleadoCreate, LiquidacionEmpleadoUpdate
from src.shared.exceptions import NotFoundError


class LiquidacionesService:
    def __init__(self, repository: LiquidacionesRepository) -> None:
        self.repository = repository

    def listar(
        self, periodo: str | None, nombre_empleado: str | None
    ) -> list[LiquidacionEmpleado]:
        return self.repository.listar(periodo, nombre_empleado)

    def obtener(self, id_liquidacion: int) -> LiquidacionEmpleado:
        liquidacion = self.repository.obtener(id_liquidacion)
        if liquidacion is None:
            raise NotFoundError("Registro de nomina no encontrado")
        return liquidacion

    def crear(
        self, datos: LiquidacionEmpleadoCreate, creado_por: int | None
    ) -> LiquidacionEmpleado:
        liquidacion = LiquidacionEmpleado(
            nombre_empleado=datos.nombre_empleado,
            periodo=datos.periodo,
            monto=datos.monto,
            concepto=datos.concepto,
            fecha_pago=datos.fecha_pago,
            creado_por=creado_por,
        )
        return self.repository.crear(liquidacion)

    def actualizar(
        self, id_liquidacion: int, datos: LiquidacionEmpleadoUpdate
    ) -> LiquidacionEmpleado:
        liquidacion = self.obtener(id_liquidacion)
        if datos.nombre_empleado is not None:
            liquidacion.nombre_empleado = datos.nombre_empleado
        if datos.periodo is not None:
            liquidacion.periodo = datos.periodo
        if datos.monto is not None:
            liquidacion.monto = datos.monto
        if datos.concepto is not None:
            liquidacion.concepto = datos.concepto
        if datos.fecha_pago is not None:
            liquidacion.fecha_pago = datos.fecha_pago
        return liquidacion

    def eliminar(self, id_liquidacion: int) -> None:
        liquidacion = self.obtener(id_liquidacion)
        self.repository.eliminar(liquidacion)
