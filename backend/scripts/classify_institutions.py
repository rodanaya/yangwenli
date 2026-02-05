"""
HYPERION-ATLAS: Institution Classification Script (v2.0)

Applies the rule-based classifier with 18-type taxonomy to all institutions
in the database, including Size Tier and Autonomy Level dimensions.

Usage:
    python -m scripts.classify_institutions [--dry-run] [--report]

Options:
    --dry-run   Show classification results without updating database
    --report    Generate detailed report only

New in v2.0:
    - 18 institution types (was 13)
    - Size tier calculation (mega/large/medium/small/micro)
    - Autonomy level assignment
    - 4-tier classification hierarchy (MEGA → KNOWN → KEYWORD → FALLBACK)
"""

import sys
import sqlite3
import argparse
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from hyperion.atlas.rules import AtlasRuleClassifier, ClassificationResult
from hyperion.atlas.taxonomy import (
    SECTORS, INSTITUTION_TYPES, SIZE_TIERS, AUTONOMY_LEVELS,
    get_size_tier, get_default_autonomy
)


# Database path
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def get_institutions(conn: sqlite3.Connection) -> list[dict]:
    """Fetch all institutions from database."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            id,
            name,
            sector_id,
            ramo_id,
            gobierno_nivel
        FROM institutions
        ORDER BY id
    """)

    columns = [desc[0] for desc in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def get_institution_contract_stats(conn: sqlite3.Connection) -> dict[int, dict]:
    """Get contract count and value per institution."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            institution_id,
            COUNT(*) as contract_count,
            SUM(COALESCE(amount_mxn, 0)) as total_value
        FROM contracts
        GROUP BY institution_id
    """)

    stats = {}
    for row in cursor.fetchall():
        stats[row[0]] = {
            'contract_count': row[1],
            'total_value': row[2]
        }
    return stats


def get_type_id(code: str) -> int:
    """Get institution_type_id from code."""
    type_to_id = {
        'federal_secretariat': 1,
        'federal_agency': 2,
        'autonomous_constitutional': 3,
        'social_security': 4,
        'state_enterprise_energy': 5,
        'state_enterprise_finance': 6,
        'state_enterprise_infra': 7,
        'research_education': 8,
        'social_program': 9,
        'regulatory_agency': 10,
        'state_government': 11,
        'state_agency': 12,
        'municipal': 13,
        'judicial': 14,
        'legislative': 15,
        'military': 16,
        'health_institution': 17,
        'decentralized_legacy': 18,
        'other': 19,
    }
    return type_to_id.get(code, 19)


def get_size_tier_id(code: str) -> int:
    """Get size_tier_id from code."""
    tier_to_id = {
        'mega': 1,
        'large': 2,
        'medium': 3,
        'small': 4,
        'micro': 5,
    }
    return tier_to_id.get(code, 3)


def get_autonomy_id(code: str) -> int:
    """Get autonomy_level_id from code."""
    autonomy_to_id = {
        'full_autonomy': 1,
        'technical_autonomy': 2,
        'operational_autonomy': 3,
        'dependent': 4,
        'subnational': 5,
    }
    return autonomy_to_id.get(code, 4)


def is_legally_decentralized(institution_type: str) -> int:
    """Check if institution is legally an 'organismo descentralizado'."""
    decentralized_types = {
        'social_security', 'state_enterprise_energy', 'state_enterprise_finance',
        'state_enterprise_infra', 'research_education', 'social_program',
        'health_institution', 'decentralized_legacy'
    }
    return 1 if institution_type in decentralized_types else 0


