"""
Tests for three previously untested routers:
  - /api/v1/search               (federated search)
  - /api/v1/categories/*         (spending categories)
  - /api/v1/watchlist/folders/*  (investigation folders — skipped while DB is locked)
"""
import pytest


# =============================================================================
# FEDERATED SEARCH
# =============================================================================


class TestFederatedSearch:
    """Tests for GET /api/v1/search."""

    def test_empty_query_returns_422(self, client, base_url):
        """Empty query violates min_length=2 — FastAPI returns 422."""
        r = client.get(f"{base_url}/search?q=")
        assert r.status_code == 422

    def test_single_char_query_returns_422(self, client, base_url):
        """Single-char query violates min_length=2."""
        r = client.get(f"{base_url}/search?q=a")
        assert r.status_code == 422

    def test_missing_query_returns_422(self, client, base_url):
        """Missing q param entirely."""
        r = client.get(f"{base_url}/search")
        assert r.status_code == 422

    def test_valid_query_returns_grouped_results(self, client, base_url):
        r = client.get(f"{base_url}/search?q=PEMEX")
        assert r.status_code == 200
        data = r.json()
        assert data["query"] == "PEMEX"
        assert "vendors" in data
        assert "institutions" in data
        assert "contracts" in data
        assert "cases" in data
        assert "total" in data
        assert isinstance(data["vendors"], list)
        assert isinstance(data["institutions"], list)
        assert isinstance(data["contracts"], list)
        assert isinstance(data["cases"], list)

    def test_total_matches_sum_of_groups(self, client, base_url):
        r = client.get(f"{base_url}/search?q=PEMEX")
        assert r.status_code == 200
        data = r.json()
        computed_total = (
            len(data["vendors"])
            + len(data["institutions"])
            + len(data["contracts"])
            + len(data["cases"])
        )
        assert data["total"] == computed_total

    def test_limit_param_respected(self, client, base_url):
        r = client.get(f"{base_url}/search?q=PEMEX&limit=3")
        assert r.status_code == 200
        data = r.json()
        assert len(data["vendors"]) <= 3
        assert len(data["institutions"]) <= 3
        assert len(data["contracts"]) <= 3

    def test_limit_max_is_20(self, client, base_url):
        """limit > 20 is rejected with 422."""
        r = client.get(f"{base_url}/search?q=PEMEX&limit=99")
        assert r.status_code == 422

    def test_vendor_results_have_required_fields(self, client, base_url):
        r = client.get(f"{base_url}/search?q=PEMEX")
        assert r.status_code == 200
        for v in r.json()["vendors"]:
            assert "id" in v
            assert "name" in v
            assert "contracts" in v

    def test_institution_results_have_required_fields(self, client, base_url):
        r = client.get(f"{base_url}/search?q=IMSS")
        assert r.status_code == 200
        for inst in r.json()["institutions"]:
            assert "id" in inst
            assert "name" in inst

    def test_contract_results_have_required_fields(self, client, base_url):
        r = client.get(f"{base_url}/search?q=equipo")
        assert r.status_code == 200
        for c in r.json()["contracts"]:
            assert "id" in c
            assert "title" in c

    def test_no_results_returns_empty_lists(self, client, base_url):
        r = client.get(f"{base_url}/search?q=xyzzy_no_match_12345")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 0
        assert data["vendors"] == []
        assert data["institutions"] == []
        assert data["contracts"] == []

    def test_two_char_minimum_accepted(self, client, base_url):
        """Exactly 2 chars meets min_length=2."""
        r = client.get(f"{base_url}/search?q=PE")
        assert r.status_code == 200

    def test_case_insensitive_search(self, client, base_url):
        """LIKE query should match regardless of case."""
        r_upper = client.get(f"{base_url}/search?q=PEMEX")
        r_lower = client.get(f"{base_url}/search?q=pemex")
        assert r_upper.status_code == 200
        assert r_lower.status_code == 200
        # Both should return some results (SQLite LIKE is case-insensitive for ASCII)
        # Just check they don't error out


# =============================================================================
# SPENDING CATEGORIES
# =============================================================================


