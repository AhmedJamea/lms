from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from server.core.config import settings

# Create async engine for SQLite (disable same_thread check for SQLite connection sharing)
engine = create_async_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

# Async session maker
SessionLocal = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False
)

# Base model class for SQLAlchemy models
class Base(DeclarativeBase):
    pass

# Dependency to get db session in FastAPI routes
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# Database and seed initialization
async def init_db() -> None:
    # Import models to register them with metadata
    from server.modules.users.models import User, UserRole
    try:
        from server.modules.academic.models import Grade, Course, StudentEnrolment, TimetableSlot, ExamSchedule, CourseGrade
        from server.modules.payments.models import TuitionPayment
        from server.modules.attendance.models import StudentAttendance, StaffAbsence
        from server.modules.payroll.models import StaffSalaryConfig, SalaryPaymentRecord
    except ImportError:
        pass
    from server.core.security import hash_password
    from sqlalchemy import select, text
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        try:
            await conn.execute(text("ALTER TABLE courses ADD COLUMN credits INTEGER DEFAULT 3"))
        except Exception:
            pass
        
    async with SessionLocal() as session:
        result = await session.execute(select(User).limit(1))

        if not result.scalars().first():
            super_admin = User(
                email="superadmin@lms.com",
                name="Super Admin",
                password_hash=hash_password("SuperAdmin123!"),
                role=UserRole.SUPER_ADMIN.value,
                must_change_password=True,
                is_active=True
            )
            session.add(super_admin)
            await session.commit()

