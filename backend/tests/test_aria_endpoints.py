"""Tests for /api/v1/aria HTTP endpoints (not pipeline unit tests)."""
import pytest


ARIA_PREFIX = "/api/v1/aria"


class TestAriaQueue:
    """GET /api/v1/aria/queue"""

    def test_returns_200(self, client):
        r = client.get(f"{ARIA_PREFIX}/queue")
        assert r.status_code == 200

    def test_has_pagination(self, client):
        data = client.get(f"{ARIA_PREFIX}/queue").json()
        assert "pagination" in data
        pag = data["pagination"]
        assert "page" in pag
        assert "per_page" in pag
        assert "total" in pag
        assert "total_pages" in pag

    def test_has_data_array(self, client):
        data = client.get(f"{ARIA_PREFIX}/queue").json()
        assert "data" in data
        assert isinstance(data["data"], list)

    def test_filter_by_tier(self, client):
        r = client.get(f"{ARIA_PREFIX}/queue", params={"tier": 1})
        assert r.status_code == 200
        data = r.json()
        for item in data["data"]:
            assert item["ips_tier"] == 1

    def test_filter_by_pattern(self, client):
        r = client.get(f"{ARIA_PREFIX}/queue", params={"pattern": "ghost"})
        assert r.status_code == 200
        data = r.json()
        for item in data["data"]:
            assert item["primary_pattern"] == "ghost"

    def test_filter_by_search(self, client):
        r = client.get(f"{ARIA_PREFIX}/queue", params={"search": "PEMEX"})
        assert r.status_code == 200
        data = r.json()
        # All returned items should contain the search term
        for item in data["data"]:
            assert "PEMEX" in item["vendor_name"].upper()

    def test_pagination_params(self, client):
        r = client.get(f"{ARIA_PREFIX}/queue", params={"page": 1, "per_page": 5})
        assert r.status_code == 200
        data = r.json()
        assert len(data["data"]) <= 5
        assert data["pagination"]["per_page"] == 5

    def test_invalid_tier_returns_422(self, client):
        r = client.get(f"{ARIA_PREFIX}/queue", params={"tier": 99})
        assert r.status_code == 422


class TestAriaQueueVendor:
    """GET /api/v1/aria/queue/{vendor_id}"""

    def test_nonexistent_vendor_returns_404(self, client):
        r = client.get(f"{ARIA_PREFIX}/queue/999999999")
        assert r.status_code == 404

    def test_valid_vendor_from_queue(self, client):
        """Fetch first vendor from queue, then get its detail."""
        queue_r = client.get(f"{ARIA_PREFIX}/queue", params={"per_page": 1})
        data = queue_r.json()
        if not data["data"]:
            pytest.skip("ARIA queue is empty — pipeline may not have been run")
        vendor_id = data["data"][0]["vendor_id"]
        r = client.get(f"{ARIA_PREFIX}/queue/{vendor_id}")
        assert r.status_code == 200
        detail = r.json()
        assert detail["vendor_id"] == vendor_id
        assert "ips_final" in detail
        assert "vendor_name" in detail


class TestAriaStats:
    """GET /api/v1/aria/stats"""

    def test_returns_200(self, client):
        r = client.get(f"{ARIA_PREFIX}/stats")
        assert r.status_code == 200
        # Body must be parseable JSON with expected top-level keys
        data = r.json()
        assert "review_stats" in data
        assert "queue_total" in data

    def test_has_review_stats(self, client):
        data = client.get(f"{ARIA_PREFIX}/stats").json()
        assert "review_stats" in data
        assert "queue_total" in data
        rs = data["review_stats"]
        for key in ("pending", "confirmed", "dismissed", "reviewing"):
            assert key in rs

    def test_has_latest_run(self, client):
        data = client.get(f"{ARIA_PREFIX}/stats").json()
        # latest_run can be None if pipeline never ran, but key must exist
        assert "latest_run" in data

    def test_review_stats_values_are_non_negative_integers(self, client):
        data = client.get(f"{ARIA_PREFIX}/stats").json()
        rs = data["review_stats"]
        for key in ("pending", "confirmed", "dismissed", "reviewing"):
            assert isinstance(rs[key], int), f"review_stats.{key} is not int"
            assert rs[key] >= 0, f"review_stats.{key} is negative"

    def test_queue_total_is_non_negative_integer(self, client):
        data = client.get(f"{ARIA_PREFIX}/stats").json()
        assert isinstance(data["queue_total"], int)
        assert data["queue_total"] >= 0


class TestAriaGTUpdates:
    """GET /api/v1/aria/gt-updates"""

    def test_returns_200(self, client):
        r = client.get(f"{ARIA_PREFIX}/gt-updates")
        assert r.status_code == 200
        # Body must have data array and pagination envelope
        data = r.json()
        assert "data" in data
        assert "pagination" in data

    def test_has_pagination(self, client):
        data = client.get(f"{ARIA_PREFIX}/gt-updates").json()
        assert "data" in data
        assert "pagination" in data
        assert isinstance(data["data"], list)

    def test_pagination_keys_present(self, client):
        data = client.get(f"{ARIA_PREFIX}/gt-updates").json()
        pag = data["pagination"]
        for key in ("page", "per_page", "total", "total_pages"):
            assert key in pag, f"pagination missing key: {key}"

    def test_filter_by_status(self, client):
        r = client.get(f"{ARIA_PREFIX}/gt-updates", params={"status": "approved"})
        assert r.status_code == 200
        data = r.json()
        # Must still return data/pagination envelope even when filtered
        assert "data" in data
        assert "pagination" in data
        assert isinstance(data["data"], list)

    def test_filter_by_status_pending_returns_envelope(self, client):
        r = client.get(f"{ARIA_PREFIX}/gt-updates", params={"status": "pending"})
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert isinstance(data["data"], list)
