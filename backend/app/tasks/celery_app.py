from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "freelux",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.price_tasks", "app.tasks.notification_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="America/Mexico_City",
    enable_utc=True,
    beat_schedule={
        "check-low-stock-daily": {
            "task": "app.tasks.price_tasks.check_low_stock",
            "schedule": 86400.0,
        },
    },
)
