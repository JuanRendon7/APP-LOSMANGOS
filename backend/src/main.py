from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from src.auth.router import roles_router, usuarios_router
from src.auth.router import router as auth_router
from src.caja.router import gastos_router, turnos_router, ventas_router
from src.configuracion.router import router as configuracion_router
from src.consumo.router import router as consumo_router
from src.hospedaje.router import habitaciones_router, huespedes_router, reservas_router
from src.liquidaciones.router import router as liquidaciones_router
from src.productos.router import productos_bar_router, productos_restaurante_router
from src.restaurante.router import mesas_router, pedidos_router
from src.shared import (
    models_registry,  # noqa: F401  (resuelve metadata/FK antes de servir)
)
from src.shared.config import get_settings
from src.shared.exceptions import BusinessRuleError, ConflictError, NotFoundError
from src.tarifas.router import temporadas_router

settings = get_settings()

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

app = FastAPI(title="Hotel Los Mangos API", version="0.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(NotFoundError)
def _handle_not_found(_: Request, exc: NotFoundError) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(ConflictError)
def _handle_conflict(_: Request, exc: ConflictError) -> JSONResponse:
    return JSONResponse(status_code=409, content={"detail": str(exc)})


@app.exception_handler(BusinessRuleError)
def _handle_business_rule(_: Request, exc: BusinessRuleError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(usuarios_router)
app.include_router(roles_router)
app.include_router(habitaciones_router)
app.include_router(huespedes_router)
app.include_router(reservas_router)
app.include_router(temporadas_router)
app.include_router(productos_restaurante_router)
app.include_router(productos_bar_router)
app.include_router(mesas_router)
app.include_router(pedidos_router)
app.include_router(consumo_router)
app.include_router(turnos_router)
app.include_router(gastos_router)
app.include_router(ventas_router)
app.include_router(configuracion_router)
app.include_router(liquidaciones_router)
