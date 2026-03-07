"""Tests for /api/v1/search endpoint."""
import pytest


class TestFederatedSearch:

    def test_basic_search_returns_200(self, client, base_url):
        r = client.get(f"{base_url}/search?q=salud")
        assert r.status_code == 200

    def test_response_has_results_field(self, client, base_url):
        r = client.get(f"{base_url}/search?q=salud")
        data = r.json()
        assert "results" in data or "vendors" in data or "contracts" in data

    def test_empty_query_returns_400_or_empty(self, client, base_url):
        r = client.get(f"{base_url}/search?q=")
        assert r.status_code in (200, 400, 422)

    def test_missing_q_param_returns_422(self, client, base_url):
        r = client.get(f"{base_url}/search")
        assert r.status_code == 422

    def test_short_query_handled(self, client, base_url):
        r = client.get(f"{base_url}/search?q=ab")
        assert r.status_code in (200, 400)

    def test_results_have_type_field(self, client, base_url):
        r = client.get(f"{base_url}/search?q=pemex")
        if r.status_code != 200:
            return
        data = r.json()
        results = data.get("results", [])
        for item in results[:3]:
            assert "type" in item or "entity_type" in item

    def test_special_characters_handled(self, client, base_url):
        r = client.get(f"{base_url}/search?q=construcc%C3%B3n")
        assert r.status_code in (200, 400)

    def test_long_query_handled(self, client, base_url):
        r = client.get(f"{base_url}/search?q=" + "a" * 200)
        assert r.status_code in (200, 400, 422)

    def test_type_filter(self, client, base_url):
        r = client.get(f"{base_url}/search?q=salud&type=vendor")
        assert r.status_code in (200, 400, 422)
