"""Tests for /api/v1/issues endpoint."""
import pytest


class TestIssueSubmission:

    def test_submit_bug_report(self, client, base_url):
        r = client.post(f"{base_url}/issues", json={
            "category": "bug",
            "subject": "Test bug report",
            "description": "This is an automated test submission.",
        })
        assert r.status_code in (200, 201)

    def test_submit_with_all_fields(self, client, base_url):
        r = client.post(f"{base_url}/issues", json={
            "category": "wrong_data",
            "subject": "Wrong vendor name",
            "description": "Vendor ABC appears duplicated.",
            "page_url": "/vendor/123",
            "email": "test@example.com",
        })
        assert r.status_code in (200, 201)
        data = r.json()
        assert "id" in data
        assert data["status"] == "open"

    def test_response_has_required_fields(self, client, base_url):
        r = client.post(f"{base_url}/issues", json={
            "category": "feature_request",
            "subject": "Add export button",
            "description": "Please add CSV export.",
        })
        assert r.status_code in (200, 201)
        data = r.json()
        assert "id" in data
        assert "category" in data
        assert "subject" in data
        assert "created_at" in data

    def test_invalid_category_rejected(self, client, base_url):
        r = client.post(f"{base_url}/issues", json={
            "category": "spam",
            "subject": "Test",
            "description": "Test.",
        })
        assert r.status_code in (400, 422)

    def test_missing_required_fields_rejected(self, client, base_url):
        r = client.post(f"{base_url}/issues", json={"category": "bug"})
        assert r.status_code == 422

    def test_empty_subject_rejected(self, client, base_url):
        r = client.post(f"{base_url}/issues", json={
            "category": "bug",
            "subject": "",
            "description": "Description here.",
        })
        assert r.status_code in (400, 422)


class TestIssuesList:

    def test_list_returns_200(self, client, base_url):
        r = client.get(f"{base_url}/issues")
        assert r.status_code == 200

    def test_list_returns_array(self, client, base_url):
        r = client.get(f"{base_url}/issues")
        data = r.json()
        assert isinstance(data, list)

    def test_status_filter(self, client, base_url):
        r = client.get(f"{base_url}/issues?status=open")
        assert r.status_code == 200


class TestIssueStatusUpdate:

    def test_update_nonexistent_issue(self, client, base_url):
        # status is a query param on this endpoint
        r = client.patch(f"{base_url}/issues/9999999/status?status=resolved")
        assert r.status_code == 404

    def test_update_invalid_status(self, client, base_url):
        r = client.post(f"{base_url}/issues", json={
            "category": "other",
            "subject": "Status test",
            "description": "Testing status update.",
        })
        assert r.status_code in (200, 201)
        issue_id = r.json()["id"]

        r2 = client.patch(f"{base_url}/issues/{issue_id}/status?status=invalid_status")
        assert r2.status_code in (400, 422)

    def test_update_valid_status(self, client, base_url):
        r = client.post(f"{base_url}/issues", json={
            "category": "other",
            "subject": "Resolve test",
            "description": "Testing resolution.",
        })
        assert r.status_code in (200, 201)
        issue_id = r.json()["id"]

        r2 = client.patch(f"{base_url}/issues/{issue_id}/status?status=resolved")
        assert r2.status_code == 200
        assert r2.json()["status"] == "resolved"
