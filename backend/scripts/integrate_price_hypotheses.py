"""
Integrate Price Hypotheses into Contracts Table

Phase 1 of v3.1 Risk Model Integration:
1. Add price_hypothesis_confidence and price_hypothesis_type columns to contracts
2. Populate from price_hypotheses table (max confidence per contract)
3. This enables the risk scoring script to include price hypothesis as a factor

Usage:
    python -m scripts.integrate_price_hypotheses [--dry-run]
"""

import sys
import sqlite3
import argparse
from pathlib import Path
from datetime import datetime

# Database path
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def add_price_hypothesis_columns(conn: sqlite3.Connection) -> bool:
    """Add price hypothesis columns to contracts table if they don't exist."""
    cursor = conn.cursor()

    # Check existing columns
    cursor.execute("PRAGMA table_info(contracts)")
    existing_cols = {row[1] for row in cursor.fetchall()}

    columns_added = False

    if 'price_hypothesis_confidence' not in existing_cols:
        print("Adding column: price_hypothesis_confidence...")
        cursor.execute("""
            ALTER TABLE contracts
            ADD COLUMN price_hypothesis_confidence REAL DEFAULT NULL
        """)
        columns_added = True
    else:
        print("Column price_hypothesis_confidence already exists")

    if 'price_hypothesis_type' not in existing_cols:
        print("Adding column: price_hypothesis_type...")
        cursor.execute("""
            ALTER TABLE contracts
            ADD COLUMN price_hypothesis_type VARCHAR(50) DEFAULT NULL
        """)
        columns_added = True
    else:
        print("Column price_hypothesis_type already exists")

    if columns_added:
        conn.commit()
        print("Columns added successfully")

    return columns_added


def populate_price_hypothesis_data(conn: sqlite3.Connection, batch_size: int = 10000) -> int:
    """Populate price hypothesis columns from price_hypotheses table."""
    cursor = conn.cursor()

    # First, check how many contracts have hypotheses
    cursor.execute("""
        SELECT COUNT(DISTINCT contract_id) as unique_contracts,
               COUNT(*) as total_hypotheses
        FROM price_hypotheses
    """)
    row = cursor.fetchone()
    unique_contracts = row[0]
    total_hypotheses = row[1]

    print(f"\nPrice hypotheses summary:")
    print(f"  Total hypotheses: {total_hypotheses:,}")
    print(f"  Unique contracts: {unique_contracts:,}")

    # Get the max confidence hypothesis for each contract
    # Using a subquery to find the hypothesis with max confidence per contract
    print(f"\nPopulating contracts with price hypothesis data...")
    print(f"  Processing in batches of {batch_size:,}...")

    start_time = datetime.now()

    # Get all contract_ids that have hypotheses
    cursor.execute("""
        SELECT DISTINCT contract_id FROM price_hypotheses
    """)
    contract_ids = [row[0] for row in cursor.fetchall()]

    processed = 0
    for i in range(0, len(contract_ids), batch_size):
        batch_ids = contract_ids[i:i + batch_size]

        # Get max confidence hypothesis for each contract in batch
        placeholders = ','.join('?' * len(batch_ids))
        cursor.execute(f"""
            SELECT
                ph.contract_id,
                ph.confidence,
                ph.hypothesis_type
            FROM price_hypotheses ph
            INNER JOIN (
                SELECT contract_id, MAX(confidence) as max_conf
                FROM price_hypotheses
                WHERE contract_id IN ({placeholders})
                GROUP BY contract_id
            ) max_h ON ph.contract_id = max_h.contract_id
                    AND ph.confidence = max_h.max_conf
            GROUP BY ph.contract_id  -- In case of ties, take first
        """, batch_ids)

        updates = [(row[1], row[2], row[0]) for row in cursor.fetchall()]

        # Update contracts table
        cursor.execute("BEGIN TRANSACTION")
        cursor.executemany("""
            UPDATE contracts
            SET price_hypothesis_confidence = ?,
                price_hypothesis_type = ?
            WHERE id = ?
        """, updates)
        cursor.execute("COMMIT")

        processed += len(updates)
        elapsed = (datetime.now() - start_time).total_seconds()
        rate = processed / elapsed if elapsed > 0 else 0
        print(f"    Processed {processed:,} / {unique_contracts:,} ({100*processed/unique_contracts:.1f}%) - {rate:.0f}/sec")

    return processed


