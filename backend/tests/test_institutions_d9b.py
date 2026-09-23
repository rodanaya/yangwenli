"""PARALLAX D9b § Change 1 — backend truths behind /institutions.

Run against the DB the suite points at (DATABASE_PATH); ids are discovered,
never hard-coded, and every test skips when its table is absent.
"""
import pytest

from tests.test_institutions import _one


class TestScorecardGradeFilter:
    """F1: the grade-free distribution query must not misalign its params."""

    @pytest.mark.parametrize("query", [
        "grade=B&scope=federal",
        "grade=B&scope=federal&min_contracts=30",
        "grade=B&scope=all",
        "scope=all",
    ])
    def test_grade_filter_200_with_distribution(self, client, base_url, query):
        if not _one("SELECT 1 FROM institution_scorecards LIMIT 1"):
            pytest.skip("institution_scorecards not built in this DB")
        r = client.get(f"{base_url}/scorecards/institutions?{query}")
        assert r.status_code == 200, r.text
        body = r.json()
        assert isinstance(body["grade_distribution"], dict)
        if "grade=B" in query:
            assert all(d["grade"] == "B" for d in body["data"])

    def test_grade_and_sector_federal(self, client, base_url):
        row = _one(
            "SELECT sec.name_es FROM institution_scorecards s JOIN institutions i ON i.id = s.institution_id "
            "JOIN sectors sec ON sec.id = i.sector_id LIMIT 1"
        )
        if not row:
            pytest.skip("institution_scorecards not built in this DB")
        r = client.get(f"{base_url}/scorecards/institutions",
                       params={"grade": "B", "sector": row[0], "scope": "federal"})
        assert r.status_code == 200, r.text
        # The distribution ignores the grade filter but keeps scope + sector.
        dist_all = client.get(f"{base_url}/scorecards/institutions",
                              params={"sector": row[0], "scope": "federal"}).json()["grade_distribution"]
        assert r.json()["grade_distribution"] == dist_all


class TestScorecardTruths:
    def test_zero_percentile_is_zero_not_half(self, client, base_url):
        """F2: a stored 0.0 national percentile is returned as 0.0."""
        row = _one("SELECT institution_id FROM institution_scorecards WHERE national_percentile = 0 LIMIT 1")
        if not row:
            pytest.skip("no institution stored at percentile 0")
        r = client.get(f"{base_url}/scorecards/institutions/{row[0]}")
        assert r.status_code == 200
        assert r.json()["national_percentile"] == 0.0

    def test_list_carries_last_contract_year(self, client, base_url):
        """F5: list rows expose institution_stats.last_contract_year."""
        if not _one("SELECT 1 FROM institution_scorecards LIMIT 1"):
            pytest.skip("institution_scorecards not built in this DB")
        body = client.get(f"{base_url}/scorecards/institutions?scope=all&per_page=20").json()
        assert body["data"]
        for d in body["data"][:5]:
            row = _one("SELECT last_contract_year FROM institution_stats WHERE institution_id = ?",
                       (d["institution_id"],))
            assert d["last_contract_year"] == (row[0] if row else None)


class TestInstitutionDetailBase:
    def test_detail_counts_come_from_institution_stats(self, client, base_url):
        """F7: hero/strip use the same base as every panel below them."""
        row = _one("SELECT institution_id, total_contracts, vendor_count FROM institution_stats "
                   "WHERE institution_id = 251 UNION ALL "
                   "SELECT institution_id, total_contracts, vendor_count FROM institution_stats LIMIT 1")
        if not row:
            pytest.skip("institution_stats not built in this DB")
        iid, n, vc = row
        body = client.get(f"{base_url}/institutions/{iid}").json()
        assert body["total_contracts"] == n
        assert body["vendor_count"] == vc


class TestCategoryCoverage:
    def test_top_categories_carries_totals(self, client, base_url):
        """F9: the panel can print 'k of N categories · x % of contracts'."""
        row = _one("SELECT institution_id FROM institution_category_stats "
                   "GROUP BY institution_id HAVING COUNT(*) > 3 LIMIT 1")
        if not row:
            pytest.skip("institution_category_stats not built in this DB")
        iid = row[0]
        from api.routers import institutions as mod
        for k in [k for k in list(mod._top_cache) if k.startswith(f"inst_topcat:{iid}:")]:
            mod._top_cache.pop(k, None)
        body = client.get(f"{base_url}/institutions/{iid}/top-categories?limit=5").json()
        n = _one("SELECT COUNT(*), SUM(contract_count) FROM institution_category_stats WHERE institution_id = ?", (iid,))
        assert body["total_categories"] == n[0]
        assert body["total_contracts_categorised"] == n[1]
        assert body["total_contracts_categorised"] >= sum(d["contract_count"] for d in body["data"])
        assert body["total_value_categorised"] >= sum(d["total_value_mxn"] for d in body["data"]) - 1

    def test_category_top_institutions_matches_dossier_base(self, client, base_url):
        """F9: /categories/:id/top-institutions agrees with the dossier panel."""
        row = _one("SELECT institution_id, category_id, contract_count FROM institution_category_stats "
                   "WHERE institution_id = 251 AND category_id = 20")
        if not row:
            pytest.skip("institution_category_stats (251, 20) not in this DB")
        body = client.get(f"{base_url}/categories/20/top-institutions?limit=10").json()
        imss = [x for x in body["institutions"] if x["institution_id"] == 251]
        if not imss:
            pytest.skip("category_top_institutions precompute not built in this DB")
        assert imss[0]["contract_count"] == row[2]


def test_officials_note_in_both_languages(client, base_url):
    """F12: the officials note is served per language."""
    row = _one("SELECT id FROM institutions WHERE id = 251 UNION ALL SELECT id FROM institutions LIMIT 1")
    if not row:
        pytest.skip("no institutions")
    body = client.get(f"{base_url}/institutions/{row[0]}/officials").json()
    assert "no es una acusación" in body["note_es"]
    assert "not an accusation" in body["note_en"]
    assert "Structure" not in body["note_es"]
