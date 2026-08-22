import pytest
from httpx import ASGITransport, AsyncClient
from server.core.main import app
from server.core.database import SessionLocal
from server.modules.users.models import User, UserRole
from server.core.security import hash_password

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
async def superadmin_token() -> str:
    # Helper fixture to get a standard (unrestricted) token for Super Admin
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login with temporary password
        response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "superadmin@lms.com", "password": "SuperAdmin123!"}
        )
        data = response.json()
        token = data["access_token"]
        
        # 2. Change password
        await ac.post(
            "/api/v1/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={"old_password": "SuperAdmin123!", "new_password": "SuperSecureNewPassword123!"}
        )
        
        # 3. Login with new password
        response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "superadmin@lms.com", "password": "SuperSecureNewPassword123!"}
        )
        return response.json()["access_token"]

@pytest.mark.anyio
async def test_admin_crud_workflow(superadmin_token: str):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {superadmin_token}"}
        
        # 1. List admins initially (should be empty, since Super Admin is super_admin, not admin)
        response = await ac.get("/api/v1/admins", headers=headers)
        assert response.status_code == 200
        assert len(response.json()) == 0
        
        # 2. Create standard admin
        admin_data = {
            "email": "admin1@lms.com",
            "name": "Admin One",
            "password": "TemporaryAdminPass123!"
        }
        response = await ac.post("/api/v1/admins", headers=headers, json=admin_data)
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "admin1@lms.com"
        assert data["name"] == "Admin One"
        assert data["role"] == "ADMIN"
        assert data["must_change_password"] is True
        assert data["is_active"] is True
        admin_id = data["id"]
        
        # 3. List admins again (should contain the new admin)
        response = await ac.get("/api/v1/admins", headers=headers)
        assert response.status_code == 200
        admins_list = response.json()
        assert len(admins_list) == 1
        assert admins_list[0]["id"] == admin_id
        
        # 4. Update the admin
        update_data = {
            "name": "Admin One Updated",
            "is_active": False
        }
        response = await ac.put(f"/api/v1/admins/{admin_id}", headers=headers, json=update_data)
        assert response.status_code == 200
        assert response.json()["name"] == "Admin One Updated"
        assert response.json()["is_active"] is False
        
        # 5. Delete the admin
        response = await ac.delete(f"/api/v1/admins/{admin_id}", headers=headers)
        assert response.status_code == 200
        assert response.json()["message"] == "Admin deleted successfully"
        
        # 6. List admins (should be empty again)
        response = await ac.get("/api/v1/admins", headers=headers)
        assert response.status_code == 200
        assert len(response.json()) == 0

@pytest.mark.anyio
async def test_admin_crud_authorization_restrictions(superadmin_token: str):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create an admin account first to test with
        headers = {"Authorization": f"Bearer {superadmin_token}"}
        admin_data = {
            "email": "admin_test@lms.com",
            "name": "Admin Test",
            "password": "TemporaryAdminPass123!"
        }
        response = await ac.post("/api/v1/admins", headers=headers, json=admin_data)
        assert response.status_code == 201
        admin_id = response.json()["id"]
        
        # 1. Login as the new Admin (must_change_password=True, so token is restricted)
        response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "admin_test@lms.com", "password": "TemporaryAdminPass123!"}
        )
        restricted_token = response.json()["access_token"]
        
        # Try to list admins with restricted token -> 403 Forbidden
        response = await ac.get("/api/v1/admins", headers={"Authorization": f"Bearer {restricted_token}"})
        assert response.status_code == 403
        
        # 2. Change password to get standard token
        response = await ac.post(
            "/api/v1/auth/change-password",
            headers={"Authorization": f"Bearer {restricted_token}"},
            json={"old_password": "TemporaryAdminPass123!", "new_password": "AdminSecurePassword123!"}
        )
        assert response.status_code == 200
        
        # Login to get standard token
        response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "admin_test@lms.com", "password": "AdminSecurePassword123!"}
        )
        admin_standard_token = response.json()["access_token"]
        
        # Try to list admins with Admin standard token -> 403 Forbidden (Only SUPER_ADMIN can manage admins)
        response = await ac.get("/api/v1/admins", headers={"Authorization": f"Bearer {admin_standard_token}"})
        assert response.status_code == 403
