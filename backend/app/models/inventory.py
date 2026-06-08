import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MovementType(str, PyEnum):
    entrada = "entrada"
    salida = "salida"
    ajuste = "ajuste"
    devolucion = "devolucion"


class ReferenciaType(str, PyEnum):
    venta = "venta"
    compra = "compra"
    ajuste = "ajuste"


class Warehouse(Base):
    __tablename__ = "warehouses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    ubicacion: Mapped[str] = mapped_column(String(500), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    movements = relationship("InventoryMovement", back_populates="warehouse")


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    almacen_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("warehouses.id"), nullable=True)
    tipo: Mapped[MovementType] = mapped_column(Enum(MovementType), nullable=False)
    cantidad: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    cantidad_anterior: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    referencia_tipo: Mapped[ReferenciaType] = mapped_column(Enum(ReferenciaType), nullable=True)
    referencia_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=True)
    usuario_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    notas: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    product = relationship("Product", back_populates="inventory_movements")
    warehouse = relationship("Warehouse", back_populates="movements")
    usuario = relationship("User", foreign_keys=[usuario_id])
