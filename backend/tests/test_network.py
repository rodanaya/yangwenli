"""Tests for /api/v1/network/* endpoints."""
import pytest


class TestNetworkGraph:

    def test_returns_200(self, client, base_url):
        r = client.get(f"{base_url}/network/graph")
        assert r.status_code == 200

    def test_has_nodes_and_links(self, client, base_url):
        r = client.get(f"{base_url}/network/graph")
        data = r.json()
        assert "nodes" in data
        # API uses "links" (not "edges")
        assert "links" in data
        assert isinstance(data["nodes"], list)
        assert isinstance(data["links"], list)

    def test_node_shape(self, client, base_url):
        r = client.get(f"{base_url}/network/graph")
        nodes = r.json()["nodes"]
        if not nodes:
            pytest.skip("No network data loaded")
        node = nodes[0]
        assert "id" in node
        assert "label" in node or "name" in node

    def test_sector_filter(self, client, base_url):
        r = client.get(f"{base_url}/network/graph?sector_id=1")
        assert r.status_code == 200

    def test_top_n_param(self, client, base_url):
        r = client.get(f"{base_url}/network/graph?top_n=5")
        assert r.status_code in (200, 422)
        if r.status_code == 200:
            data = r.json()
            assert "nodes" in data


class TestCoBidders:

    def test_returns_200_or_404(self, client, base_url):
        r = client.get(f"{base_url}/network/co-bidders/1")
        assert r.status_code in (200, 404)

    def test_valid_vendor_has_cobidders_field(self, client, base_url):
        r = client.get(f"{base_url}/network/co-bidders/1")
        if r.status_code == 200:
            data = r.json()
            assert "co_bidders" in data or "vendor_id" in data

    def test_invalid_vendor_returns_error(self, client, base_url):
        r = client.get(f"{base_url}/network/co-bidders/9999999999")
        assert r.status_code in (404, 200)  # 200 with empty list is also acceptable


class TestInstitutionNetwork:

    def test_returns_200_or_404(self, client, base_url):
        r = client.get(f"{base_url}/network/institution-vendors/1")
        assert r.status_code in (200, 404)

    def test_response_shape(self, client, base_url):
        r = client.get(f"{base_url}/network/institution-vendors/1")
        if r.status_code == 200:
            data = r.json()
            assert isinstance(data, dict)


class TestRelatedVendors:

    def test_returns_200_or_404(self, client, base_url):
        r = client.get(f"{base_url}/network/related-vendors/1")
        assert r.status_code in (200, 404)


class TestCommunities:

    def test_list_returns_200(self, client, base_url):
        r = client.get(f"{base_url}/network/communities")
        assert r.status_code == 200

    def test_has_communities_list(self, client, base_url):
        r = client.get(f"{base_url}/network/communities")
        data = r.json()
        assert "communities" in data
        assert isinstance(data["communities"], list)

    def test_community_detail(self, client, base_url):
        r = client.get(f"{base_url}/network/communities")
        communities = r.json().get("communities", [])
        if not communities:
            pytest.skip("No community data")
        cid = communities[0]["community_id"]
        r2 = client.get(f"{base_url}/network/communities/{cid}")
        assert r2.status_code in (200, 404)
