from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server.core.database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables and seed Super-Admin
    await init_db()
    yield

app = FastAPI(
    title="LMS User Management API",
    description="Backend API for LMS authentication, forced password reset, and user CRUD.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes (will import routers here once implemented)
from server.modules.auth.router import router as auth_router
from server.modules.users.router import router as users_router
from server.modules.academic.router import router as academic_router
from server.modules.payments.router import router as payments_router
from server.modules.attendance.router import router as attendance_router
from server.modules.payroll.router import router as payroll_router

app.include_router(auth_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(academic_router, prefix="/api/v1")
app.include_router(payments_router, prefix="/api/v1")
app.include_router(attendance_router, prefix="/api/v1")
app.include_router(payroll_router, prefix="/api/v1")



@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}

