import pytest
from datetime import datetime, date
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete
from server.core.main import app
from server.core.database import SessionLocal, init_db
from server.modules.users.models import User, UserRole
from server.modules.payroll.models import StaffSalaryConfig, SalaryPaymentRecord
from server.core.security import hash_password

@pytest.fixture
def anyio_backend():
    return "asyncio"

@pytest.fixture(autouse=True)
async def cleanup_database():
    await init_db()
    yield
    async with SessionLocal() as session:
        async with session.begin():
            await session.execute(delete(SalaryPaymentRecord))
            await session.execute(delete(StaffSalaryConfig))
            await session.execute(delete(User))

@pytest.fixture
async def superadmin_token() -> str:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "superadmin@lms.com", "password": "SuperAdmin123!"}
        )
        token = response.json()["access_token"]
        await ac.post(
            "/api/v1/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={"old_password": "SuperAdmin123!", "new_password": "SuperSecureNewPassword123!"}
        )
        response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "superadmin@lms.com", "password": "SuperSecureNewPassword123!"}
        )
        return response.json()["access_token"]

@pytest.fixture
async def setup_staff_users():
    async with SessionLocal() as session:
        async with session.begin():
            teacher = User(
                email="teacher@lms.com",
                name="Teacher Name",
                password_hash=hash_password("Teacher123!"),
                role=UserRole.TEACHER.value,
                must_change_password=False,
                is_active=True
            )
            admin = User(
                email="admin_staff@lms.com",
                name="Admin Name",
                password_hash=hash_password("Admin123!"),
                role=UserRole.ADMIN.value,
                must_change_password=False,
                is_active=True
            )
            inactive_teacher = User(
                email="inactive@lms.com",
                name="Inactive Teacher",
                password_hash=hash_password("Inactive123!"),
                role=UserRole.TEACHER.value,
                must_change_password=False,
                is_active=False
            )
            student = User(
                email="student@lms.com",
                name="Student Name",
                password_hash=hash_password("Student123!"),
                role=UserRole.STUDENT.value,
                must_change_password=False,
                is_active=True
            )
            session.add_all([teacher, admin, inactive_teacher, student])
        
        await session.commit()
        
        # Reload to get IDs
        from sqlalchemy import select
        db_teacher = (await session.execute(select(User).where(User.email == "teacher@lms.com"))).scalar_one()
        db_admin = (await session.execute(select(User).where(User.email == "admin_staff@lms.com"))).scalar_one()
        db_inactive = (await session.execute(select(User).where(User.email == "inactive@lms.com"))).scalar_one()
        db_student = (await session.execute(select(User).where(User.email == "student@lms.com"))).scalar_one()
        
        return {
            "teacher": db_teacher,
            "admin": db_admin,
            "inactive_teacher": db_inactive,
            "student": db_student
        }

# ─── US1 Tests: Configure Staff Base Salary ─────────────────────────────────

