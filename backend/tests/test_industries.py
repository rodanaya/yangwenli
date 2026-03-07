"""Tests for /api/v1/industries/* endpoints."""
import pytest


class TestIndustriesList:

    def test_returns_200(self, client, base_url):
        r = client.get(f"{base_url}/industries")
        assert r.status_code == 200

    def test_has_data_list(self, client, base_url):
        r = client.get(f"{base_url}/industries")
        data = r.json()
        assert "data" in data or isinstance(data, list)

    def test_item_shape(self, client, base_url):
        r = client.get(f"{base_url}/industries")
        raw = r.json()
        items = raw.get("data", raw) if isinstance(raw, dict) else raw
        if not items:
            pytest.skip("No industry data")
        item = items[0]
        # industries items use id, name_es, name_en
        assert "id" in item or "industry_id" in item
        assert "name_es" in item or "name" in item or "industry_name" in item

    def test_pagination_params(self, client, base_url):
        r = client.get(f"{base_url}/industries?page=1&per_page=5")
        assert r.status_code == 200

    def test_sector_filter(self, client, base_url):
        r = client.get(f"{base_url}/industries?sector_id=1")
        assert r.status_code == 200


class TestIndustryDetail:

    def test_valid_id_returns_200_or_404(self, client, base_url):
        r = client.get(f"{base_url}/industries/1")
        assert r.status_code in (200, 404)

    def test_detail_shape(self, client, base_url):
        r = client.get(f"{base_url}/industries/1")
        if r.status_code == 200:
            data = r.json()
            assert "industry_id" in data or "id" in data

    def test_invalid_id_returns_404(self, client, base_url):
        r = client.get(f"{base_url}/industries/9999999")
        assert r.status_code in (404, 422)
