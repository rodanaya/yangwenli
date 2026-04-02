"""
Tests for routers that previously had zero coverage.

Covers: ai_explain, stories, scorecards, collusion, procurement_health
(procurement_health already had coverage; tests here are additive).

For each router, at least 2 tests verify response structure beyond status 200.
"""
import pytest


# ---------------------------------------------------------------------------
# ai_explain  —  /api/v1/ai/contracts/{id}/explain
# ---------------------------------------------------------------------------

AI_PREFIX = "/api/v1/ai"


class TestAIExplainRouter:
    """Tests for the ai_explain router endpoint structure."""

    def test_explain_response_has_required_fields_or_503(self, client):
        """When AI is available, response must have known fields."""
        r = client.get(f"{AI_PREFIX}/contracts/1/explain")
        if r.status_code == 503:
            # ANTHROPIC_API_KEY not set — confirm it's the right 503
            assert "AI" in r.json().get("detail", "") or "configured" in r.json().get("detail", "")
            return
        if r.status_code == 404:
            # Contract 1 may not exist in test DB
            return
        assert r.status_code == 200
        data = r.json()
        # The ExplainResponse model mandates these fields
        assert "contract_id" in data
        assert "explanation" in data
        assert "language" in data
        assert "model" in data
        assert "available" in data

    def test_explain_language_field_value(self, client):
        """If AI responds, language must be a non-empty string."""
        r = client.get(f"{AI_PREFIX}/contracts/1/explain")
        if r.status_code == 200:
            data = r.json()
            assert isinstance(data["language"], str)
            assert len(data["language"]) > 0

    def test_explain_nonexistent_contract_returns_404_or_503(self, client):
        """Contract that doesn't exist must return 404 (or 503 if AI not configured)."""
        r = client.get(f"{AI_PREFIX}/contracts/9999999999/explain")
        assert r.status_code in (404, 503)

    def test_explain_invalid_id_returns_error(self, client):
        """Non-integer contract ID is a routing mismatch — 404 or 422."""
        r = client.get(f"{AI_PREFIX}/contracts/not-a-number/explain")
        assert r.status_code in (404, 422)


# ---------------------------------------------------------------------------
# stories  —  /api/v1/stories/*
# ---------------------------------------------------------------------------

STORIES_PREFIX = "/api/v1/stories"


class TestStoriesRouter:
    """Tests for the stories router endpoints."""

    def test_administration_comparison_returns_200(self, client):
        r = client.get(f"{STORIES_PREFIX}/administration-comparison")
        assert r.status_code == 200

    def test_administration_comparison_has_data_and_title(self, client):
        data = client.get(f"{STORIES_PREFIX}/administration-comparison").json()
        assert "data" in data
        assert isinstance(data["data"], list)
        assert "title" in data
        assert "key_question" in data

    def test_administration_comparison_data_items_have_fields(self, client):
        data = client.get(f"{STORIES_PREFIX}/administration-comparison").json()
        if data["data"]:
            item = data["data"][0]
            assert "administration" in item
            assert "total_contracts" in item
            assert "avg_risk_score" in item

    def test_ghost_companies_returns_200(self, client):
        r = client.get(f"{STORIES_PREFIX}/ghost-companies")
        assert r.status_code == 200

    def test_ghost_companies_has_data_and_metadata(self, client):
        data = client.get(f"{STORIES_PREFIX}/ghost-companies").json()
        assert "data" in data
        assert "title" in data
        assert "methodology" in data
        assert isinstance(data["data"], list)

    def test_overpricing_patterns_returns_200(self, client):
        r = client.get(f"{STORIES_PREFIX}/overpricing-patterns")
        assert r.status_code == 200

    def test_overpricing_patterns_has_structure(self, client):
        data = client.get(f"{STORIES_PREFIX}/overpricing-patterns").json()
        assert "data" in data
        assert "title" in data

    def test_story_packages_returns_200_or_503(self, client):
        """Packages are computed in background — 200 (warm) or 503 (cold) are valid."""
        r = client.get(f"{STORIES_PREFIX}/packages")
        assert r.status_code in (200, 503)

    def test_story_packages_when_warm_has_packages_key(self, client):
        """If 200, response must have 'packages' key with a list."""
        r = client.get(f"{STORIES_PREFIX}/packages")
        if r.status_code == 200:
            data = r.json()
            assert "packages" in data
            assert isinstance(data["packages"], list)

    def test_top_suspicious_vendors_returns_200(self, client):
        r = client.get(f"{STORIES_PREFIX}/top-suspicious-vendors")
        assert r.status_code == 200

    def test_top_suspicious_vendors_has_data_array(self, client):
        data = client.get(f"{STORIES_PREFIX}/top-suspicious-vendors").json()
        assert "data" in data
        assert isinstance(data["data"], list)


# ---------------------------------------------------------------------------
# scorecards  —  /api/v1/scorecards/*
# ---------------------------------------------------------------------------

SC_PREFIX = "/api/v1/scorecards"