@pytest.mark.anyio
async def test_salary_configuration_endpoints(superadmin_token: str, setup_staff_users: dict):
    headers = {"Authorization": f"Bearer {superadmin_token}"}
    teacher = setup_staff_users["teacher"]
    admin = setup_staff_users["admin"]
    inactive_teacher = setup_staff_users["inactive_teacher"]
    student = setup_staff_users["student"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. GET initial salaries list
        response = await ac.get("/api/v1/payroll/staff/salaries", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify active teacher and admin are in list, but student and inactive teacher are not
        user_ids = [entry["user_id"] for entry in data]
        assert teacher.id in user_ids
        assert admin.id in user_ids
        assert inactive_teacher.id not in user_ids
        assert student.id not in user_ids

        # Verify base_salary is initially null
        teacher_entry = next(e for e in data if e["user_id"] == teacher.id)
        assert teacher_entry["base_salary"] is None

        # 2. PUT set base salary for teacher
        response = await ac.put(
            f"/api/v1/payroll/staff/{teacher.id}/salary",
            headers=headers,
            json={"base_salary": 5000.0}
        )
        assert response.status_code == 200
        assert response.json()["base_salary"] == 5000.0
        assert response.json()["user_id"] == teacher.id

        # 3. GET verify set salary list
        response = await ac.get("/api/v1/payroll/staff/salaries", headers=headers)
        assert response.status_code == 200
        data = response.json()
        teacher_entry = next(e for e in data if e["user_id"] == teacher.id)
        assert teacher_entry["base_salary"] == 5000.0

        # 4. Try putting invalid salary (<= 0)
        response = await ac.put(
            f"/api/v1/payroll/staff/{teacher.id}/salary",
            headers=headers,
            json={"base_salary": 0}
        )
        assert response.status_code == 422  # Pydantic validation error or 400

        response = await ac.put(
            f"/api/v1/payroll/staff/{teacher.id}/salary",
            headers=headers,
            json={"base_salary": -100}
        )
        assert response.status_code == 422

        # 5. Try putting salary for student (ineligible role)
        response = await ac.put(
            f"/api/v1/payroll/staff/{student.id}/salary",
            headers=headers,
            json={"base_salary": 3000.0}
        )
        assert response.status_code == 400

        # 6. Try putting salary for nonexistent user
        response = await ac.put(
            "/api/v1/payroll/staff/99999/salary",
            headers=headers,
            json={"base_salary": 3000.0}
        )
        assert response.status_code == 404

# ─── US2 Tests: Execute Monthly Payroll ──────────────────────────────────────

@pytest.mark.anyio
async def test_payroll_execution_endpoints(superadmin_token: str, setup_staff_users: dict):
    headers = {"Authorization": f"Bearer {superadmin_token}"}
    teacher = setup_staff_users["teacher"]
    admin = setup_staff_users["admin"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Configure salary for teacher, leave admin unconfigured
        response = await ac.put(
            f"/api/v1/payroll/staff/{teacher.id}/salary",
            headers=headers,
            json={"base_salary": 4500.0}
        )
        assert response.status_code == 200

        # 1. GET payroll list for a month
        response = await ac.get("/api/v1/payroll/list/2026-06", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify status: teacher (PENDING), admin (NOT_CONFIGURED)
        teacher_payroll = next(e for e in data if e["user_id"] == teacher.id)
        assert teacher_payroll["status"] == "PENDING"
        assert teacher_payroll["base_salary"] == 4500.0

        admin_payroll = next(e for e in data if e["user_id"] == admin.id)
        assert admin_payroll["status"] == "NOT_CONFIGURED"

        # 2. Try POST pay for unconfigured admin (should fail 400)
        response = await ac.post(
            f"/api/v1/payroll/staff/{admin.id}/pay",
            headers=headers,
            json={"payment_month": "2026-06"}
        )
        assert response.status_code == 400

        # 3. POST mark teacher as paid
        response = await ac.post(
            f"/api/v1/payroll/staff/{teacher.id}/pay",
            headers=headers,
            json={"payment_month": "2026-06"}
        )
        assert response.status_code == 201
        payment = response.json()
        assert payment["amount_paid"] == 4500.0
        assert payment["payment_month"] == "2026-06"

        # 4. GET payroll list again (verify PAID status)
        response = await ac.get("/api/v1/payroll/list/2026-06", headers=headers)
        assert response.status_code == 200
        data = response.json()
        teacher_payroll = next(e for e in data if e["user_id"] == teacher.id)
        assert teacher_payroll["status"] == "PAID"
        assert teacher_payroll["payment_id"] is not None

        # 5. POST duplicate payment (should fail 409)
        response = await ac.post(
            f"/api/v1/payroll/staff/{teacher.id}/pay",
            headers=headers,
            json={"payment_month": "2026-06"}
        )
        assert response.status_code == 409

# ─── US3 Tests: View Financial Dashboard ─────────────────────────────────────

@pytest.mark.anyio
async def test_financial_dashboard_endpoint(superadmin_token: str, setup_staff_users: dict):
    headers = {"Authorization": f"Bearer {superadmin_token}"}
    teacher = setup_staff_users["teacher"]
    admin = setup_staff_users["admin"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Set salaries
        await ac.put(f"/api/v1/payroll/staff/{teacher.id}/salary", headers=headers, json={"base_salary": 4000.0})
        await ac.put(f"/api/v1/payroll/staff/{admin.id}/salary", headers=headers, json={"base_salary": 3000.0})

        # 1. GET dashboard before any payments
        response = await ac.get("/api/v1/payroll/dashboard/2026-06", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["fees_collected"] == 0.0
        assert data["fees_pending"] == 0.0
        assert data["salaries_paid"] == 0.0
        # Both teacher (4000) and admin (3000) pending
        assert data["salaries_pending"] == 7000.0
        assert data["net_balance"] == 0.0

        # 2. Pay teacher
        await ac.post(f"/api/v1/payroll/staff/{teacher.id}/pay", headers=headers, json={"payment_month": "2026-06"})

        # 3. GET dashboard again
        response = await ac.get("/api/v1/payroll/dashboard/2026-06", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["salaries_paid"] == 4000.0
        # Only admin (3000) left pending
        assert data["salaries_pending"] == 3000.0
        # net_balance = fees_collected (0) - salaries_paid (4000) = -4000
        assert data["net_balance"] == -4000.0
