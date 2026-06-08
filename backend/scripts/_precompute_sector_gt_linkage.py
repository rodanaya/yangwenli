"""
Precompute `sector_gt_linkage`: per-sector counts of ground-truth corruption
cases and distinct GT vendors that operate in the sector.

A GT vendor "operates in" a sector if it holds at least one contract whose
sector_id is that sector. The join (ground_truth_vendors ⋈ contracts.sector_id)
takes ~4s live — far too slow for a request path — so it is precomputed into a
single precomputed_stats row:

  sector_gt_linkage = { "<sector_id>": { "cases": N, "vendors": M }, ... }

Read instantly by GET /sectors/{id}/gt-linkage to back the dossier's
"759 GT cases · 761 GT vendors operate here" credibility chip.

Idempotent. Usage:
    python -m scripts._precompute_sector_gt_linkage [DB_PATH]
    DB_PATH defaults to RUBLI_NORMALIZED.db (run dir = backend/).
"""
import json
import sqlite3
import sys
import time
from datetime import datetime


def precompute(db_path: str) -> None:
    print(f"Precomputing sector_gt_linkage in: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("PRAGMA busy_timeout=30000")

    t0 = time.time()
    rows = cur.execute(
        """
        SELECT ct.sector_id            AS sector_id,
               COUNT(DISTINCT gv.vendor_id) AS vendors,
               COUNT(DISTINCT gv.case_id)   AS cases
        FROM ground_truth_vendors gv
        JOIN contracts ct ON ct.vendor_id = gv.vendor_id
        WHERE ct.sector_id IS NOT NULL
        GROUP BY ct.sector_id
        """
    ).fetchall()
    print(f"   join done in {time.time() - t0:.1f}s · {len(rows)} sectors")

    linkage = {
        str(r["sector_id"]): {"cases": r["cases"] or 0, "vendors": r["vendors"] or 0}
        for r in rows
    }

    cur.execute("BEGIN IMMEDIATE")
    cur.execute(
        "INSERT OR REPLACE INTO precomputed_stats (stat_key, stat_value, updated_at) VALUES (?, ?, ?)",
        ("sector_gt_linkage", json.dumps(linkage), datetime.now().isoformat()),
    )
    conn.commit()

    print("\nsector_id   cases   vendors")
    print("-" * 28)
    for sid in sorted(linkage, key=lambda k: int(k)):
        v = linkage[sid]
        print(f"{sid:>9}{v['cases']:>8}{v['vendors']:>10}")
    conn.close()
    print("\n==> sector_gt_linkage written.")


if __name__ == "__main__":
    precompute(sys.argv[1] if len(sys.argv) > 1 else "RUBLI_NORMALIZED.db")
