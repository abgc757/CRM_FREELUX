from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    rfc = Column(String(20), unique=True, nullable=False)
    email = Column(String(255))
    phone = Column(String(50))
    contact_name = Column(String(150))
    address = Column(String(500))
    city = Column(String(100))
    state = Column(String(100))
    zip_code = Column(String(10))
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    credit_limit = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    notes = Column(String(1000))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="clients", foreign_keys=[owner_user_id])
    quotes = relationship("Quote", back_populates="cliente", foreign_keys="Quote.cliente_id")
