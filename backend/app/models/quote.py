import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, Sequence, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class QuoteStatus(str, PyEnum):
    borrador = "borrador"
    enviada = "enviada"
    aprobada = "aprobada"
    rechazada = "rechazada"
    convertida = "convertida"


quote_folio_seq = Sequence("quote_folio_seq", start=1000, increment=1)


class Quote(Base):
    __tablename__ = "quotes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    folio: Mapped[int] = mapped_column(Integer, quote_folio_seq, server_default=quote_folio_seq.next_value(), unique=True)
    cliente_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False)
    vendedor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    fecha_validez: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    moneda: Mapped[str] = mapped_column(String(3), default="MXN", nullable=False)
    estado: Mapped[QuoteStatus] = mapped_column(Enum(QuoteStatus), default=QuoteStatus.borrador, nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(14, 4), default=0.0, nullable=False)
    iva: Mapped[float] = mapped_column(Numeric(14, 4), default=0.0, nullable=False)
    total: Mapped[float] = mapped_column(Numeric(14, 4), default=0.0, nullable=False)
    notas: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    cliente = relationship("Client", back_populates="quotes")
    vendedor = relationship("User", back_populates="quotes", foreign_keys=[vendedor_id])
    items = relationship("QuoteItem", back_populates="quote", cascade="all, delete-orphan")
    sale = relationship("Sale", back_populates="quote", uselist=False)
    price_requests = relationship("PriceRequest", back_populates="quote")


class QuoteItem(Base):
    __tablename__ = "quote_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quote_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("quotes.id"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True)
    descripcion: Mapped[str] = mapped_column(String(500), nullable=False)
    cantidad: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    precio_unitario: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    importe: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)

    quote = relationship("Quote", back_populates="items")
    product = relationship("Product")
