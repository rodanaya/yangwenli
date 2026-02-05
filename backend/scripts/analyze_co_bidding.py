#!/usr/bin/env python3
"""
Co-Bidding Network Analysis for Vendor Deduplication

This script analyzes procurement data to find:
1. Vendors that frequently bid together (potential duplicates or shell companies)
2. Vendors that never compete (bid rotation - collusion indicator)
3. Win/loss patterns suggesting coordinated bidding

Usage:
    python backend/scripts/analyze_co_bidding.py
"""

import sqlite3
from pathlib import Path
from collections import defaultdict
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Configuration
CONFIG = {
    'MIN_CO_BIDS': 3,           # Minimum co-bids to consider
    'MIN_CO_BID_RATE': 0.50,    # Minimum co-bid rate for high confidence
    'MIN_VENDOR_PROCEDURES': 5,  # Vendors must have at least N procedures
    'MAX_PAIRS_TO_ANALYZE': 100000,  # Limit for memory
}


def analyze_co_bidding():
    """Analyze co-bidding patterns to identify related vendors."""

    print("=" * 60)
    print("HYPERION-ATLAS: Co-Bidding Network Analysis")
    print("=" * 60)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Timestamp: {datetime.now()}")

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA busy_timeout = 30000")
    cursor = conn.cursor()

    # Get statistics
    cursor.execute("SELECT COUNT(*) FROM vendors")
    total_vendors = cursor.fetchone()[0]
    print(f"\nTotal vendors: {total_vendors:,}")

    cursor.execute("""
        SELECT COUNT(DISTINCT vendor_id) FROM contracts
        WHERE procedure_number IS NOT NULL AND procedure_number != ''
    """)
    vendors_with_procedures = cursor.fetchone()[0]
    print(f"Vendors with procedure numbers: {vendors_with_procedures:,}")

    cursor.execute("""
        SELECT COUNT(DISTINCT procedure_number) FROM contracts
        WHERE procedure_number IS NOT NULL AND procedure_number != ''
    """)
    total_procedures = cursor.fetchone()[0]
    print(f"Total procedures: {total_procedures:,}")

    # ==================== PHASE 1: Build vendor procedure counts ====================
    print("\nPhase 1: Building vendor procedure counts...")

    cursor.execute("""
        SELECT vendor_id, COUNT(DISTINCT procedure_number) as proc_count
        FROM contracts
        WHERE procedure_number IS NOT NULL AND procedure_number != ''
        GROUP BY vendor_id
        HAVING proc_count >= ?
    """, (CONFIG['MIN_VENDOR_PROCEDURES'],))

    vendor_proc_counts = {row[0]: row[1] for row in cursor.fetchall()}
    print(f"  Vendors with >= {CONFIG['MIN_VENDOR_PROCEDURES']} procedures: {len(vendor_proc_counts):,}")

    # ==================== PHASE 2: Find co-bidding pairs ====================
    print("\nPhase 2: Finding co-bidding pairs...")

    # Get vendor pairs that appear in same procedures (COMPANIES ONLY)
    cursor.execute("""
        SELECT
            c1.vendor_id as v1,
            c2.vendor_id as v2,
            COUNT(DISTINCT c1.procedure_number) as co_bids
        FROM contracts c1
        JOIN contracts c2 ON c1.procedure_number = c2.procedure_number
        JOIN vendors v1_info ON c1.vendor_id = v1_info.id
        JOIN vendors v2_info ON c2.vendor_id = v2_info.id
        WHERE c1.vendor_id < c2.vendor_id
          AND c1.procedure_number IS NOT NULL
          AND c1.procedure_number != ''
          AND v1_info.is_individual = 0
          AND v2_info.is_individual = 0
        GROUP BY c1.vendor_id, c2.vendor_id
        HAVING co_bids >= ?
        ORDER BY co_bids DESC
        LIMIT ?
    """, (CONFIG['MIN_CO_BIDS'], CONFIG['MAX_PAIRS_TO_ANALYZE']))

    co_bid_pairs = cursor.fetchall()
    print(f"  Co-bidding pairs found: {len(co_bid_pairs):,}")

    # ==================== PHASE 3: Calculate co-bid rates ====================
    print("\nPhase 3: Calculating co-bid rates...")

    high_confidence_pairs = []
    stats = {
        'pairs_analyzed': 0,
        'high_rate_pairs': 0,
        'potential_duplicates': 0,
    }

    for v1, v2, co_bids in co_bid_pairs:
        stats['pairs_analyzed'] += 1

        # Get procedure counts for both vendors
        v1_procs = vendor_proc_counts.get(v1, 0)
        v2_procs = vendor_proc_counts.get(v2, 0)

        if v1_procs == 0 or v2_procs == 0:
            continue

        # Calculate co-bid rates
        rate_v1 = co_bids / v1_procs  # % of v1's procedures that include v2
        rate_v2 = co_bids / v2_procs  # % of v2's procedures that include v1
        min_rate = min(rate_v1, rate_v2)
        max_rate = max(rate_v1, rate_v2)

        # High confidence if both rates are high
        if min_rate >= CONFIG['MIN_CO_BID_RATE']:
            stats['high_rate_pairs'] += 1
            high_confidence_pairs.append({
                'v1': v1,
                'v2': v2,
                'co_bids': co_bids,
                'v1_procs': v1_procs,
                'v2_procs': v2_procs,
                'rate_v1': rate_v1,
                'rate_v2': rate_v2,
                'min_rate': min_rate,
            })

        # Very high confidence - potential duplicates
        if min_rate >= 0.80:
            stats['potential_duplicates'] += 1

    print(f"  Pairs analyzed: {stats['pairs_analyzed']:,}")
    print(f"  High-rate pairs (>= {CONFIG['MIN_CO_BID_RATE']*100:.0f}%): {stats['high_rate_pairs']:,}")
    print(f"  Potential duplicates (>= 80%): {stats['potential_duplicates']:,}")

    # ==================== PHASE 4: Get vendor info ====================
    print("\nPhase 4: Enriching with vendor info...")

    # Get vendor info for ALL high-confidence pairs
    vendor_ids = set()
    for pair in high_confidence_pairs:
        vendor_ids.add(pair['v1'])
        vendor_ids.add(pair['v2'])

    vendor_info = {}
    if vendor_ids:
        # Process in chunks to avoid too many placeholders
        vendor_ids_list = list(vendor_ids)
        for i in range(0, len(vendor_ids_list), 1000):
            chunk = vendor_ids_list[i:i+1000]
            placeholders = ','.join(['?' for _ in chunk])
            cursor.execute(f"""
                SELECT id, name, normalized_name, corporate_group, group_id
                FROM vendors
                WHERE id IN ({placeholders})
            """, chunk)

            for row in cursor.fetchall():
                vendor_info[row[0]] = {
                    'name': row[1],
                    'normalized_name': row[2],
                    'corporate_group': row[3],
                    'group_id': row[4],
                }

    print(f"  Enriched {len(vendor_info):,} vendor records")

    # ==================== PHASE 5: Report findings ====================
    print("\n" + "=" * 60)
    print("FINDINGS")
    print("=" * 60)

    # Sort by min_rate descending
    high_confidence_pairs.sort(key=lambda x: x['min_rate'], reverse=True)

    # Top potential duplicates
    print("\nTop 20 Potential Duplicate Pairs (highest co-bid rates):")
    print("-" * 80)

    already_grouped = 0
    not_grouped = 0

    for i, pair in enumerate(high_confidence_pairs[:20], 1):
        v1_info = vendor_info.get(pair['v1'], {})
        v2_info = vendor_info.get(pair['v2'], {})

        v1_name = v1_info.get('name', 'Unknown')[:40]
        v2_name = v2_info.get('name', 'Unknown')[:40]

        same_group = (v1_info.get('group_id') and
                      v1_info.get('group_id') == v2_info.get('group_id'))

        if same_group:
            already_grouped += 1
            status = "[Already grouped]"
        else:
            not_grouped += 1
            status = "[NOT grouped]"

        print(f"\n{i}. {status}")
        print(f"   {v1_name}")
        print(f"   {v2_name}")
        print(f"   Co-bids: {pair['co_bids']} | Rate: {pair['min_rate']*100:.0f}%-{max(pair['rate_v1'], pair['rate_v2'])*100:.0f}%")

    # Count how many high-confidence pairs are already grouped
    grouped_count = 0
    not_grouped_count = 0
    for pair in high_confidence_pairs:
        v1_info = vendor_info.get(pair['v1'], {})
        v2_info = vendor_info.get(pair['v2'], {})
        if (v1_info.get('group_id') and
            v1_info.get('group_id') == v2_info.get('group_id')):
            grouped_count += 1
        else:
            not_grouped_count += 1

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"\nHigh-confidence co-bidding pairs: {len(high_confidence_pairs):,}")
    print(f"  Already in same vendor group: {grouped_count:,}")
    print(f"  NOT in same group (opportunities): {not_grouped_count:,}")

    # Collusion indicators
    print("\nPotential collusion indicators:")
    print("  (Pairs where both vendors bid together >80% of the time)")
    collusion_candidates = [p for p in high_confidence_pairs if p['min_rate'] >= 0.80]
    print(f"  Candidate pairs: {len(collusion_candidates):,}")

    conn.close()

    print("\n" + "=" * 60)
    print("Co-bidding analysis complete!")
    print("=" * 60)

    return {
        'high_confidence_pairs': len(high_confidence_pairs),
        'already_grouped': grouped_count,
        'not_grouped': not_grouped_count,
        'potential_collusion': len(collusion_candidates),
    }


if __name__ == "__main__":
    analyze_co_bidding()
