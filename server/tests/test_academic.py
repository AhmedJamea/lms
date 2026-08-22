import pytest
from datetime import date
from httpx import ASGITransport, AsyncClient
from server.core.main import app
from server.core.database import SessionLocal
from server.modules.users.models import User, UserRole
from server.core.security import hash_password
from server.modules.academic.models import Grade, Course, StudentEnrolment, TimetableSlot, ExamSchedule
from sqlalchemy import delete

@pytest.fixture
def anyio_backend():
    return "asyncio"

@pytest.fixture(autouse=True)
async def seed_academic_users():
    # Force database initialization (tables and seed)
    from server.core.database import init_db
    await init_db()
    
    # Create test users with standard passwords
    async with SessionLocal() as session:
        async with session.begin():
            # Delete existing test data first
            await session.execute(delete(ExamSchedule))
            await session.execute(delete(TimetableSlot))
            await session.execute(delete(Course))
            await session.execute(delete(StudentEnrolment))
            await session.execute(delete(Grade))
            await session.execute(delete(User).filter(User.email != "superadmin@lms.com"))
            
            # Create users
            admin = User(
                email="admin@lms.com",
                name="Standard Admin",
                password_hash=hash_password("Password123!"),
                role=UserRole.ADMIN.value,
                must_change_password=False,
                is_active=True
            )
            teacher = User(
                email="teacher@lms.com",
                name="Professor Jane",
                password_hash=hash_password("Password123!"),
                role=UserRole.TEACHER.value,
                must_change_password=False,
                is_active=True
            )
            student = User(
                email="student@lms.com",
                name="Bobby Student",
                password_hash=hash_password("Password123!"),
                role=UserRole.STUDENT.value,
                must_change_password=False,
                is_active=True
            )
            student2 = User(
                email="student2@lms.com",
                name="Alice Student",
                password_hash=hash_password("Password123!"),
                role=UserRole.STUDENT.value,
                must_change_password=False,
                is_active=True
            )
            session.add_all([admin, teacher, student, student2])
    yield
    
    # Cleanup after test
    async with SessionLocal() as session:
        async with session.begin():
            await session.execute(delete(ExamSchedule))
            await session.execute(delete(TimetableSlot))
            await session.execute(delete(Course))
            await session.execute(delete(StudentEnrolment))
            await session.execute(delete(Grade))
            await session.execute(delete(User).filter(User.email != "superadmin@lms.com"))


async def get_tokens(ac: AsyncClient) -> dict[str, str]:
    roles = ["admin", "teacher", "student"]
    tokens = {}
    for role in roles:
        res = await ac.post(
            "/api/v1/auth/login",
            json={"email": f"{role}@lms.com", "password": "Password123!"}
        )
        tokens[role] = res.json()["access_token"]
    return tokens


@pytest.mark.anyio
async def test_grade_crud_and_permissions():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        tokens = await get_tokens(ac)
        admin_hdr = {"Authorization": f"Bearer {tokens['admin']}"}
        student_hdr = {"Authorization": f"Bearer {tokens['student']}"}
        
        # 1. Admin creates a Grade
        res = await ac.post(
            "/api/v1/academic/grades",
            headers=admin_hdr,
            json={"name": "Grade 10-A", "level": 10, "academic_year": "2026-2027"}
        )
        assert res.status_code == 201
        grade_id = res.json()["id"]
        assert res.json()["name"] == "Grade 10-A"
        
        # 2. Student fails to create a Grade (403)
        res = await ac.post(
            "/api/v1/academic/grades",
            headers=student_hdr,
            json={"name": "Grade 11-A", "level": 11, "academic_year": "2026-2027"}
        )
        assert res.status_code == 403
        
        # 3. Admin updates Grade details
        res = await ac.put(
            f"/api/v1/academic/grades/{grade_id}",
            headers=admin_hdr,
            json={"name": "Grade 10-B", "level": 10, "academic_year": "2026-2027"}
        )
        assert res.status_code == 200
        assert res.json()["name"] == "Grade 10-B"
        
        # 4. Admin lists Grades
        res = await ac.get("/api/v1/academic/grades", headers=admin_hdr)
        assert res.status_code == 200
        assert len(res.json()) == 1


