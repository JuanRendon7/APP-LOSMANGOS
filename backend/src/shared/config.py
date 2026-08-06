from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"

    database_url: str = "postgresql+psycopg://hotel:hotel@localhost:5432/hotel_mangos"
    db_pool_size: int = 5
    db_max_overflow: int = 10

    redis_url: str = "redis://localhost:6379/0"

    jwt_secret_key: str = "change-me-in-env"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 480

    cors_origins: str = "http://localhost:5173"

    admin_email: str = "admin@hotellosmangos.com"
    admin_password: str = "change-me-in-env"
    admin_nombre: str = "Administrador"

    booking_ical_token_secret: str = "change-me-in-env"

    timezone: str = "America/Bogota"

    @property
    def cors_origins_list(self) -> list[str]:
        origenes = self.cors_origins.split(",")
        return [origen.strip() for origen in origenes if origen.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
