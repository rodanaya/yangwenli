#!/usr/bin/env python3
"""
Token-Based Corporate Group Matching (Version 2)

This script applies token-based matching to assign corporate groups to vendors.
Unlike the SQL LIKE pattern approach (v1), this version:
- Matches tokens as complete words (not substrings)
- Supports multi-word tokens
- Has better precision with fewer false positives

Usage:
    python backend/scripts/match_corporate_groups_v2.py
"""

import sqlite3
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Import token matcher
import sys
sys.path.insert(0, str(Path(__file__).parent))
from corporate_group_tokens import match_corporate_group, CORPORATE_GROUP_TOKENS

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def apply_token_matching():
    """Apply token-based corporate group matching to vendors."""

    print("=" * 60)
    print("HYPERION-ATLAS: Token-Based Corporate Group Matching v2")
    print("=" * 60)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Timestamp: {datetime.now()}")
    print(f"Corporate groups defined: {len(CORPORATE_GROUP_TOKENS)}")

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA busy_timeout = 30000")
    cursor = conn.cursor()

    # Get current state
    cursor.execute("SELECT COUNT(*) FROM vendors")
    total_vendors = cursor.fetchone()[0]
    print(f"\nTotal vendors: {total_vendors:,}")

    cursor.execute("SELECT COUNT(*) FROM vendors WHERE corporate_group IS NOT NULL")
    before_count = cursor.fetchone()[0]
    print(f"With corporate_group (before): {before_count:,}")

    # Get all company vendors (exclude individuals)
    print("\nLoading company vendors...")
    cursor.execute("""
        SELECT id, name, is_individual, corporate_group
        FROM vendors
        WHERE is_individual = 0
    """)
    companies = cursor.fetchall()
    print(f"Company vendors to process: {len(companies):,}")

    # Track statistics
    stats = {
        'processed': 0,
        'matched': 0,
        'new_matches': 0,
        'updated': 0,
        'by_group': defaultdict(int),
    }

    # Process in batches
    batch_size = 10000
    updates = []

    print("\nProcessing vendors...")
    for vendor_id, name, is_individual, existing_group in companies:
        stats['processed'] += 1

        # Skip if already has a corporate group (keep existing)
        if existing_group:
            continue

        # Try token matching
        corp_group, matched_tokens, confidence = match_corporate_group(name, is_individual)

        if corp_group:
            stats['matched'] += 1
            stats['new_matches'] += 1
            stats['by_group'][corp_group] += 1
            updates.append((corp_group, vendor_id))

        # Progress indicator
        if stats['processed'] % 50000 == 0:
            print(f"  Processed {stats['processed']:,} vendors, "
                  f"matched {stats['matched']:,}...")

    # Apply updates in batches
    print(f"\nApplying {len(updates):,} updates...")
    for i in range(0, len(updates), batch_size):
        batch = updates[i:i + batch_size]
        cursor.executemany("""
            UPDATE vendors SET corporate_group = ?
            WHERE id = ?
        """, batch)
        stats['updated'] += len(batch)

    conn.commit()

    # Get final stats
    cursor.execute("SELECT COUNT(*) FROM vendors WHERE corporate_group IS NOT NULL")
    after_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(DISTINCT corporate_group) FROM vendors WHERE corporate_group IS NOT NULL")
    unique_groups = cursor.fetchone()[0]

    # Verify no individuals matched
    cursor.execute("""
        SELECT COUNT(*) FROM vendors
        WHERE corporate_group IS NOT NULL AND is_individual = 1
    """)
    individual_errors = cursor.fetchone()[0]

    # Top groups
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
    print(f"\nCompanies processed: {stats['processed']:,}")
    print(f"New matches found: {stats['new_matches']:,}")
    print(f"Vendors updated: {stats['updated']:,}")
    print(f"\nCorporate group coverage:")
    print(f"  Before: {before_count:,} ({100*before_count/total_vendors:.2f}%)")
    print(f"  After: {after_count:,} ({100*after_count/total_vendors:.2f}%)")
    print(f"  Increase: {after_count - before_count:,}")
    print(f"\nUnique corporate groups: {unique_groups}")
    print(f"Individual errors: {individual_errors} {'PASS' if individual_errors == 0 else 'FAIL'}")

    print("\nTop 20 Corporate Groups by Vendor Count:")
    for group, count in top_groups:
        print(f"  {count:5d}: {group}")

    # Show token matching stats by group
    print("\nNew matches by corporate group:")
    sorted_groups = sorted(stats['by_group'].items(), key=lambda x: x[1], reverse=True)[:15]
    for group, count in sorted_groups:
        print(f"  {count:5d}: {group}")

    conn.close()

    print("\n" + "=" * 60)
    print("Token-based matching complete!")
    print("=" * 60)

    return stats


if __name__ == "__main__":
    apply_token_matching()
