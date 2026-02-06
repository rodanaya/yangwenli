"""
Tests for contract API endpoints.
"""
import pytest


class TestContractList:
    """Tests for GET /api/v1/contracts."""

    def test_list_contracts_default(self, client, base_url):
        """Test default contract listing returns paginated results."""
        response = client.get(f"{base_url}/contracts")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        assert data["pagination"]["page"] == 1
        assert data["pagination"]["per_page"] == 50

    def test_list_contracts_custom_pagination(self, client, base_url):
        """Test custom pagination parameters."""
        response = client.get(f"{base_url}/contracts?page=2&per_page=10")
        assert response.status_code == 200
        data = response.json()
        assert data["pagination"]["page"] == 2
        assert data["pagination"]["per_page"] == 10

    def test_list_contracts_filter_by_sector(self, client, base_url):
        """Test filtering contracts by sector_id."""
        response = client.get(f"{base_url}/contracts?sector_id=1")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_list_contracts_filter_by_risk_level(self, client, base_url):
        """Test filtering contracts by risk_level."""
        for level in ["critical", "high", "medium", "low"]:
            response = client.get(f"{base_url}/contracts?risk_level={level}")
            assert response.status_code == 200

    def test_list_contracts_filter_by_year(self, client, base_url):
        """Test filtering contracts by year."""
        response = client.get(f"{base_url}/contracts?year=2024")
        assert response.status_code == 200

    def test_list_contracts_search(self, client, base_url):
        """Test searching contracts."""
        response = client.get(f"{base_url}/contracts?search=pemex")
        assert response.status_code == 200

    def test_list_contracts_response_shape(self, client, base_url):
        """Test response data shape has expected fields."""
        response = client.get(f"{base_url}/contracts?per_page=1")
        assert response.status_code == 200
        data = response.json()
        if data["data"]:
            contract = data["data"][0]
            assert "id" in contract
            assert "amount_mxn" in contract or "importe_contrato" in contract


class TestContractPagination:
    """Tests for contract pagination edge cases."""

    def test_page_zero_is_invalid(self, client, base_url):
        """Page 0 should be rejected or treated as page 1."""
        response = client.get(f"{base_url}/contracts?page=0")
        # Either 422 validation error or auto-corrected to page 1
        assert response.status_code in [200, 422]

    def test_large_page_returns_empty(self, client, base_url):
        """Very large page number should return empty data."""
        response = client.get(f"{base_url}/contracts?page=999999")
        assert response.status_code == 200
        data = response.json()
        assert data["data"] == []
