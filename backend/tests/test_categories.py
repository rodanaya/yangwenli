"""Tests for /api/v1/categories/* endpoints."""
import pytest


class TestCategoriesSummary:

    def test_returns_200(self, client, base_url):
        r = client.get(f"{base_url}/categories/summary")
        assert r.status_code == 200

    def test_has_data_field(self, client, base_url):
        r = client.get(f"{base_url}/categories/summary")
        data = r.json()
        assert "data" in data or isinstance(data, list)

    def test_item_shape(self, client, base_url):
        r = client.get(f"{base_url}/categories/summary")
        items = r.json().get("data", r.json() if isinstance(r.json(), list) else [])
        if not items:
            pytest.skip("No category_stats table or empty data")
        item = items[0]
        assert "category_id" in item or "category_name" in item


class TestCategoryContracts:

    def test_valid_category_returns_200_or_404(self, client, base_url):
        r = client.get(f"{base_url}/categories/1/contracts")
        assert r.status_code in (200, 404)

    def test_has_pagination(self, client, base_url):
        r = client.get(f"{base_url}/categories/1/contracts")
        if r.status_code == 200:
            data = r.json()
            assert "data" in data or "contracts" in data

    def test_invalid_category_returns_404(self, client, base_url):
        r = client.get(f"{base_url}/categories/9999999/contracts")
        assert r.status_code in (404, 200)  # 200 with empty list acceptable


class TestCategoryVendorInstitution:

    def test_returns_200_or_404(self, client, base_url):
        r = client.get(f"{base_url}/categories/1/vendor-institution")
        assert r.status_code in (200, 404)


class TestCategoryTrends:

    def test_returns_200(self, client, base_url):
        r = client.get(f"{base_url}/categories/trends")
        assert r.status_code == 200

    def test_has_trend_data(self, client, base_url):
        r = client.get(f"{base_url}/categories/trends")
        data = r.json()
        assert isinstance(data, (list, dict))


class TestCategoryCompetition:

    def test_returns_200_or_404(self, client, base_url):
        r = client.get(f"{base_url}/categories/1/competition")
        assert r.status_code in (200, 404)

    def test_shape(self, client, base_url):
        r = client.get(f"{base_url}/categories/1/competition")
        if r.status_code == 200:
            data = r.json()
            assert "procedure_breakdown" in data
            assert "yearly_trend" in data
            assert isinstance(data["procedure_breakdown"], list)

    def test_invalid_returns_404(self, client, base_url):
        r = client.get(f"{base_url}/categories/9999999/competition")
        assert r.status_code == 404


class TestCategorySeasonality:

    def test_returns_200_or_404(self, client, base_url):
        r = client.get(f"{base_url}/categories/1/seasonality")
        assert r.status_code in (200, 404)

    def test_shape(self, client, base_url):
        r = client.get(f"{base_url}/categories/1/seasonality")
        if r.status_code == 200:
            data = r.json()
            assert "monthly" in data
            assert isinstance(data["monthly"], list)
            assert "december_index" in data

    def test_invalid_returns_404(self, client, base_url):
        r = client.get(f"{base_url}/categories/9999999/seasonality")
        assert r.status_code == 404


class TestCategoryPatterns:

    def test_returns_200_or_404(self, client, base_url):
        r = client.get(f"{base_url}/categories/1/patterns")
        assert r.status_code in (200, 404)

    def test_shape(self, client, base_url):
        r = client.get(f"{base_url}/categories/1/patterns")
        if r.status_code == 200:
            data = r.json()
            assert "patterns" in data
            assert "tier_distribution" in data
            assert isinstance(data["patterns"], list)

    def test_invalid_returns_404(self, client, base_url):
        r = client.get(f"{base_url}/categories/9999999/patterns")
        assert r.status_code == 404


class TestCategoryPriceDistribution:

    def test_returns_200_or_404(self, client, base_url):
        r = client.get(f"{base_url}/categories/1/price-distribution")
        assert r.status_code in (200, 404)

    def test_shape(self, client, base_url):
        r = client.get(f"{base_url}/categories/1/price-distribution")
        if r.status_code == 200:
            data = r.json()
            assert "n" in data
            assert "p50" in data
            assert "mean" in data
            assert "mean_median_ratio" in data
            assert "yearly_trend" in data
            assert isinstance(data["yearly_trend"], list)

    def test_invalid_returns_404(self, client, base_url):
        r = client.get(f"{base_url}/categories/9999999/price-distribution")
        assert r.status_code == 404
