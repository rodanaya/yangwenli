"""
Yang Wen-li: Data Quality Score Calculation
============================================
Calculates quality scores for contracts, vendors, and institutions
based on completeness, validity, structure, and reliability factors.

Quality Score Formula:
    quality_score = (completeness * 0.30) + (validity * 0.25) +
                    (structure * 0.25) + (reliability * 0.20)

Quality Grades:
    A (90-100): High confidence - fully reliable
    B (75-89):  High confidence - reliable with minor gaps
    C (60-74):  Medium confidence - usable with caveats
    D (40-59):  Medium confidence - limited reliability
    F (0-39):   Low confidence - use for counts only

Author: Yang Wen-li Project
Date: 2026-01-14
"""

import sqlite3
import os
import json
from datetime import datetime
from typing import Dict, Tuple, Optional, List

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(BACKEND_DIR, 'RUBLI_NORMALIZED.db')

BATCH_SIZE = 10_000

# Critical field weights (sum = 100)
CRITICAL_FIELD_WEIGHTS = {
    'vendor_id': 25,
    'institution_id': 20,
    'amount_mxn': 20,
    'contract_date': 15,
    'procedure_type': 10,
    'contract_number': 10
}

# Structure baseline scores
STRUCTURE_BASELINES = {
    'A': 40,   # 2002-2010: lowest quality, 0.1% RFC
    'B': 60,   # 2010-2017: improving, 15.7% RFC
    'C': 80,   # 2018-2022: good, 30.3% RFC
    'D': 100   # 2023-2025: best, 47.4% RFC
}

# Amount thresholds
MAX_CONTRACT_VALUE = 100_000_000_000  # 100B MXN - reject above
FLAG_THRESHOLD = 10_000_000_000        # 10B MXN - flag for review

# =============================================================================
# SCHEMA MIGRATION
# =============================================================================

MIGRATION_DDL = """
-- =============================================================================
-- DATA QUALITY TABLES (v1.0)
-- =============================================================================

-- Field Profiles: Structure-aware field metadata
CREATE TABLE IF NOT EXISTS field_profiles (
    id INTEGER PRIMARY KEY,
    structure CHAR(1) NOT NULL,           -- A, B, C, D
    field_name VARCHAR(100) NOT NULL,
    is_available INTEGER DEFAULT 0,       -- 1 if field exists in structure
    availability_rate REAL DEFAULT 0.0,   -- % non-null when available
    reliability_score REAL DEFAULT 0.0,   -- 0-100 quality score
    notes TEXT,
    UNIQUE(structure, field_name)
);

-- Contract Quality: Per-contract quality scores
CREATE TABLE IF NOT EXISTS contract_quality (
    id INTEGER PRIMARY KEY,
    contract_id INTEGER NOT NULL UNIQUE,
    -- Component scores (0-100)
    completeness_score REAL DEFAULT 0.0,
    validity_score REAL DEFAULT 0.0,
    structure_score REAL DEFAULT 0.0,
    reliability_score REAL DEFAULT 0.0,
    -- Aggregate
    quality_score REAL DEFAULT 0.0,
    quality_grade CHAR(1),                -- A, B, C, D, F
    risk_confidence VARCHAR(10),          -- high, medium, low
    -- Flags
    has_rfc INTEGER DEFAULT 0,
    has_valid_dates INTEGER DEFAULT 0,
    has_amount_issue INTEGER DEFAULT 0,
    missing_critical_fields TEXT,         -- JSON array
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

-- Data Quality Audit: Track quality score changes
CREATE TABLE IF NOT EXISTS data_quality_audit (
    id INTEGER PRIMARY KEY,
    entity_type VARCHAR(20) NOT NULL,     -- contract, vendor, institution
    entity_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL,          -- calculated, recalculated, flagged
    previous_score REAL,
    new_score REAL,
    reason TEXT,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for contract_quality
CREATE INDEX IF NOT EXISTS idx_contract_quality_score ON contract_quality(quality_score);
CREATE INDEX IF NOT EXISTS idx_contract_quality_grade ON contract_quality(quality_grade);
CREATE INDEX IF NOT EXISTS idx_contract_quality_confidence ON contract_quality(risk_confidence);

-- Indexes for audit trail
CREATE INDEX IF NOT EXISTS idx_dq_audit_entity ON data_quality_audit(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_dq_audit_time ON data_quality_audit(calculated_at);
"""

