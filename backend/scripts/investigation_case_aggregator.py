"""
Investigation Case Aggregator
=============================
Groups anomalous vendors into investigation cases.

Case Types:
- single_vendor: Individual vendor with extreme anomalies
- vendor_network: Connected vendors via co-bidding patterns
- corporate_group: Same corporate group with suspicious patterns

Algorithm:
1. Start with top N most anomalous vendors
2. Create cases for top individual vendors
3. Identify corporate groups with multiple anomalous members
4. Rank by final suspicion score
5. Return top 10-20 cases

Author: RUBLI Project
Date: 2026-02-03
"""

import sqlite3
import os
import json
from datetime import datetime
from collections import defaultdict
from typing import Dict, List, Tuple, Optional, Set

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(BACKEND_DIR, 'RUBLI_NORMALIZED.db')

# Target sectors
TARGET_SECTORS = [1, 3]  # Salud, Infraestructura

# Case generation parameters
TOP_ANOMALOUS_VENDORS = 50      # Start with top N anomalous vendors
MIN_SUSPICION_SCORE = 0.5       # Minimum score for case inclusion
MAX_CASES_PER_SECTOR = 15       # Maximum cases per sector
MIN_CONTRACTS_FOR_CASE = 5      # Minimum contracts for a case
MIN_VALUE_FOR_CASE = 10_000_000  # Minimum value for a case (10M MXN)

# Estimated corruption loss rates (from IMF methodology)
LOSS_RATES = {
    'low': 0.08,      # 8% for low risk
    'medium': 0.12,   # 12% for medium risk
    'high': 0.18,     # 18% for high risk
    'critical': 0.25  # 25% for critical risk
}


def generate_cases(sector_ids: Optional[List[int]] = None) -> int:
    """
    Generate investigation cases for specified sectors.
    """
    if sector_ids is None:
        sector_ids = TARGET_SECTORS

    print(f"Starting case generation for sectors: {sector_ids}")
    print(f"Database: {DB_PATH}")
    print()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Clear existing cases for these sectors
    print("Clearing existing cases...")
    sector_list = ','.join(str(s) for s in sector_ids)
    cursor.execute(f"""
        DELETE FROM case_questions WHERE case_id IN (
            SELECT id FROM investigation_cases WHERE primary_sector_id IN ({sector_list})
        )
    """)
    cursor.execute(f"""
        DELETE FROM case_contracts WHERE case_id IN (
            SELECT id FROM investigation_cases WHERE primary_sector_id IN ({sector_list})
        )
    """)
    cursor.execute(f"""
        DELETE FROM case_vendors WHERE case_id IN (
            SELECT id FROM investigation_cases WHERE primary_sector_id IN ({sector_list})
        )
    """)
    cursor.execute(f"DELETE FROM investigation_cases WHERE primary_sector_id IN ({sector_list})")
    conn.commit()

    total_cases = 0

    for sector_id in sector_ids:
        cursor.execute("SELECT name_es, code FROM sectors WHERE id = ?", (sector_id,))
        sector = cursor.fetchone()
        sector_name = sector['name_es']
        sector_code = sector['code'].upper()

        print(f"\n{'='*60}")
        print(f"Processing Sector: {sector_name} (ID={sector_id})")
        print(f"{'='*60}")

        cases = generate_sector_cases(cursor, sector_id, sector_code)
        print(f"\nGenerated {len(cases)} cases for {sector_name}")

        # Save cases to database
        for case in cases:
            save_case(cursor, case)
            total_cases += 1

        conn.commit()

    # Print summary
    print_case_summary(cursor, sector_ids)

    conn.close()
    return total_cases


