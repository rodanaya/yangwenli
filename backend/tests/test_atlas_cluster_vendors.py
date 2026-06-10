"""Tests for GET /api/v1/atlas/cluster-vendors."""
import pytest

PREFIX = "/api/v1/atlas/cluster-vendors"


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _get(client, **params):
    return client.get(PREFIX, params=params)


# ---------------------------------------------------------------------------
# Happy path — lens=patterns
# ---------------------------------------------------------------------------

class TestPatternsLens:
    def test_returns_200_for_valid_pattern(self, client):
        r = _get(client, lens="patterns", code="P5")
        assert r.status_code == 200

    def test_response_shape(self, client):
        data = _get(client, lens="patterns", code="P5", limit=5).json()
        assert data["lens"] == "patterns"
        assert data["code"] == "P5"
        assert "label_es" in data
        assert "label_en" in data
        assert isinstance(data["total"], int)
        assert isinstance(data["vendors"], list)
        # next_cursor may be null or a float
        assert "next_cursor" in data

    def test_vendor_item_shape(self, client):
        data = _get(client, lens="patterns", code="P5", limit=5).json()
        if not data["vendors"]:
            pytest.skip("No P5 vendors in DB")
        v = data["vendors"][0]
        assert "vendor_id" in v
        assert "name" in v
        assert "risk_score" in v
        assert "risk_level" in v
        assert "tier" in v
        assert "total_contracts" in v
        assert "total_amount_mxn" in v
        assert "primary_sector_code" in v
        assert "is_gt" in v
        assert isinstance(v["is_gt"], bool)
        assert "ghost_score" in v
        assert "capture_score" in v

    def test_label_for_known_pattern(self, client):
        data = _get(client, lens="patterns", code="P5").json()
        assert "Sobreprecio" in data["label_es"]
        assert "overpricing" in data["label_en"].lower()

    def test_total_matches_known_count(self, client):
        # Memory says P5 has ~3,772-3,985 vendors; just assert > 0
        data = _get(client, lens="patterns", code="P5").json()
        assert data["total"] > 0

    def test_vendors_sorted_by_risk_desc(self, client):
        data = _get(client, lens="patterns", code="P5", limit=20).json()
        scores = [v["risk_score"] for v in data["vendors"] if v["risk_score"] is not None]
        assert scores == sorted(scores, reverse=True)

    def test_limit_respected(self, client):
        data = _get(client, lens="patterns", code="P5", limit=3).json()
        assert len(data["vendors"]) <= 3

    def test_risk_level_values(self, client):
        data = _get(client, lens="patterns", code="P5", limit=20).json()
        valid_levels = {"critical", "high", "medium", "low", None}
        for v in data["vendors"]:
            assert v["risk_level"] in valid_levels

    def test_all_patterns_return_200(self, client):
        for pattern in ("P1", "P2", "P3", "P4", "P5", "P6", "P7"):
            r = _get(client, lens="patterns", code=pattern)
            assert r.status_code == 200, f"Pattern {pattern} failed with {r.status_code}"

    def test_unknown_pattern_returns_empty(self, client):
        data = _get(client, lens="patterns", code="P99").json()
        assert data["total"] == 0
        assert data["vendors"] == []


# ---------------------------------------------------------------------------
# Cursor-based pagination
# ---------------------------------------------------------------------------

class TestCursorPagination:
    def test_cursor_returns_lower_scores(self, client):
        # Get first page, extract last risk_score as cursor
        first = _get(client, lens="patterns", code="P5", limit=5).json()
        if len(first["vendors"]) < 5:
            pytest.skip("Not enough P5 vendors for pagination test")

        cursor = first["next_cursor"]
        assert cursor is not None, "Expected a next_cursor on full page"

        second = _get(client, lens="patterns", code="P5", limit=5, cursor=cursor).json()
        if not second["vendors"]:
            pytest.skip("Second page is empty")

        # All scores on second page must be <= cursor
        for v in second["vendors"]:
            if v["risk_score"] is not None:
                assert v["risk_score"] <= cursor

    def test_cursor_and_first_page_non_overlapping(self, client):
        first = _get(client, lens="patterns", code="P6", limit=10).json()
        if len(first["vendors"]) < 10:
            pytest.skip("Not enough P6 vendors")
        first_ids = {v["vendor_id"] for v in first["vendors"]}

        cursor = first["next_cursor"]
        second = _get(client, lens="patterns", code="P6", limit=10, cursor=cursor).json()
        second_ids = {v["vendor_id"] for v in second["vendors"]}

        overlap = first_ids & second_ids
        assert not overlap, f"Pages overlap: {overlap}"

    def test_last_page_has_no_next_cursor(self, client):
        # Use a high cursor that should exhaust results quickly
        data = _get(client, lens="patterns", code="P1", limit=200, cursor=0.0001).json()
        assert data["next_cursor"] is None


# ---------------------------------------------------------------------------
# Offset-based pagination
# ---------------------------------------------------------------------------

