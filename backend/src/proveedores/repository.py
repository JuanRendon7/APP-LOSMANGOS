from sqlalchemy import select
from sqlalchemy.orm import Session

from src.proveedores.models import Proveedor


class ProveedoresRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def listar(self) -> list[Proveedor]:
        stmt = select(Proveedor).order_by(Proveedor.nombre)
        return list(self.db.scalars(stmt))

    def obtener(self, id_proveedor: int) -> Proveedor | None:
        return self.db.get(Proveedor, id_proveedor)

    def obtener_por_nit(self, nit_cedula: str) -> Proveedor | None:
        return self.db.scalar(
            select(Proveedor).where(Proveedor.nit_cedula == nit_cedula)
        )

    def crear(self, proveedor: Proveedor) -> Proveedor:
        self.db.add(proveedor)
        self.db.flush()
        return proveedor
