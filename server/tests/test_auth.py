import pytest
from httpx import ASGITransport, AsyncClient
from server.core.main import app
from server.core.database import SessionLocal
from server.modules.users.models import User, UserRole
from server.core.security import hash_password

# Use ASGI transport for testing the app directly
@pytest.fixture
def anyio_backend():
    return "asyncio"

@pytest.fixture(autouse=True)
async def cleanup_database():
    # Force database initialization (tables and seed) in case lifespan is not triggered by HTTPX
    from server.core.database import init_db
    await init_db()
    yield
    # Cleanup logic after each test (optional for SQLite in-memory, but good for local file DB)
    async with SessionLocal() as session:
        # Delete all users to allow a clean re-seed
        from sqlalchemy import delete
        async with session.begin():
            await session.execute(delete(User))



@pytest.mark.anyio
async def test_super_admin_first_login_forces_password_change():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:

        # 1. Attempt login with predefined credentials
        response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "superadmin@lms.com", "password": "SuperAdmin123!"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["must_change_password"] is True
        assert data["refresh_token"] is None
        
        token = data["access_token"]
        
        # 2. Try to access health check or dashboard (standard endpoints should block standard requests if token restricted)
        # Wait, the health endpoint doesn't require auth, but let's test a restricted endpoint like listing admins
        response = await ac.get(
            "/api/v1/admins",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403
        assert "Password change required" in response.json()["detail"]
        
        # 3. Change password successfully
        response = await ac.post(
            "/api/v1/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={"old_password": "SuperAdmin123!", "new_password": "SuperSecureNewPassword123!"}
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Password changed successfully"
        
        # 4. Login again with new password
        response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "superadmin@lms.com", "password": "SuperSecureNewPassword123!"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["must_change_password"] is False
        assert data["refresh_token"] is not None
        
        token = data["access_token"]
        
        # 5. Admin management should now be accessible
        response = await ac.get(
            "/api/v1/admins",
            headers={"Authorization": f"Bearer {token}"}
        )
        # It should return 200 (empty list or list containing admins)
        assert response.status_code == 200
