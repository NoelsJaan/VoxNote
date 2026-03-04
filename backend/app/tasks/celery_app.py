from celery import Celery

from app.config import settings

celery = Celery(
    "voxnote",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery.conf.task_serializer = "json"
celery.conf.result_serializer = "json"
celery.conf.accept_content = ["json"]
celery.conf.timezone = "UTC"
celery.conf.enable_utc = True

# Retry configuration
celery.conf.task_acks_late = True
celery.conf.worker_prefetch_multiplier = 1
