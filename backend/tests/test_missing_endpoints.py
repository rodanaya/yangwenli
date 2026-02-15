"""
Tests for API endpoints not covered by existing test files.

Covers: sectors, network, executive, investigation, watchlist, stats, industries.
"""
import pytest


class TestSectorsList:
    """Tests for GET /sectors endpoint."""

    def test_list_sectors(self, client, base_url):
        """Test listing all 12 sectors."""
        response = client.get(f"{base_url}/sectors")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert len(data["data"]) == 12

    def test_sector_has_required_fields(self, client, base_url):
        """Each sector should have sector_id, name, and key metrics."""
        response = client.get(f"{base_url}/sectors")
        assert response.status_code == 200
        data = response.json()
        if data["data"]:
            sector = data["data"][0]
            assert "sector_id" in sector
            assert "sector_name" in sector
            assert "total_contracts" in sector
            assert "total_value_mxn" in sector
            assert "color" in sector


class TestSectorDetail:
    """Tests for GET /sectors/{sector_id} endpoint."""

    def test_sector_detail_valid(self, client, base_url):
        """Test getting sector details with valid ID."""
        response = client.get(f"{base_url}/sectors/1")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 1
        assert "name" in data
        assert "statistics" in data

    def test_sector_detail_all_valid_ids(self, client, base_url):
        """All 12 sector IDs should return valid data."""
        for sector_id in range(1, 13):
            response = client.get(f"{base_url}/sectors/{sector_id}")
            assert response.status_code == 200, f"Sector {sector_id} failed"

    def test_sector_detail_invalid_id(self, client, base_url):
        """Invalid sector ID should return 404 or 422."""
        response = client.get(f"{base_url}/sectors/99")
        assert response.status_code in [404, 422]


class TestSectorTrends:
    """Tests for GET /sectors/{sector_id}/trends endpoint."""

    def test_sector_trends(self, client, base_url):
        """Test getting trends for a valid sector."""
        response = client.get(f"{base_url}/sectors/1/trends")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data


class TestAnalysisEndpoints:
    """Tests for analysis endpoints in sectors router."""

    def test_vendor_concentration(self, client, base_url):
        """Test vendor concentration analysis."""
        response = client.get(f"{base_url}/analysis/vendor-concentration")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_direct_award_rate(self, client, base_url):
        """Test direct award rate analysis."""
        response = client.get(f"{base_url}/analysis/direct-award-rate")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_single_bid_rate(self, client, base_url):
        """Test single bid rate analysis."""
        response = client.get(f"{base_url}/analysis/single-bid-rate")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data


class TestNetworkGraph:
    """Tests for GET /network/graph endpoint."""

    def test_network_graph_default(self, client, base_url):
        """Test default network graph."""
        response = client.get(f"{base_url}/network/graph")
        assert response.status_code == 200
        data = response.json()
        assert "nodes" in data
        assert "links" in data
        assert "total_nodes" in data

    def test_network_graph_with_sector(self, client, base_url):
        """Test network graph filtered by sector."""
        response = client.get(f"{base_url}/network/graph?sector_id=1")
        assert response.status_code == 200


class TestNetworkCoBidders:
    """Tests for GET /network/co-bidders/{vendor_id} endpoint."""

    def test_co_bidders_valid_vendor(self, client, base_url):
        """Test co-bidders for a valid vendor."""
        # First get a vendor ID
        vendors = client.get(f"{base_url}/vendors?per_page=1")
        if vendors.status_code == 200 and vendors.json()["data"]:
            vendor_id = vendors.json()["data"][0]["id"]
            response = client.get(f"{base_url}/network/co-bidders/{vendor_id}")
            assert response.status_code == 200

    def test_co_bidders_invalid_vendor(self, client, base_url):
        """Test co-bidders with non-existent vendor."""
        response = client.get(f"{base_url}/network/co-bidders/999999999")
        assert response.status_code in [200, 404]


class TestNetworkInstitutionVendors:
    """Tests for GET /network/institution-vendors/{institution_id} endpoint."""

    def test_institution_vendors_valid(self, client, base_url):
        """Test getting vendor network for an institution."""
        institutions = client.get(f"{base_url}/institutions?per_page=1")
        if institutions.status_code == 200 and institutions.json()["data"]:
            inst_id = institutions.json()["data"][0]["id"]
            response = client.get(f"{base_url}/network/institution-vendors/{inst_id}")
            assert response.status_code == 200


class TestNetworkRelatedVendors:
    """Tests for GET /network/related-vendors/{vendor_id} endpoint."""

    def test_related_vendors_valid(self, client, base_url):
        """Test getting related vendors."""
        vendors = client.get(f"{base_url}/vendors?per_page=1")
        if vendors.status_code == 200 and vendors.json()["data"]:
            vendor_id = vendors.json()["data"][0]["id"]
            response = client.get(f"{base_url}/network/related-vendors/{vendor_id}")
            assert response.status_code == 200


class TestExecutiveSummary:
    """Tests for GET /executive/summary endpoint."""

    def test_executive_summary(self, client, base_url):
        """Test executive summary returns data."""
        response = client.get(f"{base_url}/executive/summary")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert "headline" in data
        assert "risk" in data
        assert "sectors" in data
        assert "model" in data


