"""
compute_vendor_tenure.py
Precompute vendor-institution tenure for all vendor-institution pairs with >= min_contracts.

Usage:
    python -m scripts.compute_vendor_tenure [--min-contracts 3]

Runtime: ~5-10 minutes on 3.1M contracts.
"""

import argparse
import sqlite3
import time
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def main(min_contracts: int = 3):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=-200000")
    cursor = conn.cursor()

    print("=" * 60)
    print("COMPUTING VENDOR-INSTITUTION TENURE")
    print("=" * 60)
    t0 = time.time()

    print(f"\n1. Aggregating vendor-institution pairs (min_contracts={min_contracts})...")
    cursor.execute("""
        SELECT
            vendor_id,
            institution_id,
            MIN(contract_year) AS first_contract_year,
            MAX(contract_year) AS last_contract_year,
            COUNT(*) AS total_contracts,
            SUM(COALESCE(amount_mxn, 0)) AS total_amount_mxn
        FROM contracts
        WHERE vendor_id IS NOT NULL
          AND institution_id IS NOT NULL
          AND contract_year IS NOT NULL
        GROUP BY vendor_id, institution_id
        HAVING COUNT(*) >= ?
    """, (min_contracts,))
    rows = cursor.fetchall()
    print(f"   Found {len(rows):,} vendor-institution pairs")

    if not rows:
        print("No data to insert.")
        conn.close()
        return

    print("\n2. Inserting into vendor_institution_tenure...")
    batch = []
    for r in rows:
        # win_rate: contracts / contracts (we don't have bid data per institution, default None)
        batch.append((
            r["vendor_id"],
            r["institution_id"],
            r["first_contract_year"],
            r["last_contract_year"],
            r["total_contracts"],
            r["total_amount_mxn"],
            None,  # win_rate_at_institution — no per-institution bid count data
        ))

    BATCH_SIZE = 50_000
    cursor.execute("DELETE FROM vendor_institution_tenure")
    for i in range(0, len(batch), BATCH_SIZE):
        chunk = batch[i:i + BATCH_SIZE]
        cursor.executemany("""
            INSERT INTO vendor_institution_tenure
                (vendor_id, institution_id, first_contract_year, last_contract_year,
                 total_contracts, total_amount_mxn, win_rate_at_institution)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, chunk)
        if (i // BATCH_SIZE) % 5 == 0:
            print(f"   Inserted {min(i + BATCH_SIZE, len(batch)):,} / {len(batch):,}")

    conn.commit()

    # Quick validation
    count = cursor.execute("SELECT COUNT(*) FROM vendor_institution_tenure").fetchone()[0]
    print(f"\n3. Validation: {count:,} rows in vendor_institution_tenure")

    # Show top tenure examples
    examples = cursor.execute("""
        SELECT v.name, i.name AS inst_name,
               vit.first_contract_year, vit.last_contract_year,
               (vit.last_contract_year - vit.first_contract_year + 1) AS tenure_years,
               vit.total_contracts
        FROM vendor_institution_tenure vit
        JOIN vendors v ON vit.vendor_id = v.id
        JOIN institutions i ON vit.institution_id = i.id
        ORDER BY tenure_years DESC
        LIMIT 5
    """).fetchall()
    print("\n   Top tenure examples:")
    for e in examples:
        print(f"   {e['name'][:40]:40s} @ {e['inst_name'][:25]:25s} "
              f"-> {e['tenure_years']} yrs ({e['first_contract_year']}-{e['last_contract_year']}), "
              f"{e['total_contracts']:,} contracts")

    elapsed = time.time() - t0
    print(f"\nDone in {elapsed:.1f}s")
    print("=" * 60)
    conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Compute vendor-institution tenure")
    parser.add_argument("--min-contracts", type=int, default=3,
                        help="Minimum contracts per vendor-institution pair (default: 3)")
    args = parser.parse_args()
    main(min_contracts=args.min_contracts)
