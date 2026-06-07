"""
Tests for the M3v2 sector value-at-risk (VaR) fields:
  high_critical_value_mxn = SUM(amount_mxn) over risk_level IN ('high','critical')
  critical_value_mxn      = SUM(amount_mxn) over risk_level = 'critical'

These ride on /api/v1/sectors (list) and /api/v1/sectors/{id} (detail), sourced
from the precomputed_stats 'sectors' blob (patched by scripts._patch_sector_var).

The sectors router caches responses in-process via a module-level SimpleCache. We
invalidate it before the first request so the patched DB values flow through a
cold read of the precomputed blob (rather than a stale pre-patch cached response).
"""
import pytest

from fastapi.testclient import TestClient

from api.main import app
from api.routers import sectors as sectors_router


# Expected high+critical VaR, B MXN (computed 2026-06-07 from RUBLI_NORMALIZED.db).
EXPECTED_SALUD_HC = 1.7225e12
EXPECTED_TOTAL_HC = 5.5257e12
TOLERANCE = 0.02  # 2%


@pytest.fixture(scope="module")
def cold_client():
    """Fresh TestClient with the sectors in-process cache cleared (cold)."""
    sectors_router._cache.invalidate()
    with TestClient(app) as test_client:
        yield test_client


class TestSectorVaRList:
    """GET /api/v1/sectors carries the VaR fields."""

    def test_fields_present_on_every_row(self, cold_client):
        resp = cold_client.get("/api/v1/sectors")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data) == 12, "expected 12 sectors"
        for s in data:
            assert "high_critical_value_mxn" in s, f"missing high_critical on {s.get('sector_code')}"
            assert "critical_value_mxn" in s, f"missing critical on {s.get('sector_code')}"
            assert s["high_critical_value_mxn"] is not None, (
                f"high_critical_value_mxn is None on {s.get('sector_code')}"
            )
            assert s["critical_value_mxn"] is not None, (
                f"critical_value_mxn is None on {s.get('sector_code')}"
            )

    def test_salud_high_critical_within_tolerance(self, cold_client):
        resp = cold_client.get("/api/v1/sectors")
        assert resp.status_code == 200
        data = resp.json()["data"]
        salud = next((s for s in data if s["sector_code"] == "salud"), None)
        assert salud is not None, "salud sector not found"
        hc = salud["high_critical_value_mxn"]
        rel_err = abs(hc - EXPECTED_SALUD_HC) / EXPECTED_SALUD_HC
        assert rel_err <= TOLERANCE, (
            f"salud high_critical={hc:,.0f} expected≈{EXPECTED_SALUD_HC:,.0f} "
            f"(rel_err {rel_err:.3%} > {TOLERANCE:.0%})"
        )

    def test_twelve_sector_sum_within_tolerance(self, cold_client):
        resp = cold_client.get("/api/v1/sectors")
        assert resp.status_code == 200
        data = resp.json()["data"]
        total = sum(s["high_critical_value_mxn"] for s in data)
        rel_err = abs(total - EXPECTED_TOTAL_HC) / EXPECTED_TOTAL_HC
        assert rel_err <= TOLERANCE, (
            f"12-sector sum={total:,.0f} expected≈{EXPECTED_TOTAL_HC:,.0f} "
            f"(rel_err {rel_err:.3%} > {TOLERANCE:.0%})"
        )

    def test_critical_le_high_critical_every_sector(self, cold_client):
        resp = cold_client.get("/api/v1/sectors")
        assert resp.status_code == 200
        data = resp.json()["data"]
        for s in data:
            crit = s["critical_value_mxn"]
            hc = s["high_critical_value_mxn"]
            assert crit <= hc, (
                f"{s['sector_code']}: critical={crit:,.0f} > high_critical={hc:,.0f}"
            )


class TestSectorVaRDetail:
    """GET /api/v1/sectors/{id} statistics carries the VaR fields."""

    def test_detail_carries_fields(self, cold_client):
        resp = cold_client.get("/api/v1/sectors/1")
        assert resp.status_code == 200
        stats = resp.json()["statistics"]
        assert "high_critical_value_mxn" in stats
        assert "critical_value_mxn" in stats
        assert stats["high_critical_value_mxn"] is not None
        assert stats["critical_value_mxn"] is not None
        # Sector 1 is salud — sanity-check the magnitude.
        rel_err = abs(stats["high_critical_value_mxn"] - EXPECTED_SALUD_HC) / EXPECTED_SALUD_HC
        assert rel_err <= TOLERANCE, (
            f"detail salud high_critical={stats['high_critical_value_mxn']:,.0f} "
            f"expected≈{EXPECTED_SALUD_HC:,.0f}"
        )

    def test_detail_critical_le_high_critical(self, cold_client):
        resp = cold_client.get("/api/v1/sectors/1")
        assert resp.status_code == 200
        stats = resp.json()["statistics"]
        assert stats["critical_value_mxn"] <= stats["high_critical_value_mxn"]
