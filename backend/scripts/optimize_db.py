"""
Database optimization script for faster query performance.
Adds indexes and optimizes SQLite settings.
"""
import sqlite3
import time

DB_PATH = "RUBLI_NORMALIZED.db"

def optimize_database():
    print("=" * 60)
    print("DATABASE OPTIMIZATION")
    print("=" * 60)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check current indexes
    cursor.execute("SELECT name FROM sqlite_master WHERE type='index'")
    existing = [r[0] for r in cursor.fetchall()]
    print(f"\nExisting indexes: {len(existing)}")

    # Essential indexes for dashboard performance
    indexes = [
        ("idx_contracts_sector_id", "contracts", "sector_id"),
        ("idx_contracts_vendor_id", "contracts", "vendor_id"),
        ("idx_contracts_institution_id", "contracts", "institution_id"),
        ("idx_contracts_year", "contracts", "contract_year"),
        ("idx_contracts_risk_level", "contracts", "risk_level"),
        ("idx_contracts_amount", "contracts", "amount_mxn"),
        ("idx_contracts_direct_award", "contracts", "is_direct_award"),
        ("idx_contracts_single_bid", "contracts", "is_single_bid"),
        ("idx_contracts_date", "contracts", "contract_date"),
        # Compound indexes for common queries
        ("idx_contracts_sector_year", "contracts", "sector_id, contract_year"),
        ("idx_contracts_sector_risk", "contracts", "sector_id, risk_level"),
        ("idx_contracts_vendor_sector", "contracts", "vendor_id, sector_id"),
    ]

    print("\nCreating indexes...")
    created = 0
    for idx_name, table, columns in indexes:
        if idx_name not in existing:
            try:
                start = time.time()
                cursor.execute(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table}({columns})")
                elapsed = time.time() - start
                print(f"  Created {idx_name} ({elapsed:.1f}s)")
                created += 1
            except Exception as e:
                print(f"  Failed {idx_name}: {e}")
        else:
            print(f"  Exists: {idx_name}")

    # Optimize SQLite settings
    print("\nOptimizing SQLite settings...")
    cursor.execute("PRAGMA journal_mode=WAL")
    print("  Set journal_mode=WAL")

    cursor.execute("PRAGMA cache_size=-64000")  # 64MB cache
    print("  Set cache_size=64MB")

    cursor.execute("PRAGMA temp_store=MEMORY")
    print("  Set temp_store=MEMORY")

    # Analyze tables for query optimizer
    print("\nAnalyzing tables for query optimizer...")
    start = time.time()
    cursor.execute("ANALYZE")
    elapsed = time.time() - start
    print(f"  ANALYZE completed ({elapsed:.1f}s)")

    conn.commit()
    conn.close()

    print(f"\nDone! Created {created} new indexes.")
    print("=" * 60)

if __name__ == "__main__":
    optimize_database()
