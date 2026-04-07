"""
Tests for the collusion router endpoints.

Covers:
  - GET /api/v1/collusion/stats
  - GET /api/v1/collusion/pairs
  - GET /api/v1/collusion/pairs/{a}/{b}/shared-contracts
"""
import pytest


BASE = "/api/v1/collusion"


class TestCollusionStats:
    """Tests for GET /api/v1/collusion/stats."""

    def test_stats_returns_200(self, client):
        response = client.get(f"{BASE}/stats")
        assert response.status_code == 200

    def test_stats_response_shape(self, client):
        response = client.get(f"{BASE}/stats")
        data = response.json()
        assert "total_pairs" in data
        assert "potential_collusion_count" in data
        assert "total_shared_procedures" in data
        assert "max_co_bid_rate" in data

    def test_stats_field_types(self, client):
        response = client.get(f"{BASE}/stats")
        data = response.json()
        assert isinstance(data["total_pairs"], int)
        assert isinstance(data["potential_collusion_count"], int)
        assert isinstance(data["total_shared_procedures"], int)
        assert isinstance(data["max_co_bid_rate"], (int, float))

    def test_stats_non_negative_values(self, client):
        response = client.get(f"{BASE}/stats")
        data = response.json()
        assert data["total_pairs"] >= 0
        assert data["potential_collusion_count"] >= 0
        assert data["total_shared_procedures"] >= 0
        assert data["max_co_bid_rate"] >= 0


class TestCollusionPairs:
    """Tests for GET /api/v1/collusion/pairs."""

    def test_pairs_returns_200(self, client):
        response = client.get(f"{BASE}/pairs")
        assert response.status_code == 200

    def test_pairs_response_shape(self, client):
        response = client.get(f"{BASE}/pairs")
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        assert isinstance(data["data"], list)

    def test_pairs_pagination_meta_shape(self, client):
        response = client.get(f"{BASE}/pairs")
        pagination = response.json()["pagination"]
        assert "page" in pagination
        assert "per_page" in pagination
        assert "total" in pagination
        assert "total_pages" in pagination

    def test_pairs_pagination_total_pages_at_least_one(self, client):
        response = client.get(f"{BASE}/pairs")
        pagination = response.json()["pagination"]
        assert pagination["total_pages"] >= 1

    def test_pairs_default_page_is_one(self, client):
        response = client.get(f"{BASE}/pairs")
        assert response.json()["pagination"]["page"] == 1

    def test_pairs_filter_potential_collusion_false(self, client):
        """is_potential_collusion=false should return 200 (all pairs regardless of flag)."""
        response = client.get(f"{BASE}/pairs?is_potential_collusion=false")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data

    def test_pairs_filter_potential_collusion_true(self, client):
        response = client.get(f"{BASE}/pairs?is_potential_collusion=true")
        assert response.status_code == 200

    def test_pairs_custom_per_page(self, client):
        response = client.get(f"{BASE}/pairs?per_page=10")
        data = response.json()
        assert response.status_code == 200
        assert data["pagination"]["per_page"] == 10
        assert len(data["data"]) <= 10

    def test_pairs_item_shape_when_present(self, client):
        """Each returned pair should have the expected fields."""
        response = client.get(f"{BASE}/pairs?per_page=1&min_shared_procedures=1")
        data = response.json()
        if data["data"]:
            pair = data["data"][0]
            assert "vendor_id_a" in pair
            assert "vendor_id_b" in pair
            assert "vendor_name_a" in pair
            assert "vendor_name_b" in pair
            assert "shared_procedures" in pair
            assert "co_bid_rate" in pair
            assert "is_potential_collusion" in pair

    def test_pairs_sort_by_co_bid_rate(self, client):
        response = client.get(f"{BASE}/pairs?sort_by=co_bid_rate")
        assert response.status_code == 200

    def test_pairs_invalid_sort_returns_422(self, client):
        response = client.get(f"{BASE}/pairs?sort_by=invalid_column")
        assert response.status_code == 422


class TestSharedContracts:
    """Tests for GET /api/v1/collusion/pairs/{a}/{b}/shared-contracts."""

    def test_nonexistent_vendors_returns_200_empty(self, client):
        """Non-existent vendor IDs should return 200 with empty data, not 404."""
        response = client.get(f"{BASE}/pairs/999999999/888888888/shared-contracts")
        assert response.status_code == 200
        data = response.json()
        assert data["data"] == []

    def test_nonexistent_vendors_pagination_total_zero(self, client):
        response = client.get(f"{BASE}/pairs/999999999/888888888/shared-contracts")
        pagination = response.json()["pagination"]
        assert pagination["total"] == 0

    def test_nonexistent_vendors_total_pages_is_one(self, client):
        """total_pages should be at least 1 even when there are no results."""
        response = client.get(f"{BASE}/pairs/999999999/888888888/shared-contracts")
        pagination = response.json()["pagination"]
        assert pagination["total_pages"] >= 1

    def test_nonexistent_vendors_summary_shape(self, client):
        response = client.get(f"{BASE}/pairs/999999999/888888888/shared-contracts")
        data = response.json()
        assert "summary" in data
        assert "shared_procedure_count" in data["summary"]
        assert "total_shared_amount" in data["summary"]

    def test_nonexistent_vendors_summary_zeros(self, client):
        response = client.get(f"{BASE}/pairs/999999999/888888888/shared-contracts")
        summary = response.json()["summary"]
        assert summary["shared_procedure_count"] == 0
        assert summary["total_shared_amount"] == 0.0

    def test_shared_contracts_response_shape(self, client):
        """Response should always include data, pagination, and summary keys."""
        response = client.get(f"{BASE}/pairs/1/2/shared-contracts")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        assert "summary" in data

    def test_shared_contracts_custom_pagination(self, client):
        response = client.get(f"{BASE}/pairs/999999999/888888888/shared-contracts?page=1&per_page=10")
        assert response.status_code == 200
        data = response.json()
        assert data["pagination"]["per_page"] == 10
