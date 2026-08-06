from fastapi import Query
from pydantic import BaseModel
from sqlalchemy import Select, func, select


class Pagina[T](BaseModel):
    items: list[T]
    total: int
    page: int
    page_size: int


class ParametrosPaginacion(BaseModel):
    page: int = 1
    page_size: int = 20


def parametros_paginacion(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> ParametrosPaginacion:
    return ParametrosPaginacion(page=page, page_size=page_size)


def contar_total(db, stmt: Select) -> int:
    return db.scalar(select(func.count()).select_from(stmt.subquery())) or 0


def aplicar_paginacion(stmt: Select, params: ParametrosPaginacion) -> Select:
    offset = (params.page - 1) * params.page_size
    return stmt.offset(offset).limit(params.page_size)
