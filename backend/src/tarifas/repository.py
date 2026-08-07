from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.tarifas.models import Temporada


class TarifasRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def listar_temporadas(self) -> list[Temporada]:
        stmt = select(Temporada).order_by(Temporada.fecha_inicio)
        return list(self.db.scalars(stmt))

    def obtener_temporada(self, id_temporada: int) -> Temporada | None:
        return self.db.get(Temporada, id_temporada)

    def crear_temporada(self, temporada: Temporada) -> Temporada:
        self.db.add(temporada)
        self.db.flush()
        return temporada

    def eliminar_temporada(self, temporada: Temporada) -> None:
        self.db.delete(temporada)

    def existe_solapamiento(
        self,
        fecha_inicio: date,
        fecha_fin: date,
        excluir_id: int | None = None,
    ) -> bool:
        stmt = select(Temporada.id_temporada).where(
            Temporada.activa.is_(True),
            Temporada.fecha_inicio <= fecha_fin,
            Temporada.fecha_fin >= fecha_inicio,
        )
        if excluir_id is not None:
            stmt = stmt.where(Temporada.id_temporada != excluir_id)
        return self.db.scalar(stmt) is not None

    def temporadas_activas_en_rango(
        self, checkin: date, checkout: date
    ) -> list[Temporada]:
        stmt = select(Temporada).where(
            Temporada.activa.is_(True),
            Temporada.fecha_inicio < checkout,
            Temporada.fecha_fin >= checkin,
        )
        return list(self.db.scalars(stmt))
