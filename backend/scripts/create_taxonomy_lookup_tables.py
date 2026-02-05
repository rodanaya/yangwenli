"""
Create and seed taxonomy lookup tables for institution classification v2.0.

This script creates:
- institution_types (19 rows)
- size_tiers (5 rows)
- autonomy_levels (5 rows)

Data is sourced from backend/hyperion/atlas/taxonomy.py

Usage:
    python -m backend.scripts.create_taxonomy_lookup_tables
"""

import sqlite3
import sys
from pathlib import Path

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.hyperion.atlas.taxonomy import (
    INSTITUTION_TYPES,
    SIZE_TIERS,
    AUTONOMY_LEVELS,
)

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def create_tables(conn: sqlite3.Connection) -> None:
    """Create the lookup tables if they don't exist."""
    cursor = conn.cursor()

    # Institution Types table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS institution_types (
            id INTEGER PRIMARY KEY,
            code VARCHAR(30) UNIQUE NOT NULL,
            name_es VARCHAR(100) NOT NULL,
            name_en VARCHAR(100),
            description TEXT,
            is_government INTEGER DEFAULT 1,
            is_legally_decentralized INTEGER DEFAULT 0,
            default_sector VARCHAR(30),
            risk_baseline REAL DEFAULT 0.25,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Size Tiers table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS size_tiers (
            id INTEGER PRIMARY KEY,
            code VARCHAR(20) UNIQUE NOT NULL,
            name_es VARCHAR(50) NOT NULL,
            name_en VARCHAR(50),
            min_contracts INTEGER,
            max_contracts INTEGER,
            risk_adjustment REAL DEFAULT 0.0,
            description TEXT,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Autonomy Levels table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS autonomy_levels (
            id INTEGER PRIMARY KEY,
            code VARCHAR(30) UNIQUE NOT NULL,
            name_es VARCHAR(100) NOT NULL,
            name_en VARCHAR(100),
            description TEXT,
            risk_baseline REAL DEFAULT 0.25,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_inst_types_code ON institution_types(code)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_size_tiers_code ON size_tiers(code)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_autonomy_code ON autonomy_levels(code)")

    conn.commit()
    print("Tables created successfully")


def seed_institution_types(conn: sqlite3.Connection) -> int:
    """Seed institution_types table from taxonomy.py."""
    cursor = conn.cursor()

    # Check if already seeded
    cursor.execute("SELECT COUNT(*) FROM institution_types")
    existing = cursor.fetchone()[0]
    if existing > 0:
        print(f"institution_types already has {existing} rows, skipping seed")
        return existing

    # Insert from INSTITUTION_TYPES
    rows = []
    for inst_type in INSTITUTION_TYPES.values():
        rows.append((
            inst_type.id,
            inst_type.code,
            inst_type.name_es,
            inst_type.name_en,
            inst_type.description,
            1 if inst_type.is_government else 0,
            1 if inst_type.is_legally_decentralized else 0,
            inst_type.default_sector,
            inst_type.risk_baseline,
            inst_type.id,  # display_order = id
        ))

    cursor.executemany("""
        INSERT INTO institution_types
        (id, code, name_es, name_en, description, is_government,
         is_legally_decentralized, default_sector, risk_baseline, display_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, rows)

    conn.commit()
    print(f"Seeded {len(rows)} institution types")
    return len(rows)


def seed_size_tiers(conn: sqlite3.Connection) -> int:
    """Seed size_tiers table from taxonomy.py."""
    cursor = conn.cursor()

    # Check if already seeded
    cursor.execute("SELECT COUNT(*) FROM size_tiers")
    existing = cursor.fetchone()[0]
    if existing > 0:
        print(f"size_tiers already has {existing} rows, skipping seed")
        return existing

    # Insert from SIZE_TIERS
    rows = []
    for tier in SIZE_TIERS.values():
        rows.append((
            tier.id,
            tier.code,
            tier.name_es,
            tier.name_en,
            tier.min_contracts,
            tier.max_contracts,
            tier.risk_adjustment,
            f"Contracts: {tier.min_contracts:,} - {tier.max_contracts if tier.max_contracts > 0 else 'unlimited'}",
            tier.id,  # display_order
        ))

    cursor.executemany("""
        INSERT INTO size_tiers
        (id, code, name_es, name_en, min_contracts, max_contracts,
         risk_adjustment, description, display_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, rows)

    conn.commit()
    print(f"Seeded {len(rows)} size tiers")
    return len(rows)


def seed_autonomy_levels(conn: sqlite3.Connection) -> int:
    """Seed autonomy_levels table from taxonomy.py."""
    cursor = conn.cursor()

    # Check if already seeded
    cursor.execute("SELECT COUNT(*) FROM autonomy_levels")
    existing = cursor.fetchone()[0]
    if existing > 0:
        print(f"autonomy_levels already has {existing} rows, skipping seed")
        return existing

    # Insert from AUTONOMY_LEVELS
    rows = []
    for level in AUTONOMY_LEVELS.values():
        rows.append((
            level.id,
            level.code,
            level.name_es,
            level.name_en,
            level.description,
            level.risk_baseline,
            level.id,  # display_order
        ))

    cursor.executemany("""
        INSERT INTO autonomy_levels
        (id, code, name_es, name_en, description, risk_baseline, display_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, rows)

    conn.commit()
    print(f"Seeded {len(rows)} autonomy levels")
    return len(rows)


def main():
    """Create and seed all taxonomy lookup tables."""
    print(f"Database: {DB_PATH}")
    print("=" * 60)

    if not DB_PATH.exists():
        print(f"ERROR: Database not found at {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    try:
        # Create tables
        print("\n1. Creating tables...")
        create_tables(conn)

        # Seed data
        print("\n2. Seeding institution_types...")
        types_count = seed_institution_types(conn)

        print("\n3. Seeding size_tiers...")
        tiers_count = seed_size_tiers(conn)

        print("\n4. Seeding autonomy_levels...")
        levels_count = seed_autonomy_levels(conn)

        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"institution_types: {types_count} rows")
        print(f"size_tiers:        {tiers_count} rows")
        print(f"autonomy_levels:   {levels_count} rows")

        # Verify
        print("\n5. Verification...")
        cursor = conn.cursor()

        print("\nInstitution Types:")
        cursor.execute("SELECT id, code, risk_baseline FROM institution_types ORDER BY id")
        for row in cursor.fetchall():
            print(f"  {row['id']:2d}. {row['code']:<30} (risk: {row['risk_baseline']:.2f})")

        print("\nSize Tiers:")
        cursor.execute("SELECT id, code, min_contracts, risk_adjustment FROM size_tiers ORDER BY id")
        for row in cursor.fetchall():
            print(f"  {row['id']}. {row['code']:<10} (min: {row['min_contracts']:>7,}, adj: {row['risk_adjustment']:+.2f})")

        print("\nAutonomy Levels:")
        cursor.execute("SELECT id, code, risk_baseline FROM autonomy_levels ORDER BY id")
        for row in cursor.fetchall():
            print(f"  {row['id']}. {row['code']:<20} (risk: {row['risk_baseline']:.2f})")

        print("\nLookup tables created and seeded successfully!")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
