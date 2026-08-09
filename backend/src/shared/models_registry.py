"""Importa los modulos `models` de cada dominio para que SQLAlchemy resuelva
el grafo completo de metadata/FK antes de crear el engine o correr Alembic.

Se importa una sola vez desde `src/main.py`, `alembic/env.py` y el entrypoint
de Celery -- ningun otro archivo debe repetir esta lista.
"""

from src.auth import models as auth_models  # noqa: F401
from src.caja import models as caja_models  # noqa: F401
from src.configuracion import models as configuracion_models  # noqa: F401
from src.consumo import models as consumo_models  # noqa: F401
from src.hospedaje import models as hospedaje_models  # noqa: F401
from src.productos import models as productos_models  # noqa: F401
from src.restaurante import models as restaurante_models  # noqa: F401
from src.tarifas import models as tarifas_models  # noqa: F401
