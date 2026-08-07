from fastapi import Depends
from sqlalchemy.orm import Session

from src.consumo.repository import ConsumoRepository
from src.consumo.service import ConsumoService
from src.hospedaje.repository import HospedajeRepository
from src.productos.repository import ProductosRepository
from src.productos.service import ProductosService
from src.shared.database import get_db


def get_consumo_service(db: Session = Depends(get_db)) -> ConsumoService:
    return ConsumoService(
        ConsumoRepository(db),
        HospedajeRepository(db),
        ProductosService(ProductosRepository(db)),
    )
