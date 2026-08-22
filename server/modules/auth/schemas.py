from pydantic import BaseModel, EmailStr, Field

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    role: str
    must_change_password: bool

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)

class RefreshRequest(BaseModel):
    refresh_token: str
