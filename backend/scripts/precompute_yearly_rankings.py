"""
precompute_yearly_rankings.py

Creates and populates two tables with yearly top-100 rankings:

  - yearly_vendor_rankings      (year, vendor_id) → rank + summary stats
  - yearly_institution_rankings (year, institution_id) → rank + summary stats

Only the top 100 per year are stored, keeping each table to ~2,400 rows.
Rankings are by total_value_mxn DESC (rank_by_value) and total_contracts DESC
(rank_by_count).

Run from backend/ directory:
    python -m scripts.precompute_yearly_rankings

Run time estimate: 5-10 minutes on the 3.1M-row contracts table.
DO NOT run while the API server is under heavy load — the per-year GROUP BY
queries are read-only but will compete for SQLite read locks.
"""

import logging
import sqlite3
import time
from pathlib import Path

log = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

YEARS = list(range(2002, 2026))   # 2002–2025 inclusive
TOP_N = 100                        # rows stored per year

DDL = """
CREATE TABLE IF NOT EXISTS yearly_vendor_rankings (
    year              INTEGER NOT NULL,
    vendor_id         INTEGER NOT NULL,
    rank_by_value     INTEGER,
    rank_by_count     INTEGER,
    total_contracts   INTEGER NOT NULL,
    total_value_mxn   REAL    NOT NULL,
    avg_risk_score    REAL,
    direct_award_pct  REAL,
    PRIMARY KEY (year, vendor_id)
);
CREATE INDEX IF NOT EXISTS idx_yvr_year_rank
    ON yearly_vendor_rankings(year, rank_by_value);

CREATE TABLE IF NOT EXISTS yearly_institution_rankings (
    year              INTEGER NOT NULL,
    institution_id    INTEGER NOT NULL,
    rank_by_value     INTEGER,
    rank_by_count     INTEGER,
    total_contracts   INTEGER NOT NULL,
    total_value_mxn   REAL    NOT NULL,
    avg_risk_score    REAL,
    direct_award_pct  REAL,
    PRIMARY KEY (year, institution_id)
);
CREATE INDEX IF NOT EXISTS idx_yir_year_rank
    ON yearly_institution_rankings(year, rank_by_value);
"""

VENDOR_QUERY = """
    SELECT
        c.vendor_id,
        COUNT(c.id)                                                         AS total_contracts,
        COALESCE(SUM(c.amount_mxn), 0)                                     AS total_value_mxn,
        COALESCE(AVG(c.risk_score), 0)                                      AS avg_risk_score,
        COALESCE(AVG(CASE WHEN c.is_direct_award = 1 THEN 1.0 ELSE 0.0 END), 0) AS direct_award_pct
    FROM contracts c
    WHERE c.contract_year = ?
      AND c.vendor_id IS NOT NULL
    GROUP BY c.vendor_id
    ORDER BY total_value_mxn DESC
    LIMIT ?
"""

INSTITUTION_QUERY = """
    SELECT
        c.institution_id,
        COUNT(c.id)                                                         AS total_contracts,
        COALESCE(SUM(c.amount_mxn), 0)                                     AS total_value_mxn,
        COALESCE(AVG(c.risk_score), 0)                                      AS avg_risk_score,
        COALESCE(AVG(CASE WHEN c.is_direct_award = 1 THEN 1.0 ELSE 0.0 END), 0) AS direct_award_pct
    FROM contracts c
    WHERE c.contract_year = ?
      AND c.institution_id IS NOT NULL
    GROUP BY c.institution_id
    ORDER BY total_value_mxn DESC
    LIMIT ?
"""

VENDOR_UPSERT = """
    INSERT OR REPLACE INTO yearly_vendor_rankings
        (year, vendor_id, rank_by_value, rank_by_count,
         total_contracts, total_value_mxn, avg_risk_score, direct_award_pct)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
"""

INSTITUTION_UPSERT = """
    INSERT OR REPLACE INTO yearly_institution_rankings
        (year, institution_id, rank_by_value, rank_by_count,
         total_contracts, total_value_mxn, avg_risk_score, direct_award_pct)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
"""


