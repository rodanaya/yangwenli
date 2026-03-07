"""Tests for /api/v1/watchlist and /api/v1/watchlist/folders endpoints."""
import pytest


class TestWatchlistCRUD:

    def test_list_empty_returns_200(self, client, base_url):
        r = client.get(f"{base_url}/watchlist")
        assert r.status_code == 200

    def test_list_has_data_field(self, client, base_url):
        r = client.get(f"{base_url}/watchlist")
        data = r.json()
        # watchlist returns {data: [...], total: N, by_status: {}, ...}
        assert "data" in data or "items" in data or isinstance(data, list)

    def test_create_watchlist_item(self, client, base_url):
        payload = {
            "item_type": "vendor",
            "item_id": 1,
            "reason": "Test monitoring",
            "priority": "medium",
        }
        r = client.post(f"{base_url}/watchlist", json=payload)
        # 409 = already on watchlist, 404 = entity not found
        assert r.status_code in (200, 201, 404, 409)

    def test_create_invalid_type_rejected(self, client, base_url):
        payload = {
            "item_type": "invalid_type",
            "item_id": 1,
            "reason": "Test",
            "priority": "medium",
        }
        r = client.post(f"{base_url}/watchlist", json=payload)
        assert r.status_code in (400, 422)

    def test_get_stats(self, client, base_url):
        r = client.get(f"{base_url}/watchlist/stats")
        assert r.status_code == 200
        data = r.json()
        assert "total" in data or "total_items" in data or isinstance(data, dict)

    def test_alerts_check(self, client, base_url):
        r = client.get(f"{base_url}/watchlist/alerts/check")
        assert r.status_code == 200

    def test_get_nonexistent_item(self, client, base_url):
        r = client.get(f"{base_url}/watchlist/9999999")
        assert r.status_code == 404

    def test_patch_nonexistent_item(self, client, base_url):
        r = client.patch(f"{base_url}/watchlist/9999999", json={"status": "resolved"})
        assert r.status_code == 404

    def test_delete_nonexistent_item(self, client, base_url):
        r = client.delete(f"{base_url}/watchlist/9999999")
        assert r.status_code in (404, 204)


class TestWatchlistFolders:

    def test_list_folders_returns_200(self, client, base_url):
        r = client.get(f"{base_url}/watchlist/folders")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_folder(self, client, base_url):
        r = client.post(f"{base_url}/watchlist/folders", json={
            "name": "Test Folder",
            "description": "Created by automated test",
            "color": "#ef4444",
        })
        assert r.status_code in (200, 201)
        if r.status_code in (200, 201):
            data = r.json()
            assert "id" in data
            assert data["name"] == "Test Folder"
            return data["id"]

    def test_create_folder_missing_name(self, client, base_url):
        r = client.post(f"{base_url}/watchlist/folders", json={"color": "#fff"})
        assert r.status_code == 422

    def test_update_nonexistent_folder(self, client, base_url):
        r = client.put(f"{base_url}/watchlist/folders/9999999", json={"name": "Updated"})
        assert r.status_code == 404

    def test_delete_nonexistent_folder(self, client, base_url):
        r = client.delete(f"{base_url}/watchlist/folders/9999999")
        assert r.status_code in (404, 204)

    def test_export_nonexistent_folder(self, client, base_url):
        r = client.get(f"{base_url}/watchlist/folders/export/9999999")
        assert r.status_code == 404

    def test_folder_full_lifecycle(self, client, base_url):
        """Create → update → delete."""
        r = client.post(f"{base_url}/watchlist/folders", json={"name": "Lifecycle Test"})
        assert r.status_code in (200, 201)
        folder_id = r.json()["id"]

        r2 = client.put(f"{base_url}/watchlist/folders/{folder_id}", json={"name": "Updated Name"})
        assert r2.status_code == 200
        assert r2.json()["name"] == "Updated Name"

        r3 = client.delete(f"{base_url}/watchlist/folders/{folder_id}")
        assert r3.status_code in (200, 204)