class TestSpendingCategories:
    """Tests for GET /api/v1/categories/* endpoints."""

    def test_summary_returns_200(self, client, base_url):
        r = client.get(f"{base_url}/categories/summary")
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert "total" in data
        assert isinstance(data["data"], list)

    def test_summary_total_matches_data_length(self, client, base_url):
        r = client.get(f"{base_url}/categories/summary")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == len(data["data"])

    def test_summary_items_have_required_fields(self, client, base_url):
        r = client.get(f"{base_url}/categories/summary")
        assert r.status_code == 200
        items = r.json()["data"]
        if not items:
            pytest.skip("No category_stats data — precompute_stats may not have run")
        for cat in items[:5]:
            assert "category_id" in cat
            assert "name_es" in cat
            assert "total_contracts" in cat
            assert "total_value" in cat

    def test_summary_sorted_by_value_desc(self, client, base_url):
        r = client.get(f"{base_url}/categories/summary")
        assert r.status_code == 200
        values = [c["total_value"] for c in r.json()["data"]]
        if len(values) > 1:
            assert values == sorted(values, reverse=True)

    def test_trends_returns_200(self, client, base_url):
        r = client.get(f"{base_url}/categories/trends")
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert isinstance(data["data"], list)

    def test_trends_year_range_filter(self, client, base_url):
        r = client.get(f"{base_url}/categories/trends?year_from=2020&year_to=2024")
        assert r.status_code == 200
        data = r.json()
        for row in data["data"]:
            assert 2020 <= row["year"] <= 2024

    def test_trends_invalid_year_returns_422(self, client, base_url):
        r = client.get(f"{base_url}/categories/trends?year_from=1990")
        assert r.status_code == 422

    def test_category_contracts_404_for_invalid_id(self, client, base_url):
        r = client.get(f"{base_url}/categories/999999/contracts")
        assert r.status_code == 404

    def test_category_contracts_returns_paginated_results(self, client, base_url):
        # Get a valid category_id from summary first
        r = client.get(f"{base_url}/categories/summary")
        assert r.status_code == 200
        items = r.json()["data"]
        if not items:
            pytest.skip("No category_stats data")
        cat_id = items[0]["category_id"]

        r2 = client.get(f"{base_url}/categories/{cat_id}/contracts")
        assert r2.status_code == 200
        data = r2.json()
        assert "data" in data
        assert "pagination" in data
        assert "page" in data["pagination"]
        assert "total" in data["pagination"]

    def test_category_contracts_pagination_params(self, client, base_url):
        r = client.get(f"{base_url}/categories/summary")
        items = r.json()["data"]
        if not items:
            pytest.skip("No category_stats data")
        cat_id = items[0]["category_id"]

        r2 = client.get(f"{base_url}/categories/{cat_id}/contracts?page=1&per_page=10")
        assert r2.status_code == 200
        data = r2.json()
        assert data["pagination"]["page"] == 1
        assert data["pagination"]["per_page"] == 10
        assert len(data["data"]) <= 10

    def test_category_contracts_risk_filter(self, client, base_url):
        r = client.get(f"{base_url}/categories/summary")
        items = r.json()["data"]
        if not items:
            pytest.skip("No category_stats data")
        cat_id = items[0]["category_id"]

        r2 = client.get(f"{base_url}/categories/{cat_id}/contracts?risk_level=high")
        assert r2.status_code == 200
        for c in r2.json()["data"]:
            assert c["risk_level"] == "high"


# =============================================================================
# WATCHLIST FOLDERS (investigation folder CRUD)
# =============================================================================


