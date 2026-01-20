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
