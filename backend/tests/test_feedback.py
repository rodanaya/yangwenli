"""
Tests for the risk feedback endpoint (feature 4.7 — False Positive Feedback Loop).
"""
import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

# Use high IDs that won't clash with real DB data
_V1 = 99999
_V2 = 99998
_V3 = 99997


def teardown_module(module):
    """Clean up test feedback rows after the test module finishes."""
    try:
        for eid in (_V1, _V2, _V3):
            client.delete("/api/v1/feedback", params={"entity_type": "vendor", "entity_id": eid})
    except Exception:
        pass


def test_submit_feedback_creates_record():
    r = client.post("/api/v1/feedback", json={
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


def test_get_feedback_returns_existing():
    # Ensure the record from above exists
    r = client.get("/api/v1/feedback", params={"entity_type": "vendor", "entity_id": _V1})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data is not None
    assert data["feedback_type"] == "not_suspicious"


def test_upsert_updates_existing_feedback():
    # Submit initial record
    client.post("/api/v1/feedback", json={
        "entity_type": "vendor",
        "entity_id": _V2,
        "feedback_type": "not_suspicious"
    })
    # Overwrite with a different type
    r = client.post("/api/v1/feedback", json={
        "entity_type": "vendor",
        "entity_id": _V2,
        "feedback_type": "confirmed_suspicious",
        "reason": "re-reviewed"
    })
    assert r.status_code == 201, r.text
    assert r.json()["feedback_type"] == "confirmed_suspicious"

    # Verify via GET
    r2 = client.get("/api/v1/feedback", params={"entity_type": "vendor", "entity_id": _V2})
    assert r2.json()["feedback_type"] == "confirmed_suspicious"


def test_delete_feedback():
    client.post("/api/v1/feedback", json={
        "entity_type": "vendor",
        "entity_id": _V3,
        "feedback_type": "needs_review"
    })
    r = client.delete("/api/v1/feedback", params={"entity_type": "vendor", "entity_id": _V3})
    assert r.status_code == 200, r.text
    assert r.json()["deleted"] is True

    # GET should return null after deletion
    r2 = client.get("/api/v1/feedback", params={"entity_type": "vendor", "entity_id": _V3})
    assert r2.status_code == 200
    assert r2.json() is None


def test_invalid_entity_type_returns_400():
    r = client.post("/api/v1/feedback", json={
        "entity_type": "unknown_type",
        "entity_id": 1,
        "feedback_type": "not_suspicious"
    })
    assert r.status_code == 400


def test_invalid_feedback_type_returns_400():
    r = client.post("/api/v1/feedback", json={
        "entity_type": "vendor",
        "entity_id": 1,
        "feedback_type": "definitely_corrupt"
    })
    assert r.status_code == 400


def test_get_missing_feedback_returns_null():
    r = client.get("/api/v1/feedback", params={"entity_type": "contract", "entity_id": 0})
    assert r.status_code == 200
    assert r.json() is None


def test_institution_feedback_works():
    r = client.post("/api/v1/feedback", json={
        "entity_type": "institution",
        "entity_id": 88888,
        "feedback_type": "needs_review",
        "reason": "institution test"
    })
    assert r.status_code == 201
    # Clean up
    client.delete("/api/v1/feedback", params={"entity_type": "institution", "entity_id": 88888})
