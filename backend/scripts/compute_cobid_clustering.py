"""
compute_cobid_clustering.py
Copy co-bidding clustering coefficients and triangle counts from
vendor_graph_features to vendors table (cobid_clustering_coeff, cobid_triangle_count).

The clustering coefficient was computed by build_vendor_graph.py.
Triangle count is derived: triangles = round(cc * degree * (degree-1) / 2).

Usage:
    python -m scripts.compute_cobid_clustering

Runtime: seconds (no graph rebuild needed).
"""

import sqlite3
import time
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    cursor = conn.cursor()

    print("=" * 60)
    print("COPYING CO-BID CLUSTERING COEFFICIENTS -> vendors")
    print("=" * 60)
    t0 = time.time()

    # Read from vendor_graph_features
    rows = cursor.execute("""
        SELECT vendor_id, clustering_coefficient, degree
        FROM vendor_graph_features
        WHERE clustering_coefficient > 0
    """).fetchall()
    print(f"Found {len(rows):,} vendors with non-zero clustering coefficient")

    # Compute triangle counts and batch update vendors
    BATCH = 50_000
    batch = []
    for r in rows:
        cc = r["clustering_coefficient"]
        deg = r["degree"]
        # Number of triangles = cc * degree * (degree-1) / 2 (rounded)
        triangles = round(cc * deg * (deg - 1) / 2)
        batch.append((cc, triangles, r["vendor_id"]))

    print(f"Updating {len(batch):,} rows in vendors table...")
    for i in range(0, len(batch), BATCH):
        chunk = batch[i:i + BATCH]
        cursor.executemany("""
            UPDATE vendors
            SET cobid_clustering_coeff = ?,
                cobid_triangle_count = ?
            WHERE id = ?
        """, chunk)
    conn.commit()

    # Validation
    result = cursor.execute("""
        SELECT COUNT(*) as total,
               COUNT(cobid_clustering_coeff) as with_coeff,
               AVG(cobid_clustering_coeff) as avg_coeff,
               MAX(cobid_triangle_count) as max_triangles
        FROM vendors
    """).fetchone()
    print(f"\nValidation:")
    print(f"  Total vendors: {result['total']:,}")
    print(f"  With clustering coeff: {result['with_coeff']:,}")
    print(f"  Avg clustering coeff: {result['avg_coeff']:.6f}")
    print(f"  Max triangle count: {result['max_triangles']}")

    # Show top vendors by triangle count
    top = cursor.execute("""
        SELECT v.name, cobid_clustering_coeff, cobid_triangle_count
        FROM vendors v
        ORDER BY cobid_triangle_count DESC
        LIMIT 5
    """).fetchall()
    print("\n  Top 5 vendors by triangle count (ring coordinator candidates):")
    for r in top:
        print(f"    {r['name'][:50]:50s}  cc={r['cobid_clustering_coeff']:.4f}  triangles={r['cobid_triangle_count']}")

    elapsed = time.time() - t0
    print(f"\nDone in {elapsed:.1f}s")
    print("=" * 60)
    conn.close()


if __name__ == "__main__":
    main()
