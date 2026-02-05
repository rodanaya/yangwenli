"""
HYPERION-PROMETHEUS: Vendor Duplicate Detection Script

Detects potential duplicate vendors using:
1. Exact RFC matches (definitive)
2. Same base name + legal suffix
3. Same phonetic code + high similarity score

Usage:
    python -m scripts.detect_vendor_duplicates [--threshold 0.85] [--report]
"""

import sys
import sqlite3
import argparse
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from hyperion.similarity import SimilarityMetrics, EntityMatcher


# Database path
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def find_rfc_duplicates(conn: sqlite3.Connection) -> list[dict]:
    """Find vendors with duplicate RFC (definitive matches)."""
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            rfc,
            COUNT(*) as cnt,
            GROUP_CONCAT(id) as vendor_ids,
            GROUP_CONCAT(name, ' | ') as names
        FROM vendors
        WHERE rfc IS NOT NULL AND rfc != ''
        AND LENGTH(rfc) >= 12
        GROUP BY rfc
        HAVING cnt > 1
        ORDER BY cnt DESC
    """)

    duplicates = []
    for row in cursor.fetchall():
        rfc, cnt, vendor_ids, names = row
        duplicates.append({
            'type': 'RFC_EXACT',
            'rfc': rfc,
            'count': cnt,
            'vendor_ids': [int(x) for x in vendor_ids.split(',')],
            'names': names.split(' | ')[:5],  # Limit to 5
            'confidence': 1.0
        })

    return duplicates


def find_exact_name_duplicates(conn: sqlite3.Connection) -> list[dict]:
    """Find vendors with identical normalized base name + suffix."""
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            base_name,
            legal_suffix,
            COUNT(*) as cnt,
            GROUP_CONCAT(id) as vendor_ids,
            GROUP_CONCAT(name, ' | ') as names,
            GROUP_CONCAT(COALESCE(rfc, 'N/A')) as rfcs
        FROM vendors
        WHERE base_name IS NOT NULL AND base_name != ''
        GROUP BY base_name, legal_suffix
        HAVING cnt > 1
        ORDER BY cnt DESC
        LIMIT 1000
    """)

    duplicates = []
    for row in cursor.fetchall():
        base_name, suffix, cnt, vendor_ids, names, rfcs = row
        # Filter out cases where RFC is different (different companies with same name)
        rfc_list = rfcs.split(',')
        non_null_rfcs = [r for r in rfc_list if r != 'N/A']

        # If multiple different RFCs, probably not duplicates
        if len(set(non_null_rfcs)) > 1:
            continue

        duplicates.append({
            'type': 'NAME_EXACT',
            'base_name': base_name,
            'suffix': suffix,
            'count': cnt,
            'vendor_ids': [int(x) for x in vendor_ids.split(',')],
            'names': names.split(' | ')[:5],
            'confidence': 0.95
        })

    return duplicates


def find_phonetic_duplicates(
    conn: sqlite3.Connection,
    similarity_threshold: float = 0.85
) -> list[dict]:
    """Find vendors with same phonetic code and high name similarity."""
    cursor = conn.cursor()
    metrics = SimilarityMetrics()

    # Get phonetic groups with 2-5 members (larger groups are less useful)
    cursor.execute("""
        SELECT
            phonetic_code,
            COUNT(*) as cnt
        FROM vendors
        WHERE phonetic_code IS NOT NULL AND phonetic_code != ''
        AND is_individual = 0  -- Focus on corporate vendors
        GROUP BY phonetic_code
        HAVING cnt >= 2 AND cnt <= 10
        ORDER BY cnt DESC
        LIMIT 500
    """)

    groups = cursor.fetchall()
    duplicates = []

    for phonetic_code, cnt in groups:
        # Get vendors in this phonetic group
        cursor.execute("""
            SELECT id, name, base_name, legal_suffix, rfc
            FROM vendors
            WHERE phonetic_code = ?
        """, (phonetic_code,))

        vendors = cursor.fetchall()

        # Compare pairs
        for i, v1 in enumerate(vendors):
            for v2 in vendors[i + 1:]:
                id1, name1, base1, suffix1, rfc1 = v1
                id2, name2, base2, suffix2, rfc2 = v2

                # Skip if both have RFC and they're different
                if rfc1 and rfc2 and rfc1 != rfc2:
                    continue

                # Calculate similarity
                if base1 and base2:
                    sim = metrics.hybrid_score(base1, base2)

                    if sim >= similarity_threshold:
                        duplicates.append({
                            'type': 'PHONETIC_SIMILAR',
                            'phonetic': phonetic_code,
                            'vendor_ids': [id1, id2],
                            'names': [name1, name2],
                            'base_names': [base1, base2],
                            'similarity': sim,
                            'confidence': min(sim, 0.90)
                        })

    return duplicates


