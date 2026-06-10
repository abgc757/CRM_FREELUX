import enum
from datetime import datetime, timezone, date
from decimal import Decimal
from sqlalchemy import String, Enum, DateTime, Integer, Numeric, Text, ForeignKey, Boolean, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class SaleStatus(str, enum.Enum):
    pendiente = "pendiente"
    facturada = "facturada"
    nota_venta = "nota_venta"
    entregada = "entregada"
    cancelada = "cancelada"


class PaymentMethod(str, enum.Enum):
    contado = "contado"
    credito = "credito"
    transferencia = "transferencia"
    cheque = "cheque"
    efectivo = "efectivo"


class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    folio: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    quote_id: Mapped[int | None] = mapped_column(ForeignKey("quotes.id"), index=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), index=True)
    seller_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    status: Mapped[SaleStatus] = mapped_column(Enum(SaleStatus), default=SaleStatus.pendiente)
    metodo_pago: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod), default=PaymentMethod.contado)

    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    iva: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    saldo_pendiente: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)

    # CFDI fields
    cfdi_uuid: Mapped[str | None] = mapped_column(String(50))
    cfdi_xml_url: Mapped[str | None] = mapped_column(String(500))
    cfdi_pdf_url: Mapped[str | None] = mapped_column(String(500))

    remision_url: Mapped[str | None] = mapped_column(String(500))
    fecha_vencimiento: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    notas: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    quote = relationship("Quote", back_populates="sale")
    client = relationship("Client", back_populates="sales")
    payments = relationship("Payment", back_populates="sale")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id", ondelete="CASCADE"), index=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), index=True)
    monto: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    metodo: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod))
    referencia: Mapped[str | None] = mapped_column(String(100))
    fecha_pago: Mapped[date | None] = mapped_column(Date, nullable=True)
    notas: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    registered_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    sale = relationship("Sale", back_populates="payments")
    client = relationship("Client", back_populates="payments")
