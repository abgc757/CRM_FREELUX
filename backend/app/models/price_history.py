import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PriceHistory(Base):
    __tablename__ = "price_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    usuario_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    precio_anterior: Mapped[float] = mapped_column(Numeric(12, 4), nullable=True)
    precio_nuevo: Mapped[float] = mapped_column(Numeric(12, 4), nullable=True)
    costo_anterior: Mapped[float] = mapped_column(Numeric(12, 4), nullable=True)
    costo_nuevo: Mapped[float] = mapped_column(Numeric(12, 4), nullable=True)
    motivo: Mapped[str] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    product = relationship("Product", back_populates="price_history")
    usuario = relationship("User", foreign_keys=[usuario_id])