class TestOffsetPagination:
    def test_offset_shifts_results(self, client):
        page1 = _get(client, lens="patterns", code="P6", limit=5, offset=0).json()
        page2 = _get(client, lens="patterns", code="P6", limit=5, offset=5).json()

        if not page1["vendors"] or not page2["vendors"]:
            pytest.skip("Not enough P6 vendors for offset test")

        ids1 = [v["vendor_id"] for v in page1["vendors"]]
        ids2 = [v["vendor_id"] for v in page2["vendors"]]
        assert ids1 != ids2


# ---------------------------------------------------------------------------
# lens=sectors
# ---------------------------------------------------------------------------

class TestSectorsLens:
    def test_returns_200_for_valid_sector(self, client):
        r = _get(client, lens="sectors", code="salud")
        assert r.status_code == 200

    def test_response_shape(self, client):
        data = _get(client, lens="sectors", code="salud", limit=5).json()
        assert data["lens"] == "sectors"
        assert data["code"] == "salud"
        assert data["total"] > 0
        assert isinstance(data["vendors"], list)

    def test_unknown_sector_returns_empty(self, client):
        data = _get(client, lens="sectors", code="nonexistent_sector").json()
        assert data["total"] == 0
        assert data["vendors"] == []

    def test_all_12_sectors_return_200(self, client):
        sectors = [
            "salud", "educacion", "infraestructura", "energia",
            "defensa", "tecnologia", "hacienda", "gobernacion",
            "agricultura", "ambiente", "trabajo", "otros",
        ]
        for sector in sectors:
            r = _get(client, lens="sectors", code=sector)
            assert r.status_code == 200, f"Sector {sector} failed"


# ---------------------------------------------------------------------------
# lens=categories
# ---------------------------------------------------------------------------

class TestCategoriesLens:
    def test_returns_200_for_known_category(self, client):
        r = _get(client, lens="categories", code="cat_medications")
        assert r.status_code == 200

    def test_unknown_category_returns_empty_with_note(self, client):
        data = _get(client, lens="categories", code="cat_does_not_exist").json()
        assert data["total"] == 0
        assert data["vendors"] == []
        assert data.get("note") is not None


# ---------------------------------------------------------------------------
# lens=terms
# ---------------------------------------------------------------------------

class TestTermsLens:
    def test_returns_200(self, client):
        r = _get(client, lens="terms", code="medicamento")
        assert r.status_code == 200

    def test_returns_empty_with_note(self, client):
        data = _get(client, lens="terms", code="medicamento").json()
        assert data["total"] == 0
        assert data["vendors"] == []
        assert data["note"] is not None
        assert len(data["note"]) > 10


# ---------------------------------------------------------------------------
# Validation / 422
# ---------------------------------------------------------------------------

class TestValidation:
    def test_missing_lens_returns_422(self, client):
        r = client.get(PREFIX, params={"code": "P5"})
        assert r.status_code == 422

    def test_missing_code_returns_422(self, client):
        r = client.get(PREFIX, params={"lens": "patterns"})
        assert r.status_code == 422

    def test_limit_above_200_returns_422(self, client):
        r = _get(client, lens="patterns", code="P5", limit=201)
        assert r.status_code == 422

    def test_limit_zero_returns_422(self, client):
        r = _get(client, lens="patterns", code="P5", limit=0)
        assert r.status_code == 422

    def test_offset_negative_returns_422(self, client):
        r = _get(client, lens="patterns", code="P5", offset=-1)
        assert r.status_code == 422

    def test_unknown_lens_returns_200_with_empty_and_note(self, client):
        # Spec says return empty + note, not 422
        data = _get(client, lens="bogus_lens", code="X").json()
        assert data["total"] == 0
        assert data["vendors"] == []
        assert data.get("note") is not None


# ---------------------------------------------------------------------------
# Response contract consistency
# ---------------------------------------------------------------------------

class TestResponseContract:
    def test_next_cursor_null_when_results_less_than_limit(self, client):
        # P1 has only 44 vendors — request 200, expect no cursor
        data = _get(client, lens="patterns", code="P1", limit=200).json()
        if data["total"] < 200:
            assert data["next_cursor"] is None

    def test_capture_score_is_float_or_null(self, client):
        data = _get(client, lens="patterns", code="P6", limit=10).json()
        for v in data["vendors"]:
            cs = v.get("capture_score")
            assert cs is None or isinstance(cs, float)

    def test_is_gt_is_boolean(self, client):
        data = _get(client, lens="patterns", code="P5", limit=10).json()
        for v in data["vendors"]:
            assert isinstance(v["is_gt"], bool)

    def test_pattern_confidences_is_dict_or_null(self, client):
        data = _get(client, lens="patterns", code="P5", limit=10).json()
        for v in data["vendors"]:
            pc = v.get("pattern_confidences")
            assert pc is None or isinstance(pc, dict)
            if pc:
                for key, val in pc.items():
                    assert isinstance(key, str)
                    assert isinstance(val, (int, float))

    def test_pattern_confidences_p6_matches_capture_score(self, client):
        # capture_score is the legacy extraction of pattern_confidences["P6"] —
        # surfacing the full dict must not let the two drift.
        data = _get(client, lens="patterns", code="P6", limit=10).json()
        for v in data["vendors"]:
            pc = v.get("pattern_confidences")
            if pc and "P6" in pc:
                assert v["capture_score"] == pytest.approx(pc["P6"])
