import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_create_dossier():
    r = client.post("/api/v1/workspace/dossiers", json={"name": "Test Dossier", "description": "test"})
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "Test Dossier"
    assert data["item_count"] == 0
    return data["id"]

def test_list_dossiers():
    r = client.get("/api/v1/workspace/dossiers")
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_get_dossier():
    r = client.post("/api/v1/workspace/dossiers", json={"name": "Get Test"})
    did = r.json()["id"]
    r2 = client.get(f"/api/v1/workspace/dossiers/{did}")
    assert r2.status_code == 200
    assert r2.json()["id"] == did

def test_update_dossier():
    r = client.post("/api/v1/workspace/dossiers", json={"name": "Update Me"})
    did = r.json()["id"]
    r2 = client.patch(f"/api/v1/workspace/dossiers/{did}", json={"name": "Updated", "status": "archived"})
    assert r2.status_code == 200
    assert r2.json()["name"] == "Updated"

def test_add_and_remove_item():
    r = client.post("/api/v1/workspace/dossiers", json={"name": "Items Test"})
    did = r.json()["id"]

    ri = client.post(f"/api/v1/workspace/dossiers/{did}/items", json={
        "item_type": "vendor", "item_id": 1, "item_name": "Test Vendor"
    })
    assert ri.status_code == 201
    iid = ri.json()["id"]

    rl = client.get(f"/api/v1/workspace/dossiers/{did}/items")
    assert len(rl.json()) == 1

    rd = client.delete(f"/api/v1/workspace/dossiers/{did}/items/{iid}")
    assert rd.status_code == 204

def test_delete_dossier():
    r = client.post("/api/v1/workspace/dossiers", json={"name": "Delete Me"})
    did = r.json()["id"]
    r2 = client.delete(f"/api/v1/workspace/dossiers/{did}")
    assert r2.status_code == 204
    r3 = client.get(f"/api/v1/workspace/dossiers/{did}")
    assert r3.status_code == 404

def test_invalid_status():
    r = client.post("/api/v1/workspace/dossiers", json={"name": "Bad", "status": "invalid"})
    assert r.status_code == 400

def test_not_found():
    r = client.get("/api/v1/workspace/dossiers/999999")
    assert r.status_code == 404
