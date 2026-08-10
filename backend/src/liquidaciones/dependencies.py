from fastapi import Depends
from sqlalchemy.orm import Session

from src.auth.repository import AuthRepository
from src.liquidaciones.repository import LiquidacionesRepository
from src.liquidaciones.service import LiquidacionesService
from src.shared.database import get_db


def get_liquidaciones_service(db: Session = Depends(get_db)) -> LiquidacionesService:
    return LiquidacionesService(LiquidacionesRepository(db), AuthRepository(db))
