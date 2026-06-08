import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    rfc: Mapped[str] = mapped_column(String(13), nullable=True)
    contacto: Mapped[str] = mapped_column(String(200), nullable=True)
    telefono: Mapped[str] = mapped_column(String(20), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    direccion: Mapped[str] = mapped_column(String(500), nullable=True)
    ciudad: Mapped[str] = mapped_column(String(100), nullable=True)
    estado_mx: Mapped[str] = mapped_column(String(100), nullable=True)
    lat: Mapped[float] = mapped_column(Float, nullable=True)
    lng: Mapped[float] = mapped_column(Float, nullable=True)
    familias: Mapped[list] = mapped_column(ARRAY(String), nullable=True, default=list)
    tiempo_entrega_promedio_dias: Mapped[int] = mapped_column(Integer, default=7, nullable=True)
    fiabilidad_score: Mapped[int] = mapped_column(Integer, default=50, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    purchases = relationship("Purchase", back_populates="supplier")
