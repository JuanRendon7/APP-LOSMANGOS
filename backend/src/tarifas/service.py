from datetime import date, timedelta

from src.shared.exceptions import BusinessRuleError, ConflictError, NotFoundError
from src.tarifas.models import Temporada
from src.tarifas.repository import TarifasRepository
from src.tarifas.schemas import TemporadaCreate, TemporadaUpdate


class TarifasService:
    def __init__(self, repository: TarifasRepository) -> None:
        self.repository = repository

    def listar_temporadas(self) -> list[Temporada]:
        return self.repository.listar_temporadas()

    def obtener_temporada(self, id_temporada: int) -> Temporada:
        temporada = self.repository.obtener_temporada(id_temporada)
        if temporada is None:
            raise NotFoundError("Temporada no encontrada")
        return temporada

    def crear_temporada(self, datos: TemporadaCreate) -> Temporada:
        if datos.fecha_inicio > datos.fecha_fin:
            raise BusinessRuleError(
                "La fecha de fin debe ser posterior o igual a la de inicio"
            )
        if datos.activa and self.repository.existe_solapamiento(
            datos.fecha_inicio, datos.fecha_fin
        ):
            raise ConflictError(
                "Ya existe una temporada activa que se solapa con esas fechas"
            )
        temporada = Temporada(
            nombre=datos.nombre,
            fecha_inicio=datos.fecha_inicio,
            fecha_fin=datos.fecha_fin,
            precio_noche=datos.precio_noche,
            activa=datos.activa,
        )
        return self.repository.crear_temporada(temporada)

    def actualizar_temporada(
        self, id_temporada: int, datos: TemporadaUpdate
    ) -> Temporada:
        temporada = self.obtener_temporada(id_temporada)
        fecha_inicio = datos.fecha_inicio or temporada.fecha_inicio
        fecha_fin = datos.fecha_fin or temporada.fecha_fin
        activa = datos.activa if datos.activa is not None else temporada.activa
        if fecha_inicio > fecha_fin:
            raise BusinessRuleError(
                "La fecha de fin debe ser posterior o igual a la de inicio"
            )
        if activa and self.repository.existe_solapamiento(
            fecha_inicio, fecha_fin, excluir_id=id_temporada
        ):
            raise ConflictError(
                "Ya existe una temporada activa que se solapa con esas fechas"
            )
        temporada.nombre = datos.nombre or temporada.nombre
        temporada.fecha_inicio = fecha_inicio
        temporada.fecha_fin = fecha_fin
        temporada.precio_noche = datos.precio_noche or temporada.precio_noche
        temporada.activa = activa
        return temporada

    def eliminar_temporada(self, id_temporada: int) -> None:
        temporada = self.obtener_temporada(id_temporada)
        self.repository.eliminar_temporada(temporada)

    def calcular_precio_total(self, checkin: date, checkout: date) -> int:
        temporadas = self.repository.temporadas_activas_en_rango(checkin, checkout)
        total = 0
        noche = checkin
        while noche < checkout:
            temporada = next(
                (t for t in temporadas if t.fecha_inicio <= noche <= t.fecha_fin),
                None,
            )
            if temporada is None:
                raise BusinessRuleError(
                    f"No hay una tarifa definida para el {noche.isoformat()}"
                )
            total += temporada.precio_noche
            noche += timedelta(days=1)
        return total