# Column additions (run separately to handle existing tables)
COLUMN_ADDITIONS = [
    # Contracts table
    ("contracts", "data_quality_score", "REAL"),
    ("contracts", "data_quality_grade", "CHAR(1)"),
    ("contracts", "risk_confidence", "VARCHAR(10)"),
    # Vendors table
    ("vendors", "avg_data_quality_score", "REAL"),
    ("vendors", "data_quality_grade", "CHAR(1)"),
    ("vendors", "pct_high_quality_contracts", "REAL"),
    # Institutions table
    ("institutions", "avg_data_quality_score", "REAL"),
    ("institutions", "data_quality_grade", "CHAR(1)"),
]

# Field profiles seed data (based on COMPRANET structure analysis)
FIELD_PROFILES_DATA = [
    # Structure A (2002-2010)
    ('A', 'rfc', 0, 0.1, 10, 'Virtually no RFC data'),
    ('A', 'contract_date', 1, 30.0, 30, 'Often missing or incomplete'),
    ('A', 'procedure_type', 1, 95.0, 70, 'Usually present'),
    ('A', 'ramo_code', 1, 60.0, 50, 'Moderate coverage'),
    ('A', 'partida_code', 0, 0.0, 0, 'Not available in Structure A'),
    ('A', 'direct_award_flag', 0, 0.0, 0, 'Not available'),
    ('A', 'amount_mxn', 1, 98.0, 80, 'Usually present but quality varies'),
    ('A', 'vendor_name', 1, 99.0, 60, 'Present but not normalized'),
    ('A', 'institution_name', 1, 99.0, 60, 'Present but not normalized'),
    # Structure B (2010-2017)
    ('B', 'rfc', 1, 15.7, 40, 'Limited RFC coverage'),
    ('B', 'contract_date', 1, 45.0, 45, 'Improved coverage'),
    ('B', 'procedure_type', 1, 98.0, 80, 'Good coverage'),
    ('B', 'ramo_code', 1, 75.0, 65, 'Good coverage'),
    ('B', 'partida_code', 0, 0.0, 0, 'Not available in Structure B'),
    ('B', 'direct_award_flag', 1, 72.2, 75, 'Well documented'),
    ('B', 'amount_mxn', 1, 99.0, 85, 'Good quality'),
    ('B', 'vendor_name', 1, 99.5, 70, 'Better normalized (UPPERCASE)'),
    ('B', 'institution_name', 1, 99.5, 70, 'Better normalized'),
    # Structure C (2018-2022)
    ('C', 'rfc', 1, 30.3, 60, 'Moderate RFC coverage'),
    ('C', 'contract_date', 1, 65.0, 65, 'Good coverage'),
    ('C', 'procedure_type', 1, 99.0, 85, 'Excellent coverage'),
    ('C', 'ramo_code', 1, 85.0, 75, 'Good coverage'),
    ('C', 'partida_code', 0, 0.0, 0, 'Not available in Structure C'),
    ('C', 'direct_award_flag', 1, 78.4, 80, 'Well documented'),
    ('C', 'amount_mxn', 1, 99.5, 90, 'High quality'),
    ('C', 'vendor_name', 1, 99.8, 80, 'Mixed case, better normalized'),
    ('C', 'institution_name', 1, 99.8, 80, 'Good normalization'),
    # Structure D (2023-2025)
    ('D', 'rfc', 1, 47.4, 80, 'Best RFC coverage'),
    ('D', 'contract_date', 1, 85.0, 85, 'Excellent coverage'),
    ('D', 'procedure_type', 1, 100.0, 95, 'Complete coverage'),
    ('D', 'ramo_code', 1, 71.6, 70, 'Good but some gaps'),
    ('D', 'partida_code', 1, 100.0, 95, 'Complete - Structure D only'),
    ('D', 'direct_award_flag', 1, 71.6, 80, 'Well documented'),
    ('D', 'amount_mxn', 1, 99.9, 95, 'Highest quality'),
    ('D', 'vendor_name', 1, 99.9, 90, 'Best normalization'),
    ('D', 'institution_name', 1, 99.9, 90, 'Best normalization'),
]

