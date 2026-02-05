"""
HYPERION-PROMETHEUS: Vendor Normalization Script

Normalizes all vendors in the database, preparing them for deduplication.
This is the first step of the PROMETHEUS pipeline.

Usage:
    python -m scripts.normalize_vendors [--dry-run] [--sample N]

Options:
    --dry-run   Show sample results without updating database
    --sample N  Only process N random vendors for testing
"""

import sys
import sqlite3
import argparse
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from hyperion.prometheus.normalize import (
    VendorNormalizer,
    update_vendors_with_normalization
)


# Database path
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def sample_normalization(conn: sqlite3.Connection, n: int = 50) -> None:
    """Show sample normalization results."""
    cursor = conn.cursor()

    # Get sample vendors (mix of with/without RFC, different sizes)
    cursor.execute("""
        SELECT v.id, v.name, v.rfc,
               COUNT(c.id) as contracts,
               SUM(COALESCE(c.amount_mxn, 0)) as value
        FROM vendors v
        LEFT JOIN contracts c ON c.vendor_id = v.id
        GROUP BY v.id
        ORDER BY value DESC
        LIMIT ?
    """, (n,))

    rows = cursor.fetchall()

    normalizer = VendorNormalizer()

    print("\nSample Normalization Results:")
    print("=" * 100)
    print(f"{'Original Name':<45} {'Normalized':<35} {'RFC':<14} {'Type':<8}")
    print("-" * 100)

    for row in rows:
        vendor = {'id': row[0], 'name': row[1], 'rfc': row[2]}
        norm = normalizer.normalize_vendor(vendor)

        orig = vendor['name'][:44] if vendor['name'] else ''
        normalized = norm.base_name[:34] if norm.base_name else ''
        rfc = norm.rfc or 'N/A'
        vtype = 'Person' if norm.is_individual else 'Corp'

        print(f"{orig:<45} {normalized:<35} {rfc:<14} {vtype:<8}")


def get_statistics(conn: sqlite3.Connection) -> dict:
    """Get vendor statistics before/after normalization."""
    cursor = conn.cursor()

    stats = {}

    # Total vendors
    cursor.execute("SELECT COUNT(*) FROM vendors")
    stats['total'] = cursor.fetchone()[0]

    # With RFC
    cursor.execute("SELECT COUNT(*) FROM vendors WHERE rfc IS NOT NULL AND rfc != ''")
    stats['with_rfc'] = cursor.fetchone()[0]

    # Check if normalized columns exist
    cursor.execute("PRAGMA table_info(vendors)")
    columns = [row[1] for row in cursor.fetchall()]

    if 'normalized_name' in columns:
        # Normalized
        cursor.execute("SELECT COUNT(*) FROM vendors WHERE normalized_name IS NOT NULL")
        stats['normalized'] = cursor.fetchone()[0]

        # Individuals
        cursor.execute("SELECT COUNT(*) FROM vendors WHERE is_individual = 1")
        stats['individuals'] = cursor.fetchone()[0]

        # With phonetic code
        cursor.execute("SELECT COUNT(*) FROM vendors WHERE phonetic_code IS NOT NULL AND phonetic_code != ''")
        stats['with_phonetic'] = cursor.fetchone()[0]

        # Unique phonetic codes
        cursor.execute("SELECT COUNT(DISTINCT phonetic_code) FROM vendors WHERE phonetic_code IS NOT NULL")
        stats['unique_phonetic'] = cursor.fetchone()[0]

        # Unique first tokens
        cursor.execute("SELECT COUNT(DISTINCT first_token) FROM vendors WHERE first_token IS NOT NULL")
        stats['unique_first_token'] = cursor.fetchone()[0]

    return stats


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='HYPERION-PROMETHEUS Vendor Normalization'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show sample results without updating database'
    )
    parser.add_argument(
        '--sample',
        type=int,
        default=30,
        help='Number of vendors to sample (for dry-run)'
    )
    args = parser.parse_args()

    print("=" * 60)
    print("HYPERION-PROMETHEUS: Vendor Normalization")
    print("=" * 60)

    # Connect to database
    if not DB_PATH.exists():
        print(f"ERROR: Database not found: {DB_PATH}")
        return 1

    conn = sqlite3.connect(DB_PATH)
    print(f"\nDatabase: {DB_PATH}")

    # Get statistics
    stats = get_statistics(conn)
    print(f"\nVendor Statistics (Before):")
    print(f"  Total vendors:    {stats['total']:,}")
    print(f"  With RFC:         {stats['with_rfc']:,} ({100*stats['with_rfc']/stats['total']:.1f}%)")

    if 'normalized' in stats:
        print(f"  Already normalized: {stats['normalized']:,}")

    if args.dry_run:
        sample_normalization(conn, args.sample)
        conn.close()
        print("\n[DRY RUN] No changes made to database.")
        return 0

    # Run normalization
    print("\nNormalizing vendors...")

    def progress(current, total):
        pct = 100 * current / total
        print(f"  Progress: {current:,} / {total:,} ({pct:.1f}%)", end='\r')

    start_time = datetime.now()
    updated = update_vendors_with_normalization(DB_PATH, progress_callback=progress)
    elapsed = (datetime.now() - start_time).total_seconds()

    print(f"\n  Completed: {updated:,} vendors in {elapsed:.1f}s")

    # Get updated statistics
    conn = sqlite3.connect(DB_PATH)
    stats = get_statistics(conn)

    print(f"\nVendor Statistics (After):")
    print(f"  Total vendors:       {stats['total']:,}")
    print(f"  Normalized:          {stats.get('normalized', 0):,}")
    print(f"  Individuals:         {stats.get('individuals', 0):,} ({100*stats.get('individuals', 0)/stats['total']:.1f}%)")
    print(f"  Corporates:          {stats['total'] - stats.get('individuals', 0):,} ({100*(stats['total'] - stats.get('individuals', 0))/stats['total']:.1f}%)")
    print(f"  With phonetic code:  {stats.get('with_phonetic', 0):,}")
    print(f"  Unique phonetic:     {stats.get('unique_phonetic', 0):,}")
    print(f"  Unique first token:  {stats.get('unique_first_token', 0):,}")

    conn.close()

    print("\n" + "=" * 60)
    print("HYPERION-PROMETHEUS normalization complete!")
    print("=" * 60)

    return 0


if __name__ == '__main__':
    sys.exit(main())
