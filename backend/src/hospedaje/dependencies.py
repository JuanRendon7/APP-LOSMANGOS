from fastapi import Depends
from sqlalchemy.orm import Session

from src.hospedaje.repository import HospedajeRepository
from src.hospedaje.service import HospedajeService
from src.shared.database import get_db
from src.tarifas.repository import TarifasRepository
from src.tarifas.service import TarifasService


def get_hospedaje_service(db: Session = Depends(get_db)) -> HospedajeService:
    return HospedajeService(
        HospedajeRepository(db), TarifasService(TarifasRepository(db))
    )
