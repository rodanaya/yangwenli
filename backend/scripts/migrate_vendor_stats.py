"""
Migration Script: Create and Populate vendor_stats Table
=========================================================

This script fixes the 30-second vendor page timeout by:
1. Creating the physical vendor_stats table (replacing slow view)
2. Adding missing indexes for risk filtering
3. Populating vendor_stats with pre-computed aggregates

The issue: vendors.py JOINs with vendor_stats table that didn't exist.
Only v_vendor_stats VIEW existed, which recalculates across 3.1M contracts
on EVERY query - causing 30s timeouts.

Solution: Pre-compute vendor statistics into a physical table.
Expected result: Query time drops from 30s to <500ms.

Author: RUBLI Project
Date: 2026-01-23
"""

import sqlite3
import os
import sys
from datetime import datetime
from pathlib import Path

# Configuration
SCRIPT_DIR = Path(__file__).parent
BACKEND_DIR = SCRIPT_DIR.parent
DB_PATH = BACKEND_DIR / 'RUBLI_NORMALIZED.db'

# Amount validation threshold (from CLAUDE.md)
MAX_CONTRACT_VALUE = 100_000_000_000  # 100B MXN


def create_vendor_stats_table(conn: sqlite3.Connection) -> None:
    """Create the vendor_stats table if it doesn't exist."""
    print("Creating vendor_stats table...")

    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vendor_stats (
            vendor_id INTEGER PRIMARY KEY,
            total_contracts INTEGER DEFAULT 0,
            total_value_mxn REAL DEFAULT 0.0,
            avg_risk_score REAL DEFAULT 0.0,
            high_risk_pct REAL DEFAULT 0.0,
            direct_award_pct REAL DEFAULT 0.0,
            single_bid_pct REAL DEFAULT 0.0,
            first_contract_year INTEGER,
            last_contract_year INTEGER,
            sector_count INTEGER DEFAULT 0,
            institution_count INTEGER DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vendor_id) REFERENCES vendors(id)
        )
    """)

    # Create indexes for fast sorting
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_vendor_stats_contracts ON vendor_stats(total_contracts)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_vendor_stats_value ON vendor_stats(total_value_mxn)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_vendor_stats_risk ON vendor_stats(avg_risk_score)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_vendor_stats_high_risk ON vendor_stats(high_risk_pct)")

    conn.commit()
    print("  vendor_stats table created")


def add_missing_indexes(conn: sqlite3.Connection) -> None:
    """Add missing indexes for risk filtering performance."""
    print("Adding missing indexes...")

    cursor = conn.cursor()

    indexes = [
        ("idx_contracts_risk_level", "contracts(risk_level)"),
        ("idx_contracts_sector_risk", "contracts(sector_id, risk_level)"),
        ("idx_contracts_vendor_risk", "contracts(vendor_id, risk_level)"),
        ("idx_contracts_year_risk", "contracts(contract_year, risk_level)"),
        ("idx_contracts_risk_score", "contracts(risk_score)"),
    ]

    for idx_name, idx_def in indexes:
        try:
            cursor.execute(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {idx_def}")
            print(f"  Created index: {idx_name}")
        except sqlite3.OperationalError as e:
            print(f"  Index {idx_name} already exists or error: {e}")

    conn.commit()
    print("  Indexes created")


def populate_vendor_stats(conn: sqlite3.Connection) -> None:
    """Populate vendor_stats with pre-computed aggregates."""
    print("Populating vendor_stats table...")
    print("  This will take a few minutes for 320K+ vendors across 3.1M contracts...")

    cursor = conn.cursor()

    # Get vendor count for progress tracking
    cursor.execute("SELECT COUNT(*) FROM vendors")
    total_vendors = cursor.fetchone()[0]
    print(f"  Total vendors to process: {total_vendors:,}")

    # Clear existing data
    cursor.execute("DELETE FROM vendor_stats")
    conn.commit()

    start_time = datetime.now()

    # Insert aggregated stats for all vendors
    # Using a single INSERT...SELECT for efficiency
    print("  Computing aggregates (this is the slow part)...")

    cursor.execute(f"""
        INSERT INTO vendor_stats (
            vendor_id,
            total_contracts,
            total_value_mxn,
            avg_risk_score,
            high_risk_pct,
            direct_award_pct,
            single_bid_pct,
            first_contract_year,
            last_contract_year,
            sector_count,
            institution_count,
            updated_at
        )
        SELECT
            v.id as vendor_id,
            COUNT(c.id) as total_contracts,
            COALESCE(SUM(c.amount_mxn), 0) as total_value_mxn,
            COALESCE(AVG(c.risk_score), 0) as avg_risk_score,
            CASE
                WHEN COUNT(c.id) > 0
                THEN ROUND(100.0 * SUM(CASE WHEN c.risk_level IN ('high', 'critical') THEN 1 ELSE 0 END) / COUNT(c.id), 2)
                ELSE 0
            END as high_risk_pct,
            CASE
                WHEN COUNT(c.id) > 0
                THEN ROUND(100.0 * SUM(CASE WHEN c.is_direct_award = 1 THEN 1 ELSE 0 END) / COUNT(c.id), 2)
                ELSE 0
            END as direct_award_pct,
            CASE
                WHEN COUNT(c.id) > 0
                THEN ROUND(100.0 * SUM(CASE WHEN c.is_single_bid = 1 THEN 1 ELSE 0 END) / COUNT(c.id), 2)
                ELSE 0
            END as single_bid_pct,
            MIN(c.contract_year) as first_contract_year,
            MAX(c.contract_year) as last_contract_year,
            COUNT(DISTINCT c.sector_id) as sector_count,
            COUNT(DISTINCT c.institution_id) as institution_count,
            CURRENT_TIMESTAMP
        FROM vendors v
        LEFT JOIN contracts c ON v.id = c.vendor_id
            AND (c.amount_mxn IS NULL OR c.amount_mxn <= {MAX_CONTRACT_VALUE})
        GROUP BY v.id
    """)

    conn.commit()

    elapsed = (datetime.now() - start_time).total_seconds()

    # Verify results
    cursor.execute("SELECT COUNT(*) FROM vendor_stats")
    inserted = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM vendor_stats WHERE total_contracts > 0")
    with_contracts = cursor.fetchone()[0]

    print(f"  Inserted {inserted:,} vendor stats records")
    print(f"  Vendors with contracts: {with_contracts:,}")
    print(f"  Completed in {elapsed:.1f} seconds")


def verify_migration(conn: sqlite3.Connection) -> bool:
    """Verify the migration was successful."""
    print("\nVerifying migration...")

    cursor = conn.cursor()

    # Check table exists
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='vendor_stats'
    """)
    if not cursor.fetchone():
        print("  ERROR: vendor_stats table not found!")
        return False
    print("  vendor_stats table exists")

    # Check indexes exist
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='index' AND name LIKE 'idx_vendor_stats%'
    """)
    indexes = cursor.fetchall()
    print(f"  Found {len(indexes)} vendor_stats indexes")

    # Check risk indexes
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='index' AND name LIKE 'idx_contracts_risk%'
    """)
    risk_indexes = cursor.fetchall()
    print(f"  Found {len(risk_indexes)} risk indexes")

    # Test a sample query (should be fast now)
    print("\n  Testing vendor list query performance...")
    start = datetime.now()
    cursor.execute("""
        SELECT v.id, v.name, s.total_contracts, s.total_value_mxn, s.avg_risk_score
        FROM vendors v
        JOIN vendor_stats s ON v.id = s.vendor_id
        WHERE s.total_contracts >= 10
        ORDER BY s.total_contracts DESC
        LIMIT 50
    """)
    rows = cursor.fetchall()
    elapsed = (datetime.now() - start).total_seconds() * 1000

    print(f"  Query returned {len(rows)} rows in {elapsed:.1f}ms")

    if elapsed > 1000:
        print("  WARNING: Query still slow (>1s). Check indexes.")
        return False

    print("  SUCCESS: Query performance is good (<1s)")
    return True


def main():
    """Run the migration."""
    print("=" * 70)
    print("VENDOR STATS MIGRATION")
    print("=" * 70)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Timestamp: {datetime.now().isoformat()}")

    if not DB_PATH.exists():
        print(f"\nERROR: Database not found at {DB_PATH}")
        sys.exit(1)

    # Connect to database
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row

    try:
        # Step 1: Create table
        create_vendor_stats_table(conn)

        # Step 2: Add missing indexes
        add_missing_indexes(conn)

        # Step 3: Populate data
        populate_vendor_stats(conn)

        # Step 4: Verify
        success = verify_migration(conn)

        print("\n" + "=" * 70)
        if success:
            print("MIGRATION COMPLETE - Vendor page should now load in <1 second")
        else:
            print("MIGRATION COMPLETED WITH WARNINGS - Check output above")
        print("=" * 70)

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        conn.close()


if __name__ == '__main__':
    main()
