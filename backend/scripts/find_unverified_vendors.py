#!/usr/bin/env python3
"""Find top unverified vendors by contract value."""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get top vendors not yet verified (by contract value)
    cursor.execute("""
        SELECT v.id, v.name, COUNT(c.id) as contracts, SUM(c.amount_mxn) as total_value
        FROM vendors v
        JOIN contracts c ON v.id = c.vendor_id
        LEFT JOIN vendor_classifications vc ON v.id = vc.vendor_id
        WHERE vc.industry_source IS NULL OR vc.industry_source != 'verified_online'
        GROUP BY v.id, v.name
        ORDER BY total_value DESC
        LIMIT 200
    """)

    print("Top 200 UNVERIFIED vendors by contract value:")
    print("=" * 100)
    for i, (vid, name, contracts, value) in enumerate(cursor.fetchall(), 1):
        print(f"{i:3}. {name[:55]:55} | {contracts:>6} contracts | {value/1e9:>10.2f}B MXN")

    # Count total unverified
    cursor.execute("""
        SELECT COUNT(DISTINCT v.id)
        FROM vendors v
        LEFT JOIN vendor_classifications vc ON v.id = vc.vendor_id
        WHERE vc.industry_source IS NULL OR vc.industry_source != 'verified_online'
    """)
    total_unverified = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM vendors")
    total_vendors = cursor.fetchone()[0]

    print()
    print(f"Total unverified vendors: {total_unverified:,} / {total_vendors:,}")

    conn.close()

if __name__ == "__main__":
    main()
