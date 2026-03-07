"""Tests for /api/v1/stats/* endpoints."""
import pytest


class TestDatabaseStats:

    def test_returns_200(self, client, base_url):
        r = client.get(f"{base_url}/stats/database")
        assert r.status_code == 200

    def test_has_table_stats(self, client, base_url):
        r = client.get(f"{base_url}/stats/database")
        data = r.json()
        assert "tables" in data or "total_contracts" in data

    def test_response_shape(self, client, base_url):
        r = client.get(f"{base_url}/stats/database")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, dict)


class TestClassificationStats:

    def test_returns_200(self, client, base_url):
        r = client.get(f"{base_url}/stats/classifications")
        assert r.status_code == 200

    def test_has_coverage_data(self, client, base_url):
        r = client.get(f"{base_url}/stats/classifications")
        data = r.json()
        # classifications endpoint returns coverage_percentage and generated_at
        assert "coverage_percentage" in data or "sectors" in data or "industries" in data


class TestFastDashboard:

    def test_returns_200(self, client, base_url):
        r = client.get(f"{base_url}/stats/dashboard/fast")
        assert r.status_code == 200

    def test_has_key_metrics(self, client, base_url):
        r = client.get(f"{base_url}/stats/dashboard/fast")
        data = r.json()
        # dashboard/fast wraps data under overview, sectors, risk_distribution
        assert "overview" in data or "sectors" in data or "risk_distribution" in data

    def test_risk_distribution_present(self, client, base_url):
        r = client.get(f"{base_url}/stats/dashboard/fast")
        data = r.json()
        assert "risk_distribution" in data
        dist = data["risk_distribution"]
        assert isinstance(dist, (dict, list))


class TestDataQuality:

    def test_returns_200(self, client, base_url):
        r = client.get(f"{base_url}/stats/data-quality")
        assert r.status_code == 200

    def test_has_quality_metrics(self, client, base_url):
        r = client.get(f"{base_url}/stats/data-quality")
        data = r.json()
        assert isinstance(data, dict)
        # Should have at least one quality metric
        assert len(data) > 0
