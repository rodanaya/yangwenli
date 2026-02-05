"""
Seed Ground Truth Data for Risk Model Validation

Loads known corruption cases from JSON files into the ground_truth_* tables.
This provides a baseline of known bad actors for validating the risk model.

Usage:
    python backend/scripts/seed_ground_truth.py [--dry-run]

Sources:
    - ASF Cuenta Publica audit reports
    - DOJ/FGR legal documents
    - Investigative journalism (Animal Politico, MCCI)
"""

import sqlite3
import os
import json
import glob
import argparse
from datetime import datetime
from typing import Dict, List, Any, Optional

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(BACKEND_DIR, 'RUBLI_NORMALIZED.db')
DATA_DIR = os.path.join(BACKEND_DIR, 'data', 'ground_truth')


def load_json_files(data_dir: str) -> List[Dict[str, Any]]:
    """Load all ground truth JSON files from the data directory."""
    json_files = glob.glob(os.path.join(data_dir, '*.json'))
    cases = []

    for filepath in json_files:
        print(f"  Loading: {os.path.basename(filepath)}")
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            data['_source_file'] = os.path.basename(filepath)
            cases.append(data)

    return cases


def case_exists(cursor: sqlite3.Cursor, case_id: str) -> bool:
    """Check if a case already exists in the database."""
    cursor.execute(
        "SELECT id FROM ground_truth_cases WHERE case_id = ?",
        (case_id,)
    )
    return cursor.fetchone() is not None


def insert_case(cursor: sqlite3.Cursor, case_data: Dict[str, Any]) -> int:
    """Insert a corruption case and return its ID."""
    cursor.execute("""
        INSERT INTO ground_truth_cases
        (case_id, case_name, case_type, year_start, year_end,
         estimated_fraud_mxn, source_asf, source_news, source_legal,
         confidence_level, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        case_data['case_id'],
        case_data['case_name'],
        case_data['case_type'],
        case_data.get('year_start'),
        case_data.get('year_end'),
        case_data.get('estimated_fraud_mxn'),
        case_data.get('source_asf'),
        case_data.get('source_news'),
        case_data.get('source_legal'),
        case_data.get('confidence_level', 'medium'),
        case_data.get('notes')
    ))

    return cursor.lastrowid


def insert_vendors(cursor: sqlite3.Cursor, case_id: int,
                   vendors: List[Dict[str, Any]]) -> int:
    """Insert vendors for a case. Returns count inserted."""
    count = 0
    for vendor in vendors:
        cursor.execute("""
            INSERT INTO ground_truth_vendors
            (case_id, vendor_name_source, rfc_source, role,
             evidence_strength, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            case_id,
            vendor['vendor_name_source'],
            vendor.get('rfc_source'),
            vendor.get('role'),
            vendor.get('evidence_strength', 'medium'),
            vendor.get('notes')
        ))
        count += 1

    return count


def insert_institutions(cursor: sqlite3.Cursor, case_id: int,
                        institutions: List[Dict[str, Any]]) -> int:
    """Insert institutions for a case. Returns count inserted."""
    count = 0
    for inst in institutions:
        cursor.execute("""
            INSERT INTO ground_truth_institutions
            (case_id, institution_name_source, role,
             evidence_strength, notes)
            VALUES (?, ?, ?, ?, ?)
        """, (
            case_id,
            inst['institution_name_source'],
            inst.get('role'),
            inst.get('evidence_strength', 'medium'),
            inst.get('notes')
        ))
        count += 1

    return count


