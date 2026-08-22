import pytest
from httpx import ASGITransport, AsyncClient
from server.core.main import app
from server.core.database import SessionLocal
from server.modules.users.models import User, UserRole

@pytest.fixture
def anyio_backend():
    return "asyncio"

@pytest.fixture(autouse=True)
async def cleanup_database():
    # Force database initialization
    from server.core.database import init_db
    await init_db()
    yield
    async with SessionLocal() as session:
        from sqlalchemy import delete
        async with session.begin():
            await session.execute(delete(User))

@pytest.fixture
async def admin_token() -> str:
    # Helper fixture to create a standard (unrestricted) token for a standard Admin
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Super Admin
        response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "superadmin@lms.com", "password": "SuperAdmin123!"}
        )
        sa_token = response.json()["access_token"]
        
        # Super Admin needs to change password first to get unrestricted access
        await ac.post(
            "/api/v1/auth/change-password",
            headers={"Authorization": f"Bearer {sa_token}"},
            json={"old_password": "SuperAdmin123!", "new_password": "SuperSecureNewPassword123!"}
        )
        
        # Login again to get standard token
        response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "superadmin@lms.com", "password": "SuperSecureNewPassword123!"}
        )
        sa_unrestricted_token = response.json()["access_token"]
        
        # 2. Create a standard Admin
        admin_data = {
            "email": "admin_test@lms.com",
            "name": "Admin Test",
            "password": "TemporaryAdminPass123!"
        }
        response = await ac.post(
            "/api/v1/admins",
            headers={"Authorization": f"Bearer {sa_unrestricted_token}"},
            json=admin_data
        )
        
        # 3. Login as standard Admin (restricted scope)
        response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "admin_test@lms.com", "password": "TemporaryAdminPass123!"}
        )
        admin_restricted_token = response.json()["access_token"]
        
        # 4. Change standard Admin password
        await ac.post(
            "/api/v1/auth/change-password",
            headers={"Authorization": f"Bearer {admin_restricted_token}"},
            json={"old_password": "TemporaryAdminPass123!", "new_password": "AdminSecurePassword123!"}
        )
        
        # 5. Login to get unrestricted standard token
        response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "admin_test@lms.com", "password": "AdminSecurePassword123!"}
        )
        return response.json()["access_token"]

@pytest.mark.anyio
async def test_user_crud_workflow(admin_token: str):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # 1. List users initially (should be empty)
        response = await ac.get("/api/v1/users", headers=headers)
        assert response.status_code == 200
        assert len(response.json()) == 0
        
        # 2. Create a Student
        student_data = {
            "email": "student1@lms.com",
            "name": "Student Bob",
            "role": "STUDENT",
            "password": "TempStudentPass123!"
        }
        response = await ac.post("/api/v1/users", headers=headers, json=student_data)
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "student1@lms.com"
        assert data["role"] == "STUDENT"
        assert data["must_change_password"] is True
        student_id = data["id"]
        
        # 3. Create a Teacher
        teacher_data = {
            "email": "teacher1@lms.com",
            "name": "Teacher Jane",
            "role": "TEACHER",
            "password": "TempTeacherPass123!"
        }
        response = await ac.post("/api/v1/users", headers=headers, json=teacher_data)
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "teacher1@lms.com"
        assert data["role"] == "TEACHER"
        teacher_id = data["id"]
        
        # 4. List all users
        response = await ac.get("/api/v1/users", headers=headers)
        assert response.status_code == 200
        users_list = response.json()
        assert len(users_list) == 2
        
        # 5. List with role filtering
        response = await ac.get("/api/v1/users?role=STUDENT", headers=headers)
        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["id"] == student_id
        
        # 6. Update student details
        update_data = {
            "name": "Student Bob Updated",
            "is_active": False
        }
        response = await ac.put(f"/api/v1/users/{student_id}", headers=headers, json=update_data)
        assert response.status_code == 200
        assert response.json()["name"] == "Student Bob Updated"
        assert response.json()["is_active"] is False
        
        # 7. Delete student
        response = await ac.delete(f"/api/v1/users/{student_id}", headers=headers)
        assert response.status_code == 200
        assert response.json()["message"] == "User deleted successfully"
        
        # List users (only teacher should remain)
        response = await ac.get("/api/v1/users", headers=headers)
        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["id"] == teacher_id

@pytest.mark.anyio
async def test_student_first_login_flow(admin_token: str):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create a Student
        response = await ac.post(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "email": "student_flow@lms.com",
                "name": "Student Flow",
                "role": "STUDENT",
                "password": "TempStudentPass123!"
            }
        )
        assert response.status_code == 201
        
        # 1. Login with temporary password
        response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "student_flow@lms.com", "password": "TempStudentPass123!"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["must_change_password"] is True
        assert data["refresh_token"] is None
        restricted_token = data["access_token"]
        
        # Try to access a standard user endpoint (should block)
        response = await ac.get("/api/v1/users", headers={"Authorization": f"Bearer {restricted_token}"})
        assert response.status_code == 403
        
        # 2. Change password
        response = await ac.post(
            "/api/v1/auth/change-password",
            headers={"Authorization": f"Bearer {restricted_token}"},
            json={"old_password": "TempStudentPass123!", "new_password": "StudentNewSecurePass123!"}
        )
        assert response.status_code == 200
        
        # 3. Login again with new password
        response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "student_flow@lms.com", "password": "StudentNewSecurePass123!"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["must_change_password"] is False
        assert data["refresh_token"] is not None
