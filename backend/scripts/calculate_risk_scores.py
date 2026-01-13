"""
RUBLI Risk Scoring: 10-Factor Model + Industry Analysis

Implements IMF CRI-aligned risk scoring methodology with industry classification:

| Factor | Weight | Data Field |
|--------|--------|------------|
| Single bidding | 15% | is_single_bid |
| Non-open procedure | 15% | is_direct_award, procedure_type |
| Price anomaly | 15% | amount_mxn vs sector median |
| Vendor concentration | 10% | vendor's sector share |
| Short ad period | 10% | days_advertised |
| Short decision period | 10% | days_to_award |
| Year-end timing | 5% | is_year_end |
| Contract modification | 10% | (not available in data) |
| Threshold splitting | 5% | same-day/week contracts |
| Network risk | 5% | (requires network analysis) |
| Industry-sector mismatch* | +3% | vendor_classifications |

*Industry-sector mismatch is an ADDITIONAL risk factor (not part of base 100%)
for vendors with verified industry classifications working outside their sector.

Usage:
    python -m scripts.calculate_risk_scores [--batch-size 10000]
"""

import sys
import sqlite3
import argparse
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Database path
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Risk factor weights (sum to 1.0)
WEIGHTS = {
    'single_bid': 0.15,
    'non_open': 0.15,
    'price_anomaly': 0.15,
    'vendor_concentration': 0.10,
    'short_ad_period': 0.10,
    'short_decision': 0.10,
    'year_end': 0.05,
    'modification': 0.10,  # Not available - will be 0
    'threshold_split': 0.05,
    'network_risk': 0.05,  # Not implemented - will be 0
}

# Additional industry-based risk weights (not part of base 100%)
INDUSTRY_WEIGHTS = {
    'industry_mismatch': 0.03,  # Vendor industry doesn't match contract sector
}


def ensure_risk_columns(conn: sqlite3.Connection):
    """Add risk score columns if they don't exist."""
    cursor = conn.cursor()

    # Check existing columns
    cursor.execute("PRAGMA table_info(contracts)")
    existing_cols = {row[1] for row in cursor.fetchall()}

    new_columns = [
        ("risk_score", "REAL DEFAULT 0"),
        ("risk_level", "VARCHAR(20)"),
        ("risk_factors", "TEXT"),  # JSON list of triggered factors
    ]

    for col_name, col_def in new_columns:
        if col_name not in existing_cols:
            print(f"Adding column: {col_name}...")
            cursor.execute(f"ALTER TABLE contracts ADD COLUMN {col_name} {col_def}")

    conn.commit()


def load_vendor_industries(conn: sqlite3.Connection) -> dict:
    """Load verified vendor industry classifications with sector affinities."""
    cursor = conn.cursor()

    print("Loading vendor industry classifications...")

    cursor.execute("""
        SELECT
            vc.vendor_id,
            vc.industry_id,
            vc.industry_code,
            vi.sector_affinity
        FROM vendor_classifications vc
        JOIN vendor_industries vi ON vc.industry_id = vi.id
        WHERE vc.industry_source = 'verified_online'
    """)

    vendor_industries = {}
    for row in cursor.fetchall():
        vendor_id, industry_id, industry_code, sector_affinity = row
        vendor_industries[vendor_id] = {
            'industry_id': industry_id,
            'industry_code': industry_code,
            'sector_affinity': sector_affinity
        }

    print(f"  Loaded {len(vendor_industries):,} verified vendor classifications")
    return vendor_industries


def calculate_sector_stats(conn: sqlite3.Connection) -> dict:
    """Calculate sector-level statistics for price anomaly detection."""
    cursor = conn.cursor()

    print("Calculating sector statistics...")

    # Get sector stats - simplified without median (SQLite limitation)
    cursor.execute("""
        SELECT
            sector_id,
            COUNT(*) as count,
            AVG(amount_mxn) as mean,
            MIN(amount_mxn) as min_val,
            MAX(amount_mxn) as max_val
        FROM contracts
        WHERE amount_mxn > 0 AND sector_id IS NOT NULL
        GROUP BY sector_id
    """)

    stats = {}
    for row in cursor.fetchall():
        sector_id, count, mean, min_val, max_val = row
        if sector_id and mean:
            stats[sector_id] = {
                'count': count,
                'mean': mean,
                # Use 3x mean as upper threshold (simplified approach)
                'upper_threshold': mean * 3
            }

    print(f"  Calculated stats for {len(stats)} sectors")
    return stats


