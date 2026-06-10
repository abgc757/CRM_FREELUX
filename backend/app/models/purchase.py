import enum
from datetime import datetime, date, timezone
from decimal import Decimal
from sqlalchemy import String, Enum, DateTime, Date, Integer, Numeric, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.product import UnitType


class PurchaseStatus(str, enum.Enum):
    borrador = "borrador"
    enviada = "enviada"
    confirmada = "confirmada"
    recibida_parcial = "recibida_parcial"
    recibida = "recibida"
    cancelada = "cancelada"


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    razon_social: Mapped[str | None] = mapped_column(String(255))
    rfc: Mapped[str | None] = mapped_column(String(20))
    contacto: Mapped[str | None] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255))
    telefono: Mapped[str | None] = mapped_column(String(30))
    direccion: Mapped[str | None] = mapped_column(Text)
    lead_time_dias: Mapped[int] = mapped_column(Integer, default=3)
    notas: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Integer, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    folio: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"), index=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    status: Mapped[PurchaseStatus] = mapped_column(Enum(PurchaseStatus), default=PurchaseStatus.borrador)
    fecha_requerida: Mapped[date | None] = mapped_column(Date)
    notas: Mapped[str | None] = mapped_column(Text)

    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    iva: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    supplier = relationship("Supplier", back_populates="purchase_orders")
    items = relationship("PurchaseOrderItem", back_populates="order", cascade="all, delete-orphan")


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)

    descripcion: Mapped[str] = mapped_column(String(500))
    cantidad_solicitada: Mapped[Decimal] = mapped_column(Numeric(12, 4))
    cantidad_recibida: Mapped[Decimal] = mapped_column(Numeric(12, 4), default=0)
    unidad: Mapped[UnitType] = mapped_column(Enum(UnitType), default=UnitType.pza)
    precio_unitario: Mapped[Decimal] = mapped_column(Numeric(12, 4))
    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 2))

    order = relationship("PurchaseOrder", back_populates="items")
