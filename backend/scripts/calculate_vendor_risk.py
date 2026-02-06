"""
Vendor Risk Score Calculation (v1.0.0)

Calculates 10-dimension vendor risk profiles based on historical patterns.
Aligned with ARACHNE and OCDS frameworks.

Dimensions:
1. Win Rate Anomaly (12%) - Unusually high win rate vs sector
2. Single-Bid Dependency (15%) - Reliance on single-bid contracts
3. Client Concentration (10%) - Over-reliance on few institutions
4. Sector Mismatch (8%) - Winning outside core competency
5. Growth Anomaly (10%) - Unusual growth patterns
6. Network Centrality (15%) - Co-bidding network risk
7. New Vendor Large Wins (10%) - New vendors winning large contracts
8. Direct Award Ratio (10%) - Reliance on non-competitive procedures
9. Co-bidding Concentration (10%) - Suspicious bidding patterns

Usage:
    python -m backend.scripts.calculate_vendor_risk [--sample N] [--vendor-id ID]
"""

import sqlite3
import argparse
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database path
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Amount validation
MAX_CONTRACT_VALUE = 100_000_000_000  # 100B MXN

# =============================================================================
# VENDOR RISK WEIGHTS (10-dimension model)
# =============================================================================

VENDOR_RISK_WEIGHTS = {
    'win_rate_anomaly': 0.12,       # 12% - Unusually high win rate
    'single_bid_dependency': 0.15,  # 15% - Reliance on single-bid contracts
    'client_concentration': 0.10,   # 10% - Over-reliance on few institutions
    'sector_mismatch': 0.08,        # 8% - Winning outside core competency
    'growth_anomaly': 0.10,         # 10% - Unusual growth patterns
    'network_centrality': 0.15,     # 15% - Co-bidding network risk
    'new_vendor_large_wins': 0.10,  # 10% - New vendors winning large contracts
    'direct_award_ratio': 0.10,     # 10% - Reliance on non-competitive procedures
    'cobidding_concentration': 0.10, # 10% - Suspicious bidding patterns
}

# Thresholds for risk scoring
THRESHOLDS = {
    'win_rate': {
        'high': 0.90,   # 90%+ win rate = high risk
        'medium': 0.70, # 70%+ = medium risk
    },
    'single_bid': {
        'high': 0.60,   # 60%+ single-bid = high risk
        'medium': 0.30, # 30%+ = medium risk
    },
    'client_concentration': {
        'high': 0.80,   # 80%+ from top client = high risk
        'medium': 0.50, # 50%+ = medium risk
    },
    'direct_award': {
        'high': 0.90,   # 90%+ direct awards = high risk
        'medium': 0.60, # 60%+ = medium risk
    },
    'growth_rate': {
        'high': 5.0,    # 5x year-over-year = high risk
        'medium': 2.0,  # 2x = medium risk
    },
    'new_vendor_threshold': 2,  # Years to be considered "new"
    'large_contract_percentile': 0.90,  # Top 10% = large contract
}


def get_connection() -> sqlite3.Connection:
    """Get database connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_vendor_risk_columns(conn: sqlite3.Connection):
    """Add vendor risk columns to vendor_stats if they don't exist."""
    cursor = conn.cursor()

    # Check if columns exist
    cursor.execute("PRAGMA table_info(vendor_stats)")
    existing_columns = {row['name'] for row in cursor.fetchall()}

    columns_to_add = [
        ('vendor_risk_score', 'REAL'),
        ('vendor_risk_factors', 'TEXT'),
        ('win_rate', 'REAL'),
        ('single_bid_rate', 'REAL'),
        ('client_concentration_rate', 'REAL'),
        ('sector_mismatch_flag', 'INTEGER'),
        ('growth_anomaly_flag', 'INTEGER'),
        ('network_centrality_score', 'REAL'),
        ('is_new_vendor', 'INTEGER'),
        ('cobidding_concentration', 'REAL'),
        ('vendor_risk_calculated_at', 'TEXT'),
    ]

    for col_name, col_type in columns_to_add:
        if col_name not in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE vendor_stats ADD COLUMN {col_name} {col_type}")
                logger.info(f"Added column {col_name} to vendor_stats")
            except sqlite3.OperationalError:
                pass  # Column might already exist

    conn.commit()


