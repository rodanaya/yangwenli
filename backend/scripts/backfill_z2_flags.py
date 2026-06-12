"""
backfill_z2_flags.py — make the Z2 vendor-pool flags exist AT REST.

El Mapa Day 5 (spec: .claude/designs/elmapa-2026-06-12-spec.md § A.1).

The /institutions/{id}/vendor-pool endpoint's cold path serves NULL
high-risk / direct-award / single-bid flags because the institution-scoped
counts only existed as a live ~60-120s GROUP BY warmed into an in-process
30-min cache — on a low-traffic site the degraded payload WAS the steady
state. This script materializes the exact same counts onto
institution_top_vendors (88.6K rows, full 4,456-institution coverage) in
ONE single-pass aggregate (~minutes), so the degraded path can serve
institution-scoped truth cold and the warmup dies.

Predicate parity: the temp aggregate below reproduces _z2_compute_full's
SQL verbatim (institutions.py § step 4):
    hr  = SUM(risk_score >= 0.40)
    da  = SUM(is_direct_award = 1)
    sb  = SUM(is_single_bid = 1)
    WHERE COALESCE(amount_mxn, 0) <= MAX_CONTRACT_VALUE
Pairs present in institution_top_vendors but absent from the aggregate
(no qualifying contracts) are written as 0 — matching the endpoint's
`flag_counts.get(vid)` → 0 fallback. NULL therefore means exactly one
thing after this run: "row created after the last backfill cut".

Usage:
    python -m scripts.backfill_z2_flags [--checkpoint]
    DATABASE_PATH=D:/path/to/RUBLI_NORMALIZED.db python -m scripts.backfill_z2_flags

    --checkpoint   run PRAGMA wal_checkpoint(TRUNCATE) after the write
                   (REQUIRED when run in the prod container — single-file
                   bind mount; see gotcha-prod-db-singlefile-bindmount-wal)

Idempotent: re-runs refresh the counts and flags_computed_at.
"""

import os
import sqlite3
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

MAX_CONTRACT_VALUE = 100_000_000_000  # parity with api/config/constants.py


def _resolve_db_path() -> Path:
    env = os.environ.get("DATABASE_PATH")
    if env:
        p = Path(env)
        if not p.exists():
            raise FileNotFoundError(f"DATABASE_PATH does not exist: {p}")
        return p
    base = Path(__file__).resolve().parent.parent
    for name in ("RUBLI_NORMALIZED.db", "RUBLI_DEPLOY.db"):
        p = base / name
        if p.exists() and p.stat().st_size > 1_000_000:  # skip stub DBs
            return p
    raise FileNotFoundError(f"No usable DB at {base}/RUBLI_*.db (set DATABASE_PATH)")


COLUMNS = ("hr_count", "da_count", "sb_count")


def ensure_columns(cur: sqlite3.Cursor) -> None:
    existing = {r[1] for r in cur.execute("PRAGMA table_info(institution_top_vendors)")}
    for col in COLUMNS:
        if col not in existing:
            cur.execute(f"ALTER TABLE institution_top_vendors ADD COLUMN {col} INTEGER")
            print(f"  + column {col}")
    if "flags_computed_at" not in existing:
        cur.execute("ALTER TABLE institution_top_vendors ADD COLUMN flags_computed_at TEXT")
        print("  + column flags_computed_at")


def main() -> None:
    db_path = _resolve_db_path()
    checkpoint = "--checkpoint" in sys.argv
    print(f"DB: {db_path}")

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    try:
        ensure_columns(cur)

        t0 = time.time()
        # Single pass over contracts — never a per-institution loop (the
        # endpoint's per-institution shape costs 162s × 4,456 offline; this
        # full-scan GROUP BY costs minutes total).
        cur.execute("DROP TABLE IF EXISTS temp._z2_flags")
        cur.execute(
            """
            CREATE TEMP TABLE _z2_flags AS
            SELECT institution_id, vendor_id,
                   SUM(CASE WHEN risk_score >= 0.40 THEN 1 ELSE 0 END) AS hr_count,
                   SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) AS da_count,
                   SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) AS sb_count
            FROM contracts
            WHERE COALESCE(amount_mxn, 0) <= ?
            GROUP BY institution_id, vendor_id
            """,
            (MAX_CONTRACT_VALUE,),
        )
        cur.execute(
            "CREATE INDEX temp.idx_z2_flags ON _z2_flags(institution_id, vendor_id)"
        )
        n_agg = cur.execute("SELECT COUNT(*) FROM temp._z2_flags").fetchone()[0]
        print(f"aggregate: {n_agg:,} (institution, vendor) pairs in {time.time() - t0:.1f}s")

        t1 = time.time()
        cut = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        cur.execute(
            """
            UPDATE institution_top_vendors AS itv
            SET hr_count = COALESCE((SELECT f.hr_count FROM temp._z2_flags f
                                     WHERE f.institution_id = itv.institution_id
                                       AND f.vendor_id = itv.vendor_id), 0),
                da_count = COALESCE((SELECT f.da_count FROM temp._z2_flags f
                                     WHERE f.institution_id = itv.institution_id
                                       AND f.vendor_id = itv.vendor_id), 0),
                sb_count = COALESCE((SELECT f.sb_count FROM temp._z2_flags f
                                     WHERE f.institution_id = itv.institution_id
                                       AND f.vendor_id = itv.vendor_id), 0),
                flags_computed_at = ?
            """,
            (cut,),
        )
        print(f"updated: {cur.rowcount:,} institution_top_vendors rows in {time.time() - t1:.1f}s")

        conn.commit()

        # Post-write sanity
        nulls = cur.execute(
            "SELECT COUNT(*) FROM institution_top_vendors WHERE hr_count IS NULL"
        ).fetchone()[0]
        sample = cur.execute(
            """
            SELECT institution_id, vendor_id, contract_count, hr_count, da_count, sb_count
            FROM institution_top_vendors
            WHERE contract_count >= 100
            ORDER BY total_value_mxn DESC LIMIT 3
            """
        ).fetchall()
        print(f"NULL hr_count rows after run: {nulls} (expect 0)")
        for r in sample:
            # ASCII-only: the Windows console is cp1252 — an arrow glyph here
            # crashed the first run AFTER commit (data was safe; print wasn't).
            print(
                f"  inst {r['institution_id']} x vendor {r['vendor_id']}: "
                f"{r['contract_count']} contracts -> hr {r['hr_count']} / "
                f"da {r['da_count']} / sb {r['sb_count']}"
            )

        if checkpoint:
            cur.execute("PRAGMA wal_checkpoint(TRUNCATE)")
            print("WAL checkpoint TRUNCATE done")
    finally:
        conn.close()
    print(f"total {time.time() - t0:.1f}s · cut {cut}")


if __name__ == "__main__":
    main()