def get_vendor_stats(conn: sqlite3.Connection, vendor_ids: list[int]) -> dict:
    """Get aggregate stats for a group of vendor IDs."""
    cursor = conn.cursor()

    placeholders = ','.join(['?'] * len(vendor_ids))
    cursor.execute(f"""
        SELECT
            COUNT(*) as contracts,
            SUM(COALESCE(amount_mxn, 0)) as total_value
        FROM contracts
        WHERE vendor_id IN ({placeholders})
    """, vendor_ids)

    row = cursor.fetchone()
    return {
        'contracts': row[0],
        'total_value': row[1] or 0
    }


def generate_report(
    rfc_dups: list[dict],
    name_dups: list[dict],
    phonetic_dups: list[dict],
    conn: sqlite3.Connection,
    output_path: Path = None
) -> str:
    """Generate duplicate detection report."""
    lines = []

    lines.append("# HYPERION-PROMETHEUS Vendor Duplicate Detection Report")
    lines.append(f"\n**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")

    # Summary
    lines.append("## Summary")
    lines.append("")
    lines.append(f"| Detection Method | Duplicate Groups | Vendors Affected | Confidence |")
    lines.append(f"|------------------|------------------|------------------|------------|")
    lines.append(f"| RFC Exact Match | {len(rfc_dups)} | {sum(d['count'] for d in rfc_dups)} | 100% |")
    lines.append(f"| Name Exact Match | {len(name_dups)} | {sum(d['count'] for d in name_dups)} | 95% |")
    lines.append(f"| Phonetic + Similarity | {len(phonetic_dups)} | {len(phonetic_dups) * 2} | 85-90% |")
    lines.append("")

    # RFC Duplicates
    if rfc_dups:
        lines.append("## RFC Exact Matches (100% Confidence)")
        lines.append("")
        lines.append("These are definitive duplicates - same RFC, different records.")
        lines.append("")
        lines.append("| RFC | Count | Names |")
        lines.append("|-----|-------|-------|")

        for dup in rfc_dups[:30]:
            names = ', '.join(dup['names'][:3])
            if len(dup['names']) > 3:
                names += f' (+{len(dup["names"]) - 3} more)'
            lines.append(f"| {dup['rfc']} | {dup['count']} | {names} |")
        lines.append("")

    # Name Duplicates
    if name_dups:
        lines.append("## Name Exact Matches (95% Confidence)")
        lines.append("")
        lines.append("| Base Name | Suffix | Count | Contracts | Value |")
        lines.append("|-----------|--------|-------|-----------|-------|")

        for dup in name_dups[:50]:
            stats = get_vendor_stats(conn, dup['vendor_ids'])
            value_str = f"${stats['total_value']/1e6:.1f}M" if stats['total_value'] > 0 else "$0"
            base = dup['base_name'][:40] + ('...' if len(dup['base_name']) > 40 else '')
            lines.append(f"| {base} | {dup['suffix'] or 'N/A'} | {dup['count']} | {stats['contracts']:,} | {value_str} |")
        lines.append("")

    # Phonetic Duplicates (high-value ones)
    if phonetic_dups:
        # Sort by similarity
        phonetic_dups.sort(key=lambda x: -x['similarity'])

        lines.append("## Phonetic + Similarity Matches (85-90% Confidence)")
        lines.append("")
        lines.append("| Similarity | Name 1 | Name 2 |")
        lines.append("|------------|--------|--------|")

        for dup in phonetic_dups[:50]:
            sim = f"{dup['similarity']:.1%}"
            n1 = dup['names'][0][:35] if dup['names'][0] else ''
            n2 = dup['names'][1][:35] if dup['names'][1] else ''
            lines.append(f"| {sim} | {n1} | {n2} |")
        lines.append("")

    # Impact estimation
    lines.append("## Estimated Impact")
    lines.append("")

    total_groups = len(rfc_dups) + len(name_dups) + len(phonetic_dups)
    total_vendors = (
        sum(d['count'] for d in rfc_dups) +
        sum(d['count'] for d in name_dups) +
        len(phonetic_dups) * 2
    )

    lines.append(f"- **Total duplicate groups identified:** {total_groups:,}")
    lines.append(f"- **Total vendors in duplicate groups:** {total_vendors:,}")
    lines.append(f"- **Estimated reduction in vendor count:** ~{total_vendors - total_groups:,}")
    lines.append("")

    report = '\n'.join(lines)

    if output_path:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"Report saved to: {output_path}")

    return report


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='HYPERION-PROMETHEUS Vendor Duplicate Detection'
    )
    parser.add_argument(
        '--threshold',
        type=float,
        default=0.85,
        help='Similarity threshold for phonetic matches (default: 0.85)'
    )
    parser.add_argument(
        '--report',
        action='store_true',
        help='Generate detailed report'
    )
    parser.add_argument(
        '--output',
        type=str,
        default='VENDOR_DUPLICATES_REPORT.md',
        help='Output file for report'
    )
    args = parser.parse_args()

    print("=" * 60)
    print("HYPERION-PROMETHEUS: Vendor Duplicate Detection")
    print("=" * 60)

    # Connect to database
    if not DB_PATH.exists():
        print(f"ERROR: Database not found: {DB_PATH}")
        return 1

    conn = sqlite3.connect(DB_PATH)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Similarity threshold: {args.threshold}")

    # Find RFC duplicates
    print("\nFinding RFC duplicates...")
    rfc_dups = find_rfc_duplicates(conn)
    print(f"  Found {len(rfc_dups)} RFC duplicate groups")

    # Find exact name duplicates
    print("\nFinding exact name duplicates...")
    name_dups = find_exact_name_duplicates(conn)
    print(f"  Found {len(name_dups)} name duplicate groups")

    # Find phonetic duplicates
    print(f"\nFinding phonetic + similarity duplicates (threshold={args.threshold})...")
    phonetic_dups = find_phonetic_duplicates(conn, args.threshold)
    print(f"  Found {len(phonetic_dups)} phonetic duplicate pairs")

    # Summary
    print("\n" + "=" * 60)
    print("Detection Summary:")
    print("=" * 60)
    print(f"  RFC exact matches:        {len(rfc_dups):>6} groups ({sum(d['count'] for d in rfc_dups):,} vendors)")
    print(f"  Name exact matches:       {len(name_dups):>6} groups ({sum(d['count'] for d in name_dups):,} vendors)")
    print(f"  Phonetic similar matches: {len(phonetic_dups):>6} pairs  ({len(phonetic_dups) * 2:,} vendors)")

    total_affected = (
        sum(d['count'] for d in rfc_dups) +
        sum(d['count'] for d in name_dups) +
        len(phonetic_dups) * 2
    )
    print(f"\n  Total vendors in duplicate groups: {total_affected:,}")

    # Generate report
    if args.report:
        print(f"\nGenerating report...")
        output_path = Path(args.output)
        report = generate_report(rfc_dups, name_dups, phonetic_dups, conn, output_path)
        print(f"\nReport preview (first 1500 chars):\n")
        print(report[:1500])

    conn.close()

    print("\n" + "=" * 60)
    print("HYPERION-PROMETHEUS duplicate detection complete!")
    print("=" * 60)

    return 0


if __name__ == '__main__':
    sys.exit(main())
