from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from app.database import Base


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    folio = Column(String(20), unique=True, nullable=False, index=True)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=True)
    cliente_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    vendedor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subtotal = Column(Float, default=0.0)
    descuento = Column(Float, default=0.0)
    impuesto = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    tipo = Column(String(20), default="contado")
    factura_solicitada = Column(Boolean, default=False)
    factura_uuid = Column(String(100))
    notas = Column(Text)
    estado = Column(String(20), default="completada")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    quote = relationship("Quote", back_populates="sale", foreign_keys=[quote_id])
    cliente = relationship("Client")
    vendedor = relationship("User", back_populates="sales", foreign_keys=[vendedor_id])
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    remissions = relationship("Remission", back_populates="sale")


class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    cantidad = Column(Float, nullable=False)
    precio_unitario = Column(Float, nullable=False)
    descuento = Column(Float, default=0.0)
    subtotal = Column(Float, nullable=False)

    sale = relationship("Sale", back_populates="items")
    product = relationship("Product")


class Remission(Base):
    __tablename__ = "remissions"

    id = Column(Integer, primary_key=True, index=True)
    folio = Column(String(20), unique=True, nullable=False, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    fecha_entrega = Column(DateTime(timezone=True))
    direccion_entrega = Column(String(500))
    recibio_nombre = Column(String(150))
    recibio_firma = Column(String(500))
    notas = Column(Text)
    estado = Column(String(20), default="pendiente")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sale = relationship("Sale", back_populates="remissions")
