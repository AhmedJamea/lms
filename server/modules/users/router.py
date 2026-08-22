from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from server.core.database import get_db
from server.core.security import RoleChecker, hash_password
from server.modules.users.models import User, UserRole
from server.modules.users.schemas import AdminCreate, UserCreate, UserUpdate, UserResponse

router = APIRouter(tags=["User Management"])

# Setup dependencies for access control
super_admin_required = RoleChecker([UserRole.SUPER_ADMIN])
admin_required = RoleChecker([UserRole.ADMIN, UserRole.SUPER_ADMIN])

# --- ADMIN MANAGEMENT (SUPER_ADMIN ONLY) ---

@router.get("/admins", response_model=list[UserResponse])
async def list_admins(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(super_admin_required),
):
    result = await db.execute(select(User).filter(User.role == UserRole.ADMIN.value))
    return result.scalars().all()

@router.post("/admins", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_admin(
    payload: AdminCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(super_admin_required),
):
    # Check duplicate email
    email_check = await db.execute(select(User).filter(User.email == payload.email))
    if email_check.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
        
    admin = User(
        email=payload.email,
        name=payload.name,
        password_hash=hash_password(payload.password),
        role=UserRole.ADMIN.value,
        must_change_password=True,
        is_active=True,
    )
    db.add(admin)
    await db.commit()
    await db.refresh(admin)
    return admin

@router.put("/admins/{admin_id}", response_model=UserResponse)
async def update_admin(
    admin_id: int,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(super_admin_required),
):
    result = await db.execute(select(User).filter(User.id == admin_id, User.role == UserRole.ADMIN.value))
    admin = result.scalars().first()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found",
        )
        
    if payload.email is not None:
        # Check duplicate if email is changing
        if payload.email != admin.email:
            email_check = await db.execute(select(User).filter(User.email == payload.email))
            if email_check.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered",
                )
        admin.email = payload.email
        
    if payload.name is not None:
        admin.name = payload.name
        
    if payload.is_active is not None:
        admin.is_active = payload.is_active
        
    db.add(admin)
    await db.commit()
    await db.refresh(admin)
    return admin

@router.delete("/admins/{admin_id}")
async def delete_admin(
    admin_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(super_admin_required),
):
    result = await db.execute(select(User).filter(User.id == admin_id, User.role == UserRole.ADMIN.value))
    admin = result.scalars().first()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found",
        )
        
    await db.delete(admin)
    await db.commit()
    return {"message": "Admin deleted successfully"}


# --- USER PROVISIONING (ADMIN & SUPER_ADMIN) ---

@router.get("/users", response_model=list[UserResponse])
async def list_users(
    role: UserRole | None = None,
    is_active: bool | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    query = select(User).filter(User.role.in_([UserRole.TEACHER.value, UserRole.STUDENT.value]))
    
    if role is not None:
        query = query.filter(User.role == role.value)
        
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
        
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    # Enforce role restriction to only Student or Teacher
    if payload.role not in [UserRole.STUDENT, UserRole.TEACHER]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only create STUDENT or TEACHER profiles",
        )
        
    # Check duplicate email
    email_check = await db.execute(select(User).filter(User.email == payload.email))
    if email_check.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
        
    user = User(
        email=payload.email,
        name=payload.name,
        password_hash=hash_password(payload.password),
        role=payload.role.value,
        must_change_password=True,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    # Fetch user, must be Student or Teacher (Admins are managed via /admins)
    result = await db.execute(select(User).filter(
        User.id == user_id, 
        User.role.in_([UserRole.TEACHER.value, UserRole.STUDENT.value])
    ))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
        
    if payload.email is not None:
        # Check duplicate if email is changing
        if payload.email != user.email:
            email_check = await db.execute(select(User).filter(User.email == payload.email))
            if email_check.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered",
                )
        user.email = payload.email
        
    if payload.name is not None:
        user.name = payload.name
        
    if payload.is_active is not None:
        user.is_active = payload.is_active
        
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    # Fetch user, must be Student or Teacher
    result = await db.execute(select(User).filter(
        User.id == user_id, 
        User.role.in_([UserRole.TEACHER.value, UserRole.STUDENT.value])
    ))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
        
    await db.delete(user)
    await db.commit()
    return {"message": "User deleted successfully"}
