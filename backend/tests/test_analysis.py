"""
Tests for analysis API endpoints.
"""
import pytest


class TestAnalysisOverview:
    """Tests for GET /analysis/overview endpoint."""

    def test_analysis_overview(self, client, base_url):
        """Test getting analysis overview."""
        response = client.get(f"{base_url}/analysis/overview")
        assert response.status_code == 200
        data = response.json()
        assert "total_contracts" in data
        assert "total_value_mxn" in data
        assert "avg_risk_score" in data


class TestAnalysisRiskDistribution:
    """Tests for GET /analysis/risk-distribution endpoint."""

    def test_risk_distribution_default(self, client, base_url):
        """Test getting risk distribution."""
        response = client.get(f"{base_url}/analysis/risk-distribution")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_risk_distribution_with_sector(self, client, base_url):
        """Test risk distribution filtered by sector."""
        response = client.get(f"{base_url}/analysis/risk-distribution?sector_id=1")
        assert response.status_code == 200


class TestAnalysisAnomalies:
    """Tests for GET /analysis/anomalies endpoint."""

    def test_anomalies_default(self, client, base_url):
        """Test detecting anomalies with default parameters."""
        response = client.get(f"{base_url}/analysis/anomalies")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        assert "filters_applied" in data

    def test_anomalies_with_severity_critical(self, client, base_url):
        """Test detecting anomalies filtered to critical only."""
        response = client.get(f"{base_url}/analysis/anomalies?severity=critical")
        assert response.status_code == 200
        data = response.json()
        for anomaly in data["data"]:
            assert anomaly["severity"] == "critical"

    def test_anomalies_filters_applied_field(self, client, base_url):
        """Test that filters_applied reflects the severity parameter."""
        response = client.get(f"{base_url}/analysis/anomalies?severity=high")
        assert response.status_code == 200
        data = response.json()
        assert data["filters_applied"].get("severity") == "high"

    def test_anomalies_severity_filter(self, client, base_url):
        """Test filtering anomalies by minimum severity."""
        response = client.get(f"{base_url}/analysis/anomalies?severity=high")
        assert response.status_code == 200
        data = response.json()
        # All returned anomalies should be high or critical
        for anomaly in data["data"]:
            assert anomaly["severity"] in ["high", "critical"]

    def test_anomalies_have_valid_types(self, client, base_url):
        """Test that anomalies have valid anomaly_type values."""
        response = client.get(f"{base_url}/analysis/anomalies")
        assert response.status_code == 200
        data = response.json()
        valid_types = {
            "high_risk_concentration", "direct_award_concentration",
            "sector_risk", "year_activity", "price_outlier",
            "vendor_concentration", "year_end_spike",
        }
        for anomaly in data["data"]:
            assert anomaly["anomaly_type"] in valid_types, (
                f"Unexpected anomaly_type: {anomaly['anomaly_type']}"
            )

    def test_anomalies_response_structure(self, client, base_url):
        """Test that anomaly response has correct structure."""
        response = client.get(f"{base_url}/analysis/anomalies")
        assert response.status_code == 200
        data = response.json()

        if data["data"]:
            anomaly = data["data"][0]
            assert "anomaly_type" in anomaly
            assert "severity" in anomaly
            assert "description" in anomaly
            assert "affected_contracts" in anomaly
            assert "affected_value_mxn" in anomaly


class TestAnalysisSectorComparison:
    """Tests for sector comparison endpoints under /sectors/analysis/."""

    def test_vendor_concentration_comparison(self, client, base_url):
        """Test vendor concentration across sectors."""
        response = client.get(f"{base_url}/analysis/vendor-concentration")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_direct_award_rate_comparison(self, client, base_url):
        """Test direct award rate across sectors."""
        response = client.get(f"{base_url}/analysis/direct-award-rate")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data


class TestAnalysisYearOverYear:
    """Tests for GET /analysis/year-over-year endpoint."""

    def test_year_over_year_default(self, client, base_url):
        """Test year over year analysis."""
        response = client.get(f"{base_url}/analysis/year-over-year")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_year_over_year_with_sector(self, client, base_url):
        """Test year over year filtered by sector."""
        response = client.get(f"{base_url}/analysis/year-over-year?sector_id=1")
        assert response.status_code == 200


class TestAnalysisPerCaseDetection:
    """Tests for GET /analysis/validation/per-case-detection endpoint."""

    def test_per_case_detection_returns_list(self, client, base_url):
        response = client.get(f"{base_url}/analysis/validation/per-case-detection")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        assert isinstance(data["data"], list)

    def test_per_case_detection_structure(self, client, base_url):
        response = client.get(f"{base_url}/analysis/validation/per-case-detection")
        data = response.json()
        if data["data"]:
            case = data["data"][0]
            assert "case_name" in case
            assert "total_contracts" in case
            assert "detection_rate" in case
            assert 0 <= case["detection_rate"] <= 1


class TestAnalysisFeatureImportance:
    """Tests for GET /analysis/feature-importance (v5.2 SHAP)."""

    def test_feature_importance_returns_200(self, client, base_url):
        response = client.get(f"{base_url}/analysis/feature-importance")
        assert response.status_code == 200

    def test_feature_importance_structure(self, client, base_url):
        response = client.get(f"{base_url}/analysis/feature-importance")
        assert response.status_code == 200
        data = response.json()
        assert "features" in data
        assert isinstance(data["features"], list)

    def test_feature_importance_item_fields(self, client, base_url):
        response = client.get(f"{base_url}/analysis/feature-importance")
        data = response.json()
        if data.get("features"):
            item = data["features"][0]
            assert "factor_name" in item
            assert "rank" in item
            assert "direction" in item

    def test_feature_importance_sector_filter(self, client, base_url):
        response = client.get(f"{base_url}/analysis/feature-importance?sector_id=1")
        assert response.status_code == 200


class TestAnalysisPyodAgreement:
    """Tests for GET /analysis/pyod-agreement (v5.2 cross-model)."""

    def test_pyod_agreement_returns_200(self, client, base_url):
        response = client.get(f"{base_url}/analysis/pyod-agreement")
        assert response.status_code == 200

    def test_pyod_agreement_structure(self, client, base_url):
        response = client.get(f"{base_url}/analysis/pyod-agreement")
        data = response.json()
        assert "both_flagged" in data
        assert "confirmation_rate" in data
        assert "by_risk_level" in data

    def test_pyod_agreement_types(self, client, base_url):
        response = client.get(f"{base_url}/analysis/pyod-agreement")
        data = response.json()
        assert isinstance(data["both_flagged"], int)
        assert isinstance(data["confirmation_rate"], float)


class TestAnalysisDrift:
    """Tests for GET /analysis/drift (v5.2 Evidently drift)."""

    def test_drift_returns_200_or_404(self, client, base_url):
        """Drift endpoint returns 200 if data exists, 404 if not yet computed."""
        response = client.get(f"{base_url}/analysis/drift")
        assert response.status_code in (200, 404)

    def test_drift_structure_when_present(self, client, base_url):
        response = client.get(f"{base_url}/analysis/drift")
        if response.status_code == 200:
            data = response.json()
            assert "dataset_drift" in data
            assert "n_drifted" in data
            assert "drifted_features" in data
            assert isinstance(data["drifted_features"], list)
