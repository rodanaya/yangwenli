#!/usr/bin/env python3
"""
Apply Corporate Groups to Vendors

This script applies the verified corporate group data from verified_vendor_data.py
to the vendors table. This is essential for proper vendor deduplication - vendors
belonging to the same corporate group should be grouped together.

Usage:
    python backend/scripts/apply_corporate_groups.py
"""

import sqlite3
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Import verified vendor data
import sys
sys.path.insert(0, str(Path(__file__).parent))
from verified_vendor_data import VERIFIED_VENDORS

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def apply_corporate_groups():
    """Apply corporate group data from verified patterns to vendors table."""

    print("=" * 60)
    print("HYPERION-ATLAS: Apply Corporate Groups")
    print("=" * 60)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Verified patterns to process: {len(VERIFIED_VENDORS)}")

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA busy_timeout = 30000")
    cursor = conn.cursor()

    # Track statistics
    stats = {
        'patterns_processed': 0,
        'patterns_with_corp_group': 0,
        'vendors_updated': 0,
        'vendors_by_group': defaultdict(int)
    }

    # Get current state
    cursor.execute("SELECT COUNT(*) FROM vendors WHERE corporate_group IS NOT NULL")
    initial_count = cursor.fetchone()[0]
    print(f"Vendors with corporate_group before: {initial_count:,}")

    # Process each verified vendor pattern
    print("\nProcessing verified vendor patterns...")

    for pattern in VERIFIED_VENDORS:
        stats['patterns_processed'] += 1

        vendor_pattern = pattern.get('vendor_pattern')
        corporate_group = pattern.get('corporate_group')

        if not vendor_pattern:
            continue

        if not corporate_group:
            continue

        stats['patterns_with_corp_group'] += 1

        # Apply the corporate group to matching vendors
        cursor.execute("""
            UPDATE vendors
            SET corporate_group = ?
            WHERE name LIKE ? AND corporate_group IS NULL
        """, (corporate_group, vendor_pattern))

        updated = cursor.rowcount
        if updated > 0:
            stats['vendors_updated'] += updated
            stats['vendors_by_group'][corporate_group] += updated

        # Progress indicator
        if stats['patterns_processed'] % 500 == 0:
            print(f"  Processed {stats['patterns_processed']:,} patterns, "
                  f"updated {stats['vendors_updated']:,} vendors...")

    conn.commit()

    # Get final state
    cursor.execute("SELECT COUNT(*) FROM vendors WHERE corporate_group IS NOT NULL")
    final_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(DISTINCT corporate_group) FROM vendors WHERE corporate_group IS NOT NULL")
    unique_groups = cursor.fetchone()[0]

    # Show top corporate groups by vendor count
    cursor.execute("""
        SELECT corporate_group, COUNT(*) as cnt
        FROM vendors
        WHERE corporate_group IS NOT NULL
        GROUP BY corporate_group
        ORDER BY cnt DESC
        LIMIT 20
    """)
    top_groups = cursor.fetchall()

    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    print(f"\nPatterns processed: {stats['patterns_processed']:,}")
    print(f"Patterns with corporate_group: {stats['patterns_with_corp_group']:,}")
    print(f"Vendors updated this run: {stats['vendors_updated']:,}")
    print(f"Total vendors with corporate_group: {final_count:,}")
    print(f"Unique corporate groups: {unique_groups}")

    print("\nTop 20 Corporate Groups by Vendor Count:")
    for group, count in top_groups:
        print(f"  {count:5d}: {group}")

    conn.close()

    print("\n" + "=" * 60)
    print("Corporate group application complete!")
    print("=" * 60)

    return stats


if __name__ == "__main__":
    apply_corporate_groups()
