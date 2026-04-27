"""Precompute sector → top-N vendors map for /vendors/top?sector_id.

Without this, the live aggregation per-sector takes 14-53s per call.
Stored as JSON in precomputed_stats[sector_top_vendors]:
  { "1": [ {vendor_id, vendor_name, rfc, total_contracts, total_value_mxn, avg_risk_score}, ... ] }

Top-50 per sector (UI cap is 100, but most lists request ≤20).
"""

import json
import sqlite3
import time
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "RUBLI_NORMALIZED.db"
TOP_N = 50


def main():
    conn = sqlite3.connect(str(DB))
    conn.row_factory = sqlite3.Row

    sectors = [r["id"] for r in conn.execute("SELECT id FROM sectors WHERE is_active = 1 ORDER BY id").fetchall()]
    print(f"computing top-{TOP_N} for {len(sectors)} sectors...")

    out: dict[str, list] = {}
    t0 = time.time()
    for sid in sectors:
        ts = time.time()
        rows = conn.execute("""
            WITH agg AS (
                SELECT c.vendor_id,
                       COUNT(c.id) AS total_contracts,
                       COALESCE(SUM(c.amount_mxn), 0) AS total_value_mxn,
                       COALESCE(AVG(c.risk_score), 0) AS avg_risk_score
                FROM contracts c
                WHERE c.sector_id = ?
                  AND c.vendor_id IS NOT NULL
                GROUP BY c.vendor_id
                ORDER BY total_value_mxn DESC
                LIMIT ?
            )
            SELECT a.vendor_id, v.name AS vendor_name, v.rfc,
                   a.total_contracts, a.total_value_mxn, a.avg_risk_score
            FROM agg a
            JOIN vendors v ON v.id = a.vendor_id
            ORDER BY a.total_value_mxn DESC
        """, (sid, TOP_N)).fetchall()
        out[str(sid)] = [
            {
                "vendor_id": r["vendor_id"],
                "vendor_name": r["vendor_name"],
                "rfc": r["rfc"],
                "total_contracts": r["total_contracts"],
                "total_value_mxn": r["total_value_mxn"],
                "avg_risk_score": round(r["avg_risk_score"], 4) if r["avg_risk_score"] else None,
            }
            for r in rows
        ]
        print(f"  sector {sid}: {len(rows)} vendors in {time.time()-ts:.1f}s")

    conn.execute(
        "INSERT OR REPLACE INTO precomputed_stats (stat_key, stat_value, updated_at) VALUES (?, ?, datetime('now'))",
        ("sector_top_vendors", json.dumps(out)),
    )
    conn.commit()
    print(f"done in {time.time()-t0:.1f}s — wrote {sum(len(v) for v in out.values())} vendor entries")
    conn.close()


if __name__ == "__main__":
    main()
