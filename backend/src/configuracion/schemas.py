from pydantic import BaseModel, Field


class ConfiguracionResponse(BaseModel):
    clave: str
    valor: str

    model_config = {"from_attributes": True}


class ConfiguracionUpdate(BaseModel):
    valor: str = Field(min_length=1, max_length=100)
