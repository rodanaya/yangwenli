"""
HYPERION-PROMETHEUS: Create Vendor Grouping Schema

Creates the infrastructure for vendor deduplication:
- vendor_groups table: Canonical vendor entities
- vendor_aliases table: Links variants to groups
- Add group_id, is_canonical to vendors table

Usage:
    python -m scripts.create_vendor_groups_schema
"""

import sys
import sqlite3
from pathlib import Path
from datetime import datetime

# Database path
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def create_vendor_groups_schema(conn: sqlite3.Connection):
    """Create vendor grouping tables."""
    cursor = conn.cursor()

    print("Creating vendor_groups table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vendor_groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            canonical_name VARCHAR(500) NOT NULL,
            canonical_rfc VARCHAR(13),
            canonical_vendor_id INTEGER,

            -- Aggregate statistics
            member_count INTEGER DEFAULT 1,
            total_contracts INTEGER DEFAULT 0,
            total_value REAL DEFAULT 0,

            -- Classification
            is_individual INTEGER DEFAULT 0,
            legal_suffix VARCHAR(50),
            primary_sector_id INTEGER,

            -- Matching metadata
            match_method VARCHAR(50),  -- 'RFC', 'NAME_EXACT', 'PHONETIC', 'MANUAL'
            confidence_score REAL DEFAULT 1.0,

            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (canonical_vendor_id) REFERENCES vendors(id),
            FOREIGN KEY (primary_sector_id) REFERENCES sectors(id)
        )
    """)

    print("Creating vendor_aliases table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vendor_aliases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            vendor_id INTEGER NOT NULL,

            -- Alias info
            alias_name VARCHAR(500),
            alias_rfc VARCHAR(13),

            -- Matching metadata
            match_type VARCHAR(30),  -- 'CANONICAL', 'RFC_MATCH', 'NAME_MATCH', 'PHONETIC', 'MANUAL'
            similarity_score REAL,

            -- Status
            is_canonical INTEGER DEFAULT 0,
            is_verified INTEGER DEFAULT 0,
            verified_by VARCHAR(100),
            verified_at TIMESTAMP,

            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (group_id) REFERENCES vendor_groups(id),
            FOREIGN KEY (vendor_id) REFERENCES vendors(id),
            UNIQUE (group_id, vendor_id)
        )
    """)

    print("Creating vendor_merges table (audit log)...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vendor_merges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            -- Merge info
            from_vendor_id INTEGER NOT NULL,
            to_group_id INTEGER NOT NULL,

            -- Details
            merge_reason VARCHAR(100),
            merge_method VARCHAR(50),
            similarity_score REAL,

            -- Audit
            merged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            merged_by VARCHAR(100) DEFAULT 'HYPERION-PROMETHEUS',

            -- Rollback support
            is_reversed INTEGER DEFAULT 0,
            reversed_at TIMESTAMP,

            FOREIGN KEY (from_vendor_id) REFERENCES vendors(id),
            FOREIGN KEY (to_group_id) REFERENCES vendor_groups(id)
        )
    """)

    conn.commit()
    print("  Tables created successfully")


def add_vendor_columns(conn: sqlite3.Connection):
    """Add grouping columns to vendors table."""
    cursor = conn.cursor()

    # Check existing columns
    cursor.execute("PRAGMA table_info(vendors)")
    existing_cols = {row[1] for row in cursor.fetchall()}

    new_columns = [
        ("group_id", "INTEGER REFERENCES vendor_groups(id)"),
        ("is_canonical", "INTEGER DEFAULT 0"),
        ("match_confidence", "REAL"),
    ]

    for col_name, col_def in new_columns:
        if col_name not in existing_cols:
            print(f"Adding column: {col_name}...")
            cursor.execute(f"ALTER TABLE vendors ADD COLUMN {col_name} {col_def}")
        else:
            print(f"  Column {col_name} already exists")

    conn.commit()


def create_indexes(conn: sqlite3.Connection):
    """Create indexes for vendor grouping tables."""
    cursor = conn.cursor()

    indexes = [
        ("idx_vendor_groups_canonical_rfc", "vendor_groups", "canonical_rfc"),
        ("idx_vendor_groups_canonical_name", "vendor_groups", "canonical_name"),
        ("idx_vendor_aliases_group", "vendor_aliases", "group_id"),
        ("idx_vendor_aliases_vendor", "vendor_aliases", "vendor_id"),
        ("idx_vendor_merges_from", "vendor_merges", "from_vendor_id"),
        ("idx_vendor_merges_to", "vendor_merges", "to_group_id"),
        ("idx_vendors_group", "vendors", "group_id"),
    ]

    print("Creating indexes...")
    for idx_name, table, column in indexes:
        try:
            cursor.execute(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table}({column})")
            print(f"  Created {idx_name}")
        except sqlite3.OperationalError as e:
            print(f"  Skipping {idx_name}: {e}")

    conn.commit()


def main():
    """Main entry point."""
    print("=" * 60)
    print("HYPERION-PROMETHEUS: Vendor Grouping Schema Setup")
    print("=" * 60)

    if not DB_PATH.exists():
        print(f"ERROR: Database not found: {DB_PATH}")
        return 1

    conn = sqlite3.connect(DB_PATH)
    print(f"\nDatabase: {DB_PATH}")

    try:
        # Create tables
        create_vendor_groups_schema(conn)

        # Add columns to vendors
        add_vendor_columns(conn)

        # Create indexes
        create_indexes(conn)

        # Verify
        print("\nVerifying schema...")
        cursor = conn.cursor()

        for table in ['vendor_groups', 'vendor_aliases', 'vendor_merges']:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"  {table}: {count} rows")

        # Check vendors columns
        cursor.execute("PRAGMA table_info(vendors)")
        cols = [row[1] for row in cursor.fetchall()]
        print(f"  vendors has group_id: {'group_id' in cols}")
        print(f"  vendors has is_canonical: {'is_canonical' in cols}")

        print("\n" + "=" * 60)
        print("Schema setup complete!")
        print("=" * 60)

    finally:
        conn.close()

    return 0


if __name__ == '__main__':
    sys.exit(main())
