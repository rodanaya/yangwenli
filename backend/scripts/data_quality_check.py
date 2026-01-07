#!/usr/bin/env python3
"""
Data Quality Validation Script for Yang Wen-li ETL Pipeline

Validates the RUBLI_NORMALIZED.db database before committing to ensure
data integrity and fitness for corruption analysis.

Based on:
- OCDS Data Quality Guide
- IMF CRI Methodology
- OCP Red Flags in Public Procurement
- OECD Mexico CompraNet Review

Usage:
    python backend/scripts/data_quality_check.py
"""

import sqlite3
import sys
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Constants
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
REPORT_PATH = Path(__file__).parent.parent.parent / "DATA_QUALITY_REPORT.md"

# Thresholds (from project rules)
MAX_CONTRACT_VALUE = 100_000_000_000  # 100B MXN - should be rejected
FLAG_THRESHOLD = 10_000_000_000       # 10B MXN - should be flagged

# Pass/Fail thresholds
COMPLETENESS_THRESHOLDS = {
    'vendor_id': 1.00,        # 100% required
    'institution_id': 1.00,   # 100% required
    'amount_mxn': 0.99,       # 99% required
    'contract_date': 0.95,    # 95% required
    'procedure_type': 0.95,   # 95% required
}

class DataQualityChecker:
    """Comprehensive data quality validation for COMPRANET procurement data."""

    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.conn = None
        self.results = {
            'completeness': {},
            'consistency': {},
            'validity': {},
            'uniqueness': {},
            'referential_integrity': {},
            'statistical': {},
            'blocking_failures': [],
            'warnings': [],
            'informational': []
        }
        self.total_contracts = 0

    def connect(self):
        """Connect to database."""
        if not self.db_path.exists():
            raise FileNotFoundError(f"Database not found: {self.db_path}")
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row

    def close(self):
        """Close database connection."""
        if self.conn:
            self.conn.close()

    def query(self, sql: str, params: tuple = ()) -> list:
        """Execute query and return results."""
        cursor = self.conn.cursor()
        cursor.execute(sql, params)
        return cursor.fetchall()

    def query_one(self, sql: str, params: tuple = ()):
        """Execute query and return single value."""
        result = self.query(sql, params)
        if result:
            return result[0][0]
        return None

    # =========================================================================
    # COMPLETENESS CHECKS
    # =========================================================================

    def check_completeness(self):
        """Check for NULL/missing values in critical fields."""
        print("\n[1/6] Running Completeness Checks...")

        self.total_contracts = self.query_one("SELECT COUNT(*) FROM contracts")

        checks = [
            ('vendor_id', "SELECT COUNT(*) FROM contracts WHERE vendor_id IS NULL"),
            ('institution_id', "SELECT COUNT(*) FROM contracts WHERE institution_id IS NULL"),
            ('amount_mxn', "SELECT COUNT(*) FROM contracts WHERE amount_mxn IS NULL OR amount_mxn = 0"),
            ('contract_date', "SELECT COUNT(*) FROM contracts WHERE contract_date IS NULL"),
            ('procedure_type', "SELECT COUNT(*) FROM contracts WHERE procedure_type IS NULL OR procedure_type = ''"),
            ('contract_number', "SELECT COUNT(*) FROM contracts WHERE contract_number IS NULL OR contract_number = ''"),
            ('contract_year', "SELECT COUNT(*) FROM contracts WHERE contract_year IS NULL"),
        ]

        for field, sql in checks:
            null_count = self.query_one(sql)
            completeness_rate = 1 - (null_count / self.total_contracts) if self.total_contracts > 0 else 0

            self.results['completeness'][field] = {
                'null_count': null_count,
                'total': self.total_contracts,
                'completeness_rate': completeness_rate,
                'threshold': COMPLETENESS_THRESHOLDS.get(field, 0.90)
            }

            # Check if blocking failure
            if field in ['vendor_id', 'institution_id'] and null_count > 0:
                self.results['blocking_failures'].append(
                    f"BLOCKING: {null_count:,} contracts have NULL {field}"
                )
            elif field in COMPLETENESS_THRESHOLDS:
                if completeness_rate < COMPLETENESS_THRESHOLDS[field]:
                    self.results['warnings'].append(
                        f"WARNING: {field} completeness {completeness_rate:.1%} below threshold {COMPLETENESS_THRESHOLDS[field]:.0%}"
                    )

        print(f"   Total contracts: {self.total_contracts:,}")

    # =========================================================================
    # CONSISTENCY CHECKS
    # =========================================================================

    def check_consistency(self):
        """Check for cross-field consistency issues."""
        print("\n[2/6] Running Consistency Checks...")

        # Date sequence: start_date <= end_date
        date_sequence_violations = self.query_one("""
            SELECT COUNT(*) FROM contracts
            WHERE start_date IS NOT NULL
            AND end_date IS NOT NULL
            AND start_date > end_date
        """)
        self.results['consistency']['date_sequence_violations'] = date_sequence_violations
        if date_sequence_violations > 0:
            self.results['warnings'].append(
                f"WARNING: {date_sequence_violations:,} contracts have start_date > end_date"
            )

        # Contract duration > 10 years
        long_duration = self.query_one("""
            SELECT COUNT(*) FROM contracts
            WHERE start_date IS NOT NULL
            AND end_date IS NOT NULL
            AND julianday(end_date) - julianday(start_date) > 3650
        """)
        self.results['consistency']['long_duration_contracts'] = long_duration
        if long_duration > self.total_contracts * 0.001:  # >0.1%
            self.results['warnings'].append(
                f"WARNING: {long_duration:,} contracts have duration > 10 years"
            )

        # Year consistency: contract_year matches contract_date
        year_mismatch = self.query_one("""
            SELECT COUNT(*) FROM contracts
            WHERE contract_date IS NOT NULL
            AND contract_year IS NOT NULL
            AND CAST(strftime('%Y', contract_date) AS INTEGER) != contract_year
        """)
        year_consistency_rate = 1 - (year_mismatch / self.total_contracts) if self.total_contracts > 0 else 0
        self.results['consistency']['year_mismatch'] = year_mismatch
        self.results['consistency']['year_consistency_rate'] = year_consistency_rate
        if year_consistency_rate < 0.99:
            self.results['warnings'].append(
                f"WARNING: Year consistency {year_consistency_rate:.1%} (threshold: 99%)"
            )

        print(f"   Date sequence violations: {date_sequence_violations:,}")
        print(f"   Long duration contracts (>10yr): {long_duration:,}")
        print(f"   Year mismatches: {year_mismatch:,}")

    # =========================================================================
    # VALIDITY CHECKS
    # =========================================================================

    def check_validity(self):
        """Check domain-specific validity rules."""
        print("\n[3/6] Running Validity Checks...")

        # Amount validation: no values > 100B MXN should exist
        over_max = self.query_one(f"""
            SELECT COUNT(*) FROM contracts
            WHERE amount_mxn > {MAX_CONTRACT_VALUE}
        """)
        self.results['validity']['over_100b_count'] = over_max
        if over_max > 0:
            self.results['blocking_failures'].append(
                f"BLOCKING: {over_max:,} contracts exceed 100B MXN (should have been rejected)"
            )

        # Flagged high-value contracts (10B-100B)
        flagged = self.query_one(f"""
            SELECT COUNT(*) FROM contracts
            WHERE amount_mxn > {FLAG_THRESHOLD}
            AND amount_mxn <= {MAX_CONTRACT_VALUE}
        """)
        self.results['validity']['flagged_high_value'] = flagged
        self.results['informational'].append(
            f"INFO: {flagged:,} contracts between 10B-100B MXN (flagged for review)"
        )

        # Date anomalies: invalid years
        date_anomalies = self.query("""
            SELECT contract_year, COUNT(*) as cnt FROM contracts
            WHERE contract_year < 2002 OR contract_year > 2025
            GROUP BY contract_year
            ORDER BY contract_year
        """)
        self.results['validity']['date_anomalies'] = [
            {'year': r[0], 'count': r[1]} for r in date_anomalies
        ]
        total_anomalous_dates = sum(r[1] for r in date_anomalies)
        if total_anomalous_dates > 0:
            years_list = ', '.join(f"{r[0]} ({r[1]:,})" for r in date_anomalies[:5])
            self.results['warnings'].append(
                f"WARNING: {total_anomalous_dates:,} contracts with invalid years: {years_list}..."
            )

        # Zero amounts check
        zero_amounts = self.query_one("""
            SELECT COUNT(*) FROM contracts WHERE amount_mxn = 0
        """)
        zero_rate = zero_amounts / self.total_contracts if self.total_contracts > 0 else 0
        self.results['validity']['zero_amounts'] = zero_amounts
        self.results['validity']['zero_rate'] = zero_rate
        if zero_rate > 0.01:  # >1%
            self.results['warnings'].append(
                f"WARNING: {zero_rate:.1%} of contracts have zero amounts ({zero_amounts:,})"
            )

        # Negative amounts (should not exist)
        negative_amounts = self.query_one("""
            SELECT COUNT(*) FROM contracts WHERE amount_mxn < 0
        """)
        self.results['validity']['negative_amounts'] = negative_amounts
        if negative_amounts > 0:
            self.results['blocking_failures'].append(
                f"BLOCKING: {negative_amounts:,} contracts have negative amounts"
            )

        print(f"   Over 100B MXN: {over_max:,}")
        print(f"   Flagged 10B-100B: {flagged:,}")
        print(f"   Date anomalies: {total_anomalous_dates:,}")
        print(f"   Zero amounts: {zero_amounts:,} ({zero_rate:.2%})")
        print(f"   Negative amounts: {negative_amounts:,}")

    # =========================================================================
    # UNIQUENESS CHECKS
    # =========================================================================

    def check_uniqueness(self):
        """Check for duplicate records."""
        print("\n[4/6] Running Uniqueness Checks...")

        # Duplicate contracts (same procedure_number, vendor_id, contract_number)
        duplicate_contracts = self.query_one("""
            SELECT COUNT(*) - COUNT(DISTINCT procedure_number || '-' || vendor_id || '-' || COALESCE(contract_number, ''))
            FROM contracts
            WHERE procedure_number IS NOT NULL
        """)
        self.results['uniqueness']['duplicate_contracts'] = duplicate_contracts
        if duplicate_contracts > 0:
            self.results['informational'].append(
                f"INFO: {duplicate_contracts:,} potential duplicate contract records"
            )

        # Vendors with same RFC but different IDs
        duplicate_rfc_vendors = self.query_one("""
            SELECT COUNT(*) FROM (
                SELECT rfc, COUNT(DISTINCT id) as id_count
                FROM vendors
                WHERE rfc IS NOT NULL AND rfc != ''
                GROUP BY rfc
                HAVING COUNT(DISTINCT id) > 1
            )
        """)
        self.results['uniqueness']['duplicate_rfc_vendors'] = duplicate_rfc_vendors
        if duplicate_rfc_vendors > 0:
            self.results['warnings'].append(
                f"WARNING: {duplicate_rfc_vendors:,} RFC values have multiple vendor IDs"
            )

        # Count unique vendors and institutions
        unique_vendors = self.query_one("SELECT COUNT(DISTINCT id) FROM vendors")
        unique_institutions = self.query_one("SELECT COUNT(DISTINCT id) FROM institutions")
        self.results['uniqueness']['unique_vendors'] = unique_vendors
        self.results['uniqueness']['unique_institutions'] = unique_institutions

        print(f"   Potential duplicate contracts: {duplicate_contracts:,}")
        print(f"   Duplicate RFC vendors: {duplicate_rfc_vendors:,}")
        print(f"   Unique vendors: {unique_vendors:,}")
        print(f"   Unique institutions: {unique_institutions:,}")

    # =========================================================================
    # REFERENTIAL INTEGRITY CHECKS
    # =========================================================================

    def check_referential_integrity(self):
        """Check foreign key relationships."""
        print("\n[5/6] Running Referential Integrity Checks...")

        # sector_id references sectors
        invalid_sectors = self.query_one("""
            SELECT COUNT(*) FROM contracts c
            WHERE c.sector_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM sectors s WHERE s.id = c.sector_id)
        """)
        self.results['referential_integrity']['invalid_sector_id'] = invalid_sectors
        if invalid_sectors > 0:
            self.results['blocking_failures'].append(
                f"BLOCKING: {invalid_sectors:,} contracts reference invalid sector_id"
            )

        # vendor_id references vendors
        invalid_vendors = self.query_one("""
            SELECT COUNT(*) FROM contracts c
            WHERE c.vendor_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM vendors v WHERE v.id = c.vendor_id)
        """)
        self.results['referential_integrity']['invalid_vendor_id'] = invalid_vendors
        if invalid_vendors > 0:
            self.results['blocking_failures'].append(
                f"BLOCKING: {invalid_vendors:,} contracts reference invalid vendor_id"
            )

        # institution_id references institutions
        invalid_institutions = self.query_one("""
            SELECT COUNT(*) FROM contracts c
            WHERE c.institution_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM institutions i WHERE i.id = c.institution_id)
        """)
        self.results['referential_integrity']['invalid_institution_id'] = invalid_institutions
        if invalid_institutions > 0:
            self.results['blocking_failures'].append(
                f"BLOCKING: {invalid_institutions:,} contracts reference invalid institution_id"
            )

        # ramo_id references ramos (NULL allowed)
        invalid_ramos = self.query_one("""
            SELECT COUNT(*) FROM contracts c
            WHERE c.ramo_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM ramos r WHERE r.id = c.ramo_id)
        """)
        self.results['referential_integrity']['invalid_ramo_id'] = invalid_ramos
        if invalid_ramos > 0:
            self.results['warnings'].append(
                f"WARNING: {invalid_ramos:,} contracts reference invalid ramo_id"
            )

        print(f"   Invalid sector_id: {invalid_sectors:,}")
        print(f"   Invalid vendor_id: {invalid_vendors:,}")
        print(f"   Invalid institution_id: {invalid_institutions:,}")
        print(f"   Invalid ramo_id: {invalid_ramos:,}")

    # =========================================================================
    # STATISTICAL ANOMALY DETECTION
    # =========================================================================

    def check_statistical_anomalies(self):
        """Check for statistical anomalies in distributions."""
        print("\n[6/6] Running Statistical Anomaly Detection...")

        # Direct award rate
        direct_awards = self.query_one("""
            SELECT COUNT(*) FROM contracts WHERE is_direct_award = 1
        """)
        direct_award_rate = direct_awards / self.total_contracts if self.total_contracts > 0 else 0
        self.results['statistical']['direct_award_count'] = direct_awards
        self.results['statistical']['direct_award_rate'] = direct_award_rate
        if direct_award_rate > 0.80:
            self.results['warnings'].append(
                f"WARNING: Direct award rate {direct_award_rate:.1%} exceeds 80% threshold"
            )
        elif direct_award_rate < 0.50:
            self.results['warnings'].append(
                f"WARNING: Direct award rate {direct_award_rate:.1%} below 50% (unusual)"
            )

        # Single bid rate (of competitive procedures)
        competitive_count = self.query_one("""
            SELECT COUNT(*) FROM contracts WHERE is_direct_award = 0
        """)
        single_bid_count = self.query_one("""
            SELECT COUNT(*) FROM contracts WHERE is_single_bid = 1
        """)
        single_bid_rate = single_bid_count / competitive_count if competitive_count > 0 else 0
        self.results['statistical']['competitive_count'] = competitive_count
        self.results['statistical']['single_bid_count'] = single_bid_count
        self.results['statistical']['single_bid_rate'] = single_bid_rate
        if single_bid_rate > 0.50:
            self.results['warnings'].append(
                f"WARNING: Single bid rate {single_bid_rate:.1%} of competitive procedures exceeds 50%"
            )

        # Year-end concentration (December contracts)
        december_contracts = self.query_one("""
            SELECT COUNT(*) FROM contracts
            WHERE contract_date IS NOT NULL
            AND strftime('%m', contract_date) = '12'
        """)
        contracts_with_date = self.query_one("""
            SELECT COUNT(*) FROM contracts WHERE contract_date IS NOT NULL
        """)
        december_rate = december_contracts / contracts_with_date if contracts_with_date > 0 else 0
        self.results['statistical']['december_contracts'] = december_contracts
        self.results['statistical']['december_rate'] = december_rate
        # Expected ~8.3% if uniform; flag if >25%
        if december_rate > 0.25:
            self.results['warnings'].append(
                f"WARNING: December concentration {december_rate:.1%} exceeds 25% threshold"
            )

        # Sector distribution (check for "otros" dominance)
        sector_distribution = self.query("""
            SELECT s.name_es, COUNT(*) as cnt,
                   ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM contracts), 2) as pct
            FROM contracts c
            JOIN sectors s ON c.sector_id = s.id
            GROUP BY s.name_es
            ORDER BY cnt DESC
        """)
        self.results['statistical']['sector_distribution'] = [
            {'sector': r[0], 'count': r[1], 'percentage': r[2]} for r in sector_distribution
        ]
        if sector_distribution and sector_distribution[0][2] > 60:
            self.results['informational'].append(
                f"INFO: '{sector_distribution[0][0]}' sector dominates at {sector_distribution[0][2]:.1f}%"
            )

        # Top vendor concentration
        top_vendors = self.query("""
            SELECT v.name, COUNT(*) as contract_count,
                   SUM(c.amount_mxn) as total_value
            FROM contracts c
            JOIN vendors v ON c.vendor_id = v.id
            GROUP BY v.id, v.name
            ORDER BY total_value DESC
            LIMIT 10
        """)
        total_value = self.query_one("SELECT SUM(amount_mxn) FROM contracts")
        top_10_value = sum(r[2] or 0 for r in top_vendors)
        top_10_concentration = top_10_value / total_value if total_value > 0 else 0
        self.results['statistical']['top_10_concentration'] = top_10_concentration
        self.results['statistical']['top_vendors'] = [
            {'name': r[0][:50], 'contracts': r[1], 'value': r[2]} for r in top_vendors
        ]
        if top_10_concentration > 0.15:
            self.results['warnings'].append(
                f"WARNING: Top 10 vendors control {top_10_concentration:.1%} of value (>15%)"
            )

        print(f"   Direct award rate: {direct_award_rate:.1%}")
        print(f"   Single bid rate (competitive): {single_bid_rate:.1%}")
        print(f"   December concentration: {december_rate:.1%}")
        print(f"   Top 10 vendor concentration: {top_10_concentration:.1%}")

    # =========================================================================
    # REPORT GENERATION
    # =========================================================================

    def generate_report(self) -> str:
        """Generate markdown report of all findings."""
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        report = []
        report.append("# Data Quality Validation Report")
        report.append(f"\n**Generated:** {now}")
        report.append(f"**Database:** `{self.db_path}`")
        report.append(f"**Total Contracts:** {self.total_contracts:,}")
        report.append("")

        # Pass/Fail Summary
        report.append("---")
        report.append("## Pass/Fail Summary")
        report.append("")

        if self.results['blocking_failures']:
            report.append("### BLOCKING FAILURES")
            for failure in self.results['blocking_failures']:
                report.append(f"- {failure}")
            report.append("")

        if self.results['warnings']:
            report.append("### WARNINGS")
            for warning in self.results['warnings']:
                report.append(f"- {warning}")
            report.append("")

        if self.results['informational']:
            report.append("### INFORMATIONAL")
            for info in self.results['informational']:
                report.append(f"- {info}")
            report.append("")

        # Completeness
        report.append("---")
        report.append("## 1. Completeness Checks")
        report.append("")
        report.append("| Field | Null/Missing | Total | Rate | Threshold | Status |")
        report.append("|-------|-------------|-------|------|-----------|--------|")
        for field, data in self.results['completeness'].items():
            rate = data['completeness_rate']
            threshold = data['threshold']
            status = "PASS" if rate >= threshold else "FAIL"
            report.append(
                f"| {field} | {data['null_count']:,} | {data['total']:,} | "
                f"{rate:.2%} | {threshold:.0%} | {status} |"
            )
        report.append("")

        # Consistency
        report.append("---")
        report.append("## 2. Consistency Checks")
        report.append("")
        report.append("| Check | Value | Status |")
        report.append("|-------|-------|--------|")
        report.append(f"| Date sequence violations (start > end) | {self.results['consistency'].get('date_sequence_violations', 0):,} | {'FAIL' if self.results['consistency'].get('date_sequence_violations', 0) > 0 else 'PASS'} |")
        report.append(f"| Long duration (>10 years) | {self.results['consistency'].get('long_duration_contracts', 0):,} | INFO |")
        report.append(f"| Year mismatches | {self.results['consistency'].get('year_mismatch', 0):,} | {'WARN' if self.results['consistency'].get('year_mismatch', 0) > 0 else 'PASS'} |")
        report.append("")

        # Validity
        report.append("---")
        report.append("## 3. Validity Checks")
        report.append("")
        report.append("| Check | Value | Status |")
        report.append("|-------|-------|--------|")
        report.append(f"| Contracts > 100B MXN | {self.results['validity'].get('over_100b_count', 0):,} | {'FAIL' if self.results['validity'].get('over_100b_count', 0) > 0 else 'PASS'} |")
        report.append(f"| Flagged 10B-100B MXN | {self.results['validity'].get('flagged_high_value', 0):,} | INFO |")
        report.append(f"| Zero amounts | {self.results['validity'].get('zero_amounts', 0):,} ({self.results['validity'].get('zero_rate', 0):.2%}) | {'WARN' if self.results['validity'].get('zero_rate', 0) > 0.01 else 'PASS'} |")
        report.append(f"| Negative amounts | {self.results['validity'].get('negative_amounts', 0):,} | {'FAIL' if self.results['validity'].get('negative_amounts', 0) > 0 else 'PASS'} |")
        report.append("")

        if self.results['validity'].get('date_anomalies'):
            report.append("### Date Anomalies (Invalid Years)")
            report.append("")
            report.append("| Year | Count |")
            report.append("|------|-------|")
            for anomaly in self.results['validity']['date_anomalies']:
                report.append(f"| {anomaly['year']} | {anomaly['count']:,} |")
            report.append("")

        # Uniqueness
        report.append("---")
        report.append("## 4. Uniqueness Checks")
        report.append("")
        report.append("| Check | Value |")
        report.append("|-------|-------|")
        report.append(f"| Unique vendors | {self.results['uniqueness'].get('unique_vendors', 0):,} |")
        report.append(f"| Unique institutions | {self.results['uniqueness'].get('unique_institutions', 0):,} |")
        report.append(f"| Duplicate RFC vendors | {self.results['uniqueness'].get('duplicate_rfc_vendors', 0):,} |")
        report.append(f"| Potential duplicate contracts | {self.results['uniqueness'].get('duplicate_contracts', 0):,} |")
        report.append("")

        # Referential Integrity
        report.append("---")
        report.append("## 5. Referential Integrity")
        report.append("")
        report.append("| Foreign Key | Invalid References | Status |")
        report.append("|-------------|-------------------|--------|")
        for fk in ['sector_id', 'vendor_id', 'institution_id', 'ramo_id']:
            key = f'invalid_{fk}'
            count = self.results['referential_integrity'].get(key, 0)
            status = 'PASS' if count == 0 else ('FAIL' if fk in ['sector_id', 'vendor_id', 'institution_id'] else 'WARN')
            report.append(f"| {fk} | {count:,} | {status} |")
        report.append("")

        # Statistical Anomalies
        report.append("---")
        report.append("## 6. Statistical Anomaly Detection")
        report.append("")
        report.append("### Procurement Patterns")
        report.append("")
        report.append("| Metric | Value | Expected | Status |")
        report.append("|--------|-------|----------|--------|")

        da_rate = self.results['statistical'].get('direct_award_rate', 0)
        da_status = 'PASS' if 0.50 <= da_rate <= 0.80 else 'WARN'
        report.append(f"| Direct award rate | {da_rate:.1%} | 60-75% | {da_status} |")

        sb_rate = self.results['statistical'].get('single_bid_rate', 0)
        sb_status = 'PASS' if sb_rate <= 0.50 else 'WARN'
        report.append(f"| Single bid rate (competitive) | {sb_rate:.1%} | <50% | {sb_status} |")

        dec_rate = self.results['statistical'].get('december_rate', 0)
        dec_status = 'PASS' if dec_rate <= 0.25 else 'WARN'
        report.append(f"| December concentration | {dec_rate:.1%} | <25% | {dec_status} |")

        top10 = self.results['statistical'].get('top_10_concentration', 0)
        top10_status = 'PASS' if top10 <= 0.15 else 'WARN'
        report.append(f"| Top 10 vendor concentration | {top10:.1%} | <15% | {top10_status} |")
        report.append("")

        # Sector Distribution
        if self.results['statistical'].get('sector_distribution'):
            report.append("### Sector Distribution")
            report.append("")
            report.append("| Sector | Contracts | Percentage |")
            report.append("|--------|-----------|------------|")
            for sector in self.results['statistical']['sector_distribution']:
                report.append(f"| {sector['sector']} | {sector['count']:,} | {sector['percentage']:.1f}% |")
            report.append("")

        # Top Vendors
        if self.results['statistical'].get('top_vendors'):
            report.append("### Top 10 Vendors by Value")
            report.append("")
            report.append("| Vendor | Contracts | Value (MXN) |")
            report.append("|--------|-----------|-------------|")
            for vendor in self.results['statistical']['top_vendors']:
                value = vendor['value'] or 0
                report.append(f"| {vendor['name'][:40]}... | {vendor['contracts']:,} | ${value:,.0f} |")
            report.append("")

        # Final Assessment
        report.append("---")
        report.append("## Final Assessment")
        report.append("")

        if self.results['blocking_failures']:
            report.append("### FAIL - DO NOT COMMIT")
            report.append("")
            report.append("The following blocking issues must be resolved:")
            for failure in self.results['blocking_failures']:
                report.append(f"- {failure}")
        else:
            report.append("### PASS - OK TO COMMIT")
            report.append("")
            report.append("All blocking criteria have been met. The database is ready for commit.")
            if self.results['warnings']:
                report.append("")
                report.append("**Note:** There are warnings that should be reviewed but are not blocking:")
                for warning in self.results['warnings']:
                    report.append(f"- {warning}")

        report.append("")
        report.append("---")
        report.append("")
        report.append("*Report generated by data_quality_check.py based on OCDS, IMF CRI, and OCP standards.*")

        return '\n'.join(report)

    def run_all_checks(self) -> bool:
        """Run all data quality checks and return pass/fail status."""
        print("=" * 60)
        print("DATA QUALITY VALIDATION")
        print("=" * 60)
        print(f"Database: {self.db_path}")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        try:
            self.connect()

            self.check_completeness()
            self.check_consistency()
            self.check_validity()
            self.check_uniqueness()
            self.check_referential_integrity()
            self.check_statistical_anomalies()

            # Generate report
            report = self.generate_report()

            # Write report to file
            with open(REPORT_PATH, 'w', encoding='utf-8') as f:
                f.write(report)

            print("\n" + "=" * 60)
            print("SUMMARY")
            print("=" * 60)

            if self.results['blocking_failures']:
                print("\nFAIL - Blocking issues found:")
                for failure in self.results['blocking_failures']:
                    print(f"  - {failure}")
                print(f"\nReport written to: {REPORT_PATH}")
                return False
            else:
                print("\nPASS - All blocking criteria met")
                if self.results['warnings']:
                    print(f"\nWarnings ({len(self.results['warnings'])}):")
                    for warning in self.results['warnings'][:5]:
                        print(f"  - {warning}")
                    if len(self.results['warnings']) > 5:
                        print(f"  ... and {len(self.results['warnings']) - 5} more")
                print(f"\nReport written to: {REPORT_PATH}")
                return True

        finally:
            self.close()


def main():
    """Main entry point."""
    checker = DataQualityChecker(DB_PATH)
    passed = checker.run_all_checks()
    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
