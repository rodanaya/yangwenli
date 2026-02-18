"""
Vendor deduplication mapping.

Tier 1: RFC-based exact matching (highest confidence).
Tier 2: Normalized name matching (for remaining vendors).

Creates vendor_canonical_map table mapping vendor IDs to a canonical
vendor (the one with the most contracts per cluster).

Run from backend/ directory:
    python -m scripts.apply_vendor_dedup
"""
import sqlite3
import time
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def create_table(cur: sqlite3.Cursor) -> None:
    """Create the vendor_canonical_map table (drop if exists)."""
    cur.execute("DROP TABLE IF EXISTS vendor_canonical_map")
    cur.execute("""
        CREATE TABLE vendor_canonical_map (
            vendor_id INTEGER PRIMARY KEY,
            canonical_id INTEGER NOT NULL,
            cluster_id INTEGER NOT NULL,
            match_method TEXT NOT NULL,
            confidence REAL DEFAULT 1.0,
            FOREIGN KEY (vendor_id) REFERENCES vendors(id),
            FOREIGN KEY (canonical_id) REFERENCES vendors(id)
        )
    """)
    cur.execute("CREATE INDEX idx_vcm_canonical ON vendor_canonical_map(canonical_id)")
    cur.execute("CREATE INDEX idx_vcm_cluster ON vendor_canonical_map(cluster_id)")


def pick_canonical(cur: sqlite3.Cursor, vendor_ids: list[int]) -> int:
    """Pick the vendor with the most contracts as canonical."""
    placeholders = ",".join("?" for _ in vendor_ids)
    cur.execute(f"""
        SELECT v.id, COALESCE(vs.total_contracts, v.total_contracts, 0) as tc
        FROM vendors v
        LEFT JOIN vendor_stats vs ON vs.vendor_id = v.id
        WHERE v.id IN ({placeholders})
        ORDER BY tc DESC, v.id ASC
        LIMIT 1
    """, vendor_ids)
    row = cur.fetchone()
    return row["id"] if row else vendor_ids[0]


def main() -> None:
    t0 = time.time()
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("PRAGMA journal_mode=WAL")
    cur.execute("PRAGMA synchronous=OFF")
    cur.execute("PRAGMA busy_timeout=60000")

    print("=" * 60)
    print("VENDOR DEDUPLICATION")
    print("=" * 60)

    create_table(cur)

    # Track which vendors have been mapped
    mapped_vendors = set()
    cluster_id = 0
    total_merged = 0

    # --- Tier 1: RFC exact match ---
    print("\n--- Tier 1: RFC exact match ---")
    cur.execute("""
        SELECT UPPER(TRIM(rfc)) as rfc_norm, GROUP_CONCAT(id, ',') as ids
        FROM vendors
        WHERE rfc IS NOT NULL AND TRIM(rfc) != '' AND LENGTH(TRIM(rfc)) >= 10
        GROUP BY UPPER(TRIM(rfc))
        HAVING COUNT(*) > 1
    """)
    rfc_clusters = cur.fetchall()
    print(f"  RFC duplicate clusters: {len(rfc_clusters)}")

    for row in rfc_clusters:
        cluster_id += 1
        vendor_ids = [int(x) for x in row["ids"].split(",")]
        canonical_id = pick_canonical(cur, vendor_ids)

        for vid in vendor_ids:
            cur.execute("""
                INSERT INTO vendor_canonical_map
                    (vendor_id, canonical_id, cluster_id, match_method, confidence)
                VALUES (?, ?, ?, 'rfc_exact', 1.0)
            """, (vid, canonical_id, cluster_id))
            mapped_vendors.add(vid)
            if vid != canonical_id:
                total_merged += 1

    # --- Tier 2: Normalized name match ---
    print("\n--- Tier 2: Normalized name match ---")
    cur.execute("""
        SELECT normalized_name, GROUP_CONCAT(id, ',') as ids
        FROM vendors
        WHERE normalized_name IS NOT NULL AND normalized_name != ''
        GROUP BY normalized_name
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC
    """)
    name_clusters = cur.fetchall()
    name_cluster_count = 0

    for row in name_clusters:
        vendor_ids = [int(x) for x in row["ids"].split(",")]
        # Skip vendors already mapped by RFC
        unmapped = [v for v in vendor_ids if v not in mapped_vendors]
        if len(unmapped) <= 1 and all(v in mapped_vendors for v in vendor_ids):
            continue

        cluster_id += 1
        name_cluster_count += 1
        canonical_id = pick_canonical(cur, vendor_ids)

        for vid in vendor_ids:
            if vid in mapped_vendors:
                continue
            cur.execute("""
                INSERT INTO vendor_canonical_map
                    (vendor_id, canonical_id, cluster_id, match_method, confidence)
                VALUES (?, ?, ?, 'normalized_name', 0.9)
            """, (vid, canonical_id, cluster_id))
            mapped_vendors.add(vid)
            if vid != canonical_id:
                total_merged += 1

    print(f"  Name duplicate clusters: {name_cluster_count}")

    # --- Self-map remaining vendors ---
    print("\n--- Self-mapping remaining vendors ---")
    t1 = time.time()
    cur.execute("""
        INSERT INTO vendor_canonical_map (vendor_id, canonical_id, cluster_id, match_method, confidence)
        SELECT id, id, id, 'self', 1.0
        FROM vendors
        WHERE id NOT IN (SELECT vendor_id FROM vendor_canonical_map)
    """)
    self_mapped = cur.rowcount
    print(f"  Self-mapped: {self_mapped:,} vendors in {time.time() - t1:.1f}s")

    conn.commit()

    # Summary
    cur.execute("SELECT COUNT(*) FROM vendor_canonical_map")
    total_rows = cur.fetchone()[0]
    cur.execute("SELECT COUNT(DISTINCT canonical_id) FROM vendor_canonical_map")
    unique_canonical = cur.fetchone()[0]

    print(f"\n{'='*60}")
    print(f"DONE in {time.time() - t0:.1f}s")
    print(f"  Total vendors mapped: {total_rows:,}")
    print(f"  Unique canonical vendors: {unique_canonical:,}")
    print(f"  Merged (non-self): {total_merged:,}")
    print(f"{'='*60}")

    # Show top clusters by member count
    cur.execute("""
        SELECT vcm.cluster_id, vcm.canonical_id, vcm.match_method,
               v.name, COUNT(*) as members
        FROM vendor_canonical_map vcm
        JOIN vendors v ON v.id = vcm.canonical_id
        WHERE vcm.match_method != 'self'
        GROUP BY vcm.cluster_id
        ORDER BY members DESC
        LIMIT 10
    """)
    rows = cur.fetchall()
    if rows:
        print("\nTop 10 clusters by size:")
        for row in rows:
            print(f"  [{row['match_method']}] members={row['members']} "
                  f"canonical={row['name'][:60]}")

    conn.close()


if __name__ == "__main__":
    main()