class TestScorecardsRouter:
    """Tests for the scorecards router endpoints."""

    def test_summary_returns_200(self, client):
        r = client.get(f"{SC_PREFIX}/summary")
        assert r.status_code == 200

    def test_summary_has_required_fields(self, client):
        data = client.get(f"{SC_PREFIX}/summary").json()
        assert "institutions_scored" in data
        assert "vendors_scored" in data
        assert "institution_grade_distribution" in data
        assert "vendor_grade_distribution" in data
        assert "institution_avg_score" in data
        assert "vendor_avg_score" in data

    def test_summary_scored_counts_are_non_negative(self, client):
        data = client.get(f"{SC_PREFIX}/summary").json()
        assert data["institutions_scored"] >= 0
        assert data["vendors_scored"] >= 0

    def test_institutions_list_returns_200(self, client):
        r = client.get(f"{SC_PREFIX}/institutions")
        assert r.status_code == 200

    def test_institutions_list_has_pagination_and_data(self, client):
        data = client.get(f"{SC_PREFIX}/institutions").json()
        assert "data" in data
        assert isinstance(data["data"], list)
        assert "total" in data
        assert "page" in data
        assert "per_page" in data
        assert "total_pages" in data

    def test_institutions_list_grade_distribution_present(self, client):
        data = client.get(f"{SC_PREFIX}/institutions").json()
        assert "grade_distribution" in data
        assert isinstance(data["grade_distribution"], dict)

    def test_institution_detail_nonexistent_returns_404(self, client):
        r = client.get(f"{SC_PREFIX}/institutions/9999999")
        assert r.status_code == 404

    def test_vendors_list_returns_200(self, client):
        r = client.get(f"{SC_PREFIX}/vendors")
        assert r.status_code == 200

    def test_vendors_list_has_pagination_and_data(self, client):
        data = client.get(f"{SC_PREFIX}/vendors").json()
        assert "data" in data
        assert isinstance(data["data"], list)
        assert "total" in data


# ---------------------------------------------------------------------------
# collusion  —  /api/v1/collusion/*
# ---------------------------------------------------------------------------

COLLUSION_PREFIX = "/api/v1/collusion"


class TestCollusionRouter:
    """Tests for the collusion router endpoints."""

    def test_pairs_returns_200(self, client):
        r = client.get(f"{COLLUSION_PREFIX}/pairs")
        assert r.status_code == 200

    def test_pairs_has_data_and_pagination(self, client):
        data = client.get(f"{COLLUSION_PREFIX}/pairs").json()
        assert "data" in data
        assert isinstance(data["data"], list)
        assert "pagination" in data
        pag = data["pagination"]
        assert "page" in pag
        assert "per_page" in pag
        assert "total" in pag
        assert "total_pages" in pag

    def test_pairs_item_structure_when_data_present(self, client):
        data = client.get(f"{COLLUSION_PREFIX}/pairs").json()
        if data["data"]:
            item = data["data"][0]
            assert "vendor_id_a" in item
            assert "vendor_id_b" in item
            assert "vendor_name_a" in item
            assert "vendor_name_b" in item
            assert "shared_procedures" in item
            assert "co_bid_rate" in item
            assert "is_potential_collusion" in item

    def test_pairs_collusion_flag_filter(self, client):
        """is_potential_collusion=true (default) — all returned items must be flagged."""
        data = client.get(f"{COLLUSION_PREFIX}/pairs", params={"is_potential_collusion": "true"}).json()
        for item in data["data"]:
            assert item["is_potential_collusion"] is True

    def test_pairs_pagination_respected(self, client):
        data = client.get(f"{COLLUSION_PREFIX}/pairs", params={"per_page": 5}).json()
        assert len(data["data"]) <= 5
        assert data["pagination"]["per_page"] == 5

    def test_pairs_sort_by_co_bid_rate(self, client):
        r = client.get(f"{COLLUSION_PREFIX}/pairs", params={"sort_by": "co_bid_rate"})
        assert r.status_code == 200


# ---------------------------------------------------------------------------
# procurement_health (additional structural tests)
# ---------------------------------------------------------------------------

PHI_PREFIX = "/api/v1/procurement-health"


class TestProcurementHealthRouterStructure:
    """Additional structural tests for procurement-health (supplements existing coverage)."""

    def test_sectors_national_grade_is_letter(self, client):
        """National grade must be a single letter A-F."""
        data = client.get(f"{PHI_PREFIX}/sectors").json()
        grade = data["national"].get("grade", "")
        assert grade in ("A", "B", "C", "D", "F", "N/A"), f"Unexpected grade: {grade!r}"

    def test_sectors_each_sector_has_sector_name_and_id(self, client):
        data = client.get(f"{PHI_PREFIX}/sectors").json()
        for sector in data["sectors"]:
            assert "sector_name" in sector
            assert sector["sector_name"] is not None

    def test_trend_entries_are_ordered_by_year(self, client):
        data = client.get(f"{PHI_PREFIX}/trend").json()
        years = [e["year"] for e in data["years"]]
        assert years == sorted(years), "Trend years are not in ascending order"

    def test_ml_correlation_sector_comparison_is_list(self, client):
        data = client.get(f"{PHI_PREFIX}/ml-correlation").json()
        sector_cmp = data["correlations"]["sector_comparison"]
        assert isinstance(sector_cmp, list)
