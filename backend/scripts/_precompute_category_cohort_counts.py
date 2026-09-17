"""
Precompute per-category vendor cohort counts (distinct vendor_count, T1
count) onto category_stats — needed for the Firmament galaxy-level
Categories lens (cluster-stats aggregate), which was missing these two
fields (total_value/avg_risk/high_risk_pct already existed on the table).

`SELECT category_id, COUNT(DISTINCT vendor_id) FROM contracts GROUP BY
category_id` timed out live (>60s) — no covering index makes SQLite build
a per-group hash/temp-btree over 3.1M rows for COUNT(DISTINCT). Same trick
as _precompute_category_top_vendors.py: aggregate at (category_id,
vendor_id) granularity first (a two-column GROUP BY SQLite handles via a
sort, cheap), then count distinct pairs in Python.

Run: python -m scripts._precompute_category_cohort_counts [DB_PATH]
"""
import sqlite3
import sys
import time
from collections import defaultdict
from pathlib import Path


def _resolve_db_path() -> Path:
    base = Path(__file__).resolve().parent.parent
    for name in ("RUBLI_NORMALIZED.db", "RUBLI_DEPLOY.db"):
        p = base / name
        if p.exists() and p.stat().st_size > 0:
            return p
    raise FileNotFoundError(f"No DB found at {base}/RUBLI_*.db")


def run(db_path: str) -> None:
    t0 = time.time()
    conn = sqlite3.connect(db_path, timeout=600)  # 10-min wait for WAL lock
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA wal_autocheckpoint=0")  # don't auto-checkpoint while we're running
    cur = conn.cursor()

    print(f"DB: {db_path}")

    tier_by_vendor: dict[int, int | None] = {}
    for vid, tier in cur.execute("SELECT vendor_id, ips_tier FROM aria_queue"):
        tier_by_vendor[vid] = tier
    print(f"Loaded {len(tier_by_vendor)} vendor tiers")

    print("Aggregating (category_id, vendor_id) pairs (single pass)...")
    t1 = time.time()
    cur.execute(
        """
        SELECT category_id, vendor_id
        FROM contracts
        WHERE category_id IS NOT NULL AND vendor_id IS NOT NULL
        GROUP BY category_id, vendor_id
        """
    )
    vendor_count: dict[int, int] = defaultdict(int)
    t1_count: dict[int, int] = defaultdict(int)
    for cat_id, vendor_id in cur.fetchall():
        vendor_count[cat_id] += 1
        if tier_by_vendor.get(vendor_id) == 1:
            t1_count[cat_id] += 1
    print(f"  done in {time.time() - t1:.1f}s, {len(vendor_count)} categories")

    existing_cols = {r[1] for r in cur.execute("PRAGMA table_info(category_stats)")}
    if "vendor_count" not in existing_cols:
        cur.execute("ALTER TABLE category_stats ADD COLUMN vendor_count INTEGER DEFAULT 0")
    if "t1_count" not in existing_cols:
        cur.execute("ALTER TABLE category_stats ADD COLUMN t1_count INTEGER DEFAULT 0")

    all_cat_ids = [r[0] for r in cur.execute("SELECT category_id FROM category_stats")]
    updates = [(vendor_count.get(cid, 0), t1_count.get(cid, 0), cid) for cid in all_cat_ids]
    cur.executemany(
        "UPDATE category_stats SET vendor_count = ?, t1_count = ? WHERE category_id = ?",
        updates,
    )
    conn.commit()
    # See _precompute_category_top_vendors.py's comment on why this matters
    # on prod (single-file bind-mount DB + WAL sidecar lost on container recreate).
    conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    conn.close()

    print(f"Done: {len(updates)} categories updated in {time.time() - t0:.1f}s total")
    print("Verify: SELECT category_id, category_name, vendor_count, t1_count FROM category_stats LIMIT 5")


if __name__ == "__main__":
    run(sys.argv[1] if len(sys.argv) > 1 else str(_resolve_db_path()))
