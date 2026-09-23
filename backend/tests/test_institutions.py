"""
Tests for institution API endpoints.
"""
import pytest


class TestInstitutionsList:
    """Tests for GET /institutions endpoint."""

    def test_list_institutions_default(self, client, base_url):
        """Test listing institutions with default parameters."""
        response = client.get(f"{base_url}/institutions")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data

    def test_list_institutions_pagination(self, client, base_url):
        """Test institution list pagination."""
        response = client.get(f"{base_url}/institutions?page=2&per_page=10")
        assert response.status_code == 200
        data = response.json()
        assert data["pagination"]["page"] == 2

    def test_list_institutions_type_filter(self, client, base_url):
        """Test filtering institutions by type."""
        response = client.get(f"{base_url}/institutions?institution_type=federal_secretariat")
        assert response.status_code == 200


class TestInstitutionsSearch:
    """Tests for GET /institutions/search endpoint."""

    def test_search_institutions(self, client, base_url):
        """Test searching institutions by name."""
        response = client.get(f"{base_url}/institutions/search?q=salud")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_search_institutions_empty_query(self, client, base_url):
        """Test search with empty query returns validation error."""
        response = client.get(f"{base_url}/institutions/search?q=")
        # Empty query might return validation error or empty results
        assert response.status_code in [200, 422]

    def test_search_institutions_with_type(self, client, base_url):
        """Test searching institutions with type filter."""
        response = client.get(f"{base_url}/institutions/search?q=secretaria&institution_type=federal_secretariat")
        assert response.status_code == 200


