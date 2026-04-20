"""
Pytest fixtures for API tests.
"""
import pytest
from fastapi.testclient import TestClient

from api.main import app


@pytest.fixture(scope="module")
def client():
    """Create a test client for the FastAPI app."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="module")
def base_url():
    """Base URL for API v1 endpoints."""
    return "/api/v1"


@pytest.fixture(scope="module")
def authed_client(base_url):
    """Test client with a registered + logged-in test user JWT injected."""
    with TestClient(app) as test_client:
        import uuid
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        password = "TestPass123!"
        test_client.post(f"{base_url}/auth/register", json={
            "email": email, "password": password, "name": "Test User"
        })
        resp = test_client.post(f"{base_url}/auth/login", json={
            "email": email, "password": password
        })
        token = resp.json().get("access_token", "")
        test_client.headers.update({"Authorization": f"Bearer {token}"})
        yield test_client
