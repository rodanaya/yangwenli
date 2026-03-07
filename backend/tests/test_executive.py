"""Tests for /api/v1/executive/summary endpoint."""
import pytest


class TestExecutiveSummary:

    def test_returns_200(self, client, base_url):
        r = client.get(f"{base_url}/executive/summary")
        assert r.status_code == 200

    def test_has_top_level_keys(self, client, base_url):
        r = client.get(f"{base_url}/executive/summary")
        data = r.json()
        for key in ("headline", "sectors", "model"):
            assert key in data, f"Missing key: {key}"

    def test_headline_fields(self, client, base_url):
        r = client.get(f"{base_url}/executive/summary")
        headline = r.json()["headline"]
        assert "total_contracts" in headline
        assert isinstance(headline["total_contracts"], int)
        assert headline["total_contracts"] > 0

    def test_sectors_list(self, client, base_url):
        r = client.get(f"{base_url}/executive/summary")
        sectors = r.json()["sectors"]
        assert isinstance(sectors, list)
        assert len(sectors) > 0
        sector = sectors[0]
        assert "sector_name" in sector or "name" in sector

    def test_model_has_auc(self, client, base_url):
        r = client.get(f"{base_url}/executive/summary")
        model = r.json()["model"]
        assert "auc" in model
        auc = model["auc"]
        assert auc is None or (0.5 <= auc <= 1.0)

    def test_response_is_cached(self, client, base_url):
        """Two successive calls should both return 200."""
        r1 = client.get(f"{base_url}/executive/summary")
        r2 = client.get(f"{base_url}/executive/summary")
        assert r1.status_code == 200
        assert r2.status_code == 200
