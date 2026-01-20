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

    def test_anomalies_with_sector(self, client, base_url):
        """Test detecting anomalies filtered by sector."""
        response = client.get(f"{base_url}/analysis/anomalies?sector_id=1")
        assert response.status_code == 200
        data = response.json()
        assert data["filters_applied"].get("sector_id") == 1

    def test_anomalies_with_year(self, client, base_url):
        """Test detecting anomalies filtered by year."""
        response = client.get(f"{base_url}/analysis/anomalies?year=2023")
        assert response.status_code == 200
        data = response.json()
        assert data["filters_applied"].get("year") == 2023

    def test_anomalies_severity_filter(self, client, base_url):
        """Test filtering anomalies by minimum severity."""
        response = client.get(f"{base_url}/analysis/anomalies?min_severity=high")
        assert response.status_code == 200
        data = response.json()
        # All returned anomalies should be high or critical
        for anomaly in data["data"]:
            assert anomaly["severity"] in ["high", "critical"]

    def test_anomalies_anomaly_type_filter(self, client, base_url):
        """Test filtering by specific anomaly type."""
        response = client.get(f"{base_url}/analysis/anomalies?anomaly_type=price_outlier")
        assert response.status_code == 200
        data = response.json()
        # All returned anomalies should be of the specified type
        for anomaly in data["data"]:
            assert anomaly["anomaly_type"] == "price_outlier"

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
    """Tests for GET /analysis/sector-comparison endpoint."""

    def test_sector_comparison_default(self, client, base_url):
        """Test sector comparison with default metric."""
        response = client.get(f"{base_url}/analysis/sector-comparison")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_sector_comparison_by_risk(self, client, base_url):
        """Test sector comparison by risk metric."""
        response = client.get(f"{base_url}/analysis/sector-comparison?metric=risk")
        assert response.status_code == 200


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