def generate_sector_cases(
    cursor: sqlite3.Cursor,
    sector_id: int,
    sector_code: str
) -> List[Dict]:
    """
    Generate investigation cases for a single sector.
    """
    cases = []

    # Get top anomalous vendors
    print(f"  Finding top {TOP_ANOMALOUS_VENDORS} anomalous vendors...")
    cursor.execute("""
        SELECT
            vf.vendor_id, v.name, v.rfc, v.corporate_group,
            vf.ensemble_score, vf.isolation_forest_score,
            vf.total_contracts, vf.total_value_mxn,
            vf.avg_risk_score, vf.single_bid_ratio, vf.direct_award_ratio,
            vf.high_conf_hypothesis_count, vf.co_bidder_count
        FROM vendor_investigation_features vf
        JOIN vendors v ON vf.vendor_id = v.id
        WHERE vf.sector_id = ? AND vf.ensemble_score >= ?
        ORDER BY vf.ensemble_score DESC
        LIMIT ?
    """, (sector_id, MIN_SUSPICION_SCORE, TOP_ANOMALOUS_VENDORS))

    top_vendors = cursor.fetchall()
    print(f"  Found {len(top_vendors)} vendors above threshold")

    # Track which vendors have been assigned to cases
    used_vendors: Set[int] = set()
    case_counter = 1

    # First: Identify corporate groups with multiple anomalous vendors
    print("  Identifying corporate groups...")
    corporate_groups = defaultdict(list)
    for vendor in top_vendors:
        if vendor['corporate_group'] and vendor['corporate_group'].strip():
            corporate_groups[vendor['corporate_group']].append(vendor)

    # Create corporate group cases first
    print("  Creating corporate group cases...")
    for group_name, group_vendors in corporate_groups.items():
        if len(group_vendors) >= 2:
            group_case = create_corporate_group_case(
                cursor, group_name, group_vendors, sector_id, sector_code, case_counter
            )
            if group_case:
                cases.append(group_case)
                for v in group_vendors:
                    used_vendors.add(v['vendor_id'])
                case_counter += 1

    # Second: Create single-vendor cases for remaining top vendors
    print("  Creating single-vendor cases...")
    for vendor in top_vendors:
        if vendor['vendor_id'] in used_vendors:
            continue

        if vendor['total_value_mxn'] < MIN_VALUE_FOR_CASE:
            continue

        case = create_single_vendor_case(
            cursor, vendor, sector_id, sector_code, case_counter
        )
        if case:
            cases.append(case)
            used_vendors.add(vendor['vendor_id'])
            case_counter += 1

        if len(cases) >= MAX_CASES_PER_SECTOR:
            break

    # Sort by suspicion score and limit
    cases.sort(key=lambda c: c['suspicion_score'], reverse=True)
    cases = cases[:MAX_CASES_PER_SECTOR]

    # Assign priorities
    for i, case in enumerate(cases):
        case['priority'] = min(5, max(1, 5 - i // 3))

    return cases


def create_single_vendor_case(
    cursor: sqlite3.Cursor,
    vendor: sqlite3.Row,
    sector_id: int,
    sector_code: str,
    case_num: int
) -> Optional[Dict]:
    """
    Create a case for a single highly anomalous vendor.
    """
    vendor_id = vendor['vendor_id']

    # Get contract stats using a simple query
    cursor.execute("""
        SELECT
            COUNT(*) as total,
            SUM(amount_mxn) as total_value,
            MIN(contract_date) as first_date,
            MAX(contract_date) as last_date,
            SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) as single_bid_count,
            SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) as direct_award_count,
            SUM(CASE WHEN is_year_end = 1 THEN 1 ELSE 0 END) as year_end_count,
            SUM(CASE WHEN risk_score >= 0.4 THEN 1 ELSE 0 END) as high_risk_count,
            SUM(CASE WHEN price_hypothesis_confidence >= 0.85 THEN 1 ELSE 0 END) as price_hyp_count
        FROM contracts
        WHERE vendor_id = ? AND sector_id = ?
    """, (vendor_id, sector_id))
    stats = cursor.fetchone()

    if not stats or stats['total'] < MIN_CONTRACTS_FOR_CASE:
        return None

    # Build signals
    signals = []
    risk_factors = {}

    if vendor['single_bid_ratio'] and vendor['single_bid_ratio'] >= 0.5:
        signals.append('high_single_bid_rate')
        risk_factors['single_bid'] = stats['single_bid_count']

    if vendor['direct_award_ratio'] and vendor['direct_award_ratio'] >= 0.7:
        signals.append('high_direct_award_rate')
        risk_factors['direct_award'] = stats['direct_award_count']

    if vendor['high_conf_hypothesis_count'] and vendor['high_conf_hypothesis_count'] >= 10:
        signals.append('multiple_price_anomalies')
        risk_factors['price_hypothesis'] = stats['price_hyp_count']

    total_contracts = stats['total'] or 1
    if stats['year_end_count'] and stats['year_end_count'] / total_contracts >= 0.3:
        signals.append('year_end_concentration')
        risk_factors['year_end'] = stats['year_end_count']

    if vendor['avg_risk_score'] and vendor['avg_risk_score'] >= 0.3:
        signals.append('high_avg_risk_score')
        risk_factors['high_risk'] = stats['high_risk_count']

    # Estimate loss
    total_value = stats['total_value'] or 0
    score = vendor['ensemble_score'] or 0
    loss_rate = get_loss_rate(score)
    estimated_loss = total_value * loss_rate * score

    case_id = f"CASE-{sector_code[:3]}-{datetime.now().year}-{case_num:05d}"

    return {
        'case_id': case_id,
        'case_type': 'single_vendor',
        'primary_sector_id': sector_id,
        'suspicion_score': score,
        'anomaly_score': vendor['isolation_forest_score'] or 0,
        'confidence': 0.85,
        'title': f"{vendor['name'][:60]} - Anomalous Procurement Pattern",
        'total_contracts': stats['total'],
        'total_value_mxn': total_value,
        'estimated_loss_mxn': estimated_loss,
        'date_range_start': stats['first_date'],
        'date_range_end': stats['last_date'],
        'signals_triggered': signals,
        'risk_factor_counts': risk_factors,
        'vendors': [{
            'vendor_id': vendor_id,
            'name': vendor['name'],
            'rfc': vendor['rfc'],
            'role': 'primary_suspect',
            'contract_count': stats['total'],
            'contract_value_mxn': total_value,
            'single_bid_count': stats['single_bid_count'],
            'direct_award_count': stats['direct_award_count'],
            'avg_risk_score': vendor['avg_risk_score'],
        }],
    }


def create_corporate_group_case(
    cursor: sqlite3.Cursor,
    group_name: str,
    vendors: List[sqlite3.Row],
    sector_id: int,
    sector_code: str,
    case_num: int
) -> Optional[Dict]:
    """
    Create a case for vendors in the same corporate group.
    """
    vendor_ids = [v['vendor_id'] for v in vendors]
    placeholders = ','.join(['?'] * len(vendor_ids))

    cursor.execute(f"""
        SELECT
            COUNT(*) as total,
            SUM(amount_mxn) as total_value,
            MIN(contract_date) as first_date,
            MAX(contract_date) as last_date,
            SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) as single_bid_count,
            SUM(CASE WHEN is_direct_award = 1 THEN 1 ELSE 0 END) as direct_award_count
        FROM contracts
        WHERE vendor_id IN ({placeholders}) AND sector_id = ?
    """, vendor_ids + [sector_id])
    stats = cursor.fetchone()

    if not stats or stats['total'] < MIN_CONTRACTS_FOR_CASE:
        return None

    vendor_details = []
    for v in vendors:
        vendor_details.append({
            'vendor_id': v['vendor_id'],
            'name': v['name'],
            'rfc': v['rfc'],
            'role': 'corporate_sibling',
            'contract_count': v['total_contracts'],
            'contract_value_mxn': v['total_value_mxn'],
            'avg_risk_score': v['ensemble_score'],
        })

    scores = [v['ensemble_score'] for v in vendors if v['ensemble_score']]
    avg_score = sum(scores) / len(scores) if scores else 0
    total_value = stats['total_value'] or 0
    estimated_loss = total_value * get_loss_rate(avg_score) * avg_score

    case_id = f"CASE-{sector_code[:3]}-{datetime.now().year}-{case_num:05d}"

    return {
        'case_id': case_id,
        'case_type': 'corporate_group',
        'primary_sector_id': sector_id,
        'suspicion_score': avg_score,
        'anomaly_score': max((v['isolation_forest_score'] or 0) for v in vendors),
        'confidence': 0.80,
        'title': f"Corporate Group: {group_name[:50]} ({len(vendors)} entities)",
        'total_contracts': stats['total'],
        'total_value_mxn': total_value,
        'estimated_loss_mxn': estimated_loss,
        'date_range_start': stats['first_date'],
        'date_range_end': stats['last_date'],
        'signals_triggered': ['corporate_group_pattern', 'multi_entity_anomaly'],
        'risk_factor_counts': {
            'group_members': len(vendors),
            'single_bid': stats['single_bid_count'],
            'direct_award': stats['direct_award_count']
        },
        'vendors': vendor_details,
    }


def get_loss_rate(score: float) -> float:
    """Get estimated corruption loss rate based on suspicion score."""
    if score >= 0.6:
        return LOSS_RATES['critical']
    elif score >= 0.4:
        return LOSS_RATES['high']
    elif score >= 0.2:
        return LOSS_RATES['medium']
    return LOSS_RATES['low']


def save_case(cursor: sqlite3.Cursor, case: Dict) -> int:
    """Save a case to the database. Returns case ID."""

    # Insert main case
    cursor.execute("""
        INSERT INTO investigation_cases (
            case_id, case_type, primary_sector_id,
            suspicion_score, anomaly_score, confidence,
            title, total_contracts, total_value_mxn, estimated_loss_mxn,
            date_range_start, date_range_end,
            signals_triggered, risk_factor_counts, priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        case['case_id'],
        case['case_type'],
        case['primary_sector_id'],
        case['suspicion_score'],
        case['anomaly_score'],
        case['confidence'],
        case['title'],
        case['total_contracts'],
        case['total_value_mxn'],
        case['estimated_loss_mxn'],
        case['date_range_start'],
        case['date_range_end'],
        json.dumps(case['signals_triggered']),
        json.dumps(case['risk_factor_counts']),
        case.get('priority', 3)
    ))

    case_db_id = cursor.lastrowid

    # Insert case vendors
    for vendor in case.get('vendors', []):
        cursor.execute("""
            INSERT INTO case_vendors (
                case_id, vendor_id, role,
                contract_count, contract_value_mxn, avg_risk_score
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, (
            case_db_id,
            vendor['vendor_id'],
            vendor['role'],
            vendor.get('contract_count'),
            vendor.get('contract_value_mxn'),
            vendor.get('avg_risk_score')
        ))

    return case_db_id


def print_case_summary(cursor: sqlite3.Cursor, sector_ids: List[int]):
    """Print summary of generated cases."""

    print("\n" + "="*60)
    print("CASE GENERATION SUMMARY")
    print("="*60)

    sector_list = ','.join(str(s) for s in sector_ids)

    cursor.execute(f"""
        SELECT
            s.name_es as sector,
            COUNT(*) as total_cases,
            SUM(ic.total_contracts) as total_contracts,
            SUM(ic.total_value_mxn) as total_value,
            SUM(ic.estimated_loss_mxn) as estimated_loss,
            AVG(ic.suspicion_score) as avg_score
        FROM investigation_cases ic
        JOIN sectors s ON ic.primary_sector_id = s.id
        WHERE ic.primary_sector_id IN ({sector_list})
        GROUP BY ic.primary_sector_id
    """)

    for row in cursor.fetchall():
        print(f"\nSector: {row['sector']}")
        print(f"  Cases generated: {row['total_cases']}")
        print(f"  Total contracts: {row['total_contracts']:,}")
        print(f"  Total value: ${row['total_value']/1e9:.2f}B MXN")
        print(f"  Estimated loss: ${row['estimated_loss']/1e9:.2f}B MXN")
        print(f"  Avg suspicion score: {row['avg_score']:.3f}")

    # Top 10 cases
    print("\n" + "-"*60)
    print("TOP 10 INVESTIGATION CASES (ALL SECTORS)")
    print("-"*60)

    cursor.execute(f"""
        SELECT
            ic.case_id, ic.title, ic.case_type,
            s.code as sector, ic.suspicion_score,
            ic.total_contracts, ic.total_value_mxn,
            ic.estimated_loss_mxn, ic.priority
        FROM investigation_cases ic
        JOIN sectors s ON ic.primary_sector_id = s.id
        WHERE ic.primary_sector_id IN ({sector_list})
        ORDER BY ic.suspicion_score DESC
        LIMIT 10
    """)

    print(f"{'#':<3} {'Case ID':<25} {'Type':<15} {'Score':>6} {'N':>6} {'Value':>12} {'Est.Loss':>10}")
    print("-"*85)
    for i, row in enumerate(cursor.fetchall(), 1):
        value_str = f"${row['total_value_mxn']/1e9:.2f}B"
        loss_str = f"${row['estimated_loss_mxn']/1e6:.0f}M"
        print(f"{i:<3} {row['case_id']:<25} {row['case_type']:<15} {row['suspicion_score']:>6.3f} {row['total_contracts']:>6} {value_str:>12} {loss_str:>10}")


if __name__ == "__main__":
    print("="*60)
    print("INVESTIGATION CASE AGGREGATOR")
    print("="*60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print()

    start = datetime.now()
    generate_cases(TARGET_SECTORS)
    elapsed = (datetime.now() - start).total_seconds()
    print(f"\nCase generation completed in {elapsed:.1f} seconds")
