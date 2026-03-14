"""Tests for /api/v1/procurement-health endpoints (PHI)."""
import pytest


PHI_PREFIX = "/api/v1/procurement-health"

INDICATOR_KEYS = {
    "competition_rate",
    "single_bid_rate",
    "avg_bidders",
    "hhi",
    "short_ad_rate",
    "amendment_rate",
}


class TestPHISectors:
    """GET /api/v1/procurement-health/sectors"""

    def test_returns_200(self, client):
        r = client.get(f"{PHI_PREFIX}/sectors")
        assert r.status_code == 200

    def test_has_top_level_keys(self, client):
        data = client.get(f"{PHI_PREFIX}/sectors").json()
        assert "sectors" in data
        assert "national" in data
        assert "methodology" in data
        assert "thresholds" in data

    def test_sectors_is_list(self, client):
        data = client.get(f"{PHI_PREFIX}/sectors").json()
        assert isinstance(data["sectors"], list)
        assert len(data["sectors"]) > 0

    def test_each_sector_has_indicators_and_grade(self, client):
        data = client.get(f"{PHI_PREFIX}/sectors").json()
        for sector in data["sectors"]:
            assert "grade" in sector, f"Missing grade for sector {sector.get('sector_name')}"
            assert "indicators" in sector
            indicators = sector["indicators"]
            for key in INDICATOR_KEYS:
                assert key in indicators, f"Missing indicator {key} in sector {sector.get('sector_name')}"
                ind = indicators[key]
                assert "value" in ind
                assert "light" in ind
                assert ind["light"] in ("green", "yellow", "red")

    def test_national_has_indicators(self, client):
        data = client.get(f"{PHI_PREFIX}/sectors").json()
        national = data["national"]
        assert "indicators" in national
        assert "grade" in national
        for key in INDICATOR_KEYS:
            assert key in national["indicators"]

    def test_methodology_metadata(self, client):
        data = client.get(f"{PHI_PREFIX}/sectors").json()
        meth = data["methodology"]
        assert meth["name"] == "Procurement Health Index (PHI)"
        assert "indicators" in meth
        assert meth["indicators"] == 6

    def test_year_filter(self, client):
        r = client.get(f"{PHI_PREFIX}/sectors", params={"year_min": 2020, "year_max": 2023})
        assert r.status_code == 200
        data = r.json()
        assert len(data["sectors"]) > 0


class TestPHISectorDetail:
    """GET /api/v1/procurement-health/sectors/{sector_id}"""

    def test_returns_200_for_valid_sector(self, client):
        r = client.get(f"{PHI_PREFIX}/sectors/1")
        assert r.status_code == 200

    def test_has_indicators(self, client):
        data = client.get(f"{PHI_PREFIX}/sectors/1").json()
        assert "indicators" in data
        assert "grade" in data
        assert "sector_name" in data
        for key in INDICATOR_KEYS:
            assert key in data["indicators"]

    def test_has_trend(self, client):
        data = client.get(f"{PHI_PREFIX}/sectors/1").json()
        assert "trend" in data
        assert isinstance(data["trend"], list)

    def test_invalid_sector_returns_404(self, client):
        r = client.get(f"{PHI_PREFIX}/sectors/9999")
        assert r.status_code == 404


class TestPHITrend:
    """GET /api/v1/procurement-health/trend"""

    def test_returns_200(self, client):
        r = client.get(f"{PHI_PREFIX}/trend")
        assert r.status_code == 200

    def test_has_years_array(self, client):
        data = client.get(f"{PHI_PREFIX}/trend").json()
        assert "years" in data
        assert isinstance(data["years"], list)
        assert len(data["years"]) > 0

    def test_year_entry_fields(self, client):
        data = client.get(f"{PHI_PREFIX}/trend").json()
        entry = data["years"][0]
        for key in ("year", "grade", "competition_rate", "single_bid_rate",
                     "avg_bidders", "total_contracts"):
            assert key in entry, f"Missing key: {key}"


class TestPHIMLCorrelation:
    """GET /api/v1/procurement-health/ml-correlation"""

    def test_returns_200(self, client):
        r = client.get(f"{PHI_PREFIX}/ml-correlation")
        assert r.status_code == 200

    def test_has_correlations(self, client):
        data = client.get(f"{PHI_PREFIX}/ml-correlation").json()
        assert "correlations" in data
        corr = data["correlations"]
        assert "by_procedure_type" in corr
        assert "by_competition" in corr
        assert "sector_comparison" in corr
        assert "ml_phi_agreement" in corr

    def test_agreement_stats(self, client):
        data = client.get(f"{PHI_PREFIX}/ml-correlation").json()
        agreement = data["correlations"]["ml_phi_agreement"]
        assert "high_risk_contracts" in agreement
        assert "agreement_rate" in agreement
        assert isinstance(agreement["high_risk_contracts"], int)