def _try_tqdm():
    try:
        from tqdm import tqdm
        return tqdm
    except ImportError:
        return None


def _assign_count_ranks(rows: list[dict]) -> list[dict]:
    """Return rows sorted by count rank (highest count = rank 1)."""
    sorted_by_count = sorted(rows, key=lambda r: r["total_contracts"], reverse=True)
    count_rank = {r["entity_id"]: i + 1 for i, r in enumerate(sorted_by_count)}
    for r in rows:
        r["rank_by_count"] = count_rank[r["entity_id"]]
    return rows


def process_vendors(conn: sqlite3.Connection, year: int) -> int:
    rows_raw = conn.execute(VENDOR_QUERY, (year, TOP_N)).fetchall()
    if not rows_raw:
        return 0

    # Build list with rank_by_value already assigned (ORDER BY value DESC gives rank)
    rows = [
        {
            "entity_id": r["vendor_id"],
            "rank_by_value": i + 1,
            "total_contracts": r["total_contracts"],
            "total_value_mxn": r["total_value_mxn"],
            "avg_risk_score": r["avg_risk_score"],
            "direct_award_pct": r["direct_award_pct"],
        }
        for i, r in enumerate(rows_raw)
    ]
    rows = _assign_count_ranks(rows)

    conn.executemany(
        VENDOR_UPSERT,
        [
            (
                year,
                r["entity_id"],
                r["rank_by_value"],
                r["rank_by_count"],
                r["total_contracts"],
                r["total_value_mxn"],
                round(r["avg_risk_score"], 6),
                round(r["direct_award_pct"], 6),
            )
            for r in rows
        ],
    )
    return len(rows)


def process_institutions(conn: sqlite3.Connection, year: int) -> int:
    rows_raw = conn.execute(INSTITUTION_QUERY, (year, TOP_N)).fetchall()
    if not rows_raw:
        return 0

    rows = [
        {
            "entity_id": r["institution_id"],
            "rank_by_value": i + 1,
            "total_contracts": r["total_contracts"],
            "total_value_mxn": r["total_value_mxn"],
            "avg_risk_score": r["avg_risk_score"],
            "direct_award_pct": r["direct_award_pct"],
        }
        for i, r in enumerate(rows_raw)
    ]
    rows = _assign_count_ranks(rows)

    conn.executemany(
        INSTITUTION_UPSERT,
        [
            (
                year,
                r["entity_id"],
                r["rank_by_value"],
                r["rank_by_count"],
                r["total_contracts"],
                r["total_value_mxn"],
                round(r["avg_risk_score"], 6),
                round(r["direct_award_pct"], 6),
            )
            for r in rows
        ],
    )
    return len(rows)


def main() -> None:
    log.info("Connecting to %s", DB_PATH)
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")

    log.info("Creating tables / indexes …")
    # Use individual execute calls (WAL-compatible, no exclusive lock)
    for stmt in DDL.strip().split(';'):
        stmt = stmt.strip()
        if stmt:
            conn.execute(stmt)
    conn.commit()

    tqdm = _try_tqdm()
    year_iter = tqdm(YEARS, desc="Years") if tqdm else YEARS

    total_vendors = 0
    total_institutions = 0
    wall_start = time.time()

    for year in year_iter:
        t0 = time.time()

        nv = process_vendors(conn, year)
        ni = process_institutions(conn, year)
        conn.commit()

        total_vendors += nv
        total_institutions += ni

        elapsed = time.time() - t0
        if not tqdm:
            log.info(
                "year=%d  vendors=%d  institutions=%d  (%.1fs)",
                year, nv, ni, elapsed,
            )

    total_elapsed = time.time() - wall_start
    log.info(
        "Done. %d vendor rows + %d institution rows in %.1fs",
        total_vendors, total_institutions, total_elapsed,
    )
    conn.close()


if __name__ == "__main__":
    main()
