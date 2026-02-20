"""
Tests for ASF (Auditoria Superior de la Federacion) integration endpoints.
"""
import pytest


class TestVendorASFCases:
    """Tests for GET /vendors/{vendor_id}/asf-cases endpoint."""

    def test_vendor_asf_cases_returns_list(self, client, base_url):
        """ASF cases endpoint returns a list (may be empty if table is empty)."""
        # Get a real vendor ID first
        list_response = client.get(f"{base_url}/vendors?per_page=1")
        if list_response.status_code == 200 and list_response.json()["data"]:
            vendor_id = list_response.json()["data"][0]["id"]
            response = client.get(f"{base_url}/vendors/{vendor_id}/asf-cases")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)

    def test_vendor_asf_cases_not_found(self, client, base_url):
        """Non-existent vendor returns 404."""
        response = client.get(f"{base_url}/vendors/999999999/asf-cases")
        assert response.status_code == 404

    def test_vendor_asf_cases_structure(self, client, base_url):
        """ASF case items have expected fields when results exist."""
        list_response = client.get(f"{base_url}/vendors?per_page=1")
        if list_response.status_code == 200 and list_response.json()["data"]:
            vendor_id = list_response.json()["data"][0]["id"]
            response = client.get(f"{base_url}/vendors/{vendor_id}/asf-cases")
            assert response.status_code == 200
            data = response.json()
            # Table may be empty, but if there are results check structure
            if data:
                item = data[0]
                assert "id" in item
                assert "entity_name" in item
                assert "finding_type" in item


class TestCaseASFMatches:
    """Tests for GET /investigation/cases/{case_id}/asf-matches endpoint."""

    def test_case_asf_matches_returns_structure(self, client, base_url):
        """ASF matches endpoint returns proper structure."""
        # Get a real case_id first
        cases_response = client.get(f"{base_url}/investigation/cases?per_page=1")
        if cases_response.status_code == 200:
            cases_data = cases_response.json()
            if cases_data.get("data"):
                case_id = cases_data["data"][0]["case_id"]
                response = client.get(
                    f"{base_url}/investigation/cases/{case_id}/asf-matches"
                )
                assert response.status_code == 200
                data = response.json()
                assert "case_id" in data
                assert "matches" in data
                assert "total" in data
                assert isinstance(data["matches"], list)
                assert data["total"] == len(data["matches"])

    def test_case_asf_matches_not_found(self, client, base_url):
        """Non-existent case returns 404."""
        response = client.get(
            f"{base_url}/investigation/cases/NONEXISTENT-CASE/asf-matches"
        )
        assert response.status_code == 404
