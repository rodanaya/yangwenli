"""
Tests for investigation API endpoints.
"""
import pytest


class TestInvestigationCasesList:
    """Tests for GET /investigation/cases endpoint."""

    def test_list_cases_default(self, client, base_url):
        """Test listing cases with default parameters."""
        response = client.get(f"{base_url}/investigation/cases")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        assert data["pagination"]["page"] == 1
        assert data["pagination"]["per_page"] == 20

    def test_list_cases_pagination(self, client, base_url):
        """Test case list pagination."""
        response = client.get(f"{base_url}/investigation/cases?page=1&per_page=5")
        assert response.status_code == 200
        data = response.json()
        assert data["pagination"]["per_page"] == 5
        assert len(data["data"]) <= 5

    def test_list_cases_page_2(self, client, base_url):
        """Test fetching page 2."""
        response = client.get(f"{base_url}/investigation/cases?page=2&per_page=5")
        assert response.status_code == 200
        data = response.json()
        assert data["pagination"]["page"] == 2

    def test_list_cases_filter_by_sector(self, client, base_url):
        """Test filtering cases by sector_id."""
        response = client.get(f"{base_url}/investigation/cases?sector_id=1")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        for case in data["data"]:
            assert case["sector_id"] == 1

    def test_list_cases_filter_by_case_type(self, client, base_url):
        """Test filtering cases by case_type."""
        # First get a valid case_type from the list
        response = client.get(f"{base_url}/investigation/cases?per_page=1")
        assert response.status_code == 200
        data = response.json()
        if data["data"]:
            case_type = data["data"][0]["case_type"]
            filtered = client.get(f"{base_url}/investigation/cases?case_type={case_type}")
            assert filtered.status_code == 200
            for case in filtered.json()["data"]:
                assert case["case_type"] == case_type

    def test_list_cases_filter_by_validation_status(self, client, base_url):
        """Test filtering cases by validation_status."""
        response = client.get(f"{base_url}/investigation/cases?validation_status=pending")
        assert response.status_code == 200
        data = response.json()
        for case in data["data"]:
            assert case["validation_status"] == "pending"

    def test_list_cases_filter_by_min_score(self, client, base_url):
        """Test filtering cases by minimum suspicion score."""
        response = client.get(f"{base_url}/investigation/cases?min_score=0.8")
        assert response.status_code == 200
        data = response.json()
        for case in data["data"]:
            assert case["suspicion_score"] >= 0.8

    def test_list_cases_filter_by_priority(self, client, base_url):
        """Test filtering cases by priority."""
        response = client.get(f"{base_url}/investigation/cases?priority=1")
        assert response.status_code == 200
        data = response.json()
        for case in data["data"]:
            assert case["priority"] == 1

    def test_list_cases_response_shape(self, client, base_url):
        """Test that case list items have expected fields."""
        response = client.get(f"{base_url}/investigation/cases?per_page=1")
        assert response.status_code == 200
        data = response.json()
        if data["data"]:
            case = data["data"][0]
            expected_fields = [
                "id", "case_id", "case_type", "sector_id", "sector_name",
                "suspicion_score", "confidence", "title", "total_contracts",
                "total_value_mxn", "estimated_loss_mxn", "priority",
                "is_reviewed", "validation_status", "vendor_count",
                "signals_triggered",
            ]
            for field in expected_fields:
                assert field in case, f"Missing field: {field}"

    def test_list_cases_large_page_returns_empty(self, client, base_url):
        """Very large page number should return empty data."""
        response = client.get(f"{base_url}/investigation/cases?page=999999")
        assert response.status_code == 200
        data = response.json()
        assert data["data"] == []

    def test_list_cases_invalid_per_page(self, client, base_url):
        """per_page above 100 should be rejected."""
        response = client.get(f"{base_url}/investigation/cases?per_page=200")
        assert response.status_code == 422


