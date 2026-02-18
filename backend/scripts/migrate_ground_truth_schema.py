"""
Migration script to add ground truth validation tables to existing database.

This adds the v3.2 validation framework tables without affecting existing data.
Run this once to enable risk model validation against known corruption cases.

Usage:
    python backend/scripts/migrate_ground_truth_schema.py
"""

import sqlite3
import os
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(BACKEND_DIR, 'RUBLI_NORMALIZED.db')


MIGRATION_DDL = """
-- =============================================================================
-- GROUND TRUTH VALIDATION TABLES (v3.2 - Risk Model Validation)
-- Migration: Add to existing database
-- =============================================================================

-- Known corruption cases for model validation
-- Sources: ASF Cuenta Publica, DOJ filings, FGR investigations, media investigations
CREATE TABLE IF NOT EXISTS ground_truth_cases (
    id INTEGER PRIMARY KEY,
    case_id VARCHAR(50) UNIQUE NOT NULL,
    case_name VARCHAR(200) NOT NULL,
    case_type VARCHAR(50) NOT NULL,              -- estafa_maestra, bribery, ghost_company, bid_rigging, embezzlement
    year_start INTEGER,
    year_end INTEGER,
    estimated_fraud_mxn REAL,
    source_asf TEXT,                             -- ASF audit report reference
    source_news TEXT,                            -- News/media source
    source_legal TEXT,                           -- Legal/court documents
    confidence_level VARCHAR(20) DEFAULT 'medium', -- high, medium, low (based on evidence quality)
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Known bad vendors linked to corruption cases
CREATE TABLE IF NOT EXISTS ground_truth_vendors (
    id INTEGER PRIMARY KEY,
    case_id INTEGER NOT NULL,
    vendor_id INTEGER,                           -- FK to vendors table (after matching)
    vendor_name_source VARCHAR(500) NOT NULL,    -- Name as reported in source
    rfc_source VARCHAR(13),                      -- RFC if available from source
    role VARCHAR(50),                            -- beneficiary, shell_company, intermediary, co-conspirator
    evidence_strength VARCHAR(20) DEFAULT 'medium', -- high, medium, low
    match_method VARCHAR(50),                    -- rfc_exact, name_exact, name_fuzzy, manual
    match_confidence REAL,                       -- 0-1 confidence score
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES ground_truth_cases(id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

-- Known bad institutions linked to corruption cases
CREATE TABLE IF NOT EXISTS ground_truth_institutions (
    id INTEGER PRIMARY KEY,
    case_id INTEGER NOT NULL,
    institution_id INTEGER,                      -- FK to institutions table (after matching)
    institution_name_source VARCHAR(500) NOT NULL, -- Name as reported in source
    role VARCHAR(50),                            -- source, awarding_entity, co-conspirator
    evidence_strength VARCHAR(20) DEFAULT 'medium',
    match_method VARCHAR(50),
    match_confidence REAL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES ground_truth_cases(id),
    FOREIGN KEY (institution_id) REFERENCES institutions(id)
);

-- Known bad contracts from corruption cases (for precise validation)
CREATE TABLE IF NOT EXISTS ground_truth_contracts (
    id INTEGER PRIMARY KEY,
    case_id INTEGER NOT NULL,
    contract_id INTEGER,                         -- FK to contracts table (after matching)
    contract_number_source VARCHAR(200),         -- Contract number from source
    procedure_number_source VARCHAR(200),        -- Procedure number from source
    amount_source REAL,                          -- Amount reported in source
    year_source INTEGER,                         -- Year from source
    evidence_strength VARCHAR(20) DEFAULT 'medium',
    match_method VARCHAR(50),
    match_confidence REAL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES ground_truth_cases(id),
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

-- Validation run results for model performance tracking
CREATE TABLE IF NOT EXISTS validation_results (
    id INTEGER PRIMARY KEY,
    run_id VARCHAR(50) NOT NULL,
    model_version VARCHAR(20) NOT NULL,
    run_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Detection metrics
    total_known_bad_contracts INTEGER,
    total_known_bad_vendors INTEGER,
    flagged_critical INTEGER,                    -- risk_level = 'critical'
    flagged_high INTEGER,                        -- risk_level = 'high'
    flagged_medium INTEGER,                      -- risk_level = 'medium'
    flagged_low INTEGER,                         -- risk_level = 'low'

    -- Key rates
    detection_rate REAL,                         -- % of known bad flagged medium+
    critical_detection_rate REAL,                -- % flagged critical or high
    false_negative_count INTEGER,                -- Known bad with low risk

    -- Factor analysis (JSON)
    factor_trigger_counts TEXT,                  -- JSON: {factor: count triggered on known bad}
    factor_effectiveness TEXT,                   -- JSON: {factor: precision/recall/F1}

    -- Comparison to baseline
    baseline_detection_rate REAL,                -- Detection rate on random sample
    lift REAL,                                   -- Model lift over baseline

    notes TEXT
);

-- Indexes for ground truth tables
CREATE INDEX IF NOT EXISTS idx_gt_cases_type ON ground_truth_cases(case_type);
CREATE INDEX IF NOT EXISTS idx_gt_cases_years ON ground_truth_cases(year_start, year_end);
CREATE INDEX IF NOT EXISTS idx_gt_vendors_case ON ground_truth_vendors(case_id);
CREATE INDEX IF NOT EXISTS idx_gt_vendors_vendor ON ground_truth_vendors(vendor_id);
CREATE INDEX IF NOT EXISTS idx_gt_institutions_case ON ground_truth_institutions(case_id);
CREATE INDEX IF NOT EXISTS idx_gt_institutions_inst ON ground_truth_institutions(institution_id);
CREATE INDEX IF NOT EXISTS idx_gt_contracts_case ON ground_truth_contracts(case_id);
CREATE INDEX IF NOT EXISTS idx_gt_contracts_contract ON ground_truth_contracts(contract_id);
CREATE INDEX IF NOT EXISTS idx_validation_results_version ON validation_results(model_version);
CREATE INDEX IF NOT EXISTS idx_validation_results_date ON validation_results(run_date);
"""


