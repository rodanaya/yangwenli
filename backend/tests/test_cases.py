"""
Tests for Case Library endpoints (GET /cases/...).
"""
import sqlite3

import pytest

from api.dependencies import DB_PATH
import api.routers.cases as cases_router


# ---------------------------------------------------------------------------
# Helpers for seeding / tearing down test data in the stub DB
# ---------------------------------------------------------------------------

_SCANDALS_DDL = """
CREATE TABLE IF NOT EXISTS procurement_scandals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_en VARCHAR(500) NOT NULL,
    name_es VARCHAR(500),
    slug VARCHAR(200) NOT NULL UNIQUE,
    fraud_type VARCHAR(100) NOT NULL,
    administration VARCHAR(50) NOT NULL,
    sector_id INTEGER,
    sector_ids_json TEXT DEFAULT '[]',
    contract_year_start INTEGER,
    contract_year_end INTEGER,
    discovery_year INTEGER,
    amount_mxn_low REAL,
    amount_mxn_high REAL,
    amount_note TEXT,
    severity INTEGER DEFAULT 2,
    legal_status VARCHAR(50) NOT NULL,
    legal_status_note TEXT,
    compranet_visibility VARCHAR(50) NOT NULL,
    compranet_note TEXT,
    summary_en TEXT NOT NULL,
    summary_es TEXT,
    key_actors_json TEXT DEFAULT '[]',
    sources_json TEXT DEFAULT '[]',
    ground_truth_case_id INTEGER,
    investigation_case_ids_json TEXT DEFAULT '[]',
    is_verified INTEGER DEFAULT 1,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""

_GT_VENDORS_DDL = """
CREATE TABLE IF NOT EXISTS ground_truth_vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL,
    vendor_id INTEGER,
    vendor_name_source VARCHAR(500) NOT NULL,
    role VARCHAR(50),
    evidence_strength VARCHAR(20) DEFAULT 'medium',
    match_method VARCHAR(50)
)
"""


def _get_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def _seed_vendor_filter_data():
    """Create tables and insert minimal test data for vendor_id filter tests."""
    conn = _get_conn()
    conn.execute(_SCANDALS_DDL)
    conn.execute(_GT_VENDORS_DDL)

    # Case A — linked to vendor 999 via ground_truth_case_id=42
    conn.execute("""
        INSERT OR IGNORE INTO procurement_scandals
            (name_en, name_es, slug, fraud_type, administration,
             sector_id, sector_ids_json, severity, legal_status,
             compranet_visibility, summary_en, ground_truth_case_id, is_verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "Test Case Alpha", "Caso Alpha", "test-case-alpha",
        "ghost_company", "amlo",
        1, "[1]", 3, "under_investigation",
        "high", "Test summary alpha.", 42, 1,
    ))

    # Case B — different case, NOT linked to vendor 999
    conn.execute("""
        INSERT OR IGNORE INTO procurement_scandals
            (name_en, name_es, slug, fraud_type, administration,
             sector_id, sector_ids_json, severity, legal_status,
             compranet_visibility, summary_en, ground_truth_case_id, is_verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "Test Case Beta", "Caso Beta", "test-case-beta",
        "overpricing", "pena_nieto",
        2, "[2]", 2, "closed",
        "low", "Test summary beta.", 99, 1,
    ))

    # Link case_id=42 to vendor_id=999
    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, role, evidence_strength, match_method)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (42, 999, "VENDOR TEST SA DE CV", "beneficiary", "high", "manual"))

    conn.commit()
    conn.close()


def _teardown_vendor_filter_data():
    """Remove test rows and clear router in-memory cache."""
    conn = _get_conn()
    conn.execute("DELETE FROM procurement_scandals WHERE slug IN ('test-case-alpha', 'test-case-beta')")
    conn.execute("DELETE FROM ground_truth_vendors WHERE vendor_id = 999")
    conn.commit()
    conn.close()
    # Flush router cache so subsequent tests don't see stale data
    with cases_router._cache_lock:
        cases_router._cache.clear()


# ---------------------------------------------------------------------------
# Tests that require the full DB (procurement_scandals populated with real data)
# These are skipped gracefully when running against the stub DB in CI/worktrees.
# ---------------------------------------------------------------------------

class TestCaseLibrary:
    """Tests for the procurement scandals case library."""

    def test_list_cases_returns_list(self, client, base_url):
        """GET /cases returns a non-empty list."""
        response = client.get(f"{base_url}/cases")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_list_cases_has_required_fields(self, client, base_url):
        """Each case has expected fields."""
        response = client.get(f"{base_url}/cases")
        assert response.status_code == 200
        item = response.json()[0]
        for field in ("id", "name_en", "slug", "fraud_type", "administration",
                      "severity", "legal_status", "compranet_visibility", "summary_en"):
            assert field in item, f"Missing field: {field}"

    def test_list_cases_filter_by_fraud_type(self, client, base_url):
        """Filter by fraud_type returns only matching cases."""
        response = client.get(f"{base_url}/cases?fraud_type=ghost_company")
        assert response.status_code == 200
        data = response.json()
        assert all(c["fraud_type"] == "ghost_company" for c in data)

    def test_list_cases_filter_by_administration(self, client, base_url):
        """Filter by administration returns only matching cases."""
        response = client.get(f"{base_url}/cases?administration=amlo")
        assert response.status_code == 200
        data = response.json()
        assert all(c["administration"] == "amlo" for c in data)

    def test_stats_endpoint(self, client, base_url):
        """GET /cases/stats returns aggregate statistics."""
        response = client.get(f"{base_url}/cases/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["total_cases"] > 0
        assert data["total_amount_mxn_low"] > 0
        assert isinstance(data["cases_by_fraud_type"], list)
        assert isinstance(data["cases_by_administration"], list)
        assert data["gt_linked_count"] > 0

    def test_get_case_by_slug(self, client, base_url):
        """GET /cases/{slug} returns full detail."""
        response = client.get(f"{base_url}/cases/imss-ghost-company-network")
        assert response.status_code == 200
        data = response.json()
        assert data["slug"] == "imss-ghost-company-network"
        assert data["ground_truth_case_id"] is not None  # GT data grows; don't pin to a specific ID
        assert isinstance(data["key_actors"], list)
        assert isinstance(data["sources"], list)
        assert len(data["key_actors"]) > 0

    def test_get_case_not_found(self, client, base_url):
        """GET /cases/{slug} with bad slug returns 404."""
        response = client.get(f"{base_url}/cases/nonexistent-slug-xyz")
        assert response.status_code == 404

    def test_cases_by_sector(self, client, base_url):
        """GET /cases/by-sector/{sector_id} returns cases for that sector."""
        # Sector 1 = salud, has IMSS and COVID cases
        response = client.get(f"{base_url}/cases/by-sector/1")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        # All returned cases should involve sector 1
        for case in data:
            assert case["sector_id"] == 1 or 1 in case["sector_ids"]


# ---------------------------------------------------------------------------
# Self-contained vendor_id filter tests — seed own data, always run.
# Regression for P0 bug: vendor_id param was silently ignored, returning
# the full global list instead of cases linked to the given vendor.
# ---------------------------------------------------------------------------

class TestCasesVendorIdFilter:
    """Verify that ?vendor_id=N filters cases via ground_truth_vendors."""

    @pytest.fixture(autouse=True)
    def setup_and_teardown(self):
        _seed_vendor_filter_data()
        # Flush cache so seeded rows are visible to the test client
        with cases_router._cache_lock:
            cases_router._cache.clear()
        yield
        _teardown_vendor_filter_data()

    def test_vendor_id_returns_only_linked_case(self, client, base_url):
        """?vendor_id=999 must return ONLY the case linked via ground_truth_vendors."""
        response = client.get(f"{base_url}/cases?vendor_id=999")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1, f"Expected 1 case for vendor 999, got {len(data)}"
        assert data[0]["slug"] == "test-case-alpha"
        assert data[0]["ground_truth_case_id"] == 42

    def test_vendor_id_no_match_returns_empty(self, client, base_url):
        """?vendor_id=998 must return [] — no cases linked to a non-existent vendor."""
        response = client.get(f"{base_url}/cases?vendor_id=998")
        assert response.status_code == 200
        data = response.json()
        assert data == [], f"Expected empty list for vendor 998, got {data}"

    def test_vendor_id_response_includes_linked_vendor_ids(self, client, base_url):
        """When vendor_id filter is active, linked_vendor_ids must be populated."""
        response = client.get(f"{base_url}/cases?vendor_id=999")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert "linked_vendor_ids" in data[0]
        assert data[0]["linked_vendor_ids"] is not None
        assert 999 in data[0]["linked_vendor_ids"]

    def test_unfiltered_list_does_not_expose_linked_vendor_ids(self, client, base_url):
        """Without vendor_id filter, linked_vendor_ids must be null (not populated)."""
        response = client.get(f"{base_url}/cases")
        assert response.status_code == 200
        data = response.json()
        # All items should have linked_vendor_ids as null when no filter is active
        for item in data:
            assert item.get("linked_vendor_ids") is None, (
                f"Case '{item['slug']}' should have null linked_vendor_ids without filter"
            )
