"""Importa los modulos `models` de cada dominio para que SQLAlchemy resuelva
el grafo completo de metadata/FK antes de crear el engine o correr Alembic.

Se importa una sola vez desde `src/main.py`, `alembic/env.py` y el entrypoint
de Celery -- ningun otro archivo debe repetir esta lista.
"""

from src.auth import models as auth_models  # noqa: F401
