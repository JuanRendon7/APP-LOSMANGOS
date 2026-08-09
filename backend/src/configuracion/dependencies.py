from fastapi import Depends
from sqlalchemy.orm import Session

from src.configuracion.repository import ConfiguracionRepository
from src.configuracion.service import ConfiguracionService
from src.shared.database import get_db


def get_configuracion_service(db: Session = Depends(get_db)) -> ConfiguracionService:
    return ConfiguracionService(ConfiguracionRepository(db))
