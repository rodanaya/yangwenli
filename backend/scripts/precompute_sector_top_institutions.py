"""
precompute_sector_top_institutions.py

Pre-computes top-3 institutions per sector and stores under the
`sector_top_institutions` key in precomputed_stats. Eliminates a slow
12x sequential aggregation that took 80-110s on the cold contracts table.

Run once after ETL or whenever institution data changes.

Usage:
    python -m scripts.precompute_sector_top_institutions
"""

import sqlite3
import json
import time
from pathlib import Path

def _resolve_db_path() -> Path:
    """Find whichever DB file actually exists. Prod uses RUBLI_DEPLOY.db,
    local dev uses RUBLI_NORMALIZED.db."""
    base = Path(__file__).resolve().parent.parent
    for name in ("RUBLI_NORMALIZED.db", "RUBLI_DEPLOY.db"):
        p = base / name
        if p.exists() and p.stat().st_size > 0:
            return p
    raise FileNotFoundError(f"No DB found at {base}/RUBLI_*.db")


DB_PATH = _resolve_db_path()
MAX_CONTRACT_VALUE = 100_000_000_000  # 100B MXN reject threshold


def main() -> None:
    print(f"DB: {DB_PATH}")
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    t0 = time.time()
    print("Aggregating top-3 institutions per sector (single CTE)...")
    cur.execute(
        """
        WITH agg AS (
            SELECT c.sector_id, c.institution_id, SUM(c.amount_mxn) AS spend
            FROM contracts c
            WHERE c.amount_mxn IS NOT NULL
              AND c.amount_mxn > 0
              AND c.amount_mxn < ?
              AND c.sector_id IS NOT NULL
              AND c.institution_id IS NOT NULL
            GROUP BY c.sector_id, c.institution_id
        ),
        ranked AS (
            SELECT
                sector_id,
                institution_id,
                spend,
                ROW_NUMBER() OVER (
                    PARTITION BY sector_id ORDER BY spend DESC
                ) AS rn
            FROM agg
        )
        SELECT r.sector_id, r.institution_id, i.name, r.spend
        FROM ranked r
        JOIN institutions i ON i.id = r.institution_id
        WHERE r.rn <= 3
        ORDER BY r.sector_id, r.rn
        """,
        (MAX_CONTRACT_VALUE,),
    )
    rows = cur.fetchall()
    print(f"  query: {time.time() - t0:.1f}s · {len(rows)} rows")

    # Group by sector_id
    by_sector: dict[int, list] = {}
    for r in rows:
        sid = r["sector_id"]
        by_sector.setdefault(sid, []).append({
            "institution_id": r["institution_id"],
            "name": r["name"],
            "value_mxn": float(r["spend"] or 0),
        })

    payload = {str(sid): items for sid, items in by_sector.items()}

    print("Writing to precomputed_stats[sector_top_institutions]...")
    cur.execute(
        """
        INSERT INTO precomputed_stats (stat_key, stat_value, updated_at)
        VALUES ('sector_top_institutions', ?, CURRENT_TIMESTAMP)
        ON CONFLICT (stat_key) DO UPDATE SET
            stat_value = excluded.stat_value,
            updated_at = CURRENT_TIMESTAMP
        """,
        (json.dumps(payload),),
    )
    conn.commit()
    print(f"  done · sectors covered: {len(payload)} · total time: {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
