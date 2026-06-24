"""
Tests for /capture/landscape — the full ≥100M federal capture field.

Shape, internal consistency, the monotonic-ids ⊆ ticks invariant, and the
precomputed_stats self-persist round-trip (admin-breakdown pattern).
"""


class TestCaptureLandscape:
    def test_landscape_shape(self, client, base_url):
        resp = client.get(f"{base_url}/capture/landscape")
        assert resp.status_code == 200
        data = resp.json()
        for key in (
            "qualifying_count", "captured_now_count", "antesala_count",
            "aria_p6_total", "monotonic_institution_ids", "thresholds",
            "ticks", "captured_now", "antesala_top", "generated_at",
        ):
            assert key in data, f"missing key {key}"
        assert data["thresholds"]["ceil_share_pct"] == 50.0
        assert data["thresholds"]["floor_share_pct"] == 25.0
        assert data["thresholds"]["min_inst_total_mxn"] == 100_000_000

    def test_landscape_counts_consistent(self, client, base_url):
        data = client.get(f"{base_url}/capture/landscape").json()
        assert data["qualifying_count"] == len(data["ticks"])
        assert data["captured_now_count"] == len(data["captured_now"])
        assert len(data["antesala_top"]) <= 12
        assert data["qualifying_count"] > 1000  # the ≥100M universe is ~1.4K
        assert 0 < data["captured_now_count"] < data["qualifying_count"]

    def test_ticks_are_minimal_tuples(self, client, base_url):
        data = client.get(f"{base_url}/capture/landscape").json()
        tick = data["ticks"][0]
        assert isinstance(tick, list) and len(tick) == 4  # [id, name, sector_id, share]
        assert isinstance(tick[0], int)
        assert isinstance(tick[3], (int, float))
        assert 0 <= tick[3] <= 100
        # ticks ordered by share desc (build contract)
        shares = [t[3] for t in data["ticks"][:50]]
        assert shares == sorted(shares, reverse=True)

    def test_captured_now_rows_complete(self, client, base_url):
        data = client.get(f"{base_url}/capture/landscape").json()
        row = data["captured_now"][0]
        for key in (
            "institution_id", "name", "sector_id", "share_pct",
            "top1_vendor_id", "top1_vendor_name", "window_total_mxn", "latest_hhi",
        ):
            assert key in row, f"missing key {key}"
        assert row["share_pct"] >= 50.0
        assert all(c["share_pct"] >= 50.0 for c in data["captured_now"])

    def test_monotonic_ids_subset_of_ticks(self, client, base_url):
        """Every strict-capture institution must exist in the field — the
        load-bearing invariant (capture_results requires ≥100M, so inclusion
        is by construction)."""
        data = client.get(f"{base_url}/capture/landscape").json()
        tick_ids = {t[0] for t in data["ticks"]}
        missing = [i for i in data["monotonic_institution_ids"] if i not in tick_ids]
        assert missing == [], f"monotonic institutions missing from field: {missing}"

    def test_persist_round_trip(self, client, base_url):
        """Second call must serve the persisted/cached payload identically."""
        first = client.get(f"{base_url}/capture/landscape").json()
        second = client.get(f"{base_url}/capture/landscape").json()
        assert first["qualifying_count"] == second["qualifying_count"]
        assert first["generated_at"] == second["generated_at"]  # not rebuilt


class TestCaptureTopAriaFold:
    """The additive ARIA cross-light folded into /capture/top so the
    model-vs-arithmetic seal renders at rest (DESIGNUS captura-2026-06-23)."""

    def test_top_items_carry_aria_crosslight(self, client, base_url):
        data = client.get(f"{base_url}/capture/top?limit=50").json()
        items = data["data"]
        assert len(items) >= 1
        for it in items:
            assert "aria" in it, "missing aria cross-light on capture item"
            if it["aria"] is not None:
                for k in (
                    "in_ground_truth", "ips_tier",
                    "is_efos_definitivo", "is_sfp_sanctioned",
                ):
                    assert k in it["aria"], f"aria missing {k}"
                assert isinstance(it["aria"]["in_ground_truth"], bool)
                assert isinstance(it["aria"]["is_efos_definitivo"], bool)

    def test_model_agrees_on_some(self, client, base_url):
        """Two methods, one conclusion — the model independently flags some of
        the arithmetic captures (ground truth or ARIA Tier-1)."""
        items = client.get(f"{base_url}/capture/top?limit=50").json()["data"]
        agree = [
            it for it in items
            if it.get("aria")
            and (it["aria"]["in_ground_truth"] or it["aria"]["ips_tier"] == 1)
        ]
        assert len(agree) >= 1
