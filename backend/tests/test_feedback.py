"""
Tests for the risk feedback endpoint (feature 4.7 — False Positive Feedback Loop).
"""
import pytest


# Use high IDs that won't clash with real DB data
_V1 = 99999
_V2 = 99998
_V3 = 99997


class TestFeedback:
    """Tests for GET/POST/DELETE /api/v1/feedback endpoint."""

    def setup_method(self):
        """Ensure clean state by deleting any leftover test records before each test."""
        # This is done lazily in each test to avoid cross-fixture ordering issues.

    def test_submit_feedback_creates_record(self, client, base_url):
        # Clean up any prior leftover
        client.delete(f"{base_url}/feedback", params={"entity_type": "vendor", "entity_id": _V1})

        r = client.post(f"{base_url}/feedback", json={
            "entity_type": "vendor",
            "entity_id": _V1,
            "feedback_type": "not_suspicious",
            "reason": "investigated — clean"
        })
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["entity_type"] == "vendor"
        assert data["entity_id"] == _V1
        assert data["feedback_type"] == "not_suspicious"
        assert data["reason"] == "investigated — clean"
        assert "id" in data
        assert "created_at" in data

        # Cleanup
        client.delete(f"{base_url}/feedback", params={"entity_type": "vendor", "entity_id": _V1})

    def test_get_feedback_returns_existing(self, client, base_url):
        # Create a record first
        client.delete(f"{base_url}/feedback", params={"entity_type": "vendor", "entity_id": _V1})
        client.post(f"{base_url}/feedback", json={
            "entity_type": "vendor",
            "entity_id": _V1,
            "feedback_type": "not_suspicious",
            "reason": "investigated — clean"
        })

        r = client.get(f"{base_url}/feedback", params={"entity_type": "vendor", "entity_id": _V1})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data is not None
        assert data["feedback_type"] == "not_suspicious"

        # Cleanup
        client.delete(f"{base_url}/feedback", params={"entity_type": "vendor", "entity_id": _V1})

    def test_upsert_updates_existing_feedback(self, client, base_url):
        client.delete(f"{base_url}/feedback", params={"entity_type": "vendor", "entity_id": _V2})

        # Submit initial record
        client.post(f"{base_url}/feedback", json={
            "entity_type": "vendor",
            "entity_id": _V2,
            "feedback_type": "not_suspicious"
        })
        # Overwrite with a different type
        r = client.post(f"{base_url}/feedback", json={
            "entity_type": "vendor",
            "entity_id": _V2,
            "feedback_type": "confirmed_suspicious",
            "reason": "re-reviewed"
        })
        assert r.status_code == 201, r.text
        assert r.json()["feedback_type"] == "confirmed_suspicious"

        # Verify via GET
        r2 = client.get(f"{base_url}/feedback", params={"entity_type": "vendor", "entity_id": _V2})
        assert r2.json()["feedback_type"] == "confirmed_suspicious"

        # Cleanup
        client.delete(f"{base_url}/feedback", params={"entity_type": "vendor", "entity_id": _V2})

    def test_delete_feedback(self, client, base_url):
        client.delete(f"{base_url}/feedback", params={"entity_type": "vendor", "entity_id": _V3})
        client.post(f"{base_url}/feedback", json={
            "entity_type": "vendor",
            "entity_id": _V3,
            "feedback_type": "needs_review"
        })
        r = client.delete(f"{base_url}/feedback", params={"entity_type": "vendor", "entity_id": _V3})
        assert r.status_code == 200, r.text
        assert r.json()["deleted"] is True

        # GET should return null after deletion
        r2 = client.get(f"{base_url}/feedback", params={"entity_type": "vendor", "entity_id": _V3})
        assert r2.status_code == 200
        assert r2.json() is None

    def test_invalid_entity_type_returns_400(self, client, base_url):
        r = client.post(f"{base_url}/feedback", json={
            "entity_type": "unknown_type",
            "entity_id": 1,
            "feedback_type": "not_suspicious"
        })
        assert r.status_code == 400

    def test_invalid_feedback_type_returns_400(self, client, base_url):
        r = client.post(f"{base_url}/feedback", json={
            "entity_type": "vendor",
            "entity_id": 1,
            "feedback_type": "definitely_corrupt"
        })
        assert r.status_code == 400

    def test_get_missing_feedback_returns_null(self, client, base_url):
        r = client.get(f"{base_url}/feedback", params={"entity_type": "contract", "entity_id": 0})
        assert r.status_code == 200
        assert r.json() is None

    def test_institution_feedback_works(self, client, base_url):
        client.delete(f"{base_url}/feedback", params={"entity_type": "institution", "entity_id": 88888})
        r = client.post(f"{base_url}/feedback", json={
            "entity_type": "institution",
            "entity_id": 88888,
            "feedback_type": "needs_review",
            "reason": "institution test"
        })
        assert r.status_code == 201
        # Cleanup
        client.delete(f"{base_url}/feedback", params={"entity_type": "institution", "entity_id": 88888})
