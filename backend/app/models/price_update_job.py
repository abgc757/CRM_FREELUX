import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PriceRequestStatus(str, PyEnum):
    pendiente = "pendiente"
    aprobado = "aprobado"
    rechazado = "rechazado"


class PriceRequest(Base):
    __tablename__ = "price_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quote_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("quotes.id"), nullable=True)
    vendedor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    gerente_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    producto_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    precio_solicitado: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    precio_aprobado: Mapped[float] = mapped_column(Numeric(12, 4), nullable=True)
    estado: Mapped[PriceRequestStatus] = mapped_column(Enum(PriceRequestStatus), default=PriceRequestStatus.pendiente, nullable=False)
    notas: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    quote = relationship("Quote", back_populates="price_requests")
    vendedor = relationship("User", foreign_keys=[vendedor_id])
    gerente = relationship("User", foreign_keys=[gerente_id])
    producto = relationship("Product")
