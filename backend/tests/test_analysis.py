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
