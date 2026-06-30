import enum
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import String, Enum, DateTime, Integer, Numeric, Text, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class SessionStatus(str, enum.Enum):
    abierta = "abierta"
    cerrada = "cerrada"


class POSPaymentMethod(str, enum.Enum):
    efectivo     = "efectivo"
    tarjeta      = "tarjeta"
    transferencia = "transferencia"
    mixto        = "mixto"


class CashSession(Base):
    """Turno / sesión de caja POS."""
    __tablename__ = "sesiones_caja"

    id: Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    folio: Mapped[str]   = mapped_column(String(20), unique=True, index=True)

    cajero_id: Mapped[int]  = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus), default=SessionStatus.abierta, index=True
    )

    fondo_inicial: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)

    # Totales calculados al cierre
    total_efectivo: Mapped[Decimal]      = mapped_column(Numeric(14, 2), default=0)
    total_tarjeta: Mapped[Decimal]       = mapped_column(Numeric(14, 2), default=0)
    total_transferencia: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    total_ventas: Mapped[Decimal]        = mapped_column(Numeric(14, 2), default=0)
    num_transacciones: Mapped[int]       = mapped_column(Integer, default=0)

    # Efectivo contado al cierre (para conciliar)
    efectivo_contado: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    diferencia: Mapped[Decimal | None]       = mapped_column(Numeric(14, 2))

    notas: Mapped[str | None] = mapped_column(Text)
    opened_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    cajero = relationship("User")
    ventas = relationship("POSSale", back_populates="session")


class POSSale(Base):
    """Venta directa desde el POS (sin cotización previa)."""
    __tablename__ = "pos_ventas"

    id: Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    folio: Mapped[str]   = mapped_column(String(20), unique=True, index=True)

    session_id: Mapped[int]  = mapped_column(ForeignKey("sesiones_caja.id"), index=True)
    cajero_id: Mapped[int]   = mapped_column(ForeignKey("users.id"), index=True)
    client_id: Mapped[int | None] = mapped_column(ForeignKey("clients.id"), index=True)

    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    iva: Mapped[Decimal]      = mapped_column(Numeric(14, 2), default=0)
    total: Mapped[Decimal]    = mapped_column(Numeric(14, 2), default=0)

    metodo_pago: Mapped[POSPaymentMethod] = mapped_column(
        Enum(POSPaymentMethod), default=POSPaymentMethod.efectivo
    )
    monto_efectivo: Mapped[Decimal]      = mapped_column(Numeric(14, 2), default=0)
    monto_tarjeta: Mapped[Decimal]       = mapped_column(Numeric(14, 2), default=0)
    monto_transferencia: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    cambio: Mapped[Decimal]              = mapped_column(Numeric(14, 2), default=0)

    notas: Mapped[str | None] = mapped_column(Text)
    is_cancelled: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    session = relationship("CashSession", back_populates="ventas")
    cajero  = relationship("User", foreign_keys=[cajero_id])
    client  = relationship("Client")
    items   = relationship("POSSaleItem", back_populates="venta", cascade="all, delete-orphan")


class POSSaleItem(Base):
    __tablename__ = "pos_venta_items"

    id: Mapped[int]       = mapped_column(Integer, primary_key=True)
    venta_id: Mapped[int] = mapped_column(
        ForeignKey("pos_ventas.id", ondelete="CASCADE"), index=True
    )
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"))
    descripcion: Mapped[str]       = mapped_column(String(500))
    cantidad: Mapped[Decimal]      = mapped_column(Numeric(12, 4))
    precio_unitario: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    descuento_pct: Mapped[Decimal]   = mapped_column(Numeric(5, 2), default=0)
    subtotal: Mapped[Decimal]        = mapped_column(Numeric(14, 2))
    tiene_iva: Mapped[bool]          = mapped_column(Boolean, default=True)

    venta   = relationship("POSSale", back_populates="items")
    product = relationship("Product")
