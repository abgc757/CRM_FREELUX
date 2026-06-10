import enum
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import String, Enum, DateTime, Integer, Numeric, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class MovementType(str, enum.Enum):
    entrada = "entrada"          # purchase receipt or manual entry
    salida = "salida"            # sale dispatch
    ajuste_positivo = "ajuste_positivo"
    ajuste_negativo = "ajuste_negativo"
    devolucion = "devolucion"


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True, nullable=False)
    tipo: Mapped[MovementType] = mapped_column(Enum(MovementType), nullable=False)
    cantidad: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    stock_antes: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    stock_despues: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    referencia: Mapped[str | None] = mapped_column(String(100))   # OC folio, sale folio, etc.
    notas: Mapped[str | None] = mapped_column(Text)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    product = relationship("Product")
