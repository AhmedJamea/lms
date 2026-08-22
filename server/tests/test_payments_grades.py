import pytest
from datetime import date, datetime, timedelta
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete

from server.core.main import app
from server.core.database import SessionLocal, init_db
from server.core.security import hash_password
from server.modules.users.models import User, UserRole
from server.modules.academic.models import Grade, Course, StudentEnrolment, CourseGrade, TimetableSlot
from server.modules.payments.models import TuitionPayment

@pytest.fixture
def anyio_backend():
    return "asyncio"

@pytest.fixture(autouse=True)
async def seed_payments_grades_test_data():
    await init_db()
    
    async with SessionLocal() as session:
        async with session.begin():
            # Clean up all existing tables
            await session.execute(delete(TuitionPayment))
            await session.execute(delete(CourseGrade))
            await session.execute(delete(TimetableSlot))
            await session.execute(delete(Course))
            await session.execute(delete(StudentEnrolment))
            await session.execute(delete(Grade))
            await session.execute(delete(User).filter(User.email != "superadmin@lms.com"))

            # Create standard users
            admin = User(
                email="admin@lms.com",
                name="System Admin",
                password_hash=hash_password("Password123!"),
                role=UserRole.ADMIN.value,
                must_change_password=False,
                is_active=True
            )
            teacher = User(
                email="teacher@lms.com",
                name="Teacher Jane",
                password_hash=hash_password("Password123!"),
                role=UserRole.TEACHER.value,
                must_change_password=False,
                is_active=True
            )
            student = User(
                email="student@lms.com",
                name="Student Bob",
                password_hash=hash_password("Password123!"),
                role=UserRole.STUDENT.value,
                must_change_password=False,
                is_active=True
            )
            session.add_all([admin, teacher, student])

    yield

    async with SessionLocal() as session:
        async with session.begin():
            await session.execute(delete(TuitionPayment))
            await session.execute(delete(CourseGrade))
            await session.execute(delete(TimetableSlot))
            await session.execute(delete(Course))
            await session.execute(delete(StudentEnrolment))
            await session.execute(delete(Grade))
            await session.execute(delete(User).filter(User.email != "superadmin@lms.com"))


async def get_tokens(ac: AsyncClient) -> dict[str, str]:
    tokens = {}
    for role in ["admin", "teacher", "student"]:
        res = await ac.post(
            "/api/v1/auth/login",
            json={"email": f"{role}@lms.com", "password": "Password123!"}
        )
        tokens[role] = res.json()["access_token"]
    return tokens


@pytest.mark.anyio
async def test_student_transcript_generation_and_gpa_math():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        tokens = await get_tokens(ac)
        admin_hdr = {"Authorization": f"Bearer {tokens['admin']}"}
        student_hdr = {"Authorization": f"Bearer {tokens['student']}"}
        
        # 1. Setup Grade and Courses with credits
        res = await ac.post(
            "/api/v1/academic/grades",
            headers=admin_hdr,
            json={"name": "Grade 10-A", "level": 10, "academic_year": "2026-2027"}
        )
        grade_id = res.json()["id"]

        async with SessionLocal() as session:
            from sqlalchemy import select
            student_user = (await session.execute(select(User).filter(User.email == "student@lms.com"))).scalars().first()
            teacher_user = (await session.execute(select(User).filter(User.email == "teacher@lms.com"))).scalars().first()
            student_id = student_user.id
            teacher_id = teacher_user.id

        # Enroll student
        await ac.post(
            "/api/v1/academic/enrolments",
            headers=admin_hdr,
            json={"student_id": student_id, "grade_id": grade_id}
        )

        # Create two courses (MATH credit = 4, SCI credit = 3)
        res = await ac.post(
            "/api/v1/academic/courses",
            headers=admin_hdr,
            json={"name": "Algebra II", "code": "MATH-201", "grade_id": grade_id, "teacher_id": teacher_id}
        )
        course1_id = res.json()["id"]

        # Directly update credits in DB for testing different credit weights
        async with SessionLocal() as session:
            async with session.begin():
                c1 = await session.get(Course, course1_id)
                c1.credits = 4
                session.add(c1)

        res = await ac.post(
            "/api/v1/academic/courses",
            headers=admin_hdr,
            json={"name": "Biology I", "code": "SCI-101", "grade_id": grade_id, "teacher_id": teacher_id}
        )
        course2_id = res.json()["id"]

        async with SessionLocal() as session:
            async with session.begin():
                c2 = await session.get(Course, course2_id)
                c2.credits = 3
                session.add(c2)

        # 2. Record Grades (Student Bob gets A = 4.0 in MATH, B = 3.0 in SCI)
        res = await ac.post(
            "/api/v1/academic/course-grades",
            headers=admin_hdr,
            json={"student_id": student_id, "course_id": course1_id, "grade_value": "A", "gpa_points": 4.0}
        )
        assert res.status_code == 201

        res = await ac.post(
            "/api/v1/academic/course-grades",
            headers=admin_hdr,
            json={"student_id": student_id, "course_id": course2_id, "grade_value": "B", "gpa_points": 3.0}
        )
        assert res.status_code == 201

        # 3. Retrieve Transcript & Check GPA:
        # Expected GPA = ((4.0 * 4) + (3.0 * 3)) / (4 + 3) = (16.0 + 9.0) / 7 = 25.0 / 7 = 3.57
        res = await ac.get("/api/v1/academic/student/transcript", headers=student_hdr)
        assert res.status_code == 200
        data = res.json()
        assert data["student_name"] == "Student Bob"
        assert data["cumulative_gpa"] == 3.57
        assert len(data["grades"]) == 2


