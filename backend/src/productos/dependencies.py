from fastapi import Depends
from sqlalchemy.orm import Session

from src.productos.repository import ProductosRepository
from src.productos.service import ProductosService
from src.shared.database import get_db


def get_productos_service(db: Session = Depends(get_db)) -> ProductosService:
    return ProductosService(ProductosRepository(db))
