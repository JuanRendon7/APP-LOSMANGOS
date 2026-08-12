from fastapi import Depends
from sqlalchemy.orm import Session

from src.proveedores.repository import ProveedoresRepository
from src.proveedores.service import ProveedoresService
from src.shared.database import get_db


def get_proveedores_service(db: Session = Depends(get_db)) -> ProveedoresService:
    return ProveedoresService(ProveedoresRepository(db))
