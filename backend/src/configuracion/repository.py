from sqlalchemy import select
from sqlalchemy.orm import Session

from src.configuracion.models import ConfiguracionApp


class ConfiguracionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def listar(self) -> list[ConfiguracionApp]:
        stmt = select(ConfiguracionApp).order_by(ConfiguracionApp.clave)
        return list(self.db.scalars(stmt))

    def obtener(self, clave: str) -> ConfiguracionApp | None:
        return self.db.get(ConfiguracionApp, clave)

    def upsert(self, clave: str, valor: str) -> ConfiguracionApp:
        existente = self.obtener(clave)
        if existente is not None:
            existente.valor = valor
            return existente
        nueva = ConfiguracionApp(clave=clave, valor=valor)
        self.db.add(nueva)
        self.db.flush()
        return nueva