def calculate_sector_baselines(conn: sqlite3.Connection) -> Dict:
    """Calculate sector-level baselines for comparison."""
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            c.sector_id,
            AVG(CASE WHEN c.is_single_bid = 1 THEN 1.0 ELSE 0.0 END) as avg_single_bid_rate,
            AVG(CASE WHEN c.is_direct_award = 1 THEN 1.0 ELSE 0.0 END) as avg_direct_award_rate,
            AVG(c.amount_mxn) as avg_contract_value
        FROM contracts c
        WHERE c.amount_mxn <= ?
        AND c.amount_mxn > 0
        GROUP BY c.sector_id
    """, (MAX_CONTRACT_VALUE,))

    baselines = {}
    for row in cursor.fetchall():
        baselines[row['sector_id']] = {
            'single_bid_rate': row['avg_single_bid_rate'] or 0,
            'direct_award_rate': row['avg_direct_award_rate'] or 0,
            'avg_contract_value': row['avg_contract_value'] or 0,
        }

    return baselines


def calculate_win_rate_score(win_rate: float, bids_participated: int) -> float:
    """
    Calculate win rate anomaly score.

    High win rates in competitive procedures are suspicious.
    Only meaningful with sufficient bid history.
    """
    if bids_participated < 5:
        return 0.0  # Not enough data

    if win_rate >= THRESHOLDS['win_rate']['high']:
        return 1.0
    elif win_rate >= THRESHOLDS['win_rate']['medium']:
        # Linear interpolation between medium and high
        return (win_rate - THRESHOLDS['win_rate']['medium']) / \
               (THRESHOLDS['win_rate']['high'] - THRESHOLDS['win_rate']['medium'])
    return 0.0


def calculate_single_bid_score(single_bid_rate: float, total_contracts: int) -> float:
    """Calculate single-bid dependency score."""
    if total_contracts < 3:
        return 0.0

    if single_bid_rate >= THRESHOLDS['single_bid']['high']:
        return 1.0
    elif single_bid_rate >= THRESHOLDS['single_bid']['medium']:
        return (single_bid_rate - THRESHOLDS['single_bid']['medium']) / \
               (THRESHOLDS['single_bid']['high'] - THRESHOLDS['single_bid']['medium'])
    return 0.0


def calculate_client_concentration_score(top_client_pct: float) -> float:
    """Calculate client concentration risk score."""
    if top_client_pct >= THRESHOLDS['client_concentration']['high']:
        return 1.0
    elif top_client_pct >= THRESHOLDS['client_concentration']['medium']:
        return (top_client_pct - THRESHOLDS['client_concentration']['medium']) / \
               (THRESHOLDS['client_concentration']['high'] - THRESHOLDS['client_concentration']['medium'])
    return 0.0


def calculate_direct_award_score(direct_award_rate: float) -> float:
    """Calculate direct award dependency score."""
    if direct_award_rate >= THRESHOLDS['direct_award']['high']:
        return 1.0
    elif direct_award_rate >= THRESHOLDS['direct_award']['medium']:
        return (direct_award_rate - THRESHOLDS['direct_award']['medium']) / \
               (THRESHOLDS['direct_award']['high'] - THRESHOLDS['direct_award']['medium'])
    return 0.0


def calculate_growth_anomaly_score(yoy_growth: float) -> float:
    """Calculate growth anomaly score."""
    if yoy_growth is None:
        return 0.0

    if yoy_growth >= THRESHOLDS['growth_rate']['high']:
        return 1.0
    elif yoy_growth >= THRESHOLDS['growth_rate']['medium']:
        return (yoy_growth - THRESHOLDS['growth_rate']['medium']) / \
               (THRESHOLDS['growth_rate']['high'] - THRESHOLDS['growth_rate']['medium'])
    return 0.0


def calculate_new_vendor_large_wins_score(
    is_new: bool,
    large_contract_count: int,
    total_contracts: int
) -> float:
    """
    Calculate score for new vendors winning large contracts.

    Shell companies often appear suddenly and win large contracts.
    """
    if not is_new or total_contracts == 0:
        return 0.0

    large_ratio = large_contract_count / total_contracts
    if large_ratio >= 0.5:  # 50%+ are large contracts
        return 1.0
    elif large_ratio >= 0.2:  # 20%+
        return large_ratio / 0.5
    return 0.0


def get_vendor_metrics(conn: sqlite3.Connection, vendor_id: int) -> Optional[Dict]:
    """Get comprehensive metrics for a single vendor."""
    cursor = conn.cursor()

    # Basic metrics from contracts
    cursor.execute("""
        SELECT
            COUNT(*) as total_contracts,
            SUM(amount_mxn) as total_value,
            AVG(amount_mxn) as avg_value,
            MIN(contract_year) as first_year,
            MAX(contract_year) as last_year,
            SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) as single_bid_count,
            SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) as direct_award_count,
            COUNT(DISTINCT institution_id) as unique_institutions,
            COUNT(DISTINCT sector_id) as unique_sectors
        FROM contracts
        WHERE vendor_id = ?
        AND (amount_mxn IS NULL OR amount_mxn <= ?)
    """, (vendor_id, MAX_CONTRACT_VALUE))

    row = cursor.fetchone()
    if not row or row['total_contracts'] == 0:
        return None

    metrics = {
        'vendor_id': vendor_id,
        'total_contracts': row['total_contracts'],
        'total_value': row['total_value'] or 0,
        'avg_value': row['avg_value'] or 0,
        'first_year': row['first_year'],
        'last_year': row['last_year'],
        'single_bid_count': row['single_bid_count'] or 0,
        'direct_award_count': row['direct_award_count'] or 0,
        'unique_institutions': row['unique_institutions'] or 0,
        'unique_sectors': row['unique_sectors'] or 0,
    }

    # Calculate rates
    metrics['single_bid_rate'] = metrics['single_bid_count'] / metrics['total_contracts']
    metrics['direct_award_rate'] = metrics['direct_award_count'] / metrics['total_contracts']

    # Client concentration (top institution share)
    cursor.execute("""
        SELECT
            institution_id,
            COUNT(*) as contract_count,
            COUNT(*) * 1.0 / ? as share
        FROM contracts
        WHERE vendor_id = ?
        AND (amount_mxn IS NULL OR amount_mxn <= ?)
        GROUP BY institution_id
        ORDER BY contract_count DESC
        LIMIT 1
    """, (metrics['total_contracts'], vendor_id, MAX_CONTRACT_VALUE))

    top_client = cursor.fetchone()
    metrics['top_client_share'] = top_client['share'] if top_client else 0

    # Check if new vendor (first contract within threshold years)
    current_year = datetime.now().year
    years_active = current_year - (metrics['first_year'] or current_year)
    metrics['is_new_vendor'] = years_active <= THRESHOLDS['new_vendor_threshold']

    # Large contracts (above 90th percentile for their sector)
    cursor.execute("""
        SELECT COUNT(*) as large_count
        FROM contracts c
        WHERE c.vendor_id = ?
        AND c.amount_mxn > (
            SELECT amount_mxn FROM contracts
            WHERE sector_id = c.sector_id
            AND amount_mxn <= ?
            ORDER BY amount_mxn DESC
            LIMIT 1 OFFSET (
                SELECT CAST(COUNT(*) * 0.1 AS INTEGER)
                FROM contracts
                WHERE sector_id = c.sector_id
                AND amount_mxn <= ?
            )
        )
    """, (vendor_id, MAX_CONTRACT_VALUE, MAX_CONTRACT_VALUE))

    large_row = cursor.fetchone()
    metrics['large_contract_count'] = large_row['large_count'] if large_row else 0

    # Year-over-year growth (compare last 2 years)
    if metrics['last_year'] and metrics['last_year'] > 2020:
        cursor.execute("""
            SELECT
                SUM(CASE WHEN contract_year = ? THEN amount_mxn ELSE 0 END) as last_year_value,
                SUM(CASE WHEN contract_year = ? - 1 THEN amount_mxn ELSE 0 END) as prev_year_value
            FROM contracts
            WHERE vendor_id = ?
            AND contract_year >= ? - 1
            AND (amount_mxn IS NULL OR amount_mxn <= ?)
        """, (metrics['last_year'], metrics['last_year'], vendor_id,
              metrics['last_year'], MAX_CONTRACT_VALUE))

        growth_row = cursor.fetchone()
        if growth_row and growth_row['prev_year_value'] and growth_row['prev_year_value'] > 0:
            metrics['yoy_growth'] = growth_row['last_year_value'] / growth_row['prev_year_value']
        else:
            metrics['yoy_growth'] = None
    else:
        metrics['yoy_growth'] = None

    # Sector mismatch (check vendor classification vs contracts)
    cursor.execute("""
        SELECT vc.sector_affinity
        FROM vendor_classifications vc
        WHERE vc.vendor_id = ?
    """, (vendor_id,))

    classification_row = cursor.fetchone()
    if classification_row and classification_row['sector_affinity']:
        # Get primary sector from contracts
        cursor.execute("""
            SELECT sector_id, COUNT(*) as cnt
            FROM contracts
            WHERE vendor_id = ?
            GROUP BY sector_id
            ORDER BY cnt DESC
            LIMIT 1
        """, (vendor_id,))

        primary_sector_row = cursor.fetchone()
        if primary_sector_row:
            metrics['sector_mismatch'] = (
                primary_sector_row['sector_id'] != classification_row['sector_affinity']
            )
        else:
            metrics['sector_mismatch'] = False
    else:
        metrics['sector_mismatch'] = False

    # Network centrality (co-bidding connections)
    cursor.execute("""
        SELECT COUNT(DISTINCT c2.vendor_id) as co_bidders
        FROM contracts c1
        JOIN contracts c2 ON c1.procedure_number = c2.procedure_number
            AND c1.vendor_id != c2.vendor_id
        WHERE c1.vendor_id = ?
        AND c1.procedure_number IS NOT NULL
        AND c1.procedure_number != ''
    """, (vendor_id,))

    network_row = cursor.fetchone()
    metrics['co_bidder_count'] = network_row['co_bidders'] if network_row else 0

    # Co-bidding concentration (always bid with same vendors)
    if metrics['co_bidder_count'] > 0:
        cursor.execute("""
            SELECT
                c2.vendor_id as co_bidder,
                COUNT(*) as shared_procedures
            FROM contracts c1
            JOIN contracts c2 ON c1.procedure_number = c2.procedure_number
                AND c1.vendor_id != c2.vendor_id
            WHERE c1.vendor_id = ?
            AND c1.procedure_number IS NOT NULL
            GROUP BY c2.vendor_id
            ORDER BY shared_procedures DESC
            LIMIT 1
        """, (vendor_id,))

        top_co_bidder = cursor.fetchone()
        if top_co_bidder:
            # How many procedures did this vendor participate in?
            cursor.execute("""
                SELECT COUNT(DISTINCT procedure_number) as proc_count
                FROM contracts
                WHERE vendor_id = ?
                AND procedure_number IS NOT NULL
            """, (vendor_id,))
            proc_row = cursor.fetchone()
            total_procedures = proc_row['proc_count'] if proc_row else 1
            metrics['cobidding_concentration'] = top_co_bidder['shared_procedures'] / max(total_procedures, 1)
        else:
            metrics['cobidding_concentration'] = 0
    else:
        metrics['cobidding_concentration'] = 0

    return metrics


def calculate_vendor_risk_score(metrics: Dict) -> Tuple[float, List[str]]:
    """
    Calculate comprehensive vendor risk score from metrics.

    Returns (risk_score, list_of_triggered_factors).
    """
    score = 0.0
    factors = []

    # 1. Win rate anomaly
    # Each contract in COMPRANET is an award (a win). Win rate = contracts won by
    # vendor in competitive procedures / total unique competitive procedures they
    # participated in. Since all records are wins, a vendor appearing in many
    # unique competitive procedures with high contract count has a high win rate.
    competitive_contracts = metrics['total_contracts'] - metrics['single_bid_count'] - metrics['direct_award_count']
    total_contracts = metrics['total_contracts']
    if total_contracts >= 5:
        # Win rate proxy: non-direct, non-single-bid contracts as share of total
        # A very high ratio means they win almost every competitive procedure
        estimated_win_rate = total_contracts / max(total_contracts + competitive_contracts * 0.3, 1)
        # Also factor in single-bid rate: high single-bid = inflated win rate
        if metrics['single_bid_rate'] > 0.5:
            estimated_win_rate = min(estimated_win_rate + metrics['single_bid_rate'] * 0.2, 1.0)
        win_score = calculate_win_rate_score(estimated_win_rate, total_contracts)
        score += win_score * VENDOR_RISK_WEIGHTS['win_rate_anomaly']
        if win_score > 0.5:
            factors.append(f'win_rate:{estimated_win_rate:.2f}')

    # 2. Single-bid dependency
    single_bid_score = calculate_single_bid_score(
        metrics['single_bid_rate'],
        metrics['total_contracts']
    )
    score += single_bid_score * VENDOR_RISK_WEIGHTS['single_bid_dependency']
    if single_bid_score > 0.5:
        factors.append(f'single_bid:{metrics["single_bid_rate"]:.2f}')

    # 3. Client concentration
    client_score = calculate_client_concentration_score(metrics['top_client_share'])
    score += client_score * VENDOR_RISK_WEIGHTS['client_concentration']
    if client_score > 0.5:
        factors.append(f'client_conc:{metrics["top_client_share"]:.2f}')

    # 4. Sector mismatch
    if metrics['sector_mismatch']:
        score += 1.0 * VENDOR_RISK_WEIGHTS['sector_mismatch']
        factors.append('sector_mismatch')

    # 5. Growth anomaly
    growth_score = calculate_growth_anomaly_score(metrics.get('yoy_growth'))
    score += growth_score * VENDOR_RISK_WEIGHTS['growth_anomaly']
    if growth_score > 0.5:
        factors.append(f'growth:{metrics.get("yoy_growth", 0):.1f}x')

    # 6. Network centrality (low co-bidder count = potentially isolated/suspicious)
    # High network centrality can also be suspicious (hub in collusion ring)
    network_score = 0.0
    if metrics['co_bidder_count'] == 0 and metrics['total_contracts'] > 10:
        # No co-bidders but many contracts = suspicious
        network_score = 0.5
    elif metrics['co_bidder_count'] > 50:
        # Very high connectivity = potential network hub
        network_score = min(metrics['co_bidder_count'] / 100, 1.0)
    score += network_score * VENDOR_RISK_WEIGHTS['network_centrality']
    if network_score > 0.3:
        factors.append(f'network:{metrics["co_bidder_count"]}')

    # 7. New vendor large wins
    new_vendor_score = calculate_new_vendor_large_wins_score(
        metrics['is_new_vendor'],
        metrics['large_contract_count'],
        metrics['total_contracts']
    )
    score += new_vendor_score * VENDOR_RISK_WEIGHTS['new_vendor_large_wins']
    if new_vendor_score > 0.5:
        factors.append(f'new_large:{metrics["large_contract_count"]}')

    # 8. Direct award ratio
    direct_score = calculate_direct_award_score(metrics['direct_award_rate'])
    score += direct_score * VENDOR_RISK_WEIGHTS['direct_award_ratio']
    if direct_score > 0.5:
        factors.append(f'direct_award:{metrics["direct_award_rate"]:.2f}')

    # 9. Co-bidding concentration
    cobid_score = 0.0
    if metrics['cobidding_concentration'] >= 0.8:
        cobid_score = 1.0
    elif metrics['cobidding_concentration'] >= 0.5:
        cobid_score = (metrics['cobidding_concentration'] - 0.5) / 0.3
    score += cobid_score * VENDOR_RISK_WEIGHTS['cobidding_concentration']
    if cobid_score > 0.5:
        factors.append(f'cobid_conc:{metrics["cobidding_concentration"]:.2f}')

    return min(score, 1.0), factors


def process_vendor(conn: sqlite3.Connection, vendor_id: int) -> Optional[Dict]:
    """Process a single vendor and calculate risk score."""
    metrics = get_vendor_metrics(conn, vendor_id)
    if not metrics:
        return None

    risk_score, factors = calculate_vendor_risk_score(metrics)

    return {
        'vendor_id': vendor_id,
        'risk_score': risk_score,
        'factors': factors,
        'metrics': metrics,
    }


def update_vendor_risk_scores(conn: sqlite3.Connection, results: List[Dict]):
    """Update vendor_stats table with calculated risk scores."""
    cursor = conn.cursor()

    for result in results:
        cursor.execute("""
            UPDATE vendor_stats SET
                vendor_risk_score = ?,
                vendor_risk_factors = ?,
                win_rate = ?,
                single_bid_rate = ?,
                client_concentration_rate = ?,
                sector_mismatch_flag = ?,
                growth_anomaly_flag = ?,
                is_new_vendor = ?,
                cobidding_concentration = ?,
                vendor_risk_calculated_at = ?
            WHERE vendor_id = ?
        """, (
            result['risk_score'],
            ','.join(result['factors']),
            result['metrics'].get('estimated_win_rate', 0),
            result['metrics']['single_bid_rate'],
            result['metrics']['top_client_share'],
            1 if result['metrics']['sector_mismatch'] else 0,
            1 if result['metrics'].get('yoy_growth', 0) and result['metrics']['yoy_growth'] >= 2.0 else 0,
            1 if result['metrics']['is_new_vendor'] else 0,
            result['metrics']['cobidding_concentration'],
            datetime.now().isoformat(),
            result['vendor_id'],
        ))

    conn.commit()


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Calculate vendor risk scores')
    parser.add_argument('--sample', type=int, help='Process only N vendors for testing')
    parser.add_argument('--vendor-id', type=int, help='Process specific vendor ID')
    parser.add_argument('--dry-run', action='store_true', help='Calculate but do not save')
    args = parser.parse_args()

    logger.info("Starting vendor risk score calculation...")
    logger.info(f"Database: {DB_PATH}")

    conn = get_connection()

    # Ensure columns exist
    ensure_vendor_risk_columns(conn)

    # Get vendors to process
    cursor = conn.cursor()

    if args.vendor_id:
        vendor_ids = [args.vendor_id]
        logger.info(f"Processing single vendor: {args.vendor_id}")
    else:
        query = """
            SELECT DISTINCT vendor_id FROM vendor_stats
            WHERE total_contracts > 0
        """
        if args.sample:
            query += f" ORDER BY total_contracts DESC LIMIT {args.sample}"

        cursor.execute(query)
        vendor_ids = [row['vendor_id'] for row in cursor.fetchall()]
        logger.info(f"Processing {len(vendor_ids)} vendors")

    # Calculate sector baselines
    logger.info("Calculating sector baselines...")
    baselines = calculate_sector_baselines(conn)

    # Process vendors
    results = []
    processed = 0

    for vendor_id in vendor_ids:
        result = process_vendor(conn, vendor_id)
        if result:
            results.append(result)

        processed += 1
        if processed % 1000 == 0:
            logger.info(f"Processed {processed}/{len(vendor_ids)} vendors")

    # Print summary
    if results:
        scores = [r['risk_score'] for r in results]

        logger.info(f"\n{'='*60}")
        logger.info("VENDOR RISK SCORE SUMMARY")
        logger.info(f"{'='*60}")
        logger.info(f"Vendors processed: {len(results)}")
        logger.info(f"Average risk score: {sum(scores)/len(scores):.4f}")
        logger.info(f"Min: {min(scores):.4f}, Max: {max(scores):.4f}")

        # Risk distribution
        low = sum(1 for s in scores if s < 0.2)
        medium = sum(1 for s in scores if 0.2 <= s < 0.4)
        high = sum(1 for s in scores if 0.4 <= s < 0.6)
        critical = sum(1 for s in scores if s >= 0.6)

        logger.info(f"\nRisk Distribution:")
        logger.info(f"  Low (<0.2):      {low:,} ({low/len(scores)*100:.1f}%)")
        logger.info(f"  Medium (0.2-0.4): {medium:,} ({medium/len(scores)*100:.1f}%)")
        logger.info(f"  High (0.4-0.6):   {high:,} ({high/len(scores)*100:.1f}%)")
        logger.info(f"  Critical (>=0.6): {critical:,} ({critical/len(scores)*100:.1f}%)")

        # Top risk factors
        all_factors = []
        for r in results:
            all_factors.extend([f.split(':')[0] for f in r['factors']])

        from collections import Counter
        factor_counts = Counter(all_factors)

        logger.info(f"\nTop Risk Factors:")
        for factor, count in factor_counts.most_common(10):
            logger.info(f"  {factor}: {count:,} vendors")

        # Save results
        if not args.dry_run:
            logger.info(f"\nSaving results to database...")
            update_vendor_risk_scores(conn, results)
            logger.info("Done!")
        else:
            logger.info("\nDry run - results not saved")

            # Show sample high-risk vendors
            high_risk = sorted(results, key=lambda x: x['risk_score'], reverse=True)[:5]
            logger.info("\nTop 5 highest risk vendors:")
            for r in high_risk:
                logger.info(f"  ID {r['vendor_id']}: {r['risk_score']:.4f} - {', '.join(r['factors'])}")

    conn.close()


if __name__ == "__main__":
    main()
