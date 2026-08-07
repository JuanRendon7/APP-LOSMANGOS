from fastapi import Depends
from sqlalchemy.orm import Session

from src.shared.database import get_db
from src.tarifas.repository import TarifasRepository
from src.tarifas.service import TarifasService


def get_tarifas_service(db: Session = Depends(get_db)) -> TarifasService:
    return TarifasService(TarifasRepository(db))
