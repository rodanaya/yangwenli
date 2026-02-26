"""
Tests for Case Library endpoints (GET /cases/...).
"""
import pytest


class TestCaseLibrary:
    """Tests for the procurement scandals case library."""

    def test_list_cases_returns_list(self, client, base_url):
        """GET /cases returns a non-empty list."""
        response = client.get(f"{base_url}/cases")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_list_cases_has_required_fields(self, client, base_url):
        """Each case has expected fields."""
        response = client.get(f"{base_url}/cases")
        assert response.status_code == 200
        item = response.json()[0]
        for field in ("id", "name_en", "slug", "fraud_type", "administration",
                      "severity", "legal_status", "compranet_visibility", "summary_en"):
            assert field in item, f"Missing field: {field}"

    def test_list_cases_filter_by_fraud_type(self, client, base_url):
        """Filter by fraud_type returns only matching cases."""
        response = client.get(f"{base_url}/cases?fraud_type=ghost_company")
        assert response.status_code == 200
        data = response.json()
        assert all(c["fraud_type"] == "ghost_company" for c in data)

    def test_list_cases_filter_by_administration(self, client, base_url):
        """Filter by administration returns only matching cases."""
        response = client.get(f"{base_url}/cases?administration=amlo")
        assert response.status_code == 200
        data = response.json()
        assert all(c["administration"] == "amlo" for c in data)

    def test_stats_endpoint(self, client, base_url):
        """GET /cases/stats returns aggregate statistics."""
        response = client.get(f"{base_url}/cases/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["total_cases"] > 0
        assert data["total_amount_mxn_low"] > 0
        assert isinstance(data["cases_by_fraud_type"], list)
        assert isinstance(data["cases_by_administration"], list)
        assert data["gt_linked_count"] > 0

    def test_get_case_by_slug(self, client, base_url):
        """GET /cases/{slug} returns full detail."""
        response = client.get(f"{base_url}/cases/imss-ghost-company-network")
        assert response.status_code == 200
        data = response.json()
        assert data["slug"] == "imss-ghost-company-network"
        assert data["ground_truth_case_id"] == 1
        assert isinstance(data["key_actors"], list)
        assert isinstance(data["sources"], list)
        assert len(data["key_actors"]) > 0

    def test_get_case_not_found(self, client, base_url):
        """GET /cases/{slug} with bad slug returns 404."""
        response = client.get(f"{base_url}/cases/nonexistent-slug-xyz")
        assert response.status_code == 404

    def test_cases_by_sector(self, client, base_url):
        """GET /cases/by-sector/{sector_id} returns cases for that sector."""
        # Sector 1 = salud, has IMSS and COVID cases
        response = client.get(f"{base_url}/cases/by-sector/1")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        # All returned cases should involve sector 1
        for case in data:
            assert case["sector_id"] == 1 or 1 in case["sector_ids"]
