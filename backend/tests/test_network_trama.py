"""
Tests for La Trama (/network) Phase A endpoints.

Covers: GET /network/communities/index (enriched community index) and
GET /network/communities/{id}/graph (real co-bidding force graph).
"""


class TestCommunityIndex:
    """Tests for GET /network/communities/index."""

    def test_index_returns_200_with_shape(self, client, base_url):
        response = client.get(f"{base_url}/network/communities/index")
        assert response.status_code == 200
        data = response.json()
        assert "communities" in data
        assert "total_communities" in data
        assert "generated_at" in data
        assert len(data["communities"]) > 0
        assert len(data["communities"]) <= 250

    def test_index_item_fields(self, client, base_url):
        response = client.get(f"{base_url}/network/communities/index")
        item = response.json()["communities"][0]
        for field in (
            "community_id", "size", "hub_vendor_id", "hub_vendor_name",
            "avg_risk", "total_value_mxn", "da_rate", "sb_rate",
            "dominant_sector_name", "pattern_mix", "labeled_count",
            "gt_vendor_count", "sanctioned_count",
        ):
            assert field in item

    def test_index_ordered_by_value_desc(self, client, base_url):
        response = client.get(f"{base_url}/network/communities/index")
        values = [c["total_value_mxn"] for c in response.json()["communities"]]
        assert values == sorted(values, reverse=True)

    def test_index_sizes_at_least_5(self, client, base_url):
        response = client.get(f"{base_url}/network/communities/index")
        assert all(c["size"] >= 5 for c in response.json()["communities"])

    def test_index_values_sane(self, client, base_url):
        """No community should exceed 10T MXN (data validation culture)."""
        response = client.get(f"{base_url}/network/communities/index")
        assert all(
            c["total_value_mxn"] <= 10_000_000_000_000
            for c in response.json()["communities"]
        )

    def test_index_hub_names_nonempty(self, client, base_url):
        response = client.get(f"{base_url}/network/communities/index")
        assert all(c["hub_vendor_name"].strip() for c in response.json()["communities"])

    def test_index_pattern_mix_top3(self, client, base_url):
        response = client.get(f"{base_url}/network/communities/index")
        for c in response.json()["communities"]:
            assert len(c["pattern_mix"]) <= 3
            for m in c["pattern_mix"]:
                assert "pattern" in m and "count" in m


class TestCommunityGraph:
    """Tests for GET /network/communities/{id}/graph."""

    def _smallest_community(self, client, base_url):
        response = client.get(f"{base_url}/network/communities/index")
        comms = response.json()["communities"]
        return min(comms, key=lambda c: c["size"])

    def _largest_community(self, client, base_url):
        response = client.get(f"{base_url}/network/communities/index")
        comms = response.json()["communities"]
        return max(comms, key=lambda c: c["size"])

    def test_graph_returns_200_with_shape(self, client, base_url):
        comm = self._smallest_community(client, base_url)
        response = client.get(f"{base_url}/network/communities/{comm['community_id']}/graph")
        assert response.status_code == 200
        data = response.json()
        for field in (
            "community_id", "total_members", "rendered_members", "truncated",
            "nodes", "edges", "edges_truncated", "stats",
        ):
            assert field in data
        assert data["community_id"] == comm["community_id"]
        assert data["total_members"] == comm["size"]

    def test_graph_node_fields(self, client, base_url):
        comm = self._smallest_community(client, base_url)
        response = client.get(f"{base_url}/network/communities/{comm['community_id']}/graph")
        node = response.json()["nodes"][0]
        for field in (
            "vendor_id", "name", "pagerank", "degree", "risk_score",
            "total_value_mxn", "contract_count", "is_sanctioned",
            "primary_pattern", "gt_case_count",
        ):
            assert field in node

    def test_graph_edges_reference_rendered_nodes(self, client, base_url):
        comm = self._largest_community(client, base_url)
        response = client.get(f"{base_url}/network/communities/{comm['community_id']}/graph")
        data = response.json()
        node_ids = {n["vendor_id"] for n in data["nodes"]}
        for e in data["edges"]:
            assert e["a"] in node_ids
            assert e["b"] in node_ids

    def test_graph_giant_truncated_to_100(self, client, base_url):
        comm = self._largest_community(client, base_url)
        if comm["size"] <= 150:
            return  # no giant in index — nothing to assert
        response = client.get(f"{base_url}/network/communities/{comm['community_id']}/graph")
        data = response.json()
        assert data["truncated"] is True
        assert data["rendered_members"] == 100
        assert data["total_members"] == comm["size"]

    def test_graph_small_not_truncated(self, client, base_url):
        comm = self._smallest_community(client, base_url)
        if comm["size"] > 150:
            return
        response = client.get(f"{base_url}/network/communities/{comm['community_id']}/graph")
        data = response.json()
        assert data["truncated"] is False
        assert data["rendered_members"] == data["total_members"]

    def test_graph_edge_cap(self, client, base_url):
        comm = self._largest_community(client, base_url)
        response = client.get(f"{base_url}/network/communities/{comm['community_id']}/graph")
        assert len(response.json()["edges"]) <= 2500

    def test_graph_stats_fields(self, client, base_url):
        comm = self._smallest_community(client, base_url)
        response = client.get(f"{base_url}/network/communities/{comm['community_id']}/graph")
        stats = response.json()["stats"]
        for field in (
            "total_value_mxn", "da_rate", "sb_rate", "avg_risk",
            "pattern_mix", "labeled_count", "gt_vendor_count", "sanctioned_count",
        ):
            assert field in stats

    def test_graph_unknown_community_404(self, client, base_url):
        response = client.get(f"{base_url}/network/communities/99999999/graph")
        assert response.status_code == 404

    def test_index_route_not_shadowed_by_int_path(self, client, base_url):
        """Literal /communities/index must not hit /communities/{community_id:int}."""
        response = client.get(f"{base_url}/network/communities/index")
        assert response.status_code == 200
        assert "communities" in response.json()


