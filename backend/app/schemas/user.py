from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class RoleOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    permissions: str = "[]"

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    nombre: str
    email: EmailStr
    password: str
    role_id: int
    vendedor_id: Optional[int] = None
    phone: Optional[str] = None


class UserUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class UserOut(BaseModel):
    id: int
    nombre: str
    email: str
    role_id: int
    role: Optional[RoleOut] = None
    vendedor_id: Optional[int] = None
    is_active: bool
    phone: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