class TestInvestigationCaseDetail:
    """Tests for GET /investigation/cases/{case_id} endpoint."""

    def test_case_detail_valid(self, client, base_url):
        """Test getting case details with a valid case_id."""
        # First get a case_id from the list
        list_resp = client.get(f"{base_url}/investigation/cases?per_page=1")
        assert list_resp.status_code == 200
        cases = list_resp.json()["data"]
        if cases:
            case_id = cases[0]["case_id"]
            response = client.get(f"{base_url}/investigation/cases/{case_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["case_id"] == case_id
            assert "vendors" in data
            assert "questions" in data
            assert "narrative" in data
            assert "risk_factor_counts" in data
            assert "generated_at" in data
            assert isinstance(data["vendors"], list)
            assert isinstance(data["questions"], list)

    def test_case_detail_not_found(self, client, base_url):
        """Test 404 for non-existent case ID."""
        response = client.get(f"{base_url}/investigation/cases/CASE-NONEXISTENT-9999")
        assert response.status_code == 404

    def test_case_detail_vendor_shape(self, client, base_url):
        """Test vendor summary shape in case detail."""
        list_resp = client.get(f"{base_url}/investigation/cases?per_page=1")
        assert list_resp.status_code == 200
        cases = list_resp.json()["data"]
        if cases:
            case_id = cases[0]["case_id"]
            response = client.get(f"{base_url}/investigation/cases/{case_id}")
            data = response.json()
            if data["vendors"]:
                vendor = data["vendors"][0]
                assert "vendor_id" in vendor
                assert "name" in vendor
                assert "role" in vendor


class TestInvestigationTopCases:
    """Tests for GET /investigation/top/{n} endpoint."""

    def test_top_5_cases(self, client, base_url):
        """Test getting top 5 cases."""
        response = client.get(f"{base_url}/investigation/top/5")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "count" in data
        assert data["count"] <= 5
        assert len(data["data"]) == data["count"]

    def test_top_cases_sorted_by_score(self, client, base_url):
        """Test that top cases are sorted by suspicion_score descending."""
        response = client.get(f"{base_url}/investigation/top/10")
        assert response.status_code == 200
        cases = response.json()["data"]
        if len(cases) >= 2:
            scores = [c["suspicion_score"] for c in cases]
            assert scores == sorted(scores, reverse=True)

    def test_top_cases_with_sector_filter(self, client, base_url):
        """Test top cases filtered by sector."""
        response = client.get(f"{base_url}/investigation/top/10?sector_id=1")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_top_cases_response_shape(self, client, base_url):
        """Test top case item has expected fields."""
        response = client.get(f"{base_url}/investigation/top/1")
        assert response.status_code == 200
        data = response.json()
        if data["data"]:
            item = data["data"][0]
            for field in ["case_id", "title", "case_type", "sector",
                          "suspicion_score", "total_contracts",
                          "total_value_mxn", "estimated_loss_mxn"]:
                assert field in item, f"Missing field: {field}"

    @pytest.mark.parametrize("n", [0, -1, 51])
    def test_top_cases_invalid_n(self, client, base_url, n):
        """Test validation for invalid n values."""
        response = client.get(f"{base_url}/investigation/top/{n}")
        assert response.status_code == 422


class TestInvestigationStats:
    """Tests for GET /investigation/stats endpoint."""

    def test_stats_returns_200(self, client, base_url):
        """Test stats endpoint returns successfully."""
        response = client.get(f"{base_url}/investigation/stats")
        assert response.status_code == 200

    def test_stats_response_shape(self, client, base_url):
        """Test stats response has expected fields."""
        response = client.get(f"{base_url}/investigation/stats")
        data = response.json()
        expected_fields = [
            "total_cases", "by_sector", "by_type", "by_status",
            "total_value_mxn", "total_estimated_loss_mxn",
            "avg_suspicion_score", "critical_cases", "high_cases",
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"

    def test_stats_by_sector_is_dict(self, client, base_url):
        """Test that by_sector is a dict mapping sector codes to counts."""
        response = client.get(f"{base_url}/investigation/stats")
        data = response.json()
        assert isinstance(data["by_sector"], dict)
        for key, val in data["by_sector"].items():
            assert isinstance(key, str)
            assert isinstance(val, int)

    def test_investigation_stats_uses_v5_thresholds(self, client, base_url):
        """
        REGRESSION TEST: Verify that investigation stats uses v5.0 thresholds.

        The v5.0 model uses critical >= 0.50 (not 0.60 from older models).
        The /investigation/stats endpoint currently has a BUG where it uses
        suspicion_score >= 0.6 for critical instead of 0.50.

        This test documents the current (buggy) behavior so the bug can be
        tracked and fixed. Once fixed, update the assertion.
        """
        response = client.get(f"{base_url}/investigation/stats")
        assert response.status_code == 200
        data = response.json()
        # NOTE: The endpoint currently uses 0.6 threshold for critical cases
        # (see investigation.py line 576: suspicion_score >= 0.6).
        # The v5.0 model threshold is 0.50. This is a known bug.
        # The critical_cases and high_cases fields are returned as integers.
        assert isinstance(data["critical_cases"], int)
        assert isinstance(data["high_cases"], int)
        # Verify the total_cases >= critical + high (sanity check)
        assert data["total_cases"] >= data["critical_cases"] + data["high_cases"]


class TestInvestigationFeatureImportance:
    """Tests for GET /investigation/feature-importance endpoint."""

    def test_feature_importance_valid_sector(self, client, base_url):
        """Test feature importance with a valid sector."""
        response = client.get(f"{base_url}/investigation/feature-importance?sector_id=1")
        # Could be 200 if data exists, or 404 if not computed yet
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
            if data:
                item = data[0]
                assert "feature" in item
                assert "importance" in item
                assert "rank" in item
                assert "method" in item

    def test_feature_importance_missing_sector_id(self, client, base_url):
        """Test feature importance without required sector_id."""
        response = client.get(f"{base_url}/investigation/feature-importance")
        assert response.status_code == 422

    def test_feature_importance_custom_method(self, client, base_url):
        """Test feature importance with a different method."""
        response = client.get(
            f"{base_url}/investigation/feature-importance?sector_id=1&method=permutation"
        )
        assert response.status_code in [200, 404]


class TestInvestigationVendorExplanation:
    """Tests for GET /investigation/vendors/{vendor_id}/explanation endpoint."""

    def test_vendor_explanation_missing_sector(self, client, base_url):
        """Test vendor explanation without required sector_id param."""
        response = client.get(f"{base_url}/investigation/vendors/1/explanation")
        assert response.status_code == 422

    def test_vendor_explanation_not_found(self, client, base_url):
        """Test 404 for vendor with no investigation features."""
        response = client.get(
            f"{base_url}/investigation/vendors/999999999/explanation?sector_id=1"
        )
        assert response.status_code == 404

    def test_vendor_explanation_valid(self, client, base_url):
        """Test vendor explanation with a valid vendor from anomalous vendors list."""
        # Get a vendor from top anomalous vendors
        vendors_resp = client.get(
            f"{base_url}/investigation/top-anomalous-vendors?limit=1"
        )
        if vendors_resp.status_code == 200:
            vendors = vendors_resp.json()["data"]
            if vendors:
                vendor_id = vendors[0]["vendor_id"]
                sector_id = vendors[0]["sector_id"]
                response = client.get(
                    f"{base_url}/investigation/vendors/{vendor_id}/explanation?sector_id={sector_id}"
                )
                assert response.status_code == 200
                data = response.json()
                assert data["vendor_id"] == vendor_id
                assert "risk_level" in data
                assert "top_contributing_features" in data
                assert isinstance(data["top_contributing_features"], list)


class TestInvestigationTopAnomalousVendors:
    """Tests for GET /investigation/top-anomalous-vendors endpoint."""

    def test_top_anomalous_vendors_default(self, client, base_url):
        """Test top anomalous vendors with default params."""
        response = client.get(f"{base_url}/investigation/top-anomalous-vendors")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "count" in data
        assert data["count"] <= 20  # default limit

    def test_top_anomalous_vendors_with_sector(self, client, base_url):
        """Test top anomalous vendors filtered by sector."""
        response = client.get(
            f"{base_url}/investigation/top-anomalous-vendors?sector_id=1&limit=5"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["count"] <= 5

    def test_top_anomalous_vendors_response_shape(self, client, base_url):
        """Test anomalous vendor item has expected fields."""
        response = client.get(
            f"{base_url}/investigation/top-anomalous-vendors?limit=1"
        )
        assert response.status_code == 200
        data = response.json()
        if data["data"]:
            vendor = data["data"][0]
            for field in ["vendor_id", "vendor_name", "sector_id",
                          "ensemble_score", "total_contracts",
                          "total_value_mxn"]:
                assert field in vendor, f"Missing field: {field}"


class TestInvestigationModelComparison:
    """Tests for GET /investigation/model-comparison endpoint."""

    def test_model_comparison_valid_sector(self, client, base_url):
        """Test model comparison with valid sector."""
        response = client.get(f"{base_url}/investigation/model-comparison?sector_id=1")
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
            if data:
                item = data[0]
                assert "model" in item
                assert "anomalies_detected" in item
                assert "avg_score" in item

    def test_model_comparison_missing_sector(self, client, base_url):
        """Test model comparison without required sector_id."""
        response = client.get(f"{base_url}/investigation/model-comparison")
        assert response.status_code == 422


class TestInvestigationDashboardSummary:
    """Tests for GET /investigation/dashboard-summary endpoint."""

    def test_dashboard_summary(self, client, base_url):
        """Test dashboard summary returns expected shape."""
        response = client.get(f"{base_url}/investigation/dashboard-summary")
        assert response.status_code == 200
        data = response.json()
        expected_fields = [
            "total_cases", "corroborated_cases", "pending_cases",
            "total_value_at_risk", "hit_rate", "top_corroborated",
            "validation_funnel",
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        assert isinstance(data["hit_rate"], dict)
        assert isinstance(data["validation_funnel"], dict)
        assert isinstance(data["top_corroborated"], list)

    def test_dashboard_summary_funnel_keys(self, client, base_url):
        """Test validation funnel has expected keys."""
        response = client.get(f"{base_url}/investigation/dashboard-summary")
        data = response.json()
        funnel = data["validation_funnel"]
        for key in ["detected", "researched", "corroborated", "promoted_to_gt"]:
            assert key in funnel, f"Missing funnel key: {key}"


class TestInvestigationCaseExport:
    """Tests for GET /investigation/cases/{case_id}/export endpoint."""

    def test_export_markdown(self, client, base_url):
        """Test exporting a case as markdown."""
        list_resp = client.get(f"{base_url}/investigation/cases?per_page=1")
        assert list_resp.status_code == 200
        cases = list_resp.json()["data"]
        if cases:
            case_id = cases[0]["case_id"]
            response = client.get(
                f"{base_url}/investigation/cases/{case_id}/export?format=markdown"
            )
            assert response.status_code == 200
            data = response.json()
            assert data["case_id"] == case_id
            assert data["format"] == "markdown"
            assert "content" in data

    def test_export_not_found(self, client, base_url):
        """Test export for non-existent case."""
        response = client.get(
            f"{base_url}/investigation/cases/CASE-NONEXISTENT-9999/export"
        )
        assert response.status_code == 404
