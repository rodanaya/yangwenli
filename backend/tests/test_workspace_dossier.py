import pytest


def test_create_dossier(authed_client, base_url):
    r = authed_client.post(f"{base_url}/workspace/dossiers", json={"name": "Test Dossier", "description": "test"})
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["name"] == "Test Dossier"
    assert data["item_count"] == 0


def test_list_dossiers(authed_client, base_url):
    r = authed_client.get(f"{base_url}/workspace/dossiers")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_get_dossier(authed_client, base_url):
    r = authed_client.post(f"{base_url}/workspace/dossiers", json={"name": "Get Test"})
    assert r.status_code == 201, r.text
    did = r.json()["id"]
    r2 = authed_client.get(f"{base_url}/workspace/dossiers/{did}")
    assert r2.status_code == 200
    assert r2.json()["id"] == did


def test_update_dossier(authed_client, base_url):
    r = authed_client.post(f"{base_url}/workspace/dossiers", json={"name": "Update Me"})
    assert r.status_code == 201, r.text
    did = r.json()["id"]
    r2 = authed_client.patch(f"{base_url}/workspace/dossiers/{did}", json={"name": "Updated", "status": "archived"})
    assert r2.status_code == 200
    assert r2.json()["name"] == "Updated"


def test_add_and_remove_item(authed_client, base_url):
    r = authed_client.post(f"{base_url}/workspace/dossiers", json={"name": "Items Test"})
    assert r.status_code == 201, r.text
    did = r.json()["id"]

    ri = authed_client.post(f"{base_url}/workspace/dossiers/{did}/items", json={
        "item_type": "vendor", "item_id": 1, "item_name": "Test Vendor"
    })
    assert ri.status_code == 201
    iid = ri.json()["id"]

    rl = authed_client.get(f"{base_url}/workspace/dossiers/{did}/items")
    assert len(rl.json()) == 1

    rd = authed_client.delete(f"{base_url}/workspace/dossiers/{did}/items/{iid}")
    assert rd.status_code == 204


def test_delete_dossier(authed_client, base_url):
    r = authed_client.post(f"{base_url}/workspace/dossiers", json={"name": "Delete Me"})
    assert r.status_code == 201, r.text
    did = r.json()["id"]
    r2 = authed_client.delete(f"{base_url}/workspace/dossiers/{did}")
    assert r2.status_code == 204
    r3 = authed_client.get(f"{base_url}/workspace/dossiers/{did}")
    assert r3.status_code == 404


def test_invalid_status(authed_client, base_url):
    r = authed_client.post(f"{base_url}/workspace/dossiers", json={"name": "Bad", "status": "invalid"})
    assert r.status_code == 400


def test_not_found(authed_client, base_url):
    r = authed_client.get(f"{base_url}/workspace/dossiers/999999")
    assert r.status_code == 404
