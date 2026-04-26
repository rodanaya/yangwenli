"""
S.1 + S.2 — Fix two broken aria_queue columns documented in
docs/DATA_INTEGRITY_PLAN.md.

S.1 — top_institution NULL for 318,285 rows even though
       top_institution_ratio is correctly populated. The pipeline computes
       the ratio but never writes the institution NAME alongside it.

S.2 — max_risk_score = 0 for 318,441 rows (essentially every vendor with
       contracts), even when avg_risk_score > 0.9. The field is supposed
       to hold MAX(contracts.risk_score) per vendor.

Both fixes are pure backfills derived from the canonical `contracts` and
`institutions` tables. Idempotent — safe to re-run. No model changes.

Usage:
    cd backend
    python scripts/_fix_aria_columns.py             # local DB
    python scripts/_fix_aria_columns.py --db RUBLI_DEPLOY.db
    python scripts/_fix_aria_columns.py --dry-run   # preview only

Success criteria (per plan):
    SELECT COUNT(*) FROM aria_queue
      WHERE top_institution_ratio > 0 AND top_institution IS NULL
    -- must return 0
    SELECT COUNT(*) FROM aria_queue
      WHERE total_contracts > 0 AND max_risk_score = 0
    -- must return 0
"""
from __future__ import annotations

import argparse
import sqlite3
import sys
import time
from pathlib import Path


def fix_top_institution(conn: sqlite3.Connection, dry_run: bool) -> int:
    """For every aria_queue row, compute top institution by SUM(importe)
    from contracts and resolve to its name via institutions.siglas
    (preferred) or institutions.name fallback."""
    cur = conn.cursor()

    # How many rows need the fix?
    cur.execute(
        "SELECT COUNT(*) FROM aria_queue "
        "WHERE top_institution_ratio > 0 AND top_institution IS NULL"
    )
    before = cur.fetchone()[0]
    print(f"S.1 top_institution: {before:,} rows need backfill")

    if dry_run or before == 0:
        return before

    # Compute top institution per vendor via correlated subquery
    # Use INSTR-style aggregation in pure SQL — single statement, fast.
    sql = """
        UPDATE aria_queue
        SET top_institution = (
            SELECT COALESCE(i.siglas, SUBSTR(i.name, 1, 50))
            FROM contracts c
            JOIN institutions i ON i.id = c.institution_id
            WHERE c.vendor_id = aria_queue.vendor_id
              AND c.institution_id IS NOT NULL
            GROUP BY c.institution_id, i.siglas, i.name
            ORDER BY SUM(c.amount_mxn) DESC
            LIMIT 1
        )
        WHERE top_institution_ratio > 0 AND top_institution IS NULL
    """
    t0 = time.time()
    cur.execute(sql)
    conn.commit()
    elapsed = time.time() - t0
    print(f"  ->updated in {elapsed:.1f}s")

    # Verify
    cur.execute(
        "SELECT COUNT(*) FROM aria_queue "
        "WHERE top_institution_ratio > 0 AND top_institution IS NULL"
    )
    after = cur.fetchone()[0]
    print(f"  ->after fix: {after:,} rows remain (target: 0)")
    return before - after


def fix_max_risk_score(conn: sqlite3.Connection, dry_run: bool) -> int:
    """For every aria_queue row, set max_risk_score = MAX(contracts.risk_score)
    for that vendor. Pipeline default of 0 was incorrect — should be the
    actual maximum, often 1.0 for high-risk vendors."""
    cur = conn.cursor()

    cur.execute(
        "SELECT COUNT(*) FROM aria_queue "
        "WHERE total_contracts > 0 AND max_risk_score = 0"
    )
    before = cur.fetchone()[0]
    print(f"S.2 max_risk_score: {before:,} rows need backfill")

    if dry_run or before == 0:
        return before

    sql = """
        UPDATE aria_queue
        SET max_risk_score = COALESCE((
            SELECT MAX(c.risk_score)
            FROM contracts c
            WHERE c.vendor_id = aria_queue.vendor_id
              AND c.risk_score IS NOT NULL
        ), 0)
        WHERE total_contracts > 0 AND max_risk_score = 0
    """
    t0 = time.time()
    cur.execute(sql)
    conn.commit()
    elapsed = time.time() - t0
    print(f"  ->updated in {elapsed:.1f}s")

    cur.execute(
        "SELECT COUNT(*) FROM aria_queue "
        "WHERE total_contracts > 0 AND max_risk_score = 0"
    )
    after = cur.fetchone()[0]
    print(f"  ->after fix: {after:,} rows remain (target: 0)")
    return before - after


def spot_check(conn: sqlite3.Connection) -> None:
    """Read 3 known-anchor vendors and verify the fixed columns make sense."""
    print("\nSpot-check (3 anchor vendors):")
    cur = conn.cursor()
    for vid, name in [(29277, "GRUFESA"), (10775, "LICONSA"), (38095, "BIRMEX")]:
        cur.execute(
            "SELECT vendor_id, top_institution, top_institution_ratio, "
            "max_risk_score, avg_risk_score "
            "FROM aria_queue WHERE vendor_id=?", (vid,))
        row = cur.fetchone()
        if row:
            print(f"  vendor {vid} {name}: "
                  f"top_inst={row[1]!r} (ratio={row[2]:.3f}) "
                  f"max_risk={row[3]:.3f} avg_risk={row[4]:.3f}")
        else:
            print(f"  vendor {vid} {name}: not found")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default="RUBLI_NORMALIZED.db",
                        help="DB path relative to backend/ (default: RUBLI_NORMALIZED.db)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print counts only, do not modify the DB")
    args = parser.parse_args()

    db_path = Path(args.db)
    if not db_path.is_absolute():
        # Resolve relative to the backend/ directory regardless of cwd
        backend_dir = Path(__file__).resolve().parents[1]
        db_path = backend_dir / args.db

    if not db_path.exists():
        print(f"ERROR: DB not found at {db_path}", file=sys.stderr)
        return 2

    print(f"Target DB: {db_path}")
    print(f"Mode: {'DRY-RUN' if args.dry_run else 'WRITE'}\n")

    conn = sqlite3.connect(str(db_path))
    # PRAGMAs for fast bulk update
    conn.execute("PRAGMA synchronous = OFF")
    conn.execute("PRAGMA journal_mode = WAL")

    fixed_inst = fix_top_institution(conn, args.dry_run)
    print()
    fixed_max = fix_max_risk_score(conn, args.dry_run)
    spot_check(conn)

    conn.close()

    print(f"\nDone. {fixed_inst:,} top_institution backfilled · "
          f"{fixed_max:,} max_risk_score backfilled.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
