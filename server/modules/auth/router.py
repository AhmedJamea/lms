from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from server.core.database import get_db
from server.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user_restricted,
)
from server.modules.auth.schemas import (
    LoginRequest,
    LoginResponse,
    ChangePasswordRequest,
    RefreshRequest,
)
from server.modules.users.models import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.email == payload.email))
    user = result.scalars().first()
    
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is inactive",
        )
        
    if user.must_change_password:
        access_token = create_access_token(data={"sub": user.email, "scope": "restricted"})
        return LoginResponse(
            access_token=access_token,
            refresh_token=None,
            role=user.role,
            must_change_password=True,
        )
    else:
        access_token = create_access_token(data={"sub": user.email, "scope": "standard"})
        refresh_token = create_refresh_token(data={"sub": user.email})
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            role=user.role,
            must_change_password=False,
        )

@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user_restricted),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(payload.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect old password",
        )
        
    # Password complexity check: must be at least 8 characters, contain at least 1 number and 1 special character
    password = payload.new_password
    if len(password) < 8 or not any(c.isdigit() for c in password) or not any(not c.isalnum() for c in password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters long and contain at least 1 number and 1 special character.",
        )
        
    current_user.password_hash = hash_password(password)
    current_user.must_change_password = False
    
    # Save the updated user
    db.add(current_user)
    await db.commit()
    
    return {"message": "Password changed successfully"}

@router.post("/refresh")
async def refresh(payload: RefreshRequest):
    # Decode token checks for expiration/validity
    token_payload = decode_token(payload.refresh_token, is_refresh=True)
    email = token_payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token payload",
        )
        
    new_access_token = create_access_token(data={"sub": email, "scope": "standard"})
    return {"access_token": new_access_token}
