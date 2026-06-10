from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token, hash_password
from app.schemas.user import TokenResponse, UserOut, RefreshRequest, UserCreate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == form.username, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email o contraseña incorrectos")
    return TokenResponse(
        access_token=create_access_token(str(user.id), user.role.value),
        refresh_token=create_refresh_token(str(user.id)),
        user=UserOut.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Refresh token inválido")
    result = await db.execute(select(User).where(User.id == int(payload["sub"]), User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return TokenResponse(
        access_token=create_access_token(str(user.id), user.role.value),
        refresh_token=create_refresh_token(str(user.id)),
        user=UserOut.model_validate(user),
    )


@router.post("/seed-admin", include_in_schema=False)
async def seed_admin(db: AsyncSession = Depends(get_db)):
    """Creates initial admin user. Only works when no users exist."""
    result = await db.execute(select(User))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Ya existen usuarios")
    admin = User(
        email="admin@freelux.mx",
        full_name="Administrador",
        hashed_password=hash_password("Admin1234!"),
        role="gerencia",
    )
    db.add(admin)
    await db.commit()
    return {"message": "Admin creado: admin@freelux.mx / Admin1234!"}
