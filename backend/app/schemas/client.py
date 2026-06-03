from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class ClientCreate(BaseModel):
    nombre: str
    rfc: str
    email: Optional[str] = None
    phone: Optional[str] = None
    contact_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    credit_limit: Optional[int] = 0
    notes: Optional[str] = None


class ClientUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    contact_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    credit_limit: Optional[int] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class ClientOut(BaseModel):
    id: int
    nombre: str
    rfc: str
    email: Optional[str] = None
    phone: Optional[str] = None
    contact_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    owner_user_id: int
    credit_limit: int
    is_active: bool
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