@pytest.mark.anyio
async def test_course_creation_and_role_guards():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        tokens = await get_tokens(ac)
        admin_hdr = {"Authorization": f"Bearer {tokens['admin']}"}
        
        # Pre-requisite: Create a Grade
        res = await ac.post(
            "/api/v1/academic/grades",
            headers=admin_hdr,
            json={"name": "Grade 10-A", "level": 10, "academic_year": "2026-2027"}
        )
        grade_id = res.json()["id"]
        
        # Find User IDs
        async with SessionLocal() as session:
            from sqlalchemy import select
            teacher_user = (await session.execute(select(User).filter(User.email == "teacher@lms.com"))).scalars().first()
            student_user = (await session.execute(select(User).filter(User.email == "student@lms.com"))).scalars().first()
            teacher_id = teacher_user.id
            student_id = student_user.id
            
        # 1. Admin creates Course assigning Teacher successfully
        res = await ac.post(
            "/api/v1/academic/courses",
            headers=admin_hdr,
            json={"name": "Algebra II", "code": "MATH-201", "grade_id": grade_id, "teacher_id": teacher_id}
        )
        assert res.status_code == 201
        assert res.json()["teacher_name"] == "Professor Jane"
        
        # 2. Admin fails to assign a Student to lead the Course (400)
        res = await ac.post(
            "/api/v1/academic/courses",
            headers=admin_hdr,
            json={"name": "Algebra II", "code": "MATH-201", "grade_id": grade_id, "teacher_id": student_id}
        )
        assert res.status_code == 400
        assert "Assigned user is not a Teacher" in res.json()["detail"]


@pytest.mark.anyio
async def test_student_enrolment_rules():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        tokens = await get_tokens(ac)
        admin_hdr = {"Authorization": f"Bearer {tokens['admin']}"}
        
        # Create Grade
        res = await ac.post(
            "/api/v1/academic/grades",
            headers=admin_hdr,
            json={"name": "Grade 10-A", "level": 10, "academic_year": "2026-2027"}
        )
        grade_id = res.json()["id"]
        
        # Find User IDs
        async with SessionLocal() as session:
            from sqlalchemy import select
            teacher_user = (await session.execute(select(User).filter(User.email == "teacher@lms.com"))).scalars().first()
            student_user = (await session.execute(select(User).filter(User.email == "student@lms.com"))).scalars().first()
            teacher_id = teacher_user.id
            student_id = student_user.id
            
        # 1. Enroll Student successfully
        res = await ac.post(
            "/api/v1/academic/enrolments",
            headers=admin_hdr,
            json={"student_id": student_id, "grade_id": grade_id}
        )
        assert res.status_code == 201
        
        # 2. Reject double enrolment (400)
        res = await ac.post(
            "/api/v1/academic/enrolments",
            headers=admin_hdr,
            json={"student_id": student_id, "grade_id": grade_id}
        )
        assert res.status_code == 400
        assert "Student is already enrolled in a Grade" in res.json()["detail"]
        
        # 3. Reject enrolling a Teacher (400)
        res = await ac.post(
            "/api/v1/academic/enrolments",
            headers=admin_hdr,
            json={"student_id": teacher_id, "grade_id": grade_id}
        )
        assert res.status_code == 400
        assert "Target user is not a Student" in res.json()["detail"]