def check_tables_exist(conn: sqlite3.Connection) -> dict:
    """Check which ground truth tables already exist."""
    cursor = conn.cursor()
    tables_to_check = [
        'ground_truth_cases',
        'ground_truth_vendors',
        'ground_truth_institutions',
        'ground_truth_contracts',
        'validation_results'
    ]

    existing = {}
    for table in tables_to_check:
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            (table,)
        )
        existing[table] = cursor.fetchone() is not None

    return existing


def run_migration(conn: sqlite3.Connection) -> None:
    """Run the migration DDL."""
    print("Running migration DDL...")
    cursor = conn.cursor()
    cursor.executescript(MIGRATION_DDL)
    conn.commit()
    print("  Migration DDL executed")


def verify_migration(conn: sqlite3.Connection) -> None:
    """Verify the migration was successful."""
    print("\nVerifying migration...")
    cursor = conn.cursor()

    tables = [
        'ground_truth_cases',
        'ground_truth_vendors',
        'ground_truth_institutions',
        'ground_truth_contracts',
        'validation_results'
    ]

    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"  {table}: OK ({count} records)")

    # Check indexes
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='index' AND name LIKE 'idx_gt_%' OR name LIKE 'idx_validation_%'
    """)
    indexes = [row[0] for row in cursor.fetchall()]
    print(f"  Indexes created: {len(indexes)}")


def main():
    """Main entry point."""
    print("=" * 70)
    print("RUBLI: GROUND TRUTH SCHEMA MIGRATION (v3.2)")
    print("=" * 70)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Timestamp: {datetime.now().isoformat()}")

    if not os.path.exists(DB_PATH):
        print(f"\nERROR: Database not found at {DB_PATH}")
        print("Run etl_create_schema.py first to create the database.")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    try:
        # Check existing state
        print("\nChecking existing tables...")
        existing = check_tables_exist(conn)

        already_exists = [t for t, exists in existing.items() if exists]
        needs_creation = [t for t, exists in existing.items() if not exists]

        if already_exists:
            print(f"  Already exist: {', '.join(already_exists)}")
        if needs_creation:
            print(f"  Will create: {', '.join(needs_creation)}")

        if not needs_creation:
            print("\n All ground truth tables already exist. Nothing to do.")
        else:
            # Run migration
            run_migration(conn)

        # Verify
        verify_migration(conn)

        print("\n" + "=" * 70)
        print("MIGRATION COMPLETE")
        print("=" * 70)
        print("\nNext steps:")
        print("  1. Run seed_ground_truth.py to load known cases")
        print("  2. Run match_ground_truth.py to link to database entities")
        print("  3. Run validate_risk_model.py to test detection rates")

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    main()