@pytest.mark.anyio
async def test_payment_lockout_and_timetabling_gating():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        tokens = await get_tokens(ac)
        admin_hdr = {"Authorization": f"Bearer {tokens['admin']}"}
        student_hdr = {"Authorization": f"Bearer {tokens['student']}"}
        
        # 1. Setup Grade and Student
        res = await ac.post(
            "/api/v1/academic/grades",
            headers=admin_hdr,
            json={"name": "Grade 10-A", "level": 10, "academic_year": "2026-2027"}
        )
        grade_id = res.json()["id"]

        async with SessionLocal() as session:
            from sqlalchemy import select
            student_user = (await session.execute(select(User).filter(User.email == "student@lms.com"))).scalars().first()
            student_id = student_user.id

        await ac.post(
            "/api/v1/academic/enrolments",
            headers=admin_hdr,
            json={"student_id": student_id, "grade_id": grade_id}
        )

        # Check default status (should be Good Standing, returns empty lists but 200)
        res = await ac.get("/api/v1/academic/student/timetable", headers=student_hdr)
        assert res.status_code == 200

        # 2. Issue an overdue invoice (due date in past)
        past_date = (date.today() - timedelta(days=5)).isoformat()
        res = await ac.post(
            "/api/v1/payments/invoices",
            headers=admin_hdr,
            json={"student_id": student_id, "amount": 1000.0, "due_date": past_date, "billing_period": "Fall 2026"}
        )
        assert res.status_code == 201
        payment_id = res.json()["id"]

        # Check payment status endpoint
        res = await ac.get("/api/v1/payments/student/status", headers=student_hdr)
        assert res.status_code == 200
        assert res.json()["standing"] == "RESTRICTED"
        assert res.json()["total_balance"] == 1000.0

        # 3. Request academic timetable -> Must return 403 Forbidden with PAYMENT_REQUIRED
        res = await ac.get("/api/v1/academic/student/timetable", headers=student_hdr)
        assert res.status_code == 403
        assert res.json()["detail"] == "PAYMENT_REQUIRED"

        # 4. Request student transcript -> Must return 403 Forbidden with PAYMENT_REQUIRED
        res = await ac.get("/api/v1/academic/student/transcript", headers=student_hdr)
        assert res.status_code == 403
        assert res.json()["detail"] == "PAYMENT_REQUIRED"


@pytest.mark.anyio
async def test_admin_manual_payment_reconciliation_reloads_standing():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        tokens = await get_tokens(ac)
        admin_hdr = {"Authorization": f"Bearer {tokens['admin']}"}
        student_hdr = {"Authorization": f"Bearer {tokens['student']}"}
        
        # 1. Setup Grade and Student
        res = await ac.post(
            "/api/v1/academic/grades",
            headers=admin_hdr,
            json={"name": "Grade 10-A", "level": 10, "academic_year": "2026-2027"}
        )
        grade_id = res.json()["id"]

        async with SessionLocal() as session:
            from sqlalchemy import select
            student_user = (await session.execute(select(User).filter(User.email == "student@lms.com"))).scalars().first()
            student_id = student_user.id

        await ac.post(
            "/api/v1/academic/enrolments",
            headers=admin_hdr,
            json={"student_id": student_id, "grade_id": grade_id}
        )

        # Issue overdue invoice
        past_date = (date.today() - timedelta(days=1)).isoformat()
        res = await ac.post(
            "/api/v1/payments/invoices",
            headers=admin_hdr,
            json={"student_id": student_id, "amount": 1200.0, "due_date": past_date, "billing_period": "Fall 2026"}
        )
        payment_id = res.json()["id"]

        # Confirm student is blocked
        res = await ac.get("/api/v1/academic/student/timetable", headers=student_hdr)
        assert res.status_code == 403

        # 2. Admin reconciles the payment
        res = await ac.post(
            f"/api/v1/payments/reconcile/{payment_id}",
            headers=admin_hdr,
            json={"notes": "Received bank receipt #4902"}
        )
        assert res.status_code == 200
        assert res.json()["status"] == "PAID"
        assert res.json()["notes"] == "Received bank receipt #4902"
        assert res.json()["reconciled_by_id"] is not None

        # 3. Confirm student standing transitions to GOOD_STANDING and timetable unlocks
        res = await ac.get("/api/v1/payments/student/status", headers=student_hdr)
        assert res.status_code == 200
        assert res.json()["standing"] == "GOOD_STANDING"
        assert res.json()["total_balance"] == 0.0

        res = await ac.get("/api/v1/academic/student/timetable", headers=student_hdr)
        assert res.status_code == 200