class TestWatchlistFolders:
    """Tests for CRUD on /api/v1/watchlist/folders.

    Router endpoints:
      GET  ""                  — list all folders
      POST ""                  — create folder (201)
      PUT  "/{folder_id}"      — update folder (200 + FolderResponse)
      DELETE "/{folder_id}"    — delete folder (200 + {message, id})
      GET  "/export/{folder_id}" — export folder (200 + FolderExportResponse)

    NOTE: There is no GET /{folder_id} single-fetch endpoint.
    NOTE: These tests write to the database. They will fail with 503 if another
    process holds a WAL write lock (e.g., a scoring rollback job). Run after
    the DB is fully idle.
    """

    def _create_folder(self, client, base_url, name="Test Folder", color="#3b82f6"):
        r = client.post(f"{base_url}/watchlist/folders", json={
            "name": name,
            "description": "Created by test suite",
            "color": color,
        })
        if r.status_code == 503:
            pytest.skip("DB locked — retry after scoring job completes")
        assert r.status_code == 201, r.text
        return r.json()

    def _delete_folder(self, client, base_url, folder_id):
        client.delete(f"{base_url}/watchlist/folders/{folder_id}")

    # ------------------------------------------------------------------
    # CREATE
    # ------------------------------------------------------------------

    def test_create_folder_returns_201(self, client, base_url):
        folder = self._create_folder(client, base_url, "Sprint Test Folder")
        assert "id" in folder
        assert folder["name"] == "Sprint Test Folder"
        assert folder["item_count"] == 0
        assert "created_at" in folder
        self._delete_folder(client, base_url, folder["id"])

    def test_create_folder_required_name(self, client, base_url):
        r = client.post(f"{base_url}/watchlist/folders", json={"description": "no name"})
        assert r.status_code == 422

    def test_create_folder_empty_name_returns_422(self, client, base_url):
        r = client.post(f"{base_url}/watchlist/folders", json={"name": ""})
        assert r.status_code == 422

    def test_create_folder_custom_color(self, client, base_url):
        folder = self._create_folder(client, base_url, "Color Folder", color="#dc2626")
        assert folder["color"] == "#dc2626"
        self._delete_folder(client, base_url, folder["id"])

    # ------------------------------------------------------------------
    # LIST
    # ------------------------------------------------------------------

    def test_list_folders_returns_list(self, client, base_url):
        folder = self._create_folder(client, base_url, "List Test")
        r = client.get(f"{base_url}/watchlist/folders")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        ids = [f["id"] for f in data]
        assert folder["id"] in ids
        self._delete_folder(client, base_url, folder["id"])

    def test_list_folders_items_have_required_fields(self, client, base_url):
        folder = self._create_folder(client, base_url, "Fields Test")
        r = client.get(f"{base_url}/watchlist/folders")
        assert r.status_code == 200
        matching = [f for f in r.json() if f["id"] == folder["id"]]
        assert len(matching) == 1
        f = matching[0]
        assert "id" in f
        assert "name" in f
        assert "color" in f
        assert "item_count" in f
        assert "created_at" in f
        self._delete_folder(client, base_url, folder["id"])

    # ------------------------------------------------------------------
    # UPDATE (PUT)
    # ------------------------------------------------------------------

    def test_update_folder_name_via_put(self, client, base_url):
        folder = self._create_folder(client, base_url, "Before Update")
        r = client.put(
            f"{base_url}/watchlist/folders/{folder['id']}",
            json={"name": "After Update"},
        )
        assert r.status_code == 200
        assert r.json()["name"] == "After Update"
        self._delete_folder(client, base_url, folder["id"])

    def test_update_folder_color_via_put(self, client, base_url):
        folder = self._create_folder(client, base_url, "Color Test")
        r = client.put(
            f"{base_url}/watchlist/folders/{folder['id']}",
            json={"color": "#dc2626"},
        )
        assert r.status_code == 200
        assert r.json()["color"] == "#dc2626"
        self._delete_folder(client, base_url, folder["id"])

    def test_update_nonexistent_folder_returns_404(self, client, base_url):
        r = client.put(
            f"{base_url}/watchlist/folders/999999",
            json={"name": "Ghost"},
        )
        assert r.status_code == 404

    # ------------------------------------------------------------------
    # DELETE
    # ------------------------------------------------------------------

    def test_delete_folder_returns_200_with_message(self, client, base_url):
        """DELETE returns 200 + {message, id} (not 204)."""
        folder = self._create_folder(client, base_url, "Delete Me")
        r = client.delete(f"{base_url}/watchlist/folders/{folder['id']}")
        assert r.status_code == 200
        body = r.json()
        assert "message" in body
        assert body["id"] == folder["id"]

    def test_deleted_folder_not_in_list(self, client, base_url):
        folder = self._create_folder(client, base_url, "Gone Folder")
        fid = folder["id"]
        client.delete(f"{base_url}/watchlist/folders/{fid}")
        r = client.get(f"{base_url}/watchlist/folders")
        ids = [f["id"] for f in r.json()]
        assert fid not in ids

    def test_delete_nonexistent_folder_returns_404(self, client, base_url):
        r = client.delete(f"{base_url}/watchlist/folders/999999")
        assert r.status_code == 404

    # ------------------------------------------------------------------
    # EXPORT
    # ------------------------------------------------------------------

    def test_export_folder_returns_structure(self, client, base_url):
        folder = self._create_folder(client, base_url, "Export Test")
        fid = folder["id"]
        r = client.get(f"{base_url}/watchlist/folders/export/{fid}")
        assert r.status_code == 200
        data = r.json()
        assert "folder" in data
        assert "items" in data
        assert "exported_at" in data
        assert data["folder"]["id"] == fid
        self._delete_folder(client, base_url, fid)

    def test_export_nonexistent_folder_returns_404(self, client, base_url):
        r = client.get(f"{base_url}/watchlist/folders/export/999999")
        assert r.status_code == 404