def verify_integration(conn: sqlite3.Connection):
    """Verify the integration was successful."""
    cursor = conn.cursor()

    print("\n" + "=" * 60)
    print("Verification:")
    print("=" * 60)

    # Count contracts with hypotheses
    cursor.execute("""
        SELECT COUNT(*) FROM contracts
        WHERE price_hypothesis_confidence IS NOT NULL
    """)
    populated = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM contracts")
    total = cursor.fetchone()[0]

    print(f"\nContracts with price hypotheses: {populated:,} / {total:,} ({100*populated/total:.2f}%)")

    # Distribution by hypothesis type
    cursor.execute("""
        SELECT
            price_hypothesis_type,
            COUNT(*) as cnt,
            AVG(price_hypothesis_confidence) as avg_conf,
            MIN(price_hypothesis_confidence) as min_conf,
            MAX(price_hypothesis_confidence) as max_conf
        FROM contracts
        WHERE price_hypothesis_confidence IS NOT NULL
        GROUP BY price_hypothesis_type
        ORDER BY cnt DESC
    """)

    print(f"\n{'Hypothesis Type':<25} {'Count':>10} {'Avg Conf':>10} {'Min':>8} {'Max':>8}")
    print("-" * 65)
    for row in cursor.fetchall():
        h_type, cnt, avg_conf, min_conf, max_conf = row
        print(f"{h_type or 'NULL':<25} {cnt:>10,} {avg_conf:>10.3f} {min_conf:>8.3f} {max_conf:>8.3f}")

    # Distribution by confidence level
    cursor.execute("""
        SELECT
            CASE
                WHEN price_hypothesis_confidence >= 0.85 THEN 'very_high (>=0.85)'
                WHEN price_hypothesis_confidence >= 0.65 THEN 'high (0.65-0.85)'
                WHEN price_hypothesis_confidence >= 0.45 THEN 'medium (0.45-0.65)'
                ELSE 'low (<0.45)'
            END as confidence_level,
            COUNT(*) as cnt
        FROM contracts
        WHERE price_hypothesis_confidence IS NOT NULL
        GROUP BY confidence_level
        ORDER BY
            CASE confidence_level
                WHEN 'very_high (>=0.85)' THEN 1
                WHEN 'high (0.65-0.85)' THEN 2
                WHEN 'medium (0.45-0.65)' THEN 3
                ELSE 4
            END
    """)

    print(f"\n{'Confidence Level':<25} {'Count':>10}")
    print("-" * 38)
    for row in cursor.fetchall():
        level, cnt = row
        print(f"{level:<25} {cnt:>10,}")

    # Create index for fast lookups if it doesn't exist
    print("\nCreating indexes...")
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_contracts_price_hyp_confidence
        ON contracts(price_hypothesis_confidence)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_contracts_price_hyp_type
        ON contracts(price_hypothesis_type)
    """)
    conn.commit()
    print("  Indexes created")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Integrate Price Hypotheses into Contracts Table'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be done without making changes'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=10000,
        help='Batch size for processing (default: 10000)'
    )
    args = parser.parse_args()

    print("=" * 60)
    print("RUBLI v3.1: Price Hypothesis Integration")
    print("=" * 60)

    if args.dry_run:
        print("\n*** DRY RUN MODE - No changes will be made ***\n")

    if not DB_PATH.exists():
        print(f"ERROR: Database not found: {DB_PATH}")
        return 1

    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        print(f"\nDatabase: {DB_PATH}")

        # Check if price_hypotheses table exists
        cursor = conn.cursor()
        cursor.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='price_hypotheses'
        """)
        if not cursor.fetchone():
            print("ERROR: price_hypotheses table does not exist")
            print("       Run the price hypothesis engine first")
            return 1

        if args.dry_run:
            print("\nDry run - would perform the following:")
            print("  1. Add price_hypothesis_confidence column to contracts")
            print("  2. Add price_hypothesis_type column to contracts")
            print("  3. Populate from price_hypotheses table")

            cursor.execute("SELECT COUNT(DISTINCT contract_id) FROM price_hypotheses")
            count = cursor.fetchone()[0]
            print(f"  4. Would populate {count:,} contracts with hypothesis data")
            return 0

        # Step 1: Add columns
        print("\nStep 1: Adding columns to contracts table...")
        add_price_hypothesis_columns(conn)

        # Step 2: Populate data
        print("\nStep 2: Populating price hypothesis data...")
        populated = populate_price_hypothesis_data(conn, args.batch_size)

        # Step 3: Verify
        verify_integration(conn)

        print("\n" + "=" * 60)
        print("Price hypothesis integration complete!")
        print("=" * 60)
        print(f"\nContracts with price hypotheses: {populated:,}")
        print("\nNext steps:")
        print("  1. Run calculate_risk_scores.py to include price hypothesis factor")
        print("  2. Run statistical validation to verify model improvement")

    except Exception as e:
        print(f"\nFATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        if conn:
            conn.close()

    return 0


if __name__ == '__main__':
    sys.exit(main())
