"""
Tests for report API endpoints.
Verifies that error responses are sanitized (no stack traces leaked to clients).
"""
import pytest


class TestVendorReport:
    """Tests for GET /api/v1/reports/vendor/{vendor_id}."""

    def test_vendor_report_not_found(self, client, base_url):
        """Test vendor report with non-existent ID returns 404."""
        response = client.get(f"{base_url}/reports/vendor/99999999")
        assert response.status_code == 404

    def test_vendor_report_valid(self, client, base_url):
        """Test vendor report with valid ID returns report data."""
        # First get a valid vendor ID from the contracts endpoint
        contracts_response = client.get(f"{base_url}/contracts?per_page=1")
        if contracts_response.status_code == 200:
            data = contracts_response.json()
            if data["data"] and "vendor_id" in data["data"][0]:
                vendor_id = data["data"][0]["vendor_id"]
                response = client.get(f"{base_url}/reports/vendor/{vendor_id}")
                assert response.status_code in [200, 404]  # May not have enough data


class TestInstitutionReport:
    """Tests for GET /api/v1/reports/institution/{institution_id}."""

    def test_institution_report_not_found(self, client, base_url):
        """Test institution report with non-existent ID returns 404."""
        response = client.get(f"{base_url}/reports/institution/99999999")
        assert response.status_code == 404


class TestSectorReport:
    """Tests for GET /api/v1/reports/sector/{sector_id}."""

    def test_sector_report_invalid_id(self, client, base_url):
        """Test sector report with out-of-range ID returns 422 (validated 1-12)."""
        response = client.get(f"{base_url}/reports/sector/99999")
        assert response.status_code == 422

    def test_sector_report_valid(self, client, base_url):
        """Test sector report with valid sector returns data."""
        response = client.get(f"{base_url}/reports/sector/1")
        assert response.status_code == 200
        data = response.json()
        assert "report_type" in data
        assert data["report_type"] == "sector_summary"


class TestErrorSanitization:
    """Verify that error responses don't leak internal details."""

    def test_500_errors_sanitized(self, client, base_url):
        """Test that 500 errors use generic messages, not str(e)."""
        # Request non-existent resources that might trigger 500
        endpoints = [
            f"{base_url}/reports/vendor/99999999",
            f"{base_url}/reports/institution/99999999",
        ]
        for endpoint in endpoints:
            response = client.get(endpoint)
            if response.status_code == 500:
                data = response.json()
                detail = data.get("detail", "")
                # Should NOT contain Python internals
                assert "Traceback" not in str(detail)
                assert "sqlite3" not in str(detail).lower()
                assert "Error(" not in str(detail)
