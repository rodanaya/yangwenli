"""One-off: backfill total_institutions into the precomputed_stats 'sectors' JSON.

The per-sector aggregate in precompute_stats.py historically omitted
COUNT(DISTINCT institution_id) (the overview query had it, the per-sector one
did not — now fixed in precompute_stats.py). As a result the precomputed
'sectors' row carried no total_institutions, so the /sectors and /sectors/{id}
endpoints returned total_institutions = 0 for every sector.

This patches the EXISTING precomputed row in place (no full regen — one
GROUP BY read + a single-row update). Idempotent and reversible: re-running
recomputes from current data, and a later full precompute_stats run produces
the same values.

Usage:
    python -m scripts._patch_sector_institutions [db_path]
    (defaults to backend/RUBLI_NORMALIZED.db)
"""
import json
import sqlite3
import sys
from pathlib import Path

db_path = sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).parent.parent / "RUBLI_NORMALIZED.db")
print(f"DB: {db_path}")

conn = sqlite3.connect(db_path, timeout=30)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Distinct institutions active in each sector (the semantically-correct count:
# an institution counts for a sector if it has any contract there).
counts = {
    r["sector_id"]: r["n"]
    for r in cur.execute(
        "SELECT sector_id, COUNT(DISTINCT institution_id) AS n "
        "FROM contracts WHERE sector_id IS NOT NULL GROUP BY sector_id"
    ).fetchall()
}
print(f"Institution counts per sector: {counts}")

row = cur.execute(
    "SELECT stat_value FROM precomputed_stats WHERE stat_key = 'sectors'"
).fetchone()
if not row:
    print("No precomputed 'sectors' row found — run precompute_stats.py instead.")
    conn.close()
    sys.exit(1)

sectors = json.loads(row[0])
patched = 0
for s in sectors:
    sid = s.get("id") or s.get("sector_id")
    new = counts.get(sid, 0)
    old = s.get("total_institutions", 0)
    if old != new:
        s["total_institutions"] = new
        patched += 1
    print(f"  sector {sid} ({s.get('code')}): total_institutions {old} -> {new}")

cur.execute(
    "UPDATE precomputed_stats SET stat_value = ? WHERE stat_key = 'sectors'",
    (json.dumps(sectors),),
)
conn.commit()
try:
    cur.execute("PRAGMA wal_checkpoint(TRUNCATE)")
except sqlite3.Error as e:
    print(f"(wal_checkpoint skipped: {e})")
conn.close()
print(f"Patched {patched}/{len(sectors)} sectors in {db_path}")
