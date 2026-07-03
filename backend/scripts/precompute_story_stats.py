"""
Precompute the slow standalone /stories/* endpoints into precomputed_stats.

Currently: /stories/administration-comparison — a full-table aggregation over
~3.1M `contracts` rows (GROUP BY a computed CASE). Run live it costs ~9-12s on
every cache miss (the endpoint's only cache is an in-process, per-worker, 1h TTL
that every fresh worker / restart re-pays). Under launch load — cold workers +
traffic + deploy restarts all producing misses at once — the repeated scan 502s
at the gateway and can briefly starve /health. This writes ONE precomputed_stats
row so the endpoint reads O(1); the live query stays as the fallback.

The `data` array is language-independent (only the title/subtitle/methodology
strings vary by lang, and those stay in the endpoint), so one row serves both
locales. The query below MUST stay byte-for-byte in sync with
api/routers/stories.py::administration_comparison — keep them together if the
aggregation changes. Idempotent (INSERT OR REPLACE).

Usage:
    python -m scripts.precompute_story_stats [DB_PATH]
    DB_PATH defaults to RUBLI_DEPLOY.db (run dir = backend/).

⚠️ Deploy note (bind-mount + WAL): on prod this MUST run IN-CONTAINER against
RUBLI_DEPLOY.db followed by wal_checkpoint(TRUNCATE) — a host-python write lands
in a separate WAL the container never sees. See gotcha-prod-db-singlefile-bindmount-wal.
"""
import json
import sqlite3
import sys
import time
from datetime import datetime

# Kept verbatim in sync with api/routers/stories.py::administration_comparison.
ADMIN_COMPARISON_SQL = """
    SELECT
        CASE
            WHEN contract_year BETWEEN 2000 AND 2006 THEN 'Fox (2000-2006)'
            WHEN contract_year BETWEEN 2006 AND 2012 THEN 'Calderón (2006-2012)'
            WHEN contract_year BETWEEN 2012 AND 2018 THEN 'Peña Nieto (2012-2018)'
            WHEN contract_year >= 2018             THEN 'AMLO/Sheinbaum (2018-)'
            ELSE 'Pre-2000'
        END                                               AS administration,
        MIN(contract_year)                                AS year_from,
        MAX(contract_year)                                AS year_to,
        COUNT(*)                                          AS total_contracts,
        SUM(amount_mxn)                                   AS total_value_mxn,
        ROUND(AVG(CASE WHEN is_direct_award=1 THEN 100.0 ELSE 0.0 END), 1) AS direct_award_pct,
        ROUND(AVG(CASE WHEN is_single_bid=1  THEN 100.0 ELSE 0.0 END), 1)  AS single_bid_pct,
        ROUND(AVG(risk_score), 4)                         AS avg_risk_score,
        ROUND(AVG(CASE WHEN risk_level IN ('critical','high') THEN 100.0 ELSE 0.0 END), 1) AS high_risk_pct
    FROM contracts
    WHERE amount_mxn > 0
      AND contract_year IS NOT NULL
      AND contract_year BETWEEN 2000 AND 2025
    GROUP BY administration
    ORDER BY year_from
"""
ADMIN_COMPARISON_COLS = [
    "administration", "year_from", "year_to", "total_contracts",
    "total_value_mxn", "direct_award_pct", "single_bid_pct",
    "avg_risk_score", "high_risk_pct",
]
ADMIN_COMPARISON_KEY = "story_administration_comparison"


def compute_administration_comparison(cur):
    rows = cur.execute(ADMIN_COMPARISON_SQL).fetchall()
    return [dict(zip(ADMIN_COMPARISON_COLS, r)) for r in rows]


def main():
    db_path = sys.argv[1] if len(sys.argv) > 1 else "RUBLI_DEPLOY.db"
    print(f"Precomputing story stats in: {db_path}")
    conn = sqlite3.connect(db_path, timeout=600)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=600000")
    cur = conn.cursor()

    t0 = time.time()
    data = compute_administration_comparison(cur)
    now = datetime.now().isoformat()
    cur.execute("BEGIN IMMEDIATE")
    cur.execute(
        "INSERT OR REPLACE INTO precomputed_stats (stat_key, stat_value, updated_at) VALUES (?, ?, ?)",
        (ADMIN_COMPARISON_KEY, json.dumps(data), now),
    )
    conn.commit()
    print(f"==> wrote '{ADMIN_COMPARISON_KEY}' ({len(data)} rows) in {time.time() - t0:.1f}s")

    v = cur.execute(
        "SELECT stat_value FROM precomputed_stats WHERE stat_key = ?", (ADMIN_COMPARISON_KEY,)
    ).fetchone()
    if v:
        d = json.loads(v["stat_value"])
        for r in d:
            print(f"   {r['administration']:26} n={r['total_contracts']:>9,}  DA={r['direct_award_pct']}%  HR={r['high_risk_pct']}%")
    conn.close()


if __name__ == "__main__":
    main()
