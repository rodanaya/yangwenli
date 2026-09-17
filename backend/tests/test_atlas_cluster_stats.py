"""Tests for GET /api/v1/atlas/cluster-stats (El Firmamento galaxy ring)."""
PREFIX = "/api/v1/atlas/cluster-stats"


def _get(client, **params):
    return client.get(PREFIX, params=params)


class TestClusterStats:
    def test_sectors_returns_twelve(self, client):
        data = _get(client, lens="sectors").json()
        assert len(data["clusters"]) == 12

    def test_patterns_returns_seven(self, client):
        data = _get(client, lens="patterns").json()
        assert len(data["clusters"]) == 7

    def test_categories_returns_active_categories(self, client):
        """categories' vendor_count/t1_count come from category_stats,
        precomputed by scripts/_precompute_category_cohort_counts.py — a
        live COUNT(DISTINCT vendor_id) GROUP BY category_id over contracts
        timed out (>60s, no covering index for a many-to-many relationship).
        This just checks the endpoint serves real, honest numbers from that
        precomputed table rather than zeros or a 3.1M-row live scan."""
        data = _get(client, lens="categories").json()
        assert data["lens"] == "categories"
        assert len(data["clusters"]) > 0
        for c in data["clusters"]:
            assert c["vendors"] > 0, f"{c['code']} has 0 vendor_count — precompute may not have run"
            assert c["total_value_mxn"] > 0

    def test_unsupported_lens_returns_empty_not_error(self, client):
        data = _get(client, lens="terms").json()
        assert data["clusters"] == []


# ---------------------------------------------------------------------------
# period= sexenio time filter (scripts/_precompute_atlas_cohort_periods.py)
# ---------------------------------------------------------------------------

class TestClusterStatsPeriod:
    def test_period_amlo_returns_clusters_and_note(self, client):
        data = _get(client, lens="patterns", period="amlo").json()
        assert data["period"] == "amlo"
        assert len(data["clusters"]) > 0
        assert data["note"] is not None and len(data["note"]) > 10

    def test_period_all_three_lenses(self, client):
        for lens in ("patterns", "sectors", "categories"):
            data = _get(client, lens=lens, period="amlo").json()
            assert data["lens"] == lens
            assert len(data["clusters"]) > 0, f"lens={lens} returned no period clusters"

    def test_period_clusters_have_positive_values(self, client):
        data = _get(client, lens="sectors", period="amlo").json()
        for c in data["clusters"]:
            assert c["vendors"] > 0
            assert c["total_value_mxn"] > 0
            assert 0.0 <= c["high_risk_rate"] <= 1.0

    def test_invalid_period_returns_422(self, client):
        r = _get(client, lens="patterns", period="not_a_sexenio")
        assert r.status_code == 422

    def test_omitting_period_is_all_time(self, client):
        data = _get(client, lens="patterns").json()
        assert data.get("period") is None
