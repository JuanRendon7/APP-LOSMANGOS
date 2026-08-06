from celery import Celery

from src.shared.config import get_settings

settings = get_settings()

celery_app = Celery(
    "hotel_mangos",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[],
)

celery_app.conf.update(
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    broker_transport_options={"visibility_timeout": 1800},
    timezone=settings.timezone,
    enable_utc=False,
)