def calculate_vendor_concentration(conn: sqlite3.Connection) -> dict:
    """Calculate vendor concentration by sector."""
    cursor = conn.cursor()

    print("Calculating vendor concentration...")

    cursor.execute("""
        SELECT
            vendor_id,
            sector_id,
            COUNT(*) as contracts,
            SUM(amount_mxn) as total_value
        FROM contracts
        WHERE vendor_id IS NOT NULL AND sector_id IS NOT NULL
        GROUP BY vendor_id, sector_id
    """)

    vendor_sector = defaultdict(dict)
    sector_totals = defaultdict(lambda: {'contracts': 0, 'value': 0})

    for row in cursor.fetchall():
        vendor_id, sector_id, contracts, value = row
        value = value or 0
        vendor_sector[vendor_id][sector_id] = {
            'contracts': contracts,
            'value': value
        }
        sector_totals[sector_id]['contracts'] += contracts
        sector_totals[sector_id]['value'] += value

    # Calculate concentration ratios
    concentration = {}
    for vendor_id, sectors in vendor_sector.items():
        max_concentration = 0
        for sector_id, stats in sectors.items():
            if sector_totals[sector_id]['value'] > 0:
                ratio = stats['value'] / sector_totals[sector_id]['value']
                max_concentration = max(max_concentration, ratio)
        concentration[vendor_id] = max_concentration

    print(f"  Calculated concentration for {len(concentration)} vendors")
    return concentration