class TestInstitutionCapture:
    """Tests for GET /network/institution-capture (Phase C lens)."""

    def test_capture_returns_200_with_shape(self, client, base_url):
        response = client.get(f"{base_url}/network/institution-capture?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "institutions" in data and "total" in data
        assert 0 < len(data["institutions"]) <= 10

    def test_capture_item_fields(self, client, base_url):
        response = client.get(f"{base_url}/network/institution-capture?limit=5")
        item = response.json()["institutions"][0]
        for field in (
            "institution_id", "name", "sector_id", "total_value_mxn",
            "total_contracts", "vendor_count", "direct_award_pct",
            "single_bid_pct", "avg_risk_score", "top1_vendor",
            "top1_share_pct", "latest_hhi", "feeding_communities",
        ):
            assert field in item

    def test_capture_sort_top1_share(self, client, base_url):
        response = client.get(f"{base_url}/network/institution-capture?limit=20&sort=top1_share")
        shares = [i["top1_share_pct"] or 0 for i in response.json()["institutions"]]
        assert shares == sorted(shares, reverse=True)

    def test_capture_invalid_sort_422(self, client, base_url):
        response = client.get(f"{base_url}/network/institution-capture?sort=bogus")
        assert response.status_code == 422

    def test_capture_top1_share_bounded(self, client, base_url):
        response = client.get(f"{base_url}/network/institution-capture?limit=120")
        for i in response.json()["institutions"]:
            if i["top1_share_pct"] is not None:
                assert 0 <= i["top1_share_pct"] <= 100


class TestInstitutionStar:
    """Tests for GET /network/institution-capture/{id}/star."""

    def test_star_returns_200_with_shape(self, client, base_url):
        cap = client.get(f"{base_url}/network/institution-capture?limit=1")
        iid = cap.json()["institutions"][0]["institution_id"]
        response = client.get(f"{base_url}/network/institution-capture/{iid}/star")
        assert response.status_code == 200
        data = response.json()
        for field in ("institution_id", "name", "sector_id", "total_value_mxn", "total_vendors", "vendors"):
            assert field in data
        assert 0 < len(data["vendors"]) <= 30
        v = data["vendors"][0]
        for field in (
            "vendor_id", "vendor_name", "total_value_mxn", "avg_risk_score",
            "contract_count", "community_id", "is_sanctioned",
        ):
            assert field in v

    def test_star_unknown_institution_404(self, client, base_url):
        response = client.get(f"{base_url}/network/institution-capture/99999999/star")
        assert response.status_code == 404
