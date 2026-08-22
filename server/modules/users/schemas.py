from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from server.modules.users.models import UserRole

class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)

class UserCreate(UserBase):
    role: UserRole
    password: str = Field(..., min_length=8)

class AdminCreate(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    name: str | None = Field(None, min_length=1, max_length=255)
    is_active: bool | None = None

class UserResponse(UserBase):
    id: int
    role: UserRole
    must_change_password: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
