from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "ferrecrm",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Mexico_City",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,
    result_expires=3600,
)


@celery_app.task
def send_notification(user_id: int, message: str, channel: str = "email"):
    # Placeholder: integrate with email/SMS/push service
    return {"user_id": user_id, "message": message, "channel": channel, "status": "sent"}


@celery_app.task
def sync_supplier_catalog(supplier_id: int):
    # Placeholder: fetch supplier product catalog via API/CSV
    return {"supplier_id": supplier_id, "status": "synced"}
