from datetime import datetime, timedelta, timezone
from typing import Any
import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from server.core.config import settings
from server.core.database import get_db
from server.modules.users.models import User, UserRole

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def hash_password(password: str) -> str:
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": int(expire.timestamp())})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def create_refresh_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": int(expire.timestamp())})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_REFRESH_SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def decode_token(token: str, is_refresh: bool = False) -> dict[str, Any]:
    secret = settings.JWT_REFRESH_SECRET_KEY if is_refresh else settings.JWT_SECRET_KEY
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token signature has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Dependency to fetch the current user using standard (unrestricted) token
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    payload = decode_token(token)
    email: str | None = payload.get("sub")
    scope: str | None = payload.get("scope")
    
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Block restricted scope tokens from hitting standard routes
    if scope == "restricted":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password change required before accessing this resource",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    result = await db.execute(select(User).filter(User.email == email))
    user = result.scalars().first()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
        
    # Extra check in case DB state says must change password but token claims otherwise
    if user.must_change_password:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password change required before accessing this resource",
        )
        
    return user

# Dependency to fetch user specifically for the forced change-password route
async def get_current_user_restricted(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    payload = decode_token(token)
    email: str | None = payload.get("sub")
    scope: str | None = payload.get("scope")
    
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Must be either restricted scope or standard (in case they want to change password voluntarily)
    if scope not in ["restricted", "standard"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token scope",
        )
        
    result = await db.execute(select(User).filter(User.email == email))
    user = result.scalars().first()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
        
    return user

# Role check dependency helper
class RoleChecker:
    def __init__(self, allowed_roles: list[UserRole]):
        self.allowed_roles = [r.value for r in allowed_roles]

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user


async def check_payment_standing(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> User:
    if current_user.role == UserRole.STUDENT.value:
        from datetime import date
        from server.modules.payments.models import TuitionPayment
        
        # Query for any overdue payments
        stmt = select(TuitionPayment).filter(
            TuitionPayment.student_id == current_user.id,
            (TuitionPayment.status == "OVERDUE") |
            ((TuitionPayment.status == "PENDING") & (TuitionPayment.due_date < date.today()))
        )
        result = await db.execute(stmt)
        if result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="PAYMENT_REQUIRED"
            )
    return current_user

