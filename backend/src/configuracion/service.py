from src.configuracion.models import ConfiguracionApp
from src.configuracion.repository import ConfiguracionRepository
from src.shared.exceptions import BusinessRuleError

SONIDOS_VALIDOS = {"campana", "timbre", "doble", "suave", "ninguno"}

VALORES_VALIDOS_POR_CLAVE: dict[str, set[str]] = {
    "sonido_notificacion": SONIDOS_VALIDOS,
}


class ConfiguracionService:
    def __init__(self, repository: ConfiguracionRepository) -> None:
        self.repository = repository

    def listar(self) -> list[ConfiguracionApp]:
        return self.repository.listar()

    def actualizar(self, clave: str, valor: str) -> ConfiguracionApp:
        valores_validos = VALORES_VALIDOS_POR_CLAVE.get(clave)
        if valores_validos is None:
            raise BusinessRuleError(f"Configuracion '{clave}' no es valida")
        if valor not in valores_validos:
            raise BusinessRuleError(f"Valor '{valor}' no es valido para '{clave}'")
        return self.repository.upsert(clave, valor)
