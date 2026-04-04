"""
One-time precompute: per-sector top vendors.

Computes top-20 vendors by value for each of the 12 sectors and stores the
result in precomputed_stats as stat_key = 'sector_top_vendors'.  Runtime on
3.1M contracts is ~10-15 min on a warm DB.

Usage:
    cd backend
    python scripts/_precompute_sector_vendors.py
    python scripts/_precompute_sector_vendors.py --db /path/to/RUBLI_DEPLOY.db
"""
import argparse
import json
import sqlite3
import time
from pathlib import Path

DEFAULT_DB = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run(db_path: Path) -> None:
    print(f"DB: {db_path}")
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    cursor = conn.cursor()

    sector_top: dict = {}
    total_start = time.time()

    for sector_id in range(1, 13):
        start = time.time()
        print(f"  Sector {sector_id:2d}/12 ...", end=" ", flush=True)
        rows = cursor.execute(
            """
            WITH agg AS (
                SELECT c.vendor_id,
                       SUM(c.amount_mxn)  AS total_value,
                       COUNT(c.id)         AS total_contracts,
                       AVG(c.risk_score)   AS avg_risk
                FROM contracts c
                WHERE c.sector_id = ?
                GROUP BY c.vendor_id
                ORDER BY total_value DESC
                LIMIT 20
            )
            SELECT v.id, v.name, v.rfc,
                   a.total_value, a.total_contracts, a.avg_risk
            FROM agg a
            JOIN vendors v ON a.vendor_id = v.id
            ORDER BY a.total_value DESC
            """,
            (sector_id,),
        ).fetchall()

        sector_top[str(sector_id)] = [
            {
                "vendor_id": row["id"],
                "vendor_name": row["name"],
                "rfc": row["rfc"],
                "total_value_mxn": round(row["total_value"] or 0, 0),
                "total_contracts": row["total_contracts"],
                "avg_risk_score": round(row["avg_risk"] or 0, 4) if row["avg_risk"] else None,
            }
            for row in rows
        ]
        print(f"{len(rows)} vendors — {time.time() - start:.1f}s")

    # Upsert into precomputed_stats
    payload = json.dumps(sector_top)
    cursor.execute(
        """
        INSERT INTO precomputed_stats(stat_key, stat_value, updated_at)
        VALUES('sector_top_vendors', ?, datetime('now'))
        ON CONFLICT(stat_key) DO UPDATE SET stat_value = excluded.stat_value,
                                             updated_at = excluded.updated_at
        """,
        (payload,),
    )
    conn.commit()
    conn.close()
    print(f"\nDone — total {time.time() - total_start:.0f}s")
    print("Stored stat_key='sector_top_vendors' in precomputed_stats.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=str(DEFAULT_DB))
    args = parser.parse_args()
    run(Path(args.db))
