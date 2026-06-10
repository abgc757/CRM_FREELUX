import enum
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import String, Enum, DateTime, Integer, Numeric, Text, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.product import UnitType


class QuoteStatus(str, enum.Enum):
    borrador = "borrador"
    enviada = "enviada"
    aprobada = "aprobada"
    convertida = "convertida"
    cancelada = "cancelada"


class Quote(Base):
    __tablename__ = "quotes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    folio: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), index=True)
    seller_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    status: Mapped[QuoteStatus] = mapped_column(Enum(QuoteStatus), default=QuoteStatus.borrador)
    notas: Mapped[str | None] = mapped_column(Text)
    condiciones_pago: Mapped[str | None] = mapped_column(String(100))
    vigencia_dias: Mapped[int] = mapped_column(Integer, default=15)

    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    iva: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)

    pdf_url: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    client = relationship("Client", back_populates="quotes")
    seller = relationship("User", back_populates="quotes", foreign_keys=[seller_id])
    items = relationship("QuoteItem", back_populates="quote", cascade="all, delete-orphan")
    sale = relationship("Sale", back_populates="quote", uselist=False)


class QuoteItem(Base):
    __tablename__ = "quote_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    quote_id: Mapped[int] = mapped_column(ForeignKey("quotes.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)

    descripcion: Mapped[str] = mapped_column(String(500))
    cantidad: Mapped[Decimal] = mapped_column(Numeric(12, 4))
    unidad: Mapped[UnitType] = mapped_column(Enum(UnitType), default=UnitType.pza)
    precio_unitario: Mapped[Decimal] = mapped_column(Numeric(12, 4))
    descuento_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    tiene_iva: Mapped[bool] = mapped_column(Boolean, default=True)

    product = relationship("Product", back_populates="quote_items")
    quote = relationship("Quote", back_populates="items")
