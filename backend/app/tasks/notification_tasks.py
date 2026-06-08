import asyncio

from app.tasks.celery_app import celery_app


@celery_app.task(name="app.tasks.notification_tasks.send_whatsapp_quote")
def send_whatsapp_quote(quote_id: str, phone: str):
    async def _build_pdf():
        import io
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        from app.database import AsyncSessionLocal
        from app.models.quote import Quote
        import uuid

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Quote)
                .options(selectinload(Quote.items))
                .where(Quote.id == uuid.UUID(quote_id))
            )
            quote = result.scalar_one_or_none()
            if not quote:
                return None
            return float(quote.total), quote.folio

    total, folio = asyncio.get_event_loop().run_until_complete(_build_pdf()) or (0, "?")

    from app.core.config import settings

    if not settings.TWILIO_ACCOUNT_SID:
        return {"status": "skipped", "reason": "Twilio not configured"}

    try:
        from twilio.rest import Client as TwilioClient

        client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=f"FREE LUX - Cotización #{folio}\nTotal: ${total:,.2f} MXN\nGracias por su preferencia.",
            from_=f"whatsapp:{settings.TWILIO_WHATSAPP_FROM}",
            to=f"whatsapp:{phone}",
        )
        return {"status": "sent", "sid": message.sid}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}


@celery_app.task(name="app.tasks.notification_tasks.send_low_stock_alert")
def send_low_stock_alert(product_sku: str, product_nombre: str, existencia: float, inv_min: float):
    return {
        "alert": "low_stock",
        "sku": product_sku,
        "nombre": product_nombre,
        "existencia": existencia,
        "inv_min": inv_min,
    }