class TestInstitutionsTop:
    """Tests for GET /institutions/top endpoint."""

    def test_top_institutions_by_spending(self, client, base_url):
        """Test top institutions by spending."""
        response = client.get(f"{base_url}/institutions/top?by=spending&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert len(data["data"]) <= 10

    def test_top_institutions_by_contracts(self, client, base_url):
        """Test top institutions by contract count."""
        response = client.get(f"{base_url}/institutions/top?by=contracts&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) <= 5

    def test_top_institutions_by_risk(self, client, base_url):
        """Test top institutions by risk score."""
        response = client.get(f"{base_url}/institutions/top?by=risk&limit=10")
        assert response.status_code == 200

    def test_top_institutions_sector_filter(self, client, base_url):
        """Test top institutions filtered by sector."""
        response = client.get(f"{base_url}/institutions/top?sector_id=1&limit=10")
        assert response.status_code == 200


class TestInstitutionsHierarchy:
    """Tests for GET /institutions/hierarchy endpoint."""

    def test_hierarchy_default(self, client, base_url):
        """Test getting institution hierarchy."""
        response = client.get(f"{base_url}/institutions/hierarchy")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_hierarchy_with_type(self, client, base_url):
        """Test getting hierarchy filtered by type."""
        response = client.get(f"{base_url}/institutions/hierarchy?institution_type=federal_secretariat")
        assert response.status_code == 200


class TestInstitutionDetail:
    """Tests for GET /institutions/{id} endpoint."""

    def test_institution_detail_valid(self, client, base_url):
        """Test getting institution details with valid ID."""
        # First get an institution ID from the list
        list_response = client.get(f"{base_url}/institutions?per_page=1")
        if list_response.status_code == 200 and list_response.json()["data"]:
            institution_id = list_response.json()["data"][0]["id"]
            response = client.get(f"{base_url}/institutions/{institution_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == institution_id

    def test_institution_detail_not_found(self, client, base_url):
        """Test getting institution details with non-existent ID."""
        response = client.get(f"{base_url}/institutions/999999999")
        assert response.status_code == 404


class TestInstitutionContracts:
    """Tests for GET /institutions/{id}/contracts endpoint."""

    def test_institution_contracts(self, client, base_url):
        """Test getting institution's contracts."""
        # First get an institution ID
        list_response = client.get(f"{base_url}/institutions?per_page=1")
        if list_response.status_code == 200 and list_response.json()["data"]:
            institution_id = list_response.json()["data"][0]["id"]
            response = client.get(f"{base_url}/institutions/{institution_id}/contracts")
            assert response.status_code == 200
            data = response.json()
            assert "data" in data
            assert "pagination" in data

    def test_institution_contracts_with_filters(self, client, base_url):
        """Test getting institution's contracts with filters."""
        list_response = client.get(f"{base_url}/institutions?per_page=1")
        if list_response.status_code == 200 and list_response.json()["data"]:
            institution_id = list_response.json()["data"][0]["id"]
            response = client.get(
                f"{base_url}/institutions/{institution_id}/contracts?year=2023&risk_level=high"
            )
            assert response.status_code == 200


class TestInstitutionVendors:
    """Tests for GET /institutions/{id}/vendors endpoint."""

    def test_institution_vendors(self, client, base_url):
        """Test getting vendors that work with an institution."""
        # First get an institution ID
        list_response = client.get(f"{base_url}/institutions?per_page=1")
        if list_response.status_code == 200 and list_response.json()["data"]:
            institution_id = list_response.json()["data"][0]["id"]
            response = client.get(f"{base_url}/institutions/{institution_id}/vendors")
            assert response.status_code == 200
            data = response.json()
            assert "data" in data


class TestInstitutionRiskTimeline:
    """Tests for GET /institutions/{id}/risk-timeline endpoint."""

    def test_institution_risk_timeline(self, client, base_url):
        """Test getting institution's risk timeline."""
        list_response = client.get(f"{base_url}/institutions?per_page=1")
        if list_response.status_code == 200 and list_response.json()["data"]:
            institution_id = list_response.json()["data"][0]["id"]
            response = client.get(f"{base_url}/institutions/{institution_id}/risk-timeline")
            assert response.status_code == 200
            data = response.json()
            assert "institution_id" in data
            assert "institution_name" in data
            assert "timeline" in data
            assert isinstance(data["timeline"], list)
            if data["timeline"]:
                item = data["timeline"][0]
                assert "year" in item
                assert "avg_risk_score" in item
                assert "contract_count" in item

    def test_institution_risk_timeline_not_found(self, client, base_url):
        """Test risk timeline with non-existent institution."""
        response = client.get(f"{base_url}/institutions/999999999/risk-timeline")
        assert response.status_code == 404


class TestInstitutionGroundTruthStatus:
    """Tests for GET /institutions/{id}/ground-truth-status endpoint."""

    def test_institution_ground_truth_status_returns_object(self, client, base_url):
        """Endpoint should return a dict with is_ground_truth_related key."""
        list_response = client.get(f"{base_url}/institutions?per_page=1")
        if list_response.status_code == 200 and list_response.json()["data"]:
            institution_id = list_response.json()["data"][0]["id"]
            response = client.get(
                f"{base_url}/institutions/{institution_id}/ground-truth-status"
            )
            assert response.status_code == 200
            data = response.json()
            assert "is_ground_truth_related" in data
            assert isinstance(data["is_ground_truth_related"], bool)

    def test_institution_ground_truth_status_false_shape(self, client, base_url):
        """Non-linked institution returns only is_ground_truth_related=False."""
        # Use a high institution ID unlikely to have GT contracts
        response = client.get(f"{base_url}/institutions/1/ground-truth-status")
        assert response.status_code == 200
        data = response.json()
        assert "is_ground_truth_related" in data
        if not data["is_ground_truth_related"]:
            # If False, only the one field should be present
            assert "case_name" not in data

    def test_institution_ground_truth_status_true_shape(self, client, base_url):
        """When GT-related, response includes case_name, fraud_type, contract_count."""
        # Try several institutions until we find a GT-linked one (or confirm shape)
        list_response = client.get(f"{base_url}/institutions?per_page=20")
        if list_response.status_code != 200:
            return
        for inst in list_response.json().get("data", []):
            response = client.get(
                f"{base_url}/institutions/{inst['id']}/ground-truth-status"
            )
            assert response.status_code == 200
            data = response.json()
            if data.get("is_ground_truth_related"):
                assert "case_name" in data
                assert "case_type" in data
                assert "contract_count" in data
                assert isinstance(data["contract_count"], int)
                break


class TestInstitutionTypes:
    """Tests for GET /institutions/types endpoint."""

    def test_institution_types(self, client, base_url):
        """Test getting list of institution types."""
        response = client.get(f"{base_url}/institutions/types")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], list)


# ── PARALLAX D9 § Change 1 — top-categories on the canonical taxonomy and the
# risk-waterfall reading its precompute first. These run against the live DB
# the suite points at (DATABASE_PATH); ids are discovered, never hard-coded.

def _one(sql, params=()):
    from api.dependencies import get_db
    import sqlite3
    try:
        with get_db() as conn:
            return conn.execute(sql, params).fetchone()
    except sqlite3.OperationalError:
        return None


class TestInstitutionTopCategories:
    """GET /institutions/{id}/top-categories — 200 always, sorted, [] when empty."""

    def _clear(self, iid):
        from api.routers import institutions as mod
        for k in [k for k in list(mod._top_cache) if k.startswith(f"inst_topcat:{iid}:")]:
            mod._top_cache.pop(k, None)

    def test_top_categories_sorted_non_empty(self, client, base_url):
        row = _one("SELECT institution_id FROM contracts WHERE category_id IS NOT NULL AND institution_id IS NOT NULL LIMIT 1")
        if not row:
            pytest.skip("no categorised contracts in this DB")
        iid = row["institution_id"]
        self._clear(iid)
        r = client.get(f"{base_url}/institutions/{iid}/top-categories?limit=8")
        assert r.status_code == 200
        data = r.json()["data"]
        assert len(data) >= 1
        values = [d["total_value_mxn"] for d in data]
        assert values == sorted(values, reverse=True)
        for d in data:
            assert d["category_id"] is not None
            assert d["name_es"] or d["name_en"]
            assert d["contract_count"] >= 1

    def test_top_categories_precompute_path_when_table_present(self, client, base_url):
        row = _one("SELECT institution_id FROM institution_category_stats LIMIT 1")
        if not row:
            pytest.skip("institution_category_stats not built in this DB")
        iid = row["institution_id"]
        self._clear(iid)
        r = client.get(f"{base_url}/institutions/{iid}/top-categories")
        assert r.status_code == 200
        assert r.json()["source"] == "precomputed"
        assert len(r.json()["data"]) >= 1

    def test_top_categories_year_filter_uses_live_path(self, client, base_url):
        row = _one("SELECT institution_id, contract_year FROM contracts WHERE category_id IS NOT NULL AND institution_id IS NOT NULL AND contract_year BETWEEN 2002 AND 2025 LIMIT 1")
        if not row:
            pytest.skip("no categorised contracts in this DB")
        iid, yr = row["institution_id"], row["contract_year"]
        self._clear(iid)
        r = client.get(f"{base_url}/institutions/{iid}/top-categories?year={yr}")
        assert r.status_code == 200
        body = r.json()
        assert body["source"] == "live"
        assert len(body["data"]) >= 1

    def test_top_categories_empty_is_200_not_404(self, client, base_url):
        row = _one(
            "SELECT i.id FROM institutions i WHERE NOT EXISTS "
            "(SELECT 1 FROM contracts c WHERE c.institution_id = i.id AND c.category_id IS NOT NULL) LIMIT 1"
        )
        query = ""
        if not row:
            # Every institution has categorised contracts in the full DB — take a
            # year with none for one of them (the live path's empty result).
            row = _one(
                "SELECT i.id FROM institutions i WHERE NOT EXISTS "
                "(SELECT 1 FROM contracts c WHERE c.institution_id = i.id AND c.contract_year = 2002) LIMIT 1"
            )
            query = "?year=2002"
        if not row:
            pytest.skip("no institution without categorised contracts")
        iid = row["id"]
        self._clear(iid)
        r = client.get(f"{base_url}/institutions/{iid}/top-categories{query}")
        assert r.status_code == 200
        assert r.json()["data"] == []

    def test_top_categories_unknown_institution_404(self, client, base_url):
        r = client.get(f"{base_url}/institutions/999999999/top-categories")
        assert r.status_code == 404


class TestInstitutionRiskWaterfall:
    """GET /institutions/{id}/risk-waterfall — institution_z_means is read first."""

    def test_waterfall_reads_precompute_first(self, client, base_url, monkeypatch):
        row = _one("SELECT institution_id, cnt FROM institution_z_means WHERE cnt > 0 LIMIT 1")
        if not row:
            pytest.skip("institution_z_means not built in this DB")
        iid, cnt = row["institution_id"], row["cnt"]
        from api.routers import institutions as mod
        mod._top_cache.pop(f"inst_wf:{iid}", None)
        calls = []
        orig = mod._load_inst_z_means

        def spy(conn, institution_id):
            calls.append(institution_id)
            return orig(conn, institution_id)

        monkeypatch.setattr(mod, "_load_inst_z_means", spy)
        r = client.get(f"{base_url}/institutions/{iid}/risk-waterfall")
        assert r.status_code == 200
        body = r.json()
        assert calls == [iid]
        assert body["total_contracts"] == cnt  # the precompute row, not a live AVG
        assert len(body["items"]) == len(mod._INST_Z_COLS)
