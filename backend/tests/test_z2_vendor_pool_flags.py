"""
Parity tests for the Z2 at-rest flag backfill (El Mapa Day 5, spec § A.1).

The backfilled institution_top_vendors.hr_count/da_count/sb_count must
reproduce _z2_compute_full's live aggregate EXACTLY — these tests recompute
the endpoint's SQL verbatim for 3 high-volume institutions and diff every
top-50 row. They are the gate that must pass BEFORE the live warmup is
short-circuited (audit directive, narrative-first consolidated audit § 3).

Skips (not fails) when the DB has no backfill yet — e.g. the worktree stub
DB or a tree where scripts/backfill_z2_flags.py hasn't run. Run for real:
    DATABASE_PATH=D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db \
        python -m pytest backend/tests/test_z2_vendor_pool_flags.py -q
"""

import sqlite3

import pytest

from api.dependencies import DB_PATH

MAX_CONTRACT_VALUE = 100_000_000_000  # parity with api/config/constants.py


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def _backfill_ready(conn: sqlite3.Connection) -> bool:
    try:
        cols = {r[1] for r in conn.execute("PRAGMA table_info(institution_top_vendors)")}
    except sqlite3.Error:
        return False
    if not {"hr_count", "da_count", "sb_count"} <= cols:
        return False
    row = conn.execute(
        "SELECT COUNT(*) FROM institution_top_vendors WHERE hr_count IS NOT NULL"
    ).fetchone()
    return bool(row and row[0] > 0)


@pytest.fixture(scope="module")
def db():
    conn = _connect()
    if not _backfill_ready(conn):
        conn.close()
        pytest.skip("institution_top_vendors not backfilled on this DB (run scripts/backfill_z2_flags.py)")
    yield conn
    conn.close()


@pytest.fixture(scope="module")
def parity_institutions(db):
    """Three high-volume institutions spanning sizes (largest, mid, smaller)."""
    rows = db.execute(
        """
        SELECT institution_id, SUM(total_value_mxn) AS v, COUNT(*) AS n
        FROM institution_top_vendors
        GROUP BY institution_id
        HAVING n >= 20
        ORDER BY v DESC
        """
    ).fetchall()
    assert len(rows) >= 3, "DB too small for parity sampling"
    return [rows[0]["institution_id"], rows[len(rows) // 2]["institution_id"], rows[-1]["institution_id"]]


def _live_counts(db: sqlite3.Connection, institution_id: int, vendor_ids: list[int]) -> dict:
    """_z2_compute_full's step-4 aggregate, verbatim predicates."""
    placeholders = ",".join("?" * len(vendor_ids))
    cur = db.execute(
        f"""
        SELECT vendor_id,
               SUM(CASE WHEN risk_score >= 0.40 THEN 1 ELSE 0 END) AS hr_count,
               SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) AS da_count,
               SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) AS sb_count
        FROM contracts
        WHERE institution_id = ?
          AND vendor_id IN ({placeholders})
          AND COALESCE(amount_mxn, 0) <= ?
        GROUP BY vendor_id
        """,
        (institution_id, *vendor_ids, MAX_CONTRACT_VALUE),
    )
    return {r["vendor_id"]: r for r in cur.fetchall()}


class TestZ2FlagParity:
    def test_backfilled_counts_match_live_aggregate(self, db, parity_institutions):
        for inst_id in parity_institutions:
            stored = db.execute(
                """
                SELECT vendor_id, hr_count, da_count, sb_count
                FROM institution_top_vendors
                WHERE institution_id = ?
                ORDER BY total_value_mxn DESC LIMIT 50
                """,
                (inst_id,),
            ).fetchall()
            assert stored, f"institution {inst_id} has no top-vendor rows"
            live = _live_counts(db, inst_id, [r["vendor_id"] for r in stored])
            for r in stored:
                lv = live.get(r["vendor_id"])
                exp = (
                    (int(lv["hr_count"]), int(lv["da_count"]), int(lv["sb_count"]))
                    if lv
                    else (0, 0, 0)  # endpoint's flag_counts.get(vid) → 0 fallback
                )
                got = (r["hr_count"], r["da_count"], r["sb_count"])
                assert got == exp, (
                    f"parity break inst {inst_id} vendor {r['vendor_id']}: stored {got} != live {exp}"
                )

    def test_no_null_flags_remain(self, db):
        nulls = db.execute(
            "SELECT COUNT(*) FROM institution_top_vendors WHERE hr_count IS NULL OR da_count IS NULL OR sb_count IS NULL"
        ).fetchone()[0]
        assert nulls == 0, f"{nulls} rows missed by the backfill"

    def test_stale_denominator_quirk_is_bounded(self, db):
        # KNOWN QUIRK (2026-06-12): 64 of 88,569 ITV rows carry a stale (low)
        # precomputed contract_count vs live contracts, so a flag count can
        # exceed it (worst observed: count 7 vs contract_count 1, low-spend
        # tail institutions). The endpoint clamps served pcts at 100. This
        # canary fails if the set GROWS — that would mean ITV regeneration
        # and the contracts table have drifted further apart.
        bad = db.execute(
            """
            SELECT COUNT(*) FROM institution_top_vendors
            WHERE hr_count > contract_count
               OR da_count > contract_count
               OR sb_count > contract_count
            """
        ).fetchone()[0]
        assert bad <= 64, f"stale-denominator set grew to {bad} (was 64 on 2026-06-12)"


class TestVendorPoolColdServing:
    """After the enrichment ships, the endpoint must serve scoped flags on a
    COLD cache (no warmup wait) for a backfilled institution."""

    def test_cold_response_carries_scoped_flags(self, db, client, base_url, parity_institutions):
        inst_id = parity_institutions[0]
        resp = client.get(f"{base_url}/institutions/{inst_id}/vendor-pool?limit=10")
        assert resp.status_code == 200
        items = resp.json()["data"]
        assert items
        with_flags = [v for v in items if v["high_risk_pct"] is not None]
        assert len(with_flags) == len(items), (
            f"{len(items) - len(with_flags)}/{len(items)} rows NULL-flagged on a backfilled DB"
        )
        # aria enrichment fields present in the shape (nullable)
        for key in ("is_efos_definitivo", "is_sfp_sanctioned", "is_disappeared"):
            assert key in items[0]
