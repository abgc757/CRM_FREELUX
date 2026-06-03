from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from app.database import Base


class Quote(Base):
    __tablename__ = "quotes"

    id = Column(Integer, primary_key=True, index=True)
    folio = Column(String(20), unique=True, nullable=False, index=True)
    cliente_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    vendedor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subtotal = Column(Float, default=0.0)
    descuento = Column(Float, default=0.0)
    impuesto = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    validez_dias = Column(Integer, default=15)
    notas = Column(Text)
    estado = Column(String(20), default="borrador")
    requires_price_approval = Column(Boolean, default=False)
    price_approval_status = Column(String(20), default="none")
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    pdf_generated = Column(Boolean, default=False)
    pdf_url = Column(String(500))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    cliente = relationship("Client", back_populates="quotes", foreign_keys=[cliente_id])
    vendedor = relationship("User", back_populates="quotes", foreign_keys=[vendedor_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    items = relationship("QuoteItem", back_populates="quote", cascade="all, delete-orphan")
    sale = relationship("Sale", back_populates="quote", uselist=False)


class QuoteItem(Base):
    __tablename__ = "quote_items"

    id = Column(Integer, primary_key=True, index=True)
    quote_id = Column(Integer, ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    cantidad = Column(Float, nullable=False)
    precio_unitario = Column(Float, nullable=False)
    descuento = Column(Float, default=0.0)
    subtotal = Column(Float, nullable=False)
    notas = Column(Text)

    quote = relationship("Quote", back_populates="items")
    product = relationship("Product")
