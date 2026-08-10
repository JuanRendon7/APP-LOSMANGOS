from src.auth.repository import AuthRepository
from src.liquidaciones.models import LiquidacionEmpleado
from src.liquidaciones.repository import LiquidacionesRepository
from src.liquidaciones.schemas import LiquidacionEmpleadoCreate, LiquidacionEmpleadoUpdate
from src.shared.exceptions import NotFoundError


class LiquidacionesService:
    def __init__(
        self, repository: LiquidacionesRepository, auth_repository: AuthRepository
    ) -> None:
        self.repository = repository
        self.auth_repository = auth_repository

    def listar(
        self, id_usuario: int | None, periodo: str | None
    ) -> list[LiquidacionEmpleado]:
        return self.repository.listar(id_usuario, periodo)

    def obtener(self, id_liquidacion: int) -> LiquidacionEmpleado:
        liquidacion = self.repository.obtener(id_liquidacion)
        if liquidacion is None:
            raise NotFoundError("Liquidacion no encontrada")
        return liquidacion

    def crear(
        self, datos: LiquidacionEmpleadoCreate, creado_por: int | None
    ) -> LiquidacionEmpleado:
        empleado = self.auth_repository.obtener_por_id(datos.id_usuario)
        if empleado is None:
            raise NotFoundError("Empleado no encontrado")
        liquidacion = LiquidacionEmpleado(
            id_usuario=datos.id_usuario,
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
