from src.proveedores.models import Proveedor
from src.proveedores.repository import ProveedoresRepository
from src.proveedores.schemas import ProveedorCreate, ProveedorUpdate
from src.shared.exceptions import ConflictError, NotFoundError


class ProveedoresService:
    def __init__(self, repository: ProveedoresRepository) -> None:
        self.repository = repository

    def listar(self) -> list[Proveedor]:
        return self.repository.listar()

    def obtener(self, id_proveedor: int) -> Proveedor:
        proveedor = self.repository.obtener(id_proveedor)
        if proveedor is None:
            raise NotFoundError("Proveedor no encontrado")
        return proveedor

    def _validar_nit_libre(
        self, nit_cedula: str | None, excluir_id: int | None = None
    ) -> None:
        if nit_cedula is None:
            return
        existente = self.repository.obtener_por_nit(nit_cedula)
        if existente is not None and existente.id_proveedor != excluir_id:
            raise ConflictError("Ya existe un proveedor con ese NIT/cedula")

    def crear(self, datos: ProveedorCreate) -> Proveedor:
        self._validar_nit_libre(datos.nit_cedula)
        proveedor = Proveedor(
            nombre=datos.nombre,
            nit_cedula=datos.nit_cedula,
            contacto=datos.contacto,
            categoria=datos.categoria,
            notas=datos.notas,
        )
        return self.repository.crear(proveedor)

    def actualizar(self, id_proveedor: int, datos: ProveedorUpdate) -> Proveedor:
        proveedor = self.obtener(id_proveedor)
        nuevo_nit = datos.nit_cedula
        if nuevo_nit is not None and nuevo_nit != proveedor.nit_cedula:
            self._validar_nit_libre(nuevo_nit, excluir_id=id_proveedor)
            proveedor.nit_cedula = nuevo_nit
        if datos.nombre is not None:
            proveedor.nombre = datos.nombre
        if datos.contacto is not None:
            proveedor.contacto = datos.contacto
        if datos.categoria is not None:
            proveedor.categoria = datos.categoria
        if datos.notas is not None:
            proveedor.notas = datos.notas
        if datos.activo is not None:
            proveedor.activo = datos.activo
        return proveedor