def calculate_risk_batch(
    conn: sqlite3.Connection,
    contracts: list[dict],
    sector_stats: dict,
    vendor_concentration: dict,
    vendor_industries: dict = None
) -> list[tuple]:
    """Calculate risk scores for a batch of contracts.

    Args:
        vendor_industries: Dict mapping vendor_id to industry info with sector_affinity
    """
    results = []
    vendor_industries = vendor_industries or {}

    for c in contracts:
        factors = []
        score = 0.0

        # Factor 1: Single Bidding (15%)
        if c.get('is_single_bid'):
            score += WEIGHTS['single_bid']
            factors.append('single_bid')

        # Factor 2: Non-Open Procedure (15%)
        if c.get('is_direct_award'):
            score += WEIGHTS['non_open']
            factors.append('direct_award')
        elif c.get('procedure_type_normalized') == 'invitacion':
            score += WEIGHTS['non_open'] * 0.5  # Partial score for restricted
            factors.append('restricted_procedure')

        # Factor 3: Price Anomaly (15%)
        sector_id = c.get('sector_id')
        amount = c.get('amount_mxn') or 0
        if sector_id in sector_stats and amount > 0:
            threshold = sector_stats[sector_id]['upper_threshold']
            if amount > threshold:
                ratio = min(amount / threshold, 3.0)  # Cap at 3x
                anomaly_score = WEIGHTS['price_anomaly'] * (ratio - 1) / 2
                score += min(anomaly_score, WEIGHTS['price_anomaly'])
                factors.append('price_anomaly')

        # Factor 4: Vendor Concentration (10%)
        vendor_id = c.get('vendor_id')
        if vendor_id in vendor_concentration:
            conc = vendor_concentration[vendor_id]
            if conc > 0.30:  # >30% = high concentration
                score += WEIGHTS['vendor_concentration']
                factors.append('vendor_concentration_high')
            elif conc > 0.20:
                score += WEIGHTS['vendor_concentration'] * 0.7
                factors.append('vendor_concentration_med')
            elif conc > 0.10:
                score += WEIGHTS['vendor_concentration'] * 0.5
                factors.append('vendor_concentration_low')

        # Factor 5: Short Advertisement Period (10%)
        # Not directly available - would need publication_date - close_date
        # Skip for now

        # Factor 6: Short Decision Period (10%)
        # Not directly available - would need bid_close_date - award_date
        # Skip for now

        # Factor 7: Year-End Timing (5%)
        if c.get('is_year_end'):
            score += WEIGHTS['year_end']
            factors.append('year_end')

        # Factor 8: Contract Modification (10%)
        # Not available in current data
        # Skip

        # Factor 9: Threshold Splitting (5%)
        # Would require window analysis - simplified check
        # Skip for now

        # Factor 10: Network Risk (5%)
        # Requires full network analysis
        # Skip for now

        # ADDITIONAL: Industry-Sector Mismatch (+3%)
        # Flags when vendor's verified industry doesn't match contract sector
        vendor_id = c.get('vendor_id')
        if vendor_id in vendor_industries:
            industry_info = vendor_industries[vendor_id]
            expected_sector = industry_info.get('sector_affinity')
            actual_sector = c.get('sector_id')
            # Check if vendor is working outside their expected sector
            if expected_sector and actual_sector and expected_sector != actual_sector:
                score += INDUSTRY_WEIGHTS['industry_mismatch']
                factors.append(f'industry_mismatch:{industry_info["industry_code"]}->s{actual_sector}')

        # Determine risk level
        if score >= 0.6:
            risk_level = 'critical'
        elif score >= 0.4:
            risk_level = 'high'
        elif score >= 0.2:
            risk_level = 'medium'
        else:
            risk_level = 'low'

        results.append((
            c['id'],
            round(score, 4),
            risk_level,
            ','.join(factors) if factors else None
        ))

    return results


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='RUBLI Risk Scoring: 10-Factor Model'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=50000,
        help='Batch size for processing'
    )
    args = parser.parse_args()

    print("=" * 60)
    print("RUBLI Risk Scoring: 10-Factor IMF CRI Model")
    print("=" * 60)

    if not DB_PATH.exists():
        print(f"ERROR: Database not found: {DB_PATH}")
        return 1

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    print(f"\nDatabase: {DB_PATH}")

    # Ensure columns exist
    ensure_risk_columns(conn)

    # Calculate helper statistics
    sector_stats = calculate_sector_stats(conn)
    vendor_concentration = calculate_vendor_concentration(conn)
    vendor_industries = load_vendor_industries(conn)

    # Get total contracts
    cursor.execute("SELECT COUNT(*) FROM contracts")
    total = cursor.fetchone()[0]
    print(f"\nTotal contracts to process: {total:,}")

    # Process in batches
    print(f"\nProcessing in batches of {args.batch_size:,}...")
    start_time = datetime.now()

    processed = 0
    offset = 0

    while offset < total:
        cursor.execute(f"""
            SELECT id, vendor_id, institution_id, sector_id,
                   amount_mxn, is_direct_award, is_single_bid,
                   is_year_end, procedure_type_normalized
            FROM contracts
            ORDER BY id
            LIMIT {args.batch_size} OFFSET {offset}
        """)

        contracts = [dict(zip(
            ['id', 'vendor_id', 'institution_id', 'sector_id',
             'amount_mxn', 'is_direct_award', 'is_single_bid',
             'is_year_end', 'procedure_type_normalized'],
            row
        )) for row in cursor.fetchall()]

        if not contracts:
            break

        # Calculate risk scores
        results = calculate_risk_batch(
            conn, contracts, sector_stats, vendor_concentration, vendor_industries
        )

        # Update database
        cursor.executemany("""
            UPDATE contracts
            SET risk_score = ?, risk_level = ?, risk_factors = ?
            WHERE id = ?
        """, [(r[1], r[2], r[3], r[0]) for r in results])

        conn.commit()

        processed += len(contracts)
        offset += args.batch_size

        elapsed = (datetime.now() - start_time).total_seconds()
        rate = processed / elapsed if elapsed > 0 else 0
        print(f"  Processed {processed:,} / {total:,} ({100*processed/total:.1f}%) - {rate:.0f} contracts/sec")

    # Summary statistics
    print("\n" + "=" * 60)
    print("Risk Scoring Summary:")
    print("=" * 60)

    cursor.execute("""
        SELECT risk_level, COUNT(*) as cnt, SUM(amount_mxn) as value
        FROM contracts
        GROUP BY risk_level
        ORDER BY
            CASE risk_level
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                WHEN 'low' THEN 4
                ELSE 5
            END
    """)

    print(f"\n{'Risk Level':<12} {'Contracts':>12} {'Value (B MXN)':>15} {'%':>8}")
    print("-" * 50)
    for row in cursor.fetchall():
        level, cnt, value = row
        value = value or 0
        pct = 100 * cnt / total
        print(f"{level or 'NULL':<12} {cnt:>12,} {value/1e9:>15,.1f} {pct:>7.1f}%")

    # Top risk factors
    cursor.execute("""
        SELECT risk_factors, COUNT(*) as cnt
        FROM contracts
        WHERE risk_factors IS NOT NULL AND risk_factors != ''
        GROUP BY risk_factors
        ORDER BY cnt DESC
        LIMIT 10
    """)

    print("\nTop Risk Factor Combinations:")
    for row in cursor.fetchall():
        factors, cnt = row
        print(f"  {factors}: {cnt:,}")

    elapsed = (datetime.now() - start_time).total_seconds()
    print(f"\nTotal time: {elapsed:.1f} seconds")
    print(f"Rate: {total/elapsed:.0f} contracts/second")

    conn.close()

    print("\n" + "=" * 60)
    print("Risk scoring complete!")
    print("=" * 60)

    return 0


if __name__ == '__main__':
    sys.exit(main())
