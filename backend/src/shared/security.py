from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from src.shared.config import get_settings

settings = get_settings()


def hash_password(password: str) -> str:
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def crear_access_token(sub: str) -> str:
    minutos = settings.jwt_access_token_expire_minutes
    payload = {"sub": sub, "exp": datetime.now(UTC) + timedelta(minutes=minutos)}
    return jwt.encode(
        payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
    )


def decodificar_access_token(token: str) -> dict:
    algoritmos = [settings.jwt_algorithm]
    return jwt.decode(token, settings.jwt_secret_key, algorithms=algoritmos)
