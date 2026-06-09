"""
Precompute top-5 vendors per category and store in category_vendor_topn table.

This runs ONE full-table scan over contracts (vs 72 separate slow queries) and
produces an O(1)-read table used by /categories/{id}/top-vendors-fast endpoint.

2026-06-09: the table now carries per-vendor RISK fields (avg_risk, max_risk,
direct_award_pct, single_bid_pct) so the dossier's vendor register Risk column
is populated instead of rendering "—" for every row. These come for free from
the same GROUP BY — no extra pass.

Run: python -m scripts._precompute_category_top_vendors [DB_PATH]
"""
import sqlite3
import sys
import time
from pathlib import Path

TOP_N = 5


def _resolve_db_path() -> Path:
    """Prod uses RUBLI_DEPLOY.db; local dev reads RUBLI_NORMALIZED.db. Prefer
    NORMALIZED locally (what the dev backend serves) and fall back to DEPLOY
    (the only file present on the VPS)."""
    base = Path(__file__).resolve().parent.parent
    for name in ("RUBLI_NORMALIZED.db", "RUBLI_DEPLOY.db"):
        p = base / name
        if p.exists() and p.stat().st_size > 0:
            return p
    raise FileNotFoundError(f"No DB found at {base}/RUBLI_*.db")


def run(db_path: str) -> None:
    t0 = time.time()
    conn = sqlite3.connect(db_path, timeout=600)  # 10-min wait for WAL lock
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA wal_autocheckpoint=0")  # don't auto-checkpoint while we're running
    cur = conn.cursor()

    print(f"DB: {db_path}")
    print("Creating category_vendor_topn table (with risk fields)...")
    cur.execute("DROP TABLE IF EXISTS category_vendor_topn")
    cur.execute("""
        CREATE TABLE category_vendor_topn (
            category_id          INTEGER NOT NULL,
            rank                 INTEGER NOT NULL,
            vendor_id            INTEGER NOT NULL,
            vendor_name          TEXT    NOT NULL,
            contract_count       INTEGER NOT NULL,
            vendor_value         REAL    NOT NULL,
            category_total_value REAL    NOT NULL,
            market_share_pct     REAL    NOT NULL,
            avg_risk             REAL,
            max_risk             REAL,
            direct_award_pct     REAL,
            single_bid_pct       REAL,
            PRIMARY KEY (category_id, rank)
        )
    """)
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_cvt_category ON category_vendor_topn(category_id)"
    )

    print("Running single-pass aggregation (may take ~3 min)...")
    t1 = time.time()
    cur.execute("""
        SELECT c.category_id,
               c.vendor_id,
               v.name AS vendor_name,
               COUNT(*)                                    AS contract_count,
               SUM(c.amount_mxn)                           AS vendor_value,
               AVG(c.risk_score)                           AS avg_risk,
               MAX(c.risk_score)                           AS max_risk,
               SUM(c.is_direct_award) * 100.0 / COUNT(*)   AS direct_award_pct,
               SUM(c.is_single_bid)   * 100.0 / COUNT(*)   AS single_bid_pct
        FROM contracts c
        JOIN vendors v ON v.id = c.vendor_id
        WHERE c.category_id IS NOT NULL AND c.amount_mxn IS NOT NULL
        GROUP BY c.category_id, c.vendor_id
        ORDER BY c.category_id, vendor_value DESC
    """)
    all_rows = cur.fetchall()
    print(f"  Aggregation done in {time.time()-t1:.1f}s, got {len(all_rows)} (category,vendor) pairs")

    # Category totals from category_stats (already precomputed)
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
            round(cat_total, 2), round(share, 2),
            round(row["avg_risk"], 4) if row["avg_risk"] is not None else None,
            round(row["max_risk"], 4) if row["max_risk"] is not None else None,
            round(row["direct_award_pct"], 1) if row["direct_award_pct"] is not None else None,
            round(row["single_bid_pct"], 1) if row["single_bid_pct"] is not None else None,
        ))

    cur.executemany(
        "INSERT INTO category_vendor_topn VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        inserts
    )
    conn.commit()
    # Merge the WAL into the main DB file. On prod RUBLI_DEPLOY.db is a SINGLE-FILE
    # bind mount (./backend/RUBLI_DEPLOY.db:/app/RUBLI_DEPLOY.db) + WAL mode, so the
    # -wal sidecar lives in the container's ephemeral layer and is LOST when the
    # container is recreated. Without this checkpoint the rebuilt table sits in the
    # WAL and vanishes on the next deploy/restart. (Learned the hard way 2026-06-09.)
    conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    conn.close()

    print(f"Done: {len(inserts)} rows inserted in {time.time()-t0:.1f}s total")
    print("Verify: SELECT * FROM category_vendor_topn WHERE category_id=26 ORDER BY rank")


if __name__ == "__main__":
    run(sys.argv[1] if len(sys.argv) > 1 else str(_resolve_db_path()))
