"""Tests for GET /api/v1/vendors/{id}/categories and the canonical sexenio table
(backend/api/administrations.py) shared by categories.py's /sexenio endpoint,
analysis.py's admin-breakdown, and the frontend's administrations.ts.
"""
from api.administrations import get_administration_for_year

# vendor_id=1 has category_id IS NOT NULL contracts in the real DB (verified 2026-09-16).
KNOWN_VENDOR_ID = 1


class TestVendorCategories:
    def test_known_vendor_returns_200(self, client):
        r = client.get(f"/api/v1/vendors/{KNOWN_VENDOR_ID}/categories")
        assert r.status_code == 200

    def test_response_shape(self, client):
        data = client.get(f"/api/v1/vendors/{KNOWN_VENDOR_ID}/categories").json()
        assert data["vendor_id"] == KNOWN_VENDOR_ID
        assert isinstance(data["total_contracts"], int)
        assert isinstance(data["categories"], list)
        if data["categories"]:
            c = data["categories"][0]
            for key in ("category_id", "code", "name_es", "name_en", "contracts", "total_amount_mxn", "share_of_vendor_value"):
                assert key in c

    def test_categories_sorted_by_value_desc(self, client):
        data = client.get(f"/api/v1/vendors/{KNOWN_VENDOR_ID}/categories").json()
        values = [c["total_amount_mxn"] for c in data["categories"]]
        assert values == sorted(values, reverse=True)

    def test_unknown_vendor_returns_404(self, client):
        r = client.get("/api/v1/vendors/999999999/categories")
        assert r.status_code == 404


class TestSexenioAgreement:
    """The three consumers of the canonical table must agree that 2018
    belongs to the outgoing president (pena_nieto) and 2019 to AMLO."""

    def test_backend_canonical_table(self):
        assert get_administration_for_year(2018).key == "pena_nieto"
        assert get_administration_for_year(2019).key == "amlo"

    def test_categories_sexenio_endpoint_year_ranges(self, client):
        data = client.get("/api/v1/categories/sexenio").json()
        names = [a["name"] for a in data["administrations"]]
        assert names == ["Fox", "Calderón", "Peña Nieto", "AMLO", "Sheinbaum"]
        # Peña Nieto's display range must end at 2018, AMLO's must start at 2019.
        pena = next(a for a in data["administrations"] if a["name"] == "Peña Nieto")
        amlo = next(a for a in data["administrations"] if a["name"] == "AMLO")
        assert pena["years"].endswith("18")
        assert amlo["years"].startswith("2019")

    def test_analysis_admin_era_map_matches_canonical(self):
        # In-process check against the source constant, not the live HTTP
        # endpoint: /analysis/admin-breakdown serves a persisted
        # precomputed_stats.admin_breakdown row (38s live query) that
        # predates this fix and won't reflect corrected years until that
        # row is refreshed — see report for details. _ADMIN_ERA_MAP itself
        # is derived from _ADMIN_ERAS, which now imports the canonical table.
        from api.routers.analysis import _ADMIN_ERA_MAP
        assert _ADMIN_ERA_MAP["pena_nieto"] == (2013, 2018)
        assert _ADMIN_ERA_MAP["amlo"] == (2019, 2024)
