"""
Populate size_tier and autonomy_level columns for all institutions.

This script:
1. Sets size_tier based on total_contracts using thresholds from taxonomy.py
2. Sets autonomy_level based on institution_type using mapping from taxonomy.py
3. Updates size_tier_id and autonomy_level_id foreign keys

Usage:
    python -m backend.scripts.populate_taxonomy_columns
"""

import sqlite3
import sys
from pathlib import Path
from datetime import datetime

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.hyperion.atlas.taxonomy import (
    SIZE_TIERS,
    AUTONOMY_LEVELS,
    get_size_tier,
    get_default_autonomy,
)

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def populate_size_tiers(conn: sqlite3.Connection) -> dict:
    """Set size_tier based on total_contracts."""
    cursor = conn.cursor()
    stats = {tier.code: 0 for tier in SIZE_TIERS.values()}

    # Get all institutions with their contract counts
    cursor.execute("""
        SELECT id, total_contracts
        FROM institutions
        WHERE total_contracts IS NOT NULL
    """)
    institutions = cursor.fetchall()

    updates = []
    for inst_id, contracts in institutions:
        contracts = contracts or 0
        tier = get_size_tier(contracts)
        updates.append((tier.code, tier.id, inst_id))
        stats[tier.code] += 1

    # Apply updates
    cursor.executemany("""
        UPDATE institutions
        SET size_tier = ?,
            size_tier_id = ?,
            updated_at = ?
        WHERE id = ?
    """, [(u[0], u[1], datetime.now().isoformat(), u[2]) for u in updates])

    conn.commit()
    return stats


def populate_autonomy_levels(conn: sqlite3.Connection) -> dict:
    """Set autonomy_level based on institution_type."""
    cursor = conn.cursor()
    stats = {level.code: 0 for level in AUTONOMY_LEVELS.values()}

    # Get all institutions with their types
    cursor.execute("""
        SELECT id, institution_type
        FROM institutions
    """)
    institutions = cursor.fetchall()

    updates = []
    for inst_id, inst_type in institutions:
        inst_type = inst_type or 'other'
        autonomy = get_default_autonomy(inst_type)
        updates.append((autonomy.code, autonomy.id, inst_id))
        stats[autonomy.code] += 1

    # Apply updates
    cursor.executemany("""
        UPDATE institutions
        SET autonomy_level = ?,
            autonomy_level_id = ?,
            updated_at = ?
        WHERE id = ?
    """, [(u[0], u[1], datetime.now().isoformat(), u[2]) for u in updates])

    conn.commit()
    return stats


def set_legally_decentralized_flag(conn: sqlite3.Connection) -> int:
    """Ensure is_legally_decentralized flag is set for appropriate types."""
    cursor = conn.cursor()

    # Types that are legally "organismo descentralizado"
    decentralized_types = [
        'social_security',
        'state_enterprise_energy',
        'state_enterprise_finance',
        'state_enterprise_infra',
        'research_education',
        'social_program',
    ]

    placeholders = ','.join('?' * len(decentralized_types))
    cursor.execute(f"""
        UPDATE institutions
        SET is_legally_decentralized = 1,
            updated_at = ?
        WHERE institution_type IN ({placeholders})
        AND (is_legally_decentralized IS NULL OR is_legally_decentralized = 0)
    """, (datetime.now().isoformat(), *decentralized_types))

    count = cursor.rowcount
    conn.commit()
    return count


def verify_population(conn: sqlite3.Connection) -> None:
    """Print verification statistics."""
    cursor = conn.cursor()

    print("\n" + "=" * 60)
    print("VERIFICATION")
    print("=" * 60)

    # Total institutions
    cursor.execute("SELECT COUNT(*) FROM institutions")
    total = cursor.fetchone()[0]
    print(f"\nTotal institutions: {total}")

    # Size tier coverage
    cursor.execute("SELECT COUNT(*) FROM institutions WHERE size_tier IS NOT NULL")
    size_count = cursor.fetchone()[0]
    print(f"size_tier populated: {size_count}/{total} ({100*size_count/total:.1f}%)")

    # Autonomy level coverage
    cursor.execute("SELECT COUNT(*) FROM institutions WHERE autonomy_level IS NOT NULL")
    auto_count = cursor.fetchone()[0]
    print(f"autonomy_level populated: {auto_count}/{total} ({100*auto_count/total:.1f}%)")

    # Size tier distribution
    print("\nSize tier distribution:")
    cursor.execute("""
        SELECT size_tier, COUNT(*) as cnt
        FROM institutions
        WHERE size_tier IS NOT NULL
        GROUP BY size_tier
        ORDER BY size_tier_id
    """)
    for row in cursor.fetchall():
        print(f"  {row[0]:<10} {row[1]:>5}")

    # Autonomy level distribution
    print("\nAutonomy level distribution:")
    cursor.execute("""
        SELECT autonomy_level, COUNT(*) as cnt
        FROM institutions
        WHERE autonomy_level IS NOT NULL
        GROUP BY autonomy_level
        ORDER BY autonomy_level_id
    """)
    for row in cursor.fetchall():
        print(f"  {row[0]:<20} {row[1]:>5}")

    # Legally decentralized distribution
    print("\nLegally decentralized:")
    cursor.execute("""
        SELECT
            CASE WHEN is_legally_decentralized = 1 THEN 'Yes'
                 WHEN is_legally_decentralized = 0 THEN 'No'
                 ELSE 'NULL' END as status,
            COUNT(*) as cnt
        FROM institutions
        GROUP BY is_legally_decentralized
    """)
    for row in cursor.fetchall():
        print(f"  {row[0]:<5} {row[1]:>5}")

    # Cross-check: institution_type vs autonomy_level
    print("\nInstitution type to autonomy level mapping (sample):")
    cursor.execute("""
        SELECT institution_type, autonomy_level, COUNT(*) as cnt
        FROM institutions
        WHERE institution_type IN ('municipal', 'autonomous_constitutional', 'social_security', 'federal_secretariat')
        GROUP BY institution_type, autonomy_level
        ORDER BY cnt DESC
        LIMIT 10
    """)
    for row in cursor.fetchall():
        print(f"  {row[0]:<25} -> {row[1]:<20} ({row[2]})")


def main():
    """Populate size_tier and autonomy_level columns."""
    print(f"Database: {DB_PATH}")
    print("=" * 60)
    print("POPULATING TAXONOMY COLUMNS")
    print("=" * 60)

    if not DB_PATH.exists():
        print(f"ERROR: Database not found at {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    try:
        # Step 1: Populate size tiers
        print("\n1. Populating size_tier based on total_contracts...")
        size_stats = populate_size_tiers(conn)
        for tier_code, count in sorted(size_stats.items(), key=lambda x: -x[1]):
            print(f"   {tier_code:<10} {count:>5}")

        # Step 2: Populate autonomy levels
        print("\n2. Populating autonomy_level based on institution_type...")
        auto_stats = populate_autonomy_levels(conn)
        for level_code, count in sorted(auto_stats.items(), key=lambda x: -x[1]):
            print(f"   {level_code:<20} {count:>5}")

        # Step 3: Set legally decentralized flag
        print("\n3. Setting is_legally_decentralized flag...")
        flag_count = set_legally_decentralized_flag(conn)
        print(f"   Set flag on {flag_count} additional institutions")

        # Verify
        verify_population(conn)

        print("\n" + "=" * 60)
        print("Population complete!")
        print("=" * 60)

    finally:
        conn.close()


if __name__ == "__main__":
    main()
