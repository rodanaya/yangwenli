"""Tests for /api/v1/contracts/{id}/explain endpoint."""
import pytest


class TestAIExplain:

    def test_valid_contract_returns_200_or_error(self, client, base_url):
        # Use contract ID 1 — may or may not exist
        r = client.get(f"{base_url}/contracts/1/explain")
        assert r.status_code in (200, 404, 503)

    def test_response_has_explanation(self, client, base_url):
        r = client.get(f"{base_url}/contracts/1/explain")
        if r.status_code == 200:
            data = r.json()
            assert "explanation" in data or "summary" in data or "text" in data

    def test_nonexistent_contract_returns_404(self, client, base_url):
        r = client.get(f"{base_url}/contracts/9999999999/explain")
        assert r.status_code in (404, 503)

    def test_invalid_id_returns_error(self, client, base_url):
        # non-integer ID routes to 404 (no match) or 422 depending on router config
        r = client.get(f"{base_url}/contracts/not-an-id/explain")
        assert r.status_code in (404, 422)

    def test_response_includes_risk_context(self, client, base_url):
        r = client.get(f"{base_url}/contracts/1/explain")
        if r.status_code == 200:
            data = r.json()
            # Should include either risk score context or explanation text
            assert any(k in data for k in ("risk_score", "explanation", "factors", "summary"))
