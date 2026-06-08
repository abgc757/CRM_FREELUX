import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PurchaseStatus(str, PyEnum):
    borrador = "borrador"
    enviada = "enviada"
    recibida = "recibida"
    cancelada = "cancelada"


class Purchase(Base):
    __tablename__ = "purchases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    supplier_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=False)
    solicitante_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    estado: Mapped[PurchaseStatus] = mapped_column(Enum(PurchaseStatus), default=PurchaseStatus.borrador, nullable=False)
    fecha_esperada: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    subtotal: Mapped[float] = mapped_column(Numeric(14, 4), default=0.0, nullable=False)
    iva: Mapped[float] = mapped_column(Numeric(14, 4), default=0.0, nullable=False)
    total: Mapped[float] = mapped_column(Numeric(14, 4), default=0.0, nullable=False)
    notas: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    supplier = relationship("Supplier", back_populates="purchases")
    solicitante = relationship("User", foreign_keys=[solicitante_id])
    items = relationship("PurchaseItem", back_populates="purchase", cascade="all, delete-orphan")


class PurchaseItem(Base):
    __tablename__ = "purchase_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    purchase_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("purchases.id"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True)
    descripcion: Mapped[str] = mapped_column(String(500), nullable=False)
    cantidad: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    precio_unitario: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    cantidad_recibida: Mapped[float] = mapped_column(Numeric(12, 4), default=0.0, nullable=False)

    purchase = relationship("Purchase", back_populates="items")
    product = relationship("Product")
