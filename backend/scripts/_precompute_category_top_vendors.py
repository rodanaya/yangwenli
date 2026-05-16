"""
Precompute top-5 vendors per category and store in category_vendor_topn table.

This runs ONE full-table scan over contracts (vs 72 separate slow queries) and
produces an O(1)-read table used by /categories/{id}/top-vendors-fast endpoint.

Run: python -m scripts._precompute_category_top_vendors
"""
import sqlite3, time
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_DEPLOY.db"
TOP_N = 5


def run():
    t0 = time.time()
    conn = sqlite3.connect(str(DB_PATH), timeout=600)  # 10-min wait for WAL lock
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA wal_autocheckpoint=0")  # don't auto-checkpoint while we're running
    cur = conn.cursor()

    print("Creating category_vendor_topn table...")
    cur.execute("DROP TABLE IF EXISTS category_vendor_topn")
    cur.execute("""
        CREATE TABLE category_vendor_topn (
            category_id         INTEGER NOT NULL,
            rank                INTEGER NOT NULL,
            vendor_id           INTEGER NOT NULL,
            vendor_name         TEXT    NOT NULL,
            contract_count      INTEGER NOT NULL,
            vendor_value        REAL    NOT NULL,
            category_total_value REAL   NOT NULL,
            market_share_pct    REAL    NOT NULL,
            PRIMARY KEY (category_id, rank)
        )
    """)
    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_cvt_category ON category_vendor_topn(category_id)
    """)

    print("Running single-pass aggregation (may take ~3 min)...")
    t1 = time.time()
    cur.execute("""
        SELECT c.category_id,
               c.vendor_id,
               v.name AS vendor_name,
               COUNT(*) AS contract_count,
               SUM(c.amount_mxn) AS vendor_value
        FROM contracts c
        JOIN vendors v ON v.id = c.vendor_id
        WHERE c.category_id IS NOT NULL AND c.amount_mxn IS NOT NULL
        GROUP BY c.category_id, c.vendor_id
        ORDER BY c.category_id, vendor_value DESC
    """)
    all_rows = cur.fetchall()
    print(f"  Aggregation done in {time.time()-t1:.1f}s, got {len(all_rows)} (category,vendor) pairs")

    # Get category totals from category_stats (already precomputed)
    cat_totals = {}
    for row in cur.execute("SELECT category_id, total_value FROM category_stats"):
        cat_totals[row["category_id"]] = row["total_value"]

    # Rank within each category and keep top N
    inserts = []
    current_cat = None
    rank = 0
    for row in all_rows:
        cat_id = row["category_id"]
        if cat_id != current_cat:
            current_cat = cat_id
            rank = 0
        rank += 1
        if rank > TOP_N:
            continue
        cat_total = cat_totals.get(cat_id, row["vendor_value"])
        share = (row["vendor_value"] / cat_total * 100) if cat_total > 0 else 0.0
        inserts.append((
            cat_id, rank,
            row["vendor_id"], row["vendor_name"],
            row["contract_count"], round(row["vendor_value"], 2),
            round(cat_total, 2), round(share, 2)
        ))

    cur.executemany(
        "INSERT INTO category_vendor_topn VALUES (?,?,?,?,?,?,?,?)",
        inserts
    )
    conn.commit()
    conn.close()

    print(f"Done: {len(inserts)} rows inserted in {time.time()-t0:.1f}s total")
    print("Verify: SELECT * FROM category_vendor_topn WHERE category_id=26 ORDER BY rank")


if __name__ == "__main__":
    run()