@pytest.mark.anyio
async def test_timetable_and_exam_overlaps():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        tokens = await get_tokens(ac)
        admin_hdr = {"Authorization": f"Bearer {tokens['admin']}"}
        
        # Setup Grades, Courses and Teachers
        res = await ac.post(
            "/api/v1/academic/grades",
            headers=admin_hdr,
            json={"name": "Grade 10-A", "level": 10, "academic_year": "2026-2027"}
        )
        grade1_id = res.json()["id"]
        
        res = await ac.post(
            "/api/v1/academic/grades",
            headers=admin_hdr,
            json={"name": "Grade 11-A", "level": 11, "academic_year": "2026-2027"}
        )
        grade2_id = res.json()["id"]
        
        async with SessionLocal() as session:
            from sqlalchemy import select
            teacher_user = (await session.execute(select(User).filter(User.email == "teacher@lms.com"))).scalars().first()
            teacher_id = teacher_user.id
            
        res = await ac.post(
            "/api/v1/academic/courses",
            headers=admin_hdr,
            json={"name": "Algebra II", "code": "MATH-201", "grade_id": grade1_id, "teacher_id": teacher_id}
        )
        course1_id = res.json()["id"]
        
        res = await ac.post(
            "/api/v1/academic/courses",
            headers=admin_hdr,
            json={"name": "Biology I", "code": "SCI-101", "grade_id": grade2_id, "teacher_id": teacher_id}
        )
        course2_id = res.json()["id"]
        
        # 1. Admin schedules a weekly TimetableSlot
        res = await ac.post(
            "/api/v1/academic/timetables",
            headers=admin_hdr,
            json={"course_id": course1_id, "day_of_week": "Monday", "start_time": "09:00", "end_time": "10:30", "room": "Room 101"}
        )
        assert res.status_code == 201
        
        # 2. Reject room booking conflict (same time, same room)
        res = await ac.post(
            "/api/v1/academic/timetables",
            headers=admin_hdr,
            json={"course_id": course2_id, "day_of_week": "Monday", "start_time": "09:30", "end_time": "11:00", "room": "Room 101"}
        )
        assert res.status_code == 400
        assert "Room is already booked for this time slot" in res.json()["detail"]
        
        # 3. Reject teacher conflict (same teacher scheduled in different room at overlapping times)
        res = await ac.post(
            "/api/v1/academic/timetables",
            headers=admin_hdr,
            json={"course_id": course2_id, "day_of_week": "Monday", "start_time": "10:00", "end_time": "11:30", "room": "Room 202"}
        )
        assert res.status_code == 400
        assert "Teacher is already scheduled for another class in this time slot" in res.json()["detail"]
        
        # 4. Schedule Exam Schedule
        res = await ac.post(
            "/api/v1/academic/exams",
            headers=admin_hdr,
            json={"course_id": course1_id, "name": "Algebra Midterm", "exam_date": "2026-06-25", "start_time": "10:00", "end_time": "12:00", "room": "Main Hall"}
        )
        assert res.status_code == 201
        
        # 5. Reject exam overlap in same room
        res = await ac.post(
            "/api/v1/academic/exams",
            headers=admin_hdr,
            json={"course_id": course2_id, "name": "Biology Midterm", "exam_date": "2026-06-25", "start_time": "11:00", "end_time": "13:00", "room": "Main Hall"}
        )
        assert res.status_code == 400
        assert "Exam room is already booked for this date and time slot" in res.json()["detail"]


@pytest.mark.anyio
async def test_student_read_only_timetable_dashboard():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        tokens = await get_tokens(ac)
        admin_hdr = {"Authorization": f"Bearer {tokens['admin']}"}
        student_hdr = {"Authorization": f"Bearer {tokens['student']}"}
        
        # Setup Grade, Course, TimetableSlot, Exam and Enrolment
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
            
        # Enroll Student
        await ac.post(
            "/api/v1/academic/enrolments",
            headers=admin_hdr,
            json={"student_id": student_id, "grade_id": grade_id}
        )
        
        # Create Course
        res = await ac.post(
            "/api/v1/academic/courses",
            headers=admin_hdr,
            json={"name": "Algebra II", "code": "MATH-201", "grade_id": grade_id}
        )
        course_id = res.json()["id"]
        
        # Create Timetable
        await ac.post(
            "/api/v1/academic/timetables",
            headers=admin_hdr,
            json={"course_id": course_id, "day_of_week": "Monday", "start_time": "09:00", "end_time": "10:30", "room": "Room 101"}
        )
        
        # Create Exam
        await ac.post(
            "/api/v1/academic/exams",
            headers=admin_hdr,
            json={"course_id": course_id, "name": "Algebra Final", "exam_date": "2026-06-25", "start_time": "13:00", "end_time": "15:00", "room": "Room 101"}
        )
        
        # Student requests read-only dashboard
        res = await ac.get("/api/v1/academic/student/timetable", headers=student_hdr)
        assert res.status_code == 200
        data = res.json()
        assert data["grade"]["name"] == "Grade 10-A"
        assert len(data["timetable"]) == 1
        assert data["timetable"][0]["course_name"] == "Algebra II"
        assert len(data["exams"]) == 1
        assert data["exams"][0]["name"] == "Algebra Final"
