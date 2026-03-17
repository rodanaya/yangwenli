"""
Compute only PHI stats (step 12 of precompute_stats) and write them to precomputed_stats.
Runs standalone — does not recompute overview, sectors, etc.
"""
import sys
import json
import sqlite3
import os
import time
from datetime import datetime

DB_PATH = os.environ.get("DATABASE_PATH", "/app/RUBLI_DEPLOY.db")
print(f"DB: {DB_PATH}")

from scripts.precompute_stats import _precompute_phi

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row

print("=" * 60)
print("COMPUTING PHI STATS ONLY")
print("=" * 60)

stats = {}
cursor = conn.cursor()

print("12. Computing PHI (Procurement Health Index)...")
start = time.time()
_precompute_phi(cursor, stats)
elapsed = time.time() - start
print(f"   Done ({elapsed:.1f}s) — {len(stats)} keys computed")

print("\nWriting to precomputed_stats...")
for key, value in stats.items():
    conn.execute(
        "INSERT OR REPLACE INTO precomputed_stats (stat_key, stat_value, updated_at) VALUES (?, ?, ?)",
        (key, json.dumps(value), datetime.now().isoformat())
    )
conn.commit()
conn.close()

print(f"\nDone! Wrote {len(stats)} PHI keys to precomputed_stats.")
print("Keys written:", sorted(stats.keys()))