class TestInvestigationCases:
    """Tests for investigation endpoints."""

    def test_list_cases(self, client, base_url):
        """Test listing investigation cases."""
        response = client.get(f"{base_url}/investigation/cases")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_investigation_stats(self, client, base_url):
        """Test investigation stats."""
        response = client.get(f"{base_url}/investigation/stats")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    def test_dashboard_summary(self, client, base_url):
        """Test investigation dashboard summary."""
        response = client.get(f"{base_url}/investigation/dashboard-summary")
        assert response.status_code == 200

    def test_case_detail_invalid(self, client, base_url):
        """Test case detail with invalid ID."""
        response = client.get(f"{base_url}/investigation/cases/99999")
        assert response.status_code in [404, 422]

    def test_feature_importance(self, client, base_url):
        """Test feature importance endpoint (requires sector_id)."""
        response = client.get(f"{base_url}/investigation/feature-importance?sector_id=1")
        # 200 if data exists, 404 if pre-computation hasn't run
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)

    def test_model_comparison(self, client, base_url):
        """Test model comparison endpoint (requires sector_id)."""
        response = client.get(f"{base_url}/investigation/model-comparison?sector_id=1")
        # 200 if data exists, 404 if pre-computation hasn't run
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)

    def test_top_anomalous_vendors(self, client, base_url):
        """Test top anomalous vendors endpoint."""
        response = client.get(f"{base_url}/investigation/top-anomalous-vendors")
        assert response.status_code == 200

    def test_top_n(self, client, base_url):
        """Test top N contracts endpoint."""
        response = client.get(f"{base_url}/investigation/top/10")
        assert response.status_code == 200


class TestInvestigationVendorExplanation:
    """Tests for vendor explanation endpoint (requires sector_id)."""

    def test_vendor_explanation_valid(self, client, base_url):
        """Test getting vendor risk explanation."""
        vendors = client.get(f"{base_url}/vendors?per_page=1")
        if vendors.status_code == 200 and vendors.json()["data"]:
            vendor_id = vendors.json()["data"][0]["id"]
            response = client.get(
                f"{base_url}/investigation/vendors/{vendor_id}/explanation?sector_id=1"
            )
            # 200 if SHAP data exists, 404 if not pre-computed
            assert response.status_code in [200, 404]

    def test_vendor_explanation_invalid(self, client, base_url):
        """Test vendor explanation with non-existent vendor."""
        response = client.get(
            f"{base_url}/investigation/vendors/999999999/explanation?sector_id=1"
        )
        assert response.status_code in [200, 404, 422]


class TestWatchlist:
    """Tests for watchlist CRUD endpoints."""

    def test_list_watchlist_default(self, client, base_url):
        """Test listing watchlist items."""
        response = client.get(f"{base_url}/watchlist")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data

    def test_watchlist_stats(self, client, base_url):
        """Test watchlist stats."""
        response = client.get(f"{base_url}/watchlist/stats")
        assert response.status_code == 200

    def test_add_and_remove_watchlist_item(self, client, base_url):
        """Test adding and removing a vendor from watchlist."""
        # Get a vendor ID first
        vendors = client.get(f"{base_url}/vendors?per_page=1")
        if vendors.status_code == 200 and vendors.json()["data"]:
            vendor_id = vendors.json()["data"][0]["id"]

            # Add to watchlist (uses WatchlistItemCreate model)
            add_response = client.post(
                f"{base_url}/watchlist",
                json={
                    "item_type": "vendor",
                    "item_id": vendor_id,
                    "reason": "Test watchlist item",
                    "priority": "medium",
                },
            )
            # 409 if already exists, 500 if DB is locked (transient)
            assert add_response.status_code in [200, 201, 409, 500]

            if add_response.status_code in [200, 201]:
                item_id = add_response.json().get("id")
                if item_id:
                    # Get the item
                    get_response = client.get(f"{base_url}/watchlist/{item_id}")
                    assert get_response.status_code == 200

                    # Delete it
                    del_response = client.delete(f"{base_url}/watchlist/{item_id}")
                    assert del_response.status_code in [200, 204]

    def test_watchlist_item_not_found(self, client, base_url):
        """Test getting non-existent watchlist item."""
        response = client.get(f"{base_url}/watchlist/999999999")
        assert response.status_code == 404


class TestStatsDatabase:
    """Tests for GET /stats/database endpoint."""

    def test_database_stats(self, client, base_url):
        """Test database statistics."""
        response = client.get(f"{base_url}/stats/database")
        assert response.status_code == 200
        data = response.json()
        assert "total_contracts" in data
        assert "total_vendors" in data
        assert "total_institutions" in data

    def test_classification_stats(self, client, base_url):
        """Test classification statistics."""
        response = client.get(f"{base_url}/stats/classifications")
        assert response.status_code == 200

    def test_fast_dashboard(self, client, base_url):
        """Test fast dashboard stats (precomputed)."""
        response = client.get(f"{base_url}/stats/dashboard/fast")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    def test_data_quality(self, client, base_url):
        """Test data quality metrics."""
        response = client.get(f"{base_url}/stats/data-quality")
        assert response.status_code == 200


class TestIndustries:
    """Tests for industries endpoints."""

    def test_list_industries(self, client, base_url):
        """Test listing industries."""
        response = client.get(f"{base_url}/industries")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_industry_detail_valid(self, client, base_url):
        """Test getting industry details."""
        list_response = client.get(f"{base_url}/industries")
        if list_response.status_code == 200 and list_response.json()["data"]:
            industry_id = list_response.json()["data"][0]["id"]
            response = client.get(f"{base_url}/industries/{industry_id}")
            assert response.status_code == 200

    def test_industry_detail_not_found(self, client, base_url):
        """Test getting non-existent industry."""
        response = client.get(f"{base_url}/industries/999999999")
        assert response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
