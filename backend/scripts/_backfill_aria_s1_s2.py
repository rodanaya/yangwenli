"""
_backfill_aria_s1_s2.py — Idempotent backfill for two aria_queue columns.

S.1: aria_queue.top_institution (NULL → institution name via contracts join)
     Also fixes top_institution_ratio = 0.0 for vendors where a dominant
     institution can be computed.

S.2: aria_queue.max_risk_score (0 or NULL → MAX(risk_score_v8) from contracts)

Both fixes are idempotent: re-running is safe and only touches rows that
still need correction (NULL / zero values).

Usage:
    python -m scripts._backfill_aria_s1_s2            # live run
    python -m scripts._backfill_aria_s1_s2 --dry-run  # report only, no writes
"""

import argparse
import logging
import sqlite3
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger(__name__)

DB_PATH = Path(__file__).resolve().parents[1] / "RUBLI_NORMALIZED.db"
BATCH_SIZE = 5_000  # rows per UPDATE batch for large fixes


def get_conn(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=-64000")  # 64 MB
    return conn


# ---------------------------------------------------------------------------
# S.1 — top_institution backfill
# ---------------------------------------------------------------------------

S1_TOP_INSTITUTION_SQL = """
    UPDATE aria_queue
    SET top_institution = (
        SELECT COALESCE(i.siglas, i.name)
        FROM contracts c
        JOIN institutions i ON i.id = c.institution_id
        WHERE c.vendor_id = aria_queue.vendor_id
          AND i.id IS NOT NULL
        GROUP BY i.id
        ORDER BY COUNT(*) DESC
        LIMIT 1
    )
    WHERE top_institution IS NULL
      AND vendor_id IN (
          SELECT DISTINCT c2.vendor_id
          FROM contracts c2
          JOIN institutions i2 ON i2.id = c2.institution_id
          WHERE i2.id IS NOT NULL
      )
"""

S1_TOP_RATIO_SQL = """
    UPDATE aria_queue
    SET top_institution_ratio = (
        SELECT CAST(
            COUNT(CASE WHEN c.institution_id = (
                SELECT institution_id
                FROM contracts
                WHERE vendor_id = aria_queue.vendor_id
                GROUP BY institution_id
                ORDER BY COUNT(*) DESC
                LIMIT 1
            ) THEN 1 END
        ) AS REAL) / NULLIF(COUNT(*), 0)
        FROM contracts c
        WHERE c.vendor_id = aria_queue.vendor_id
    )
    WHERE top_institution_ratio = 0.0
      AND top_institution IS NOT NULL
"""

# ---------------------------------------------------------------------------
# S.2 — max_risk_score backfill
# ---------------------------------------------------------------------------

S2_MAX_RISK_SQL = """
    UPDATE aria_queue
    SET max_risk_score = (
        SELECT MAX(c.risk_score_v8)
        FROM contracts c
        WHERE c.vendor_id = aria_queue.vendor_id
          AND c.risk_score_v8 IS NOT NULL
    )
    WHERE max_risk_score = 0
       OR max_risk_score IS NULL
"""


def count_s1_nulls(cur: sqlite3.Cursor) -> int:
    cur.execute("SELECT COUNT(*) FROM aria_queue WHERE top_institution IS NULL")
    return cur.fetchone()[0]


def count_s1_zero_ratio(cur: sqlite3.Cursor) -> int:
    cur.execute(
        "SELECT COUNT(*) FROM aria_queue "
        "WHERE top_institution_ratio = 0.0 AND top_institution IS NOT NULL"
    )
    return cur.fetchone()[0]


def count_s2_zeros(cur: sqlite3.Cursor) -> int:
    cur.execute(
        "SELECT COUNT(*) FROM aria_queue "
        "WHERE max_risk_score = 0 OR max_risk_score IS NULL"
    )
    return cur.fetchone()[0]


def run_backfill(db_path: Path, dry_run: bool = False) -> None:
    log.info("DB: %s", db_path)
    log.info("Mode: %s", "DRY-RUN (no writes)" if dry_run else "LIVE")

    conn = get_conn(db_path)
    cur = conn.cursor()

    # ── S.1 report ──────────────────────────────────────────────────────────
    s1_null_before = count_s1_nulls(cur)
    s1_ratio_before = count_s1_zero_ratio(cur)
    log.info("S.1 BEFORE — top_institution NULL: %d", s1_null_before)
    log.info("S.1 BEFORE — top_institution_ratio=0 (with name): %d", s1_ratio_before)

    if not dry_run:
        cur.execute(S1_TOP_INSTITUTION_SQL)
        s1_updated = cur.rowcount
        log.info("S.1 top_institution — rows updated: %d", s1_updated)

        cur.execute(S1_TOP_RATIO_SQL)
        s1_ratio_updated = cur.rowcount
        log.info("S.1 top_institution_ratio — rows updated: %d", s1_ratio_updated)

        conn.commit()

    s1_null_after = count_s1_nulls(cur)
    log.info("S.1 AFTER  — top_institution NULL: %d", s1_null_after)

    # ── S.2 report ──────────────────────────────────────────────────────────
    s2_before = count_s2_zeros(cur)
    log.info("S.2 BEFORE — max_risk_score zero/NULL: %d", s2_before)

    if not dry_run and s2_before > 0:
        cur.execute(S2_MAX_RISK_SQL)
        s2_updated = cur.rowcount
        log.info("S.2 max_risk_score — rows updated: %d", s2_updated)
        conn.commit()

    s2_after = count_s2_zeros(cur)
    log.info("S.2 AFTER  — max_risk_score zero/NULL: %d", s2_after)

    # ── Summary ─────────────────────────────────────────────────────────────
    if dry_run:
        log.info("DRY-RUN complete — no changes written.")
    else:
        ok = s1_null_after == 0 and s2_after == 0
        if ok:
            log.info("All checks PASS — both columns fully populated.")
        else:
            log.warning(
                "Remaining gaps — S.1 NULL: %d | S.2 zero/NULL: %d",
                s1_null_after,
                s2_after,
            )

    conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report gaps without writing any changes.",
    )
    parser.add_argument(
        "--db",
        default=str(DB_PATH),
        help="Path to the SQLite database (default: %(default)s).",
    )
    args = parser.parse_args()
    run_backfill(Path(args.db), dry_run=args.dry_run)


if __name__ == "__main__":
    main()
