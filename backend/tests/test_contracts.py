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

    def test_large_page_returns_200(self, client, base_url):
        """
        Very large page number: the service clamps it to max page 1000,
        so the response is always 200 (not empty for a large database).
        """
        response = client.get(f"{base_url}/contracts?page=999999")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data


class TestContractAmountValidation:
    """Tests that amount filter parameters enforce the 100B MXN ceiling and non-negative floor."""

    def test_max_amount_above_100b_returns_422(self, client, base_url):
        """
        max_amount=150_000_000_000 (150B) exceeds the 100B MXN ceiling.
        The Query(..., le=100_000_000_000) annotation causes FastAPI to return 422.
        """
        response = client.get(
            f"{base_url}/contracts",
            params={"max_amount": 150_000_000_000},
        )
        assert response.status_code == 422, (
            f"Expected 422 for max_amount > 100B, got {response.status_code}"
        )

    def test_min_amount_negative_returns_422(self, client, base_url):
        """
        min_amount=-1 is below the ge=0 constraint — must return 422.
        """
        response = client.get(
            f"{base_url}/contracts",
            params={"min_amount": -1},
        )
        assert response.status_code == 422, (
            f"Expected 422 for min_amount < 0, got {response.status_code}"
        )

    def test_min_greater_than_max_returns_422_or_empty(self, client, base_url):
        """
        min_amount=5_000_000_000 > max_amount=1_000_000_000 is a logical contradiction.
        The API returns either 422 (validation) or 200 with empty results.
        Both are acceptable — we just verify the response is not a server error.
        """
        response = client.get(
            f"{base_url}/contracts",
            params={"min_amount": 5_000_000_000, "max_amount": 1_000_000_000},
        )
        assert response.status_code in (200, 422), (
            f"Unexpected status {response.status_code} for min > max"
        )
        if response.status_code == 200:
            data = response.json()
            assert data["data"] == [], (
                "Expected empty data when min_amount > max_amount"
            )

    def test_valid_max_amount_at_ceiling_is_accepted(self, client, base_url):
        """max_amount exactly at 100B (the ceiling) must be accepted."""
        response = client.get(
            f"{base_url}/contracts",
            params={"max_amount": 100_000_000_000},
        )
        assert response.status_code == 200

    def test_valid_amount_range_returns_data_envelope(self, client, base_url):
        """A sensible amount range must return the standard data/pagination envelope."""
        response = client.get(
            f"{base_url}/contracts",
            params={"min_amount": 1_000_000, "max_amount": 10_000_000},
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