# =============================================================================
# QUALITY CALCULATION FUNCTIONS
# =============================================================================

def calculate_completeness(contract: Dict) -> Tuple[float, List[str]]:
    """
    Calculate completeness score based on critical field presence.
    Returns (score, list of missing fields).
    """
    score = 0
    missing = []

    for field, weight in CRITICAL_FIELD_WEIGHTS.items():
        value = contract.get(field)
        if value is not None and value != '' and value != 0:
            score += weight
        else:
            missing.append(field)

    return score, missing


def calculate_validity(contract: Dict) -> Tuple[float, bool]:
    """
    Calculate validity score based on data validation rules.
    Returns (score, has_amount_issue).
    """
    score = 100
    has_amount_issue = False

    # Amount validation
    amount = contract.get('amount_mxn') or 0
    if amount > MAX_CONTRACT_VALUE:
        score -= 40  # Severe: likely data error
        has_amount_issue = True
    elif amount > FLAG_THRESHOLD:
        score -= 15  # Flagged for review
        has_amount_issue = True
    elif amount <= 0:
        score -= 20  # Missing/invalid amount

    # Date validation
    start_date = contract.get('start_date')
    end_date = contract.get('end_date')
    if start_date and end_date:
        try:
            if str(start_date) > str(end_date):
                score -= 20  # Date sequence error
        except:
            pass

    # Year validation
    year = contract.get('contract_year')
    if year:
        if year < 2000 or year > 2030:
            score -= 20  # Invalid year

    return max(0, score), has_amount_issue


def calculate_structure_score(contract: Dict) -> float:
    """
    Calculate structure score based on COMPRANET data structure.
    """
    structure = contract.get('source_structure') or 'A'
    return STRUCTURE_BASELINES.get(structure, 40)


def calculate_reliability(contract: Dict, vendor_info: Optional[Dict] = None) -> Tuple[float, bool]:
    """
    Calculate reliability score based on verifiable data.
    Returns (score, has_rfc).
    """
    score = 50  # Base score
    has_rfc = False

    # RFC presence is major reliability indicator
    # Check if vendor has RFC
    if vendor_info and vendor_info.get('rfc'):
        score += 30
        has_rfc = True

    # Vendor verified in SAT
    if vendor_info and vendor_info.get('is_verified_sat'):
        score += 10

    # Institution classification confidence
    inst_confidence = contract.get('classification_confidence') or 0
    if inst_confidence >= 0.9:
        score += 10
    elif inst_confidence >= 0.7:
        score += 5

    return min(100, score), has_rfc


def calculate_quality_score(contract: Dict, vendor_info: Optional[Dict] = None) -> Dict:
    """
    Calculate overall quality score and all components.
    """
    # Calculate components
    completeness, missing_fields = calculate_completeness(contract)
    validity, has_amount_issue = calculate_validity(contract)
    structure = calculate_structure_score(contract)
    reliability, has_rfc = calculate_reliability(contract, vendor_info)

    # Weighted aggregate
    quality_score = (
        completeness * 0.30 +
        validity * 0.25 +
        structure * 0.25 +
        reliability * 0.20
    )

    # Grade mapping
    if quality_score >= 90:
        grade, confidence = 'A', 'high'
    elif quality_score >= 75:
        grade, confidence = 'B', 'high'
    elif quality_score >= 60:
        grade, confidence = 'C', 'medium'
    elif quality_score >= 40:
        grade, confidence = 'D', 'medium'
    else:
        grade, confidence = 'F', 'low'

    # Check date validity
    has_valid_dates = 1
    start_date = contract.get('start_date')
    end_date = contract.get('end_date')
    if start_date and end_date:
        try:
            if str(start_date) > str(end_date):
                has_valid_dates = 0
        except:
            has_valid_dates = 0

    return {
        'completeness_score': completeness,
        'validity_score': validity,
        'structure_score': structure,
        'reliability_score': reliability,
        'quality_score': quality_score,
        'quality_grade': grade,
        'risk_confidence': confidence,
        'has_rfc': 1 if has_rfc else 0,
        'has_valid_dates': has_valid_dates,
        'has_amount_issue': 1 if has_amount_issue else 0,
        'missing_critical_fields': json.dumps(missing_fields)
    }


