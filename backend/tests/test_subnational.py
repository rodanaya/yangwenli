"""
Tests for subnational (state expenditure) API endpoints.
Covers: /api/v1/subnational/states and /states/{code}/*
"""
import pytest


class TestStatesList:
    """Tests for GET /subnational/states."""

    def test_list_states_returns_200(self, client, base_url):
        r = client.get(f"{base_url}/subnational/states")
        assert r.status_code == 200

    def test_list_states_has_required_fields(self, client, base_url):
        r = client.get(f"{base_url}/subnational/states")
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert "total_states" in data
        assert "total_contracts" in data
        assert "total_value_mxn" in data
        assert isinstance(data["data"], list)

    def test_list_states_items_have_required_fields(self, client, base_url):
        r = client.get(f"{base_url}/subnational/states")
        assert r.status_code == 200
        items = r.json()["data"]
        if not items:
            pytest.skip("No subnational data loaded")
        for state in items[:3]:
            assert "state_code" in state
            assert "total_value_mxn" in state

    def test_list_states_pagination(self, client, base_url):
        """List endpoint returns all states — no server-side pagination."""
        r = client.get(f"{base_url}/subnational/states")
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert isinstance(data["data"], list)

    def test_list_states_sector_filter(self, client, base_url):
        r = client.get(f"{base_url}/subnational/states?sector_id=1")
        assert r.status_code == 200

    def test_list_states_year_filter(self, client, base_url):
        r = client.get(f"{base_url}/subnational/states?year=2023")
        assert r.status_code == 200

    def test_list_states_sector_filter_returns_200(self, client, base_url):
        """sector_id filter is accepted without error."""
        r = client.get(f"{base_url}/subnational/states?sector_id=1")
        assert r.status_code == 200


class TestStateDetail:
    """Tests for GET /subnational/states/{code}."""

    def _get_valid_code(self, client, base_url):
        r = client.get(f"{base_url}/subnational/states?per_page=1")
        if r.status_code == 200 and r.json()["data"]:
            return r.json()["data"][0]["state_code"]
        return None

    def test_state_detail_valid(self, client, base_url):
        code = self._get_valid_code(client, base_url)
        if not code:
            pytest.skip("No subnational data loaded")
        r = client.get(f"{base_url}/subnational/states/{code}")
        assert r.status_code == 200
        data = r.json()
        assert "state_code" in data
        assert data["state_code"] == code

    def test_state_detail_has_stats(self, client, base_url):
        code = self._get_valid_code(client, base_url)
        if not code:
            pytest.skip("No subnational data loaded")
        r = client.get(f"{base_url}/subnational/states/{code}")
        assert r.status_code == 200
        data = r.json()
        assert "state_code" in data
        assert "total_value_mxn" in data

    def test_state_detail_invalid_code_returns_404(self, client, base_url):
        r = client.get(f"{base_url}/subnational/states/XX")
        assert r.status_code in [404, 422]

    def test_state_detail_lowercase_code(self, client, base_url):
        code = self._get_valid_code(client, base_url)
        if not code:
            pytest.skip("No subnational data loaded")
        r = client.get(f"{base_url}/subnational/states/{code.lower()}")
        # Should either normalize or 404 — not 500
        assert r.status_code in [200, 404, 422]


class TestStateVendors:
    """Tests for GET /subnational/states/{code}/vendors."""

    def _get_valid_code(self, client, base_url):
        r = client.get(f"{base_url}/subnational/states?per_page=1")
        if r.status_code == 200 and r.json()["data"]:
            return r.json()["data"][0]["state_code"]
        return None

    def test_state_vendors_returns_200(self, client, base_url):
        code = self._get_valid_code(client, base_url)
        if not code:
            pytest.skip("No subnational data loaded")
        r = client.get(f"{base_url}/subnational/states/{code}/vendors")
        assert r.status_code == 200

    def test_state_vendors_has_vendors_list(self, client, base_url):
        code = self._get_valid_code(client, base_url)
        if not code:
            pytest.skip("No subnational data loaded")
        r = client.get(f"{base_url}/subnational/states/{code}/vendors")
        assert r.status_code == 200
        data = r.json()
        assert "state_code" in data
        assert "vendors" in data
        assert isinstance(data["vendors"], list)

    def test_state_vendors_invalid_code(self, client, base_url):
        r = client.get(f"{base_url}/subnational/states/XX/vendors")
        assert r.status_code in [404, 422]


class TestStateInstitutions:
    """Tests for GET /subnational/states/{code}/institutions."""

    def _get_valid_code(self, client, base_url):
        r = client.get(f"{base_url}/subnational/states?per_page=1")
        if r.status_code == 200 and r.json()["data"]:
            return r.json()["data"][0]["state_code"]
        return None

    def test_state_institutions_returns_200(self, client, base_url):
        code = self._get_valid_code(client, base_url)
        if not code:
            pytest.skip("No subnational data loaded")
        r = client.get(f"{base_url}/subnational/states/{code}/institutions")
        assert r.status_code == 200

    def test_state_institutions_has_data(self, client, base_url):
        code = self._get_valid_code(client, base_url)
        if not code:
            pytest.skip("No subnational data loaded")
        r = client.get(f"{base_url}/subnational/states/{code}/institutions")
        assert r.status_code == 200
        data = r.json()
        assert "state_code" in data
        assert "institutions" in data
        assert isinstance(data["institutions"], list)

    def test_state_institutions_invalid_code(self, client, base_url):
        r = client.get(f"{base_url}/subnational/states/XX/institutions")
        assert r.status_code in [404, 422]


class TestStateSectors:
    """Tests for GET /subnational/states/{code}/sectors."""

    def _get_valid_code(self, client, base_url):
        r = client.get(f"{base_url}/subnational/states?per_page=1")
        if r.status_code == 200 and r.json()["data"]:
            return r.json()["data"][0]["state_code"]
        return None

    def test_state_sectors_returns_200(self, client, base_url):
        code = self._get_valid_code(client, base_url)
        if not code:
            pytest.skip("No subnational data loaded")
        r = client.get(f"{base_url}/subnational/states/{code}/sectors")
        assert r.status_code == 200

    def test_state_sectors_has_data(self, client, base_url):
        code = self._get_valid_code(client, base_url)
        if not code:
            pytest.skip("No subnational data loaded")
        r = client.get(f"{base_url}/subnational/states/{code}/sectors")
        assert r.status_code == 200
        data = r.json()
        assert "state_code" in data
        assert "sectors" in data
        assert isinstance(data["sectors"], list)

    def test_state_sectors_invalid_code(self, client, base_url):
        r = client.get(f"{base_url}/subnational/states/XX/sectors")
        assert r.status_code in [404, 422]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
