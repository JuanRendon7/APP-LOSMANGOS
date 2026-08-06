class DomainError(Exception):
    """Base para errores de negocio que los routers traducen a HTTP."""


class NotFoundError(DomainError):
    """El recurso solicitado no existe."""


class ConflictError(DomainError):
    """La operacion entra en conflicto con el estado actual (duplicados, unicidad)."""


class BusinessRuleError(DomainError):
    """La operacion viola una regla de negocio (ej. caja cerrada, stock insuf.)."""
