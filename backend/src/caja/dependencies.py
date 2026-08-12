from fastapi import Depends
from sqlalchemy.orm import Session

from src.caja.repository import CajaRepository
from src.caja.service import CajaService
from src.consumo.repository import ConsumoRepository
from src.hospedaje.repository import HospedajeRepository
from src.hospedaje.service import HospedajeService
from src.productos.repository import ProductosRepository
from src.productos.service import ProductosService
from src.proveedores.repository import ProveedoresRepository
from src.restaurante.repository import RestauranteRepository
from src.restaurante.service import RestauranteService
from src.shared.database import get_db
from src.tarifas.repository import TarifasRepository
from src.tarifas.service import TarifasService


def get_caja_service(db: Session = Depends(get_db)) -> CajaService:
    productos_service = ProductosService(ProductosRepository(db))
    return CajaService(
        CajaRepository(db),
        ConsumoRepository(db),
        HospedajeService(
            HospedajeRepository(db), TarifasService(TarifasRepository(db))
        ),
        RestauranteService(RestauranteRepository(db), productos_service),
        productos_service,
        ProveedoresRepository(db),
    )
