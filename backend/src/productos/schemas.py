from typing import Literal

from pydantic import BaseModel, Field, field_validator

CategoriaProductoRestaurante = Literal["DESAYUNO", "ALMUERZO", "CENA", "ADICIONALES"]


class ProductoRestauranteBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=150)
    categoria: CategoriaProductoRestaurante = "ALMUERZO"
    precio_venta: int = Field(gt=0)


class ProductoRestauranteCreate(ProductoRestauranteBase):
    pass


class ProductoRestauranteUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=150)
    categoria: CategoriaProductoRestaurante | None = None
    precio_venta: int | None = Field(default=None, gt=0)
    activo: bool | None = None


class ProductoRestauranteResponse(ProductoRestauranteBase):
    id_producto: int
    activo: bool

    model_config = {"from_attributes": True}


class ProductoBarBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=150)
    codigo_barras: str | None = Field(default=None, max_length=50)
    precio_costo: int = Field(ge=0)
    precio_venta: int = Field(gt=0)

    @field_validator("codigo_barras")
    @classmethod
    def _vacio_es_nulo(cls, valor: str | None) -> str | None:
        return valor.strip() or None if valor is not None else None


class ProductoBarCreate(ProductoBarBase):
    stock: int = Field(default=0, ge=0)
    umbral_stock_bajo: int = Field(default=5, ge=0)


class ProductoBarUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=150)
    codigo_barras: str | None = Field(default=None, min_length=1, max_length=50)
    precio_costo: int | None = Field(default=None, ge=0)
    precio_venta: int | None = Field(default=None, gt=0)
    umbral_stock_bajo: int | None = Field(default=None, ge=0)
    activo: bool | None = None


class ProductoBarResponse(BaseModel):
    id_producto: int
    nombre: str
    codigo_barras: str | None
    precio_venta: int
    stock: int
    umbral_stock_bajo: int
    activo: bool
    precio_costo: int | None = None
    margen: int | None = None
    margen_porcentaje: float | None = None

    model_config = {"from_attributes": True}


class AjusteStockInput(BaseModel):
    cantidad: int

    @field_validator("cantidad")
    @classmethod
    def _cantidad_no_puede_ser_cero(cls, valor: int) -> int:
        if valor == 0:
            raise ValueError("La cantidad no puede ser cero")
        return valor