# =============================================================================
# DATABASE OPERATIONS
# =============================================================================

def run_migration(conn: sqlite3.Connection) -> None:
    """Create new tables and add columns for data quality."""
    print("Running schema migration for data quality...")
    cursor = conn.cursor()

    # Create new tables
    cursor.executescript(MIGRATION_DDL)
    conn.commit()
    print("  Created data quality tables")

    # Add columns to existing tables (ignore errors if already exist)
    for table, column, dtype in COLUMN_ADDITIONS:
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {dtype}")
            print(f"  Added {table}.{column}")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                pass  # Column already exists
            else:
                print(f"  Warning: {e}")

    conn.commit()


def seed_field_profiles(conn: sqlite3.Connection) -> None:
    """Populate field_profiles with structure metadata."""
    print("Seeding field profiles...")
    cursor = conn.cursor()

    for row in FIELD_PROFILES_DATA:
        cursor.execute("""
            INSERT OR REPLACE INTO field_profiles
            (structure, field_name, is_available, availability_rate, reliability_score, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        """, row)

    conn.commit()
    print(f"  Inserted {len(FIELD_PROFILES_DATA)} field profiles")


def get_vendor_rfc_map(conn: sqlite3.Connection) -> Dict[int, Dict]:
    """Build map of vendor_id -> {rfc, is_verified_sat}."""
    print("Loading vendor RFC data...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, rfc, is_verified_sat
        FROM vendors
        WHERE rfc IS NOT NULL AND rfc != ''
    """)

    vendor_map = {}
    for row in cursor.fetchall():
        vendor_map[row[0]] = {
            'rfc': row[1],
            'is_verified_sat': row[2]
        }

    print(f"  Loaded {len(vendor_map)} vendors with RFC")
    return vendor_map


def process_contracts_batch(
    conn: sqlite3.Connection,
    vendor_map: Dict[int, Dict],
    offset: int,
    batch_size: int
) -> int:
    """Process a batch of contracts and calculate quality scores."""
    cursor = conn.cursor()

    # Fetch batch of contracts
    cursor.execute("""
        SELECT c.id, c.vendor_id, c.institution_id, c.amount_mxn,
               c.contract_date, c.procedure_type, c.contract_number,
               c.start_date, c.end_date, c.contract_year,
               c.source_structure, i.classification_confidence
        FROM contracts c
        LEFT JOIN institutions i ON c.institution_id = i.id
        ORDER BY c.id
        LIMIT ? OFFSET ?
    """, (batch_size, offset))

    rows = cursor.fetchall()
    if not rows:
        return 0

    # Calculate quality scores
    results = []
    for row in rows:
        contract = {
            'id': row[0],
            'vendor_id': row[1],
            'institution_id': row[2],
            'amount_mxn': row[3],
            'contract_date': row[4],
            'procedure_type': row[5],
            'contract_number': row[6],
            'start_date': row[7],
            'end_date': row[8],
            'contract_year': row[9],
            'source_structure': row[10],
            'classification_confidence': row[11]
        }

        vendor_info = vendor_map.get(contract['vendor_id'])
        quality = calculate_quality_score(contract, vendor_info)
        quality['contract_id'] = contract['id']
        results.append(quality)

    # Insert into contract_quality table
    cursor.executemany("""
        INSERT OR REPLACE INTO contract_quality
        (contract_id, completeness_score, validity_score, structure_score,
         reliability_score, quality_score, quality_grade, risk_confidence,
         has_rfc, has_valid_dates, has_amount_issue, missing_critical_fields,
         calculated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    """, [(
        r['contract_id'], r['completeness_score'], r['validity_score'],
        r['structure_score'], r['reliability_score'], r['quality_score'],
        r['quality_grade'], r['risk_confidence'], r['has_rfc'],
        r['has_valid_dates'], r['has_amount_issue'], r['missing_critical_fields']
    ) for r in results])

    # Update contracts table with denormalized scores
    cursor.executemany("""
        UPDATE contracts SET
            data_quality_score = ?,
            data_quality_grade = ?,
            risk_confidence = ?
        WHERE id = ?
    """, [(
        r['quality_score'], r['quality_grade'], r['risk_confidence'], r['contract_id']
    ) for r in results])

    conn.commit()
    return len(rows)


def aggregate_vendor_quality(conn: sqlite3.Connection) -> None:
    """Calculate aggregated quality metrics for vendors."""
    print("\nAggregating vendor quality scores...")
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE vendors SET
            avg_data_quality_score = (
                SELECT AVG(cq.quality_score)
                FROM contracts c
                JOIN contract_quality cq ON c.id = cq.contract_id
                WHERE c.vendor_id = vendors.id
            ),
            pct_high_quality_contracts = (
                SELECT SUM(CASE WHEN cq.quality_grade IN ('A', 'B') THEN 1 ELSE 0 END) * 100.0 / COUNT(*)
                FROM contracts c
                JOIN contract_quality cq ON c.id = cq.contract_id
                WHERE c.vendor_id = vendors.id
            ),
            data_quality_grade = CASE
                WHEN (SELECT AVG(cq.quality_score) FROM contracts c
                      JOIN contract_quality cq ON c.id = cq.contract_id
                      WHERE c.vendor_id = vendors.id) >= 90 THEN 'A'
                WHEN (SELECT AVG(cq.quality_score) FROM contracts c
                      JOIN contract_quality cq ON c.id = cq.contract_id
                      WHERE c.vendor_id = vendors.id) >= 75 THEN 'B'
                WHEN (SELECT AVG(cq.quality_score) FROM contracts c
                      JOIN contract_quality cq ON c.id = cq.contract_id
                      WHERE c.vendor_id = vendors.id) >= 60 THEN 'C'
                WHEN (SELECT AVG(cq.quality_score) FROM contracts c
                      JOIN contract_quality cq ON c.id = cq.contract_id
                      WHERE c.vendor_id = vendors.id) >= 40 THEN 'D'
                ELSE 'F'
            END
        WHERE id IN (SELECT DISTINCT vendor_id FROM contracts WHERE vendor_id IS NOT NULL)
    """)

    conn.commit()

    # Count updated vendors
    cursor.execute("SELECT COUNT(*) FROM vendors WHERE avg_data_quality_score IS NOT NULL")
    count = cursor.fetchone()[0]
    print(f"  Updated {count} vendors")


def aggregate_institution_quality(conn: sqlite3.Connection) -> None:
    """Calculate aggregated quality metrics for institutions."""
    print("Aggregating institution quality scores...")
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE institutions SET
            avg_data_quality_score = (
                SELECT AVG(cq.quality_score)
                FROM contracts c
                JOIN contract_quality cq ON c.id = cq.contract_id
                WHERE c.institution_id = institutions.id
            ),
            data_quality_grade = CASE
                WHEN (SELECT AVG(cq.quality_score) FROM contracts c
                      JOIN contract_quality cq ON c.id = cq.contract_id
                      WHERE c.institution_id = institutions.id) >= 90 THEN 'A'
                WHEN (SELECT AVG(cq.quality_score) FROM contracts c
                      JOIN contract_quality cq ON c.id = cq.contract_id
                      WHERE c.institution_id = institutions.id) >= 75 THEN 'B'
                WHEN (SELECT AVG(cq.quality_score) FROM contracts c
                      JOIN contract_quality cq ON c.id = cq.contract_id
                      WHERE c.institution_id = institutions.id) >= 60 THEN 'C'
                WHEN (SELECT AVG(cq.quality_score) FROM contracts c
                      JOIN contract_quality cq ON c.id = cq.contract_id
                      WHERE c.institution_id = institutions.id) >= 40 THEN 'D'
                ELSE 'F'
            END
        WHERE id IN (SELECT DISTINCT institution_id FROM contracts WHERE institution_id IS NOT NULL)
    """)

    conn.commit()

    # Count updated institutions
    cursor.execute("SELECT COUNT(*) FROM institutions WHERE avg_data_quality_score IS NOT NULL")
    count = cursor.fetchone()[0]
    print(f"  Updated {count} institutions")


def generate_report(conn: sqlite3.Connection) -> str:
    """Generate quality score distribution report."""
    cursor = conn.cursor()

    report_lines = [
        "# Data Quality Classification Report",
        f"\n**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        ""
    ]

    # Overall distribution by grade
    cursor.execute("""
        SELECT data_quality_grade, COUNT(*),
               ROUND(AVG(data_quality_score), 1),
               COUNT(*) * 100.0 / (SELECT COUNT(*) FROM contracts) as pct
        FROM contracts
        WHERE data_quality_score IS NOT NULL
        GROUP BY data_quality_grade
        ORDER BY data_quality_grade
    """)

    report_lines.append("## Quality Grade Distribution")
    report_lines.append("")
    report_lines.append("| Grade | Count | Avg Score | Percentage |")
    report_lines.append("|-------|-------|-----------|------------|")

    for row in cursor.fetchall():
        grade, count, avg_score, pct = row
        report_lines.append(f"| {grade} | {count:,} | {avg_score} | {pct:.1f}% |")

    # Distribution by structure
    cursor.execute("""
        SELECT source_structure,
               COUNT(*) as count,
               ROUND(AVG(data_quality_score), 1) as avg_score,
               SUM(CASE WHEN data_quality_grade IN ('A', 'B') THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as high_quality_pct
        FROM contracts
        WHERE data_quality_score IS NOT NULL
        GROUP BY source_structure
        ORDER BY source_structure
    """)

    report_lines.append("\n## Quality by Data Structure")
    report_lines.append("")
    report_lines.append("| Structure | Contracts | Avg Score | High Quality % |")
    report_lines.append("|-----------|-----------|-----------|----------------|")

    for row in cursor.fetchall():
        structure, count, avg_score, hq_pct = row
        report_lines.append(f"| {structure or 'N/A'} | {count:,} | {avg_score} | {hq_pct:.1f}% |")

    # Risk confidence distribution
    cursor.execute("""
        SELECT risk_confidence, COUNT(*),
               COUNT(*) * 100.0 / (SELECT COUNT(*) FROM contracts) as pct
        FROM contracts
        WHERE risk_confidence IS NOT NULL
        GROUP BY risk_confidence
        ORDER BY CASE risk_confidence
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            WHEN 'low' THEN 3
        END
    """)

    report_lines.append("\n## Risk Confidence Distribution")
    report_lines.append("")
    report_lines.append("| Confidence | Count | Percentage |")
    report_lines.append("|------------|-------|------------|")

    for row in cursor.fetchall():
        conf, count, pct = row
        report_lines.append(f"| {conf} | {count:,} | {pct:.1f}% |")

    # Vendor quality distribution
    cursor.execute("""
        SELECT data_quality_grade, COUNT(*)
        FROM vendors
        WHERE data_quality_grade IS NOT NULL
        GROUP BY data_quality_grade
        ORDER BY data_quality_grade
    """)

    report_lines.append("\n## Vendor Quality Distribution")
    report_lines.append("")
    report_lines.append("| Grade | Vendors |")
    report_lines.append("|-------|---------|")

    for row in cursor.fetchall():
        grade, count = row
        report_lines.append(f"| {grade} | {count:,} |")

    # Institution quality distribution
    cursor.execute("""
        SELECT data_quality_grade, COUNT(*)
        FROM institutions
        WHERE data_quality_grade IS NOT NULL
        GROUP BY data_quality_grade
        ORDER BY data_quality_grade
    """)

    report_lines.append("\n## Institution Quality Distribution")
    report_lines.append("")
    report_lines.append("| Grade | Institutions |")
    report_lines.append("|-------|--------------|")

    for row in cursor.fetchall():
        grade, count = row
        report_lines.append(f"| {grade} | {count:,} |")

    return "\n".join(report_lines)


# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main():
    """Main entry point."""
    print("=" * 70)
    print("YANG WEN-LI: DATA QUALITY SCORE CALCULATION")
    print("=" * 70)
    print(f"\nDatabase: {DB_PATH}")
    start_time = datetime.now()

    if not os.path.exists(DB_PATH):
        print("ERROR: Database not found!")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 30000")  # 30 second timeout for locks
    conn.execute("PRAGMA journal_mode = WAL")    # Better concurrent access

    try:
        # Step 1: Run migration
        run_migration(conn)

        # Step 2: Seed field profiles
        seed_field_profiles(conn)

        # Step 3: Load vendor RFC map
        vendor_map = get_vendor_rfc_map(conn)

        # Step 4: Get total contract count and already processed count
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM contracts")
        total_contracts = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM contract_quality")
        already_processed = cursor.fetchone()[0]

        if already_processed > 0:
            print(f"\nResuming: {already_processed:,} contracts already processed")
            print(f"Remaining: {total_contracts - already_processed:,} contracts")
        else:
            print(f"\nProcessing {total_contracts:,} contracts...")

        # Step 5: Process contracts in batches
        # Find first unprocessed contract ID to resume
        if already_processed > 0:
            cursor.execute("""
                SELECT MIN(c.id) FROM contracts c
                WHERE c.id NOT IN (SELECT contract_id FROM contract_quality)
            """)
            first_unprocessed = cursor.fetchone()[0]
            if first_unprocessed:
                cursor.execute("SELECT COUNT(*) FROM contracts WHERE id < ?", (first_unprocessed,))
                offset = cursor.fetchone()[0]
            else:
                offset = total_contracts  # All done
        else:
            offset = 0

        processed = already_processed

        while True:
            batch_count = process_contracts_batch(conn, vendor_map, offset, BATCH_SIZE)
            if batch_count == 0:
                break

            processed += batch_count
            offset += BATCH_SIZE

            pct = (processed / total_contracts) * 100
            print(f"  Processed {processed:,} / {total_contracts:,} ({pct:.1f}%)")

        # Step 6: Aggregate to entities
        aggregate_vendor_quality(conn)
        aggregate_institution_quality(conn)

        # Step 7: Generate report
        report = generate_report(conn)

        # Save report
        report_path = os.path.join(BACKEND_DIR, '..', 'DATA_QUALITY_CLASSIFICATION_REPORT.md')
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"\nReport saved to: {report_path}")

        # Print summary
        elapsed = datetime.now() - start_time
        print("\n" + "=" * 70)
        print("DATA QUALITY CALCULATION COMPLETE")
        print("=" * 70)
        print(f"Contracts processed: {processed:,}")
        print(f"Elapsed time: {elapsed}")
        print(f"Rate: {processed / elapsed.total_seconds():.0f} contracts/second")

        # Show grade distribution
        print("\nGrade Distribution:")
        cursor.execute("""
            SELECT data_quality_grade, COUNT(*)
            FROM contracts
            WHERE data_quality_grade IS NOT NULL
            GROUP BY data_quality_grade
            ORDER BY data_quality_grade
        """)
        for row in cursor.fetchall():
            print(f"  Grade {row[0]}: {row[1]:,}")

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    main()
