import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TipoDocumento(str, PyEnum):
    factura = "factura"
    nota_venta = "nota_venta"
    remision = "remision"


class SaleStatus(str, PyEnum):
    pendiente = "pendiente"
    completada = "completada"
    cancelada = "cancelada"


class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quote_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("quotes.id"), nullable=True)
    vendedor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    cliente_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False)
    tipo_documento: Mapped[TipoDocumento] = mapped_column(Enum(TipoDocumento), default=TipoDocumento.nota_venta, nullable=False)
    estado: Mapped[SaleStatus] = mapped_column(Enum(SaleStatus), default=SaleStatus.pendiente, nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(14, 4), default=0.0, nullable=False)
    iva: Mapped[float] = mapped_column(Numeric(14, 4), default=0.0, nullable=False)
    total: Mapped[float] = mapped_column(Numeric(14, 4), default=0.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    quote = relationship("Quote", back_populates="sale")
    vendedor = relationship("User", back_populates="sales", foreign_keys=[vendedor_id])
    cliente = relationship("Client", back_populates="sales")
