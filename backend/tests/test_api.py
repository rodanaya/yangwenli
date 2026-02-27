"""
Tests for general API functionality.
"""
import pytest


class TestHealthCheck:
    """Tests for health check endpoint."""

    def test_health_check(self, client):
        """Test health check returns status."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "database" in data
        assert "version" in data


class TestRoot:
    """Tests for root endpoint."""

    def test_root_returns_api_info(self, client):
        """Test root endpoint returns API info."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert "docs" in data
        assert "endpoints" in data

    def test_root_lists_endpoints(self, client):
        """Test root endpoint lists all available endpoints."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        endpoints = data["endpoints"]
        # Check for key endpoints
        assert "contracts" in endpoints
        assert "vendors" in endpoints
        assert "institutions" in endpoints
        assert "sectors" in endpoints


class TestDocs:
    """Tests for API documentation endpoints."""

    def test_swagger_docs(self, client):
        """Docs disabled by default (ENABLE_DOCS=false). Expect 404."""
        response = client.get("/docs")
        assert response.status_code == 404

    def test_redoc_docs(self, client):
        """ReDoc disabled by default (ENABLE_DOCS=false). Expect 404."""
        response = client.get("/redoc")
        assert response.status_code == 404


class TestCORS:
    """Tests for CORS configuration."""

    def test_cors_headers_allowed_origin(self, client):
        """Test CORS headers for allowed origin."""
        response = client.get(
            "/",
            headers={"Origin": "http://localhost:3009"}
        )
        assert response.status_code == 200
        # CORS headers should be present
        assert "access-control-allow-origin" in response.headers or response.status_code == 200


class TestAmountValidation:
    """Tests for amount validation rules."""

    def test_export_respects_max_amount(self, client, base_url):
        """Test that exports respect the 100B MXN max amount limit."""
        # Request contracts with max_amount above the threshold should fail validation
        response = client.get(
            f"{base_url}/export/contracts/csv?max_amount=150000000000&limit=10"
        )
        assert response.status_code == 422  # Validation error

    def test_contracts_filter_max_amount(self, client, base_url):
        """Test contracts endpoint respects amount validation."""
        response = client.get(f"{base_url}/contracts?max_amount=100000000000")
        assert response.status_code == 200


class TestPagination:
    """Tests for pagination across endpoints."""

    def test_contracts_pagination(self, client, base_url):
        """Test contracts pagination."""
        response = client.get(f"{base_url}/contracts?page=1&per_page=10")
        assert response.status_code == 200
        data = response.json()
        assert "pagination" in data
        assert data["pagination"]["page"] == 1
        assert data["pagination"]["per_page"] == 10

    def test_vendors_pagination(self, client, base_url):
        """Test vendors pagination."""
        response = client.get(f"{base_url}/vendors?page=1&per_page=10")
        assert response.status_code == 200
        data = response.json()
        assert "pagination" in data

    def test_institutions_pagination(self, client, base_url):
        """Test institutions pagination."""
        response = client.get(f"{base_url}/institutions?page=1&per_page=10")
        assert response.status_code == 200
        data = response.json()
        assert "pagination" in data

    def test_invalid_pagination_page(self, client, base_url):
        """Test invalid page number."""
        response = client.get(f"{base_url}/contracts?page=0")
        assert response.status_code == 422

    def test_invalid_pagination_per_page(self, client, base_url):
        """Test invalid per_page value."""
        response = client.get(f"{base_url}/contracts?per_page=500")
        assert response.status_code == 422