def insert_contracts(cursor: sqlite3.Cursor, case_id: int,
                     contracts: List[Dict[str, Any]]) -> int:
    """Insert known contracts for a case. Returns count inserted."""
    count = 0
    for contract in contracts:
        cursor.execute("""
            INSERT INTO ground_truth_contracts
            (case_id, contract_number_source, procedure_number_source,
             amount_source, year_source, evidence_strength, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            case_id,
            contract.get('contract_number_source'),
            contract.get('procedure_number_source'),
            contract.get('amount_source'),
            contract.get('year_source'),
            contract.get('evidence_strength', 'medium'),
            contract.get('notes') or contract.get('description')
        ))
        count += 1

    return count


def seed_from_json(conn: sqlite3.Connection, case_data: Dict[str, Any],
                   dry_run: bool = False) -> Dict[str, Any]:
    """
    Seed database with data from a single JSON case file.

    Returns summary statistics.
    """
    cursor = conn.cursor()
    result = {
        'case_id': case_data['case']['case_id'],
        'source_file': case_data.get('_source_file'),
        'status': 'skipped',
        'vendors_inserted': 0,
        'institutions_inserted': 0,
        'contracts_inserted': 0
    }

    case = case_data['case']

    # Check if already exists
    if case_exists(cursor, case['case_id']):
        print(f"    Case {case['case_id']} already exists - skipping")
        result['status'] = 'exists'
        return result

    if dry_run:
        print(f"    [DRY RUN] Would insert case: {case['case_name']}")
        result['status'] = 'dry_run'
        result['vendors_inserted'] = len(case_data.get('vendors', []))
        result['institutions_inserted'] = len(case_data.get('institutions', []))
        result['contracts_inserted'] = len(case_data.get('contracts', []))
        return result

    # Insert case
    db_case_id = insert_case(cursor, case)
    print(f"    Inserted case: {case['case_name']} (ID: {db_case_id})")

    # Insert vendors
    vendors = case_data.get('vendors', [])
    if vendors:
        count = insert_vendors(cursor, db_case_id, vendors)
        result['vendors_inserted'] = count
        print(f"    Inserted {count} vendors")

    # Insert institutions
    institutions = case_data.get('institutions', [])
    if institutions:
        count = insert_institutions(cursor, db_case_id, institutions)
        result['institutions_inserted'] = count
        print(f"    Inserted {count} institutions")

    # Insert contracts
    contracts = case_data.get('contracts', [])
    if contracts:
        count = insert_contracts(cursor, db_case_id, contracts)
        result['contracts_inserted'] = count
        print(f"    Inserted {count} known contracts")

    conn.commit()
    result['status'] = 'inserted'

    return result


def get_summary(conn: sqlite3.Connection) -> Dict[str, int]:
    """Get current ground truth table counts."""
    cursor = conn.cursor()
    summary = {}

    for table in ['ground_truth_cases', 'ground_truth_vendors',
                  'ground_truth_institutions', 'ground_truth_contracts']:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        summary[table] = cursor.fetchone()[0]

    return summary


def main():
    parser = argparse.ArgumentParser(
        description='Seed ground truth data for risk model validation'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be inserted without making changes'
    )
    parser.add_argument(
        '--file',
        type=str,
        help='Process only a specific JSON file'
    )
    args = parser.parse_args()

    print("=" * 70)
    print("YANG WEN-LI: GROUND TRUTH DATA SEEDING")
    print("=" * 70)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Data directory: {DATA_DIR}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    if args.dry_run:
        print("\n*** DRY RUN MODE - No changes will be made ***")

    if not os.path.exists(DB_PATH):
        print(f"\nERROR: Database not found at {DB_PATH}")
        return

    if not os.path.exists(DATA_DIR):
        print(f"\nERROR: Data directory not found at {DATA_DIR}")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    try:
        # Show current state
        print("\nCurrent ground truth data:")
        before = get_summary(conn)
        for table, count in before.items():
            print(f"  {table}: {count} records")

        # Load JSON files
        print("\nLoading JSON files...")
        if args.file:
            filepath = os.path.join(DATA_DIR, args.file)
            if not os.path.exists(filepath):
                print(f"ERROR: File not found: {filepath}")
                return
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
                data['_source_file'] = args.file
                cases = [data]
        else:
            cases = load_json_files(DATA_DIR)

        if not cases:
            print("No JSON files found to process")
            return

        print(f"\nFound {len(cases)} case files")

        # Process each case
        print("\nProcessing cases...")
        results = []
        for case_data in cases:
            result = seed_from_json(conn, case_data, args.dry_run)
            results.append(result)

        # Summary
        print("\n" + "=" * 70)
        print("SEEDING SUMMARY")
        print("=" * 70)

        inserted = sum(1 for r in results if r['status'] == 'inserted')
        skipped = sum(1 for r in results if r['status'] == 'exists')
        dry_run = sum(1 for r in results if r['status'] == 'dry_run')

        print(f"\nCases processed: {len(results)}")
        print(f"  Inserted: {inserted}")
        print(f"  Already existed: {skipped}")
        if dry_run:
            print(f"  Would insert (dry run): {dry_run}")

        total_vendors = sum(r['vendors_inserted'] for r in results)
        total_institutions = sum(r['institutions_inserted'] for r in results)
        total_contracts = sum(r['contracts_inserted'] for r in results)

        print(f"\nRecords {'would be ' if args.dry_run else ''}inserted:")
        print(f"  Vendors: {total_vendors}")
        print(f"  Institutions: {total_institutions}")
        print(f"  Contracts: {total_contracts}")

        if not args.dry_run:
            print("\nFinal ground truth data:")
            after = get_summary(conn)
            for table, count in after.items():
                delta = count - before[table]
                print(f"  {table}: {count} records (+{delta})")

        print("\n" + "=" * 70)
        print("SEEDING COMPLETE")
        print("=" * 70)
        print("\nNext steps:")
        print("  1. Run match_ground_truth.py to link to database entities")
        print("  2. Run validate_risk_model.py to test detection rates")

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    main()
