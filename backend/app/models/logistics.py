import enum
from datetime import datetime, timezone, date
from decimal import Decimal
from sqlalchemy import String, Enum, DateTime, Integer, Numeric, Text, ForeignKey, Boolean, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class DeliveryStatus(str, enum.Enum):
    pendiente  = "pendiente"
    programado = "programado"
    en_ruta    = "en_ruta"
    entregado  = "entregado"
    cancelado  = "cancelado"


class Vehicle(Base):
    __tablename__ = "vehiculos"

    id: Mapped[int]          = mapped_column(Integer, primary_key=True, index=True)
    placa: Mapped[str]       = mapped_column(String(20), unique=True, index=True)
    descripcion: Mapped[str] = mapped_column(String(200))
    capacidad_kg: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    is_active: Mapped[bool]  = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    deliveries = relationship("DeliveryOrder", back_populates="vehiculo")


class Operator(Base):
    __tablename__ = "operadores"

    id: Mapped[int]               = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str]           = mapped_column(String(200))
    licencia: Mapped[str | None]  = mapped_column(String(50))
    telefono: Mapped[str | None]  = mapped_column(String(30))
    is_active: Mapped[bool]       = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime]  = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    deliveries = relationship("DeliveryOrder", back_populates="operador")


class DeliveryOrder(Base):
    __tablename__ = "pedidos_entrega"

    id: Mapped[int]     = mapped_column(Integer, primary_key=True, index=True)
    folio: Mapped[str]  = mapped_column(String(20), unique=True, index=True)

    sale_id: Mapped[int | None]   = mapped_column(ForeignKey("sales.id"), index=True)
    client_id: Mapped[int]        = mapped_column(ForeignKey("clients.id"), index=True)

    direccion_entrega: Mapped[str]      = mapped_column(Text)
    ciudad: Mapped[str | None]          = mapped_column(String(100))
    contacto_entrega: Mapped[str | None] = mapped_column(String(200))
    telefono_entrega: Mapped[str | None] = mapped_column(String(30))

    fecha_programada: Mapped[date | None]    = mapped_column(Date, index=True)
    fecha_entrega_real: Mapped[date | None]  = mapped_column(Date)

    vehiculo_id: Mapped[int | None]  = mapped_column(ForeignKey("vehiculos.id"))
    operador_id: Mapped[int | None]  = mapped_column(ForeignKey("operadores.id"))

    status: Mapped[DeliveryStatus] = mapped_column(
        Enum(DeliveryStatus), default=DeliveryStatus.pendiente, index=True
    )
    notas: Mapped[str | None] = mapped_column(Text)

    created_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    sale     = relationship("Sale")
    client   = relationship("Client")
    vehiculo = relationship("Vehicle", back_populates="deliveries")
    operador = relationship("Operator", back_populates="deliveries")
    items    = relationship(
        "DeliveryOrderItem", back_populates="pedido", cascade="all, delete-orphan"
    )


class DeliveryOrderItem(Base):
    __tablename__ = "pedido_entrega_items"

    id: Mapped[int]         = mapped_column(Integer, primary_key=True)
    pedido_id: Mapped[int]  = mapped_column(
        ForeignKey("pedidos_entrega.id", ondelete="CASCADE"), index=True
    )
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"))
    descripcion: Mapped[str]       = mapped_column(String(500))
    cantidad: Mapped[Decimal]      = mapped_column(Numeric(12, 4))
    unidad: Mapped[str | None]     = mapped_column(String(20))

    pedido  = relationship("DeliveryOrder", back_populates="items")
    product = relationship("Product")