def update_institutions(
    conn: sqlite3.Connection,
    classifications: list[tuple[dict, ClassificationResult]],
    contract_stats: dict[int, dict]
) -> int:
    """Update institution classifications in database (v2.0 taxonomy)."""
    cursor = conn.cursor()

    # Ensure we have the v2.0 classification columns
    new_columns = [
        ("institution_type", "VARCHAR(30)"),
        ("institution_type_id", "INTEGER"),
        ("size_tier", "VARCHAR(20)"),
        ("size_tier_id", "INTEGER"),
        ("autonomy_level", "VARCHAR(30)"),
        ("autonomy_level_id", "INTEGER"),
        ("is_legally_decentralized", "INTEGER DEFAULT 0"),
        ("classification_confidence", "REAL"),
        ("classification_method", "VARCHAR(100)"),
        ("state_code", "VARCHAR(5)"),
        ("geographic_scope", "VARCHAR(20)"),
    ]

    for col_name, col_type in new_columns:
        try:
            cursor.execute(f"ALTER TABLE institutions ADD COLUMN {col_name} {col_type}")
        except sqlite3.OperationalError:
            pass  # Column already exists

    # Update institutions
    updated = 0
    for inst, result in classifications:
        # Get contract count for size tier calculation
        stats = contract_stats.get(inst['id'], {'contract_count': 0, 'total_value': 0})
        contract_count = stats['contract_count']

        # Calculate size tier from contract count
        size_tier_obj = get_size_tier(contract_count)
        size_tier = size_tier_obj.code

        # Get autonomy level based on institution type
        autonomy_obj = get_default_autonomy(result.institution_type)
        autonomy = autonomy_obj.code

        # Only update sector if we have high confidence and it's different
        new_sector_id = result.sector_id if result.confidence >= 0.85 else inst['sector_id']

        cursor.execute("""
            UPDATE institutions SET
                sector_id = ?,
                institution_type = ?,
                institution_type_id = ?,
                size_tier = ?,
                size_tier_id = ?,
                autonomy_level = ?,
                autonomy_level_id = ?,
                is_legally_decentralized = ?,
                classification_confidence = ?,
                classification_method = ?,
                state_code = ?,
                geographic_scope = ?,
                total_contracts = ?,
                total_amount_mxn = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (
            new_sector_id,
            result.institution_type,
            get_type_id(result.institution_type),
            size_tier,
            get_size_tier_id(size_tier),
            autonomy,
            get_autonomy_id(autonomy),
            is_legally_decentralized(result.institution_type),
            result.confidence,
            result.matched_rule,
            result.state_code,
            result.geographic_scope,
            contract_count,
            stats['total_value'],
            inst['id']
        ))
        updated += 1

    conn.commit()
    return updated


def generate_report(
    classifications: list[tuple[dict, ClassificationResult]],
    contract_stats: dict[int, dict],
    output_path: Path = None
) -> str:
    """Generate classification report (v2.0 taxonomy)."""
    lines = []

    lines.append("# HYPERION-ATLAS Institution Classification Report (v2.0)")
    lines.append(f"\n**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"**Total Institutions:** {len(classifications):,}")
    lines.append("**Taxonomy Version:** 2.0 (18 types, size tiers, autonomy levels)")
    lines.append("")

    # Overall statistics
    results = [r for _, r in classifications]
    high_conf = sum(1 for r in results if r.confidence >= 0.9)
    medium_conf = sum(1 for r in results if 0.7 <= r.confidence < 0.9)
    low_conf = sum(1 for r in results if 0 < r.confidence < 0.7)
    unclassified = sum(1 for r in results if r.confidence == 0)

    lines.append("## Classification Confidence Distribution")
    lines.append("")
    lines.append("| Confidence Level | Count | Percentage |")
    lines.append("|------------------|-------|------------|")
    lines.append(f"| High (>=90%) | {high_conf:,} | {100*high_conf/len(results):.1f}% |")
    lines.append(f"| Medium (70-90%) | {medium_conf:,} | {100*medium_conf/len(results):.1f}% |")
    lines.append(f"| Low (<70%) | {low_conf:,} | {100*low_conf/len(results):.1f}% |")
    lines.append(f"| Unclassified | {unclassified:,} | {100*unclassified/len(results):.1f}% |")
    lines.append("")

    # By sector
    sector_counts = defaultdict(lambda: {'count': 0, 'contracts': 0, 'value': 0})
    for inst, result in classifications:
        sector = result.sector
        stats = contract_stats.get(inst['id'], {'contract_count': 0, 'total_value': 0})
        sector_counts[sector]['count'] += 1
        sector_counts[sector]['contracts'] += stats['contract_count']
        sector_counts[sector]['value'] += stats['total_value']

    lines.append("## Classification by Sector")
    lines.append("")
    lines.append("| Sector | Institutions | Contracts | Value (MXN) |")
    lines.append("|--------|--------------|-----------|-------------|")
    for sector in sorted(sector_counts.keys()):
        data = sector_counts[sector]
        lines.append(
            f"| {sector} | {data['count']:,} | {data['contracts']:,} | "
            f"${data['value']:,.0f} |"
        )
    lines.append("")

    # By institution type (including contract counts)
    type_stats = defaultdict(lambda: {'count': 0, 'contracts': 0, 'value': 0})
    for inst, result in classifications:
        stats = contract_stats.get(inst['id'], {'contract_count': 0, 'total_value': 0})
        type_stats[result.institution_type]['count'] += 1
        type_stats[result.institution_type]['contracts'] += stats['contract_count']
        type_stats[result.institution_type]['value'] += stats['total_value']

    lines.append("## Classification by Institution Type (v2.0)")
    lines.append("")
    lines.append("| Type | Institutions | Contracts | % of Contracts | Value (MXN) |")
    lines.append("|------|--------------|-----------|----------------|-------------|")

    total_contracts = sum(d['contracts'] for d in type_stats.values())
    for inst_type in sorted(type_stats.keys(), key=lambda x: -type_stats[x]['contracts']):
        data = type_stats[inst_type]
        pct = 100 * data['contracts'] / total_contracts if total_contracts > 0 else 0
        lines.append(
            f"| {inst_type} | {data['count']:,} | {data['contracts']:,} | "
            f"{pct:.1f}% | ${data['value']:,.0f} |"
        )
    lines.append("")

    # By size tier
    size_tier_stats = defaultdict(lambda: {'count': 0, 'contracts': 0})
    for inst, result in classifications:
        stats = contract_stats.get(inst['id'], {'contract_count': 0, 'total_value': 0})
        tier = get_size_tier(stats['contract_count']).code
        size_tier_stats[tier]['count'] += 1
        size_tier_stats[tier]['contracts'] += stats['contract_count']

    lines.append("## Distribution by Size Tier")
    lines.append("")
    lines.append("| Size Tier | Institutions | Contracts | % of Contracts |")
    lines.append("|-----------|--------------|-----------|----------------|")
    tier_order = ['mega', 'large', 'medium', 'small', 'micro']
    for tier in tier_order:
        data = size_tier_stats.get(tier, {'count': 0, 'contracts': 0})
        pct = 100 * data['contracts'] / total_contracts if total_contracts > 0 else 0
        lines.append(f"| {tier} | {data['count']:,} | {data['contracts']:,} | {pct:.1f}% |")
    lines.append("")

    # By autonomy level
    autonomy_stats = defaultdict(lambda: {'count': 0, 'contracts': 0})
    for inst, result in classifications:
        stats = contract_stats.get(inst['id'], {'contract_count': 0, 'total_value': 0})
        autonomy = get_default_autonomy(result.institution_type).code
        autonomy_stats[autonomy]['count'] += 1
        autonomy_stats[autonomy]['contracts'] += stats['contract_count']

    lines.append("## Distribution by Autonomy Level")
    lines.append("")
    lines.append("| Autonomy Level | Institutions | Contracts | % of Contracts |")
    lines.append("|----------------|--------------|-----------|----------------|")
    autonomy_order = ['full_autonomy', 'technical_autonomy', 'operational_autonomy', 'dependent', 'subnational']
    for autonomy in autonomy_order:
        data = autonomy_stats.get(autonomy, {'count': 0, 'contracts': 0})
        pct = 100 * data['contracts'] / total_contracts if total_contracts > 0 else 0
        lines.append(f"| {autonomy} | {data['count']:,} | {data['contracts']:,} | {pct:.1f}% |")
    lines.append("")

    # Major reclassifications
    reclassified = [
        (inst, result)
        for inst, result in classifications
        if inst['sector_id'] != result.sector_id and result.confidence >= 0.85
    ]

    if reclassified:
        # Group by old and new sector
        changes = defaultdict(list)
        for inst, result in reclassified:
            old_sector = next(
                (code for code, sid in SECTORS.items() if sid == inst['sector_id']),
                'unknown'
            )
            key = (old_sector, result.sector)
            stats = contract_stats.get(inst['id'], {'contract_count': 0, 'total_value': 0})
            changes[key].append((inst, result, stats))

        lines.append("## Major Reclassifications")
        lines.append("")
        lines.append("| From Sector | To Sector | Count | Contracts | Value |")
        lines.append("|-------------|-----------|-------|-----------|-------|")

        for (old, new), items in sorted(changes.items(), key=lambda x: -len(x[1])):
            total_contracts = sum(s['contract_count'] for _, _, s in items)
            total_value = sum(s['total_value'] for _, _, s in items)
            lines.append(
                f"| {old} | {new} | {len(items):,} | {total_contracts:,} | "
                f"${total_value:,.0f} |"
            )
        lines.append("")

    # Sample high-value reclassifications
    lines.append("## Top 20 High-Value Reclassifications")
    lines.append("")
    lines.append("| Institution | Old Sector | New Sector | Contracts | Value |")
    lines.append("|-------------|------------|------------|-----------|-------|")

    reclassified_with_stats = [
        (inst, result, contract_stats.get(inst['id'], {'contract_count': 0, 'total_value': 0}))
        for inst, result in reclassified
    ]
    reclassified_with_stats.sort(key=lambda x: -x[2]['total_value'])

    for inst, result, stats in reclassified_with_stats[:20]:
        old_sector = next(
            (code for code, sid in SECTORS.items() if sid == inst['sector_id']),
            'unknown'
        )
        name = inst['name'][:50] + ('...' if len(inst['name']) > 50 else '')
        lines.append(
            f"| {name} | {old_sector} | {result.sector} | "
            f"{stats['contract_count']:,} | ${stats['total_value']:,.0f} |"
        )
    lines.append("")

    # Unclassified institutions
    unclassified_list = [
        (inst, result, contract_stats.get(inst['id'], {'contract_count': 0, 'total_value': 0}))
        for inst, result in classifications
        if result.confidence == 0
    ]
    unclassified_list.sort(key=lambda x: -x[2]['total_value'])

    if unclassified_list:
        lines.append("## Top 20 Unclassified Institutions (by Value)")
        lines.append("")
        lines.append("| Institution | Contracts | Value | Gobierno Nivel |")
        lines.append("|-------------|-----------|-------|----------------|")

        for inst, result, stats in unclassified_list[:20]:
            name = inst['name'][:50] + ('...' if len(inst['name']) > 50 else '')
            nivel = inst.get('gobierno_nivel', 'N/A') or 'N/A'
            lines.append(
                f"| {name} | {stats['contract_count']:,} | "
                f"${stats['total_value']:,.0f} | {nivel} |"
            )

    report = '\n'.join(lines)

    if output_path:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"Report saved to: {output_path}")

    return report


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='HYPERION-ATLAS Institution Classification (v2.0 Taxonomy)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show results without updating database'
    )
    parser.add_argument(
        '--report',
        action='store_true',
        help='Generate detailed report only'
    )
    parser.add_argument(
        '--output',
        type=str,
        default='CLASSIFICATION_REPORT.md',
        help='Output file for report'
    )
    args = parser.parse_args()

    print("=" * 60)
    print("HYPERION-ATLAS: Institution Classification (v2.0)")
    print("=" * 60)
    print("Taxonomy: 18 types, size tiers, autonomy levels")

    # Connect to database
    if not DB_PATH.exists():
        print(f"ERROR: Database not found: {DB_PATH}")
        return 1

    conn = sqlite3.connect(DB_PATH)
    print(f"\nDatabase: {DB_PATH}")

    # Fetch institutions
    print("\nFetching institutions...")
    institutions = get_institutions(conn)
    print(f"  Found {len(institutions):,} institutions")

    # Get contract statistics
    print("\nFetching contract statistics...")
    contract_stats = get_institution_contract_stats(conn)

    # Classify institutions
    print("\nClassifying institutions...")
    classifier = AtlasRuleClassifier()
    classifications = classifier.classify_batch(institutions)

    # Get statistics
    results = [r for _, r in classifications]
    stats = classifier.get_statistics(results)

    print(f"\n  Classification Statistics:")
    print(f"    Classified: {stats['classified_rate']*100:.1f}%")
    print(f"    Avg Confidence: {stats['avg_confidence']:.2f}")
    print(f"\n  By Confidence Level:")
    for level, count in stats['by_confidence'].items():
        print(f"    {level}: {count:,} ({100*count/len(results):.1f}%)")

    # Count sector changes
    changes = sum(
        1 for inst, result in classifications
        if inst['sector_id'] != result.sector_id and result.confidence >= 0.85
    )
    print(f"\n  Sector changes (high confidence): {changes:,}")

    # Generate report
    if args.report or args.dry_run:
        print("\nGenerating report...")
        output_path = Path(args.output)
        report = generate_report(classifications, contract_stats, output_path)
        print(f"\nReport preview (first 2000 chars):\n")
        print(report[:2000])

    # Update database
    if not args.dry_run and not args.report:
        print("\nUpdating database with v2.0 taxonomy...")
        updated = update_institutions(conn, classifications, contract_stats)
        print(f"  Updated {updated:,} institutions")
        print("  Columns updated: institution_type, size_tier, autonomy_level")

    conn.close()

    print("\n" + "=" * 60)
    print("HYPERION-ATLAS classification complete!")
    print("=" * 60)

    return 0


if __name__ == '__main__':
    sys.exit(main())
