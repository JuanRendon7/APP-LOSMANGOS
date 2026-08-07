from fastapi import Depends
from sqlalchemy.orm import Session

from src.productos.repository import ProductosRepository
from src.restaurante.repository import RestauranteRepository
from src.restaurante.service import RestauranteService
from src.shared.database import get_db


def get_restaurante_service(db: Session = Depends(get_db)) -> RestauranteService:
    return RestauranteService(RestauranteRepository(db), ProductosRepository(db))
