import enum
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import String, Boolean, Enum, DateTime, Integer, Numeric, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.product import ClientType


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    razon_social: Mapped[str | None] = mapped_column(String(255))
    rfc: Mapped[str | None] = mapped_column(String(20), index=True)
    tipo: Mapped[ClientType] = mapped_column(Enum(ClientType), default=ClientType.publico_general)

    # Contact
    email: Mapped[str | None] = mapped_column(String(255))
    telefono: Mapped[str | None] = mapped_column(String(30))
    whatsapp: Mapped[str | None] = mapped_column(String(30))
    direccion: Mapped[str | None] = mapped_column(Text)
    ciudad: Mapped[str | None] = mapped_column(String(100))
    estado: Mapped[str | None] = mapped_column(String(100))
    cp: Mapped[str | None] = mapped_column(String(10))
    uso_cfdi: Mapped[str | None] = mapped_column(String(10), default="G03")
    regimen_fiscal: Mapped[str | None] = mapped_column(String(10))

    # Credit
    credito_activo: Mapped[bool] = mapped_column(Boolean, default=False)
    limite_credito: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    dias_credito: Mapped[int] = mapped_column(Integer, default=30)
    saldo_pendiente: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)

    # Assignment
    seller_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    notas: Mapped[str | None] = mapped_column(Text)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    seller = relationship("User", back_populates="clients")
    quotes = relationship("Quote", back_populates="client")
    sales = relationship("Sale", back_populates="client")
    payments = relationship("Payment", back_populates="client")
