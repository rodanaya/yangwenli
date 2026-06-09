"""
Tests for GET /analysis/admin-breakdown/{era}/vendors and .../institutions

Mirrors test_missing_endpoints.py's TestClient pattern.
Uses 'sheinbaum' (smallest data set → fastest runtime).
"""
import pytest
from fastapi.testclient import TestClient

from api.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def base_url():
    return "/api/v1"


class TestAdminVendorsDrilldown:
    """Tests for GET /analysis/admin-breakdown/{era}/vendors"""

    def test_sheinbaum_vendors_200(self, client, base_url):
        response = client.get(f"{base_url}/analysis/admin-breakdown/sheinbaum/vendors")
        assert response.status_code == 200

    def test_sheinbaum_vendors_shape(self, client, base_url):
        data = client.get(
            f"{base_url}/analysis/admin-breakdown/sheinbaum/vendors?limit=5"
        ).json()
        assert "era" in data
        assert data["era"] == "sheinbaum"
        assert "year_start" in data
        assert "year_end" in data
        assert "term_total_mxn" in data
        assert "vendor_count" in data
        assert "vendors" in data
        assert isinstance(data["vendors"], list)
        assert len(data["vendors"]) <= 5

    def test_sheinbaum_vendors_entry_fields(self, client, base_url):
        data = client.get(
            f"{base_url}/analysis/admin-breakdown/sheinbaum/vendors?limit=3"
        ).json()
        if data["vendors"]:
            entry = data["vendors"][0]
            assert "vendor_id" in entry
            assert "vendor_name" in entry
            assert "total_mxn" in entry
            assert "contracts" in entry
            assert "high_risk_pct" in entry
            assert "direct_award_pct" in entry
            assert "share_pct" in entry
            assert "yearly" in entry
            assert isinstance(entry["yearly"], list)

    def test_bogus_era_vendors_404(self, client, base_url):
        response = client.get(f"{base_url}/analysis/admin-breakdown/bogus/vendors")
        assert response.status_code == 404

    def test_limit_respected(self, client, base_url):
        data = client.get(
            f"{base_url}/analysis/admin-breakdown/sheinbaum/vendors?limit=10"
        ).json()
        assert len(data["vendors"]) <= 10


class TestAdminInstitutionsDrilldown:
    """Tests for GET /analysis/admin-breakdown/{era}/institutions"""

    def test_sheinbaum_institutions_200(self, client, base_url):
        response = client.get(
            f"{base_url}/analysis/admin-breakdown/sheinbaum/institutions"
        )
        assert response.status_code == 200

    def test_sheinbaum_institutions_shape(self, client, base_url):
        data = client.get(
            f"{base_url}/analysis/admin-breakdown/sheinbaum/institutions?limit=5"
        ).json()
        assert "era" in data
        assert data["era"] == "sheinbaum"
        assert "year_start" in data
        assert "year_end" in data
        assert "term_total_mxn" in data
        assert "institution_count" in data
        assert "top_n_share_pct" in data
        assert "institutions" in data
        assert isinstance(data["institutions"], list)
        assert len(data["institutions"]) <= 5

    def test_sheinbaum_institutions_entry_fields(self, client, base_url):
        data = client.get(
            f"{base_url}/analysis/admin-breakdown/sheinbaum/institutions?limit=3"
        ).json()
        if data["institutions"]:
            entry = data["institutions"][0]
            assert "institution_id" in entry
            assert "institution_name" in entry
            assert "total_mxn" in entry
            assert "contracts" in entry
            assert "direct_award_pct" in entry
            assert "share_pct" in entry
            assert "top_sector_id" in entry
            assert "top_sector_code" in entry

    def test_bogus_era_institutions_404(self, client, base_url):
        response = client.get(
            f"{base_url}/analysis/admin-breakdown/bogus/institutions"
        )
        assert response.status_code == 404

    def test_limit_respected(self, client, base_url):
        data = client.get(
            f"{base_url}/analysis/admin-breakdown/sheinbaum/institutions?limit=6"
        ).json()
        assert len(data["institutions"]) <= 6


class TestAdminDrilldownRouterImport:
    """Smoke-test that the analysis router compiles without error."""

    def test_router_importable(self):
        from api.routers import analysis as _m
        assert hasattr(_m, "router")
        assert hasattr(_m, "get_admin_breakdown_vendors")
        assert hasattr(_m, "get_admin_breakdown_institutions")
