#!/usr/bin/env python3
"""
Pattern Discovery: What CAN We Detect?

This script explores the COMPRANET data to identify patterns that ARE detectable
with the available data. Instead of validating against known cases (which failed),
we discover what patterns exist and can be flagged.

The exploration-first approach answers: "What patterns warrant investigation?"
rather than "Does our model correctly identify known corruption?"

Detectable Patterns:
1. Co-bidding clusters - Vendors appearing in same procedures
2. Rotating winners - Same vendors taking turns
3. Vendor concentration - Few vendors dominating institution
4. Year-end spikes - December contract clustering
5. Price anomalies - IQR-based outliers
6. Single bidding - Competitive procedures with 1 bidder
7. Direct award concentration - High % non-open procedures
8. Threshold splitting - Same vendor, same day, multiple contracts

Usage:
    python backend/scripts/explore_detectable_patterns.py [--output-dir reports]
"""

import sqlite3
import argparse
import json
from pathlib import Path
from datetime import datetime
from collections import defaultdict
from typing import Dict, List, Any, Tuple

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Configuration
CONFIG = {
    'MIN_CO_BIDS': 3,              # Minimum co-bids for pattern
    'MIN_CO_BID_RATE': 0.50,       # Rate for high-confidence co-bidding
    'CONCENTRATION_THRESHOLD': 0.30,  # 30% = high concentration
    'YEAR_END_SPIKE_THRESHOLD': 1.5,  # December 50% above average
    'PRICE_OUTLIER_IQR_MULT': 1.5,    # Standard Tukey fence
    'THRESHOLD_SPLIT_DAYS': 1,     # Same-day splitting
    'MIN_VENDOR_CONTRACTS': 5,     # Minimum contracts for analysis
}


def get_connection() -> sqlite3.Connection:
    """Get database connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def print_section(title: str):
    """Print formatted section header."""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def pattern_1_co_bidding_clusters(conn: sqlite3.Connection) -> Dict[str, Any]:
    """
    Pattern 1: Co-Bidding Clusters

    Detect vendors that frequently appear in the same procedures.
    High co-bidding rates suggest:
    - Coordinated bidding (collusion)
    - Related entities (shell companies)
    - Bid rotation schemes
    """
    print_section("PATTERN 1: Co-Bidding Clusters")
    cursor = conn.cursor()

    # Get procedure participation counts per vendor
    cursor.execute("""
        SELECT vendor_id, COUNT(DISTINCT procedure_number) as proc_count
        FROM contracts
        WHERE procedure_number IS NOT NULL AND procedure_number != ''
        GROUP BY vendor_id
        HAVING proc_count >= ?
    """, (CONFIG['MIN_VENDOR_CONTRACTS'],))

    vendor_procs = {row['vendor_id']: row['proc_count'] for row in cursor.fetchall()}
    print(f"  Vendors with >= {CONFIG['MIN_VENDOR_CONTRACTS']} procedures: {len(vendor_procs):,}")

    # Find co-bidding pairs (only companies, not individuals)
    cursor.execute("""
        SELECT
            c1.vendor_id as v1,
            c2.vendor_id as v2,
            COUNT(DISTINCT c1.procedure_number) as co_bids
        FROM contracts c1
        JOIN contracts c2 ON c1.procedure_number = c2.procedure_number
        JOIN vendors v1_info ON c1.vendor_id = v1_info.id
        JOIN vendors v2_info ON c2.vendor_id = v2_info.id
        WHERE c1.vendor_id < c2.vendor_id
          AND c1.procedure_number IS NOT NULL
          AND c1.procedure_number != ''
          AND v1_info.is_individual = 0
          AND v2_info.is_individual = 0
        GROUP BY c1.vendor_id, c2.vendor_id
        HAVING co_bids >= ?
        ORDER BY co_bids DESC
        LIMIT 10000
    """, (CONFIG['MIN_CO_BIDS'],))

    pairs = cursor.fetchall()
    print(f"  Co-bidding pairs found: {len(pairs):,}")

    # Calculate co-bid rates and identify high-confidence pairs
    high_confidence = []
    potential_collusion = []

    for row in pairs:
        v1, v2 = row['v1'], row['v2']
        co_bids = row['co_bids']

        v1_procs = vendor_procs.get(v1, 0)
        v2_procs = vendor_procs.get(v2, 0)

        if v1_procs == 0 or v2_procs == 0:
            continue

        rate_v1 = co_bids / v1_procs
        rate_v2 = co_bids / v2_procs
        min_rate = min(rate_v1, rate_v2)

        if min_rate >= CONFIG['MIN_CO_BID_RATE']:
            high_confidence.append({
                'v1': v1, 'v2': v2,
                'co_bids': co_bids,
                'min_rate': min_rate,
                'max_rate': max(rate_v1, rate_v2)
            })

            if min_rate >= 0.80:
                potential_collusion.append({
                    'v1': v1, 'v2': v2,
                    'co_bids': co_bids,
                    'rate': min_rate
                })

    print(f"  High-confidence pairs (>= {CONFIG['MIN_CO_BID_RATE']*100:.0f}%): {len(high_confidence):,}")
    print(f"  Potential collusion pairs (>= 80%): {len(potential_collusion):,}")

    # Get top examples with vendor names
    top_pairs = []
    if high_confidence:
        vendor_ids = set()
        for p in high_confidence[:50]:
            vendor_ids.add(p['v1'])
            vendor_ids.add(p['v2'])

        vendor_names = {}
        if vendor_ids:
            placeholders = ','.join(['?' for _ in vendor_ids])
            cursor.execute(f"""
                SELECT id, name FROM vendors WHERE id IN ({placeholders})
            """, list(vendor_ids))
            vendor_names = {row['id']: row['name'] for row in cursor.fetchall()}

        for p in high_confidence[:20]:
            top_pairs.append({
                'vendor_1': vendor_names.get(p['v1'], f"ID:{p['v1']}")[:50],
                'vendor_2': vendor_names.get(p['v2'], f"ID:{p['v2']}")[:50],
                'co_bids': p['co_bids'],
                'rate': f"{p['min_rate']*100:.0f}%-{p['max_rate']*100:.0f}%"
            })

        print("\n  Top 10 co-bidding pairs:")
        for i, p in enumerate(top_pairs[:10], 1):
            print(f"    {i}. {p['vendor_1'][:35]}")
            print(f"       {p['vendor_2'][:35]}")
            print(f"       Co-bids: {p['co_bids']} | Rate: {p['rate']}")

    return {
        'pattern': 'co_bidding_clusters',
        'detectable': True,
        'total_pairs_analyzed': len(pairs),
        'high_confidence_pairs': len(high_confidence),
        'potential_collusion_pairs': len(potential_collusion),
        'detection_criteria': f"Co-bid rate >= {CONFIG['MIN_CO_BID_RATE']*100:.0f}%",
        'top_examples': top_pairs[:10],
        'recommendation': 'Investigate pairs with 80%+ co-bid rates for potential collusion'
    }


def pattern_2_rotating_winners(conn: sqlite3.Connection) -> Dict[str, Any]:
    """
    Pattern 2: Rotating Winners

    Detect vendors that take turns winning in the same institution/sector.
    Rotation pattern = never compete head-to-head despite frequent co-bidding.
    """
    print_section("PATTERN 2: Rotating Winners")
    cursor = conn.cursor()

    # Find vendor pairs that appear in same procedures but have suspicious win patterns
    # A rotation indicator: high co-bid count but low head-to-head wins
    cursor.execute("""
        WITH vendor_wins AS (
            SELECT
                vendor_id,
                procedure_number,
                institution_id,
                sector_id
            FROM contracts
            WHERE procedure_number IS NOT NULL
              AND is_direct_award = 0  -- Only competitive procedures
        ),
        co_appearances AS (
            SELECT
                CASE WHEN w1.vendor_id < w2.vendor_id THEN w1.vendor_id ELSE w2.vendor_id END as v1,
                CASE WHEN w1.vendor_id < w2.vendor_id THEN w2.vendor_id ELSE w1.vendor_id END as v2,
                w1.institution_id,
                COUNT(DISTINCT w1.procedure_number) as shared_procedures,
                SUM(CASE WHEN w1.vendor_id != w2.vendor_id THEN 1 ELSE 0 END) as both_won
            FROM vendor_wins w1
            JOIN vendor_wins w2 ON w1.procedure_number = w2.procedure_number
            WHERE w1.vendor_id != w2.vendor_id
            GROUP BY v1, v2, w1.institution_id
            HAVING shared_procedures >= 3
        )
        SELECT
            v1, v2, institution_id,
            shared_procedures,
            both_won,
            CAST(both_won AS REAL) / shared_procedures as both_win_rate
        FROM co_appearances
        WHERE both_won = 0 OR (CAST(both_won AS REAL) / shared_procedures < 0.1)
        ORDER BY shared_procedures DESC
        LIMIT 1000
    """)

    rotation_patterns = cursor.fetchall()
    print(f"  Potential rotation patterns found: {len(rotation_patterns):,}")

    # Analyze patterns
    suspicious_rotations = []
    for row in rotation_patterns:
        if row['shared_procedures'] >= 5:  # More confidence with more procedures
            suspicious_rotations.append({
                'v1': row['v1'],
                'v2': row['v2'],
                'institution_id': row['institution_id'],
                'shared_procedures': row['shared_procedures'],
                'both_won_rate': row['both_win_rate'] or 0
            })

    print(f"  High-confidence rotation patterns (>= 5 shared procedures): {len(suspicious_rotations):,}")

    # Get examples with names
    examples = []
    if suspicious_rotations[:20]:
        vendor_ids = set()
        inst_ids = set()
        for p in suspicious_rotations[:20]:
            vendor_ids.add(p['v1'])
            vendor_ids.add(p['v2'])
            inst_ids.add(p['institution_id'])

        vendor_names = {}
        if vendor_ids:
            placeholders = ','.join(['?' for _ in vendor_ids])
            cursor.execute(f"SELECT id, name FROM vendors WHERE id IN ({placeholders})", list(vendor_ids))
            vendor_names = {row['id']: row['name'] for row in cursor.fetchall()}

        inst_names = {}
        if inst_ids:
            placeholders = ','.join(['?' for _ in inst_ids])
            cursor.execute(f"SELECT id, name FROM institutions WHERE id IN ({placeholders})", list(inst_ids))
            inst_names = {row['id']: row['name'] for row in cursor.fetchall()}

        for p in suspicious_rotations[:10]:
            examples.append({
                'vendor_1': vendor_names.get(p['v1'], f"ID:{p['v1']}")[:40],
                'vendor_2': vendor_names.get(p['v2'], f"ID:{p['v2']}")[:40],
                'institution': inst_names.get(p['institution_id'], f"ID:{p['institution_id']}")[:40],
                'shared_procedures': p['shared_procedures'],
                'indicator': 'Never compete directly despite frequent co-bidding'
            })

    if examples:
        print("\n  Top 5 rotation pattern examples:")
        for i, e in enumerate(examples[:5], 1):
            print(f"    {i}. {e['vendor_1'][:30]} + {e['vendor_2'][:30]}")
            print(f"       Institution: {e['institution'][:40]}")
            print(f"       Shared procedures: {e['shared_procedures']} | {e['indicator']}")

    return {
        'pattern': 'rotating_winners',
        'detectable': True,
        'total_patterns_found': len(rotation_patterns),
        'high_confidence_patterns': len(suspicious_rotations),
        'detection_criteria': 'Co-bid frequently but never/rarely both win',
        'top_examples': examples[:10],
        'recommendation': 'Investigate vendor pairs that appear together but never compete'
    }


def pattern_3_vendor_concentration(conn: sqlite3.Connection) -> Dict[str, Any]:
    """
    Pattern 3: Vendor Concentration

    Detect institutions where a few vendors dominate contract awards.
    High concentration indicates:
    - Potential favoritism
    - Market manipulation
    - Capture of procurement process
    """
    print_section("PATTERN 3: Vendor Concentration")
    cursor = conn.cursor()

    # Calculate vendor concentration by institution
    cursor.execute("""
        WITH inst_totals AS (
            SELECT
                institution_id,
                COUNT(*) as total_contracts,
                SUM(amount_mxn) as total_value
            FROM contracts
            WHERE institution_id IS NOT NULL AND amount_mxn > 0
            GROUP BY institution_id
            HAVING total_contracts >= 100  -- Only institutions with significant activity
        ),
        vendor_shares AS (
            SELECT
                c.institution_id,
                c.vendor_id,
                COUNT(*) as vendor_contracts,
                SUM(c.amount_mxn) as vendor_value,
                t.total_contracts,
                t.total_value
            FROM contracts c
            JOIN inst_totals t ON c.institution_id = t.institution_id
            WHERE c.vendor_id IS NOT NULL AND c.amount_mxn > 0
            GROUP BY c.institution_id, c.vendor_id
        )
        SELECT
            institution_id,
            vendor_id,
            vendor_contracts,
            vendor_value,
            total_contracts,
            total_value,
            CAST(vendor_contracts AS REAL) / total_contracts as contract_share,
            CAST(vendor_value AS REAL) / total_value as value_share
        FROM vendor_shares
        WHERE CAST(vendor_value AS REAL) / total_value >= ?
        ORDER BY value_share DESC
        LIMIT 500
    """, (CONFIG['CONCENTRATION_THRESHOLD'],))

    concentrated = cursor.fetchall()
    print(f"  High-concentration vendor-institution pairs: {len(concentrated):,}")

    # Group by institution
    inst_concentration = defaultdict(list)
    for row in concentrated:
        inst_concentration[row['institution_id']].append({
            'vendor_id': row['vendor_id'],
            'value_share': row['value_share'],
            'contract_share': row['contract_share'],
            'vendor_value': row['vendor_value'],
            'total_value': row['total_value']
        })

    print(f"  Institutions with concentrated vendors: {len(inst_concentration):,}")

    # Get examples
    examples = []
    top_insts = sorted(inst_concentration.keys(),
                       key=lambda x: max(v['value_share'] for v in inst_concentration[x]),
                       reverse=True)[:20]

    if top_insts:
        cursor.execute(f"""
            SELECT id, name FROM institutions WHERE id IN ({','.join(['?' for _ in top_insts])})
        """, top_insts)
        inst_names = {row['id']: row['name'] for row in cursor.fetchall()}

        all_vendor_ids = set()
        for inst_id in top_insts[:10]:
            for v in inst_concentration[inst_id][:3]:
                all_vendor_ids.add(v['vendor_id'])

        vendor_names = {}
        if all_vendor_ids:
            cursor.execute(f"""
                SELECT id, name FROM vendors WHERE id IN ({','.join(['?' for _ in all_vendor_ids])})
            """, list(all_vendor_ids))
            vendor_names = {row['id']: row['name'] for row in cursor.fetchall()}

        for inst_id in top_insts[:10]:
            top_vendor = inst_concentration[inst_id][0]
            examples.append({
                'institution': inst_names.get(inst_id, f"ID:{inst_id}")[:50],
                'top_vendor': vendor_names.get(top_vendor['vendor_id'], f"ID:{top_vendor['vendor_id']}")[:50],
                'value_share': f"{top_vendor['value_share']*100:.1f}%",
                'total_value_b': top_vendor['total_value'] / 1e9,
                'num_dominant_vendors': len(inst_concentration[inst_id])
            })

    if examples:
        print("\n  Top 10 concentrated institutions:")
        for i, e in enumerate(examples[:10], 1):
            print(f"    {i}. {e['institution'][:45]}")
            print(f"       Top vendor: {e['top_vendor'][:40]}")
            print(f"       Share: {e['value_share']} of {e['total_value_b']:.1f}B MXN")

    return {
        'pattern': 'vendor_concentration',
        'detectable': True,
        'total_concentrated_pairs': len(concentrated),
        'institutions_affected': len(inst_concentration),
        'detection_criteria': f'Vendor value share >= {CONFIG["CONCENTRATION_THRESHOLD"]*100:.0f}%',
        'top_examples': examples,
        'recommendation': 'Review institutions where single vendors dominate'
    }


def pattern_4_year_end_spikes(conn: sqlite3.Connection) -> Dict[str, Any]:
    """
    Pattern 4: Year-End Spending Spikes

    Detect December contract spikes indicating budget exhaustion behavior.
    Year-end rush contracts often have:
    - Less scrutiny
    - Rushed procedures
    - Lower quality outcomes
    """
    print_section("PATTERN 4: Year-End Spending Spikes")
    cursor = conn.cursor()

    cursor.execute("""
        WITH monthly AS (
            SELECT
                contract_year as year,
                contract_month as month,
                COUNT(*) as contracts,
                SUM(amount_mxn) as value,
                AVG(risk_score) as avg_risk
            FROM contracts
            WHERE contract_year >= 2015
              AND contract_year <= 2024
              AND contract_month IS NOT NULL
              AND amount_mxn > 0
              AND amount_mxn < 100000000000
            GROUP BY contract_year, contract_month
        ),
        yearly_avg AS (
            SELECT
                year,
                AVG(CASE WHEN month != 12 THEN value END) as avg_other_months,
                SUM(CASE WHEN month = 12 THEN value ELSE 0 END) as december_value,
                SUM(CASE WHEN month = 12 THEN contracts ELSE 0 END) as december_contracts,
                AVG(CASE WHEN month = 12 THEN avg_risk END) as december_risk,
                AVG(CASE WHEN month != 12 THEN avg_risk END) as other_months_risk
            FROM monthly
            GROUP BY year
        )
        SELECT
            year,
            december_value,
            december_contracts,
            avg_other_months,
            CASE WHEN avg_other_months > 0 THEN december_value / avg_other_months ELSE NULL END as spike_ratio,
            december_risk,
            other_months_risk,
            CASE WHEN other_months_risk > 0 THEN december_risk / other_months_risk ELSE NULL END as risk_ratio
        FROM yearly_avg
        WHERE december_value > 0
        ORDER BY year
    """)

    yearly_data = cursor.fetchall()
    print(f"  Years analyzed: {len(yearly_data)}")

    spike_years = []
    total_december_value = 0
    total_spike_excess = 0

    for row in yearly_data:
        spike_ratio = row['spike_ratio']
        if spike_ratio and spike_ratio >= CONFIG['YEAR_END_SPIKE_THRESHOLD']:
            spike_years.append({
                'year': row['year'],
                'spike_ratio': spike_ratio,
                'december_value_b': row['december_value'] / 1e9,
                'december_contracts': row['december_contracts'],
                'risk_ratio': row['risk_ratio'] or 1.0
            })
            # Calculate excess spending
            if row['avg_other_months']:
                excess = row['december_value'] - row['avg_other_months']
                total_spike_excess += max(0, excess)

        total_december_value += row['december_value'] or 0

    print(f"  Years with significant spikes (>= {CONFIG['YEAR_END_SPIKE_THRESHOLD']}x): {len(spike_years)}")
    print(f"  Total December spending: {total_december_value/1e12:.2f}T MXN")
    print(f"  Estimated excess spending: {total_spike_excess/1e9:.1f}B MXN")

    if spike_years:
        print("\n  Year-end spike analysis:")
        for y in sorted(spike_years, key=lambda x: x['spike_ratio'], reverse=True)[:10]:
            risk_indicator = "HIGHER RISK" if y['risk_ratio'] > 1.1 else "normal risk"
            print(f"    {y['year']}: {y['spike_ratio']:.1f}x spike | {y['december_value_b']:.1f}B MXN | {risk_indicator}")

    return {
        'pattern': 'year_end_spikes',
        'detectable': True,
        'years_analyzed': len(yearly_data),
        'years_with_spikes': len(spike_years),
        'total_december_value_b': total_december_value / 1e9,
        'estimated_excess_spending_b': total_spike_excess / 1e9,
        'detection_criteria': f'December value >= {CONFIG["YEAR_END_SPIKE_THRESHOLD"]}x monthly average',
        'spike_years': spike_years,
        'recommendation': 'Review December contracts for rushed/low-scrutiny awards'
    }


def pattern_5_price_anomalies(conn: sqlite3.Connection) -> Dict[str, Any]:
    """
    Pattern 5: Price Anomalies

    Detect contracts with prices significantly above sector norms.
    Uses IQR method (Tukey fences) for outlier detection.
    """
    print_section("PATTERN 5: Price Anomalies")
    cursor = conn.cursor()

    # Get sector statistics - simpler approach calculating in Python
    cursor.execute("""
        SELECT sector_id, amount_mxn
        FROM contracts
        WHERE sector_id IS NOT NULL
          AND amount_mxn > 0
          AND amount_mxn < 100000000000
        ORDER BY sector_id, amount_mxn
    """)

    # Group amounts by sector
    sector_amounts = defaultdict(list)
    for row in cursor.fetchall():
        sector_amounts[row['sector_id']].append(row['amount_mxn'])

    # Calculate quartiles in Python
    sector_stats = {}
    for sector_id, amounts in sector_amounts.items():
        n = len(amounts)
        if n < 10:
            continue
        q1_idx = int(n * 0.25)
        median_idx = int(n * 0.50)
        q3_idx = int(n * 0.75)

        q1 = amounts[q1_idx]
        median = amounts[median_idx]
        q3 = amounts[q3_idx]
        iqr = q3 - q1

        sector_stats[sector_id] = {
            'count': n,
            'median': median,
            'q1': q1,
            'q3': q3,
            'iqr': iqr,
            'upper_fence': q3 + CONFIG['PRICE_OUTLIER_IQR_MULT'] * iqr,
            'extreme_fence': q3 + 3.0 * iqr
        }

    print(f"  Sectors with statistics: {len(sector_stats)}")

    # Count outliers by sector
    outlier_counts = {}
    extreme_counts = {}
    total_outliers = 0
    total_extreme = 0

    for sector_id, stats in sector_stats.items():
        cursor.execute("""
            SELECT
                COUNT(CASE WHEN amount_mxn > ? THEN 1 END) as outliers,
                COUNT(CASE WHEN amount_mxn > ? THEN 1 END) as extreme
            FROM contracts
            WHERE sector_id = ? AND amount_mxn > 0 AND amount_mxn < 100000000000
        """, (stats['upper_fence'], stats['extreme_fence'], sector_id))

        row = cursor.fetchone()
        outlier_counts[sector_id] = row['outliers']
        extreme_counts[sector_id] = row['extreme']
        total_outliers += row['outliers']
        total_extreme += row['extreme']

    print(f"  Total mild outliers (> Q3 + 1.5*IQR): {total_outliers:,}")
    print(f"  Total extreme outliers (> Q3 + 3*IQR): {total_extreme:,}")

    # Get examples of extreme outliers
    examples = []
    cursor.execute("""
        SELECT
            c.id, c.title, c.amount_mxn, c.sector_id, c.contract_year,
            v.name as vendor_name, i.name as institution_name,
            s.name_es as sector_name
        FROM contracts c
        LEFT JOIN vendors v ON c.vendor_id = v.id
        LEFT JOIN institutions i ON c.institution_id = i.id
        LEFT JOIN sectors s ON c.sector_id = s.id
        WHERE c.amount_mxn > 1000000000  -- > 1B MXN
          AND c.amount_mxn < 100000000000
          AND c.sector_id IS NOT NULL
        ORDER BY c.amount_mxn DESC
        LIMIT 20
    """)

    for row in cursor.fetchall():
        sector_id = row['sector_id']
        if sector_id in sector_stats:
            stats = sector_stats[sector_id]
            ratio = row['amount_mxn'] / stats['median'] if stats['median'] > 0 else 0
            examples.append({
                'contract_id': row['id'],
                'title': (row['title'] or '')[:50],
                'amount_b': row['amount_mxn'] / 1e9,
                'sector': row['sector_name'],
                'vendor': (row['vendor_name'] or '')[:40],
                'institution': (row['institution_name'] or '')[:40],
                'ratio_to_median': ratio,
                'year': row['contract_year']
            })

    if examples:
        print("\n  Top 10 extreme price outliers:")
        for i, e in enumerate(examples[:10], 1):
            print(f"    {i}. {e['amount_b']:.1f}B MXN ({e['ratio_to_median']:.0f}x median)")
            print(f"       {e['sector']} | {e['year']}")
            print(f"       {e['vendor'][:35]}")

    return {
        'pattern': 'price_anomalies',
        'detectable': True,
        'total_outliers': total_outliers,
        'total_extreme_outliers': total_extreme,
        'detection_criteria': 'IQR method (Tukey fences)',
        'sector_stats': {sid: {'outliers': outlier_counts[sid], 'extreme': extreme_counts[sid]}
                        for sid in sector_stats},
        'top_examples': examples[:10],
        'recommendation': 'Review extreme outliers for potential overpricing'
    }


def pattern_6_single_bidding(conn: sqlite3.Connection) -> Dict[str, Any]:
    """
    Pattern 6: Single Bidding

    Detect competitive procedures that received only one bid.
    Single bidding in open procedures indicates:
    - Specifications tailored to one vendor
    - Potential bid suppression
    - Market access barriers
    """
    print_section("PATTERN 6: Single Bidding in Competitive Procedures")
    cursor = conn.cursor()

    # Get single bid statistics
    cursor.execute("""
        SELECT
            contract_year,
            COUNT(*) as total_competitive,
            SUM(CASE WHEN is_single_bid = 1 THEN 1 ELSE 0 END) as single_bid_count,
            SUM(CASE WHEN is_single_bid = 1 THEN amount_mxn ELSE 0 END) as single_bid_value
        FROM contracts
        WHERE is_direct_award = 0
          AND contract_year >= 2010
          AND contract_year <= 2024
          AND amount_mxn > 0
          AND amount_mxn < 100000000000
        GROUP BY contract_year
        ORDER BY contract_year
    """)

    yearly_stats = []
    total_single_bid = 0
    total_competitive = 0
    total_single_bid_value = 0

    for row in cursor.fetchall():
        rate = (row['single_bid_count'] / row['total_competitive'] * 100) if row['total_competitive'] > 0 else 0
        yearly_stats.append({
            'year': row['contract_year'],
            'total_competitive': row['total_competitive'],
            'single_bid_count': row['single_bid_count'],
            'single_bid_rate': rate,
            'single_bid_value_b': (row['single_bid_value'] or 0) / 1e9
        })
        total_single_bid += row['single_bid_count'] or 0
        total_competitive += row['total_competitive']
        total_single_bid_value += row['single_bid_value'] or 0

    overall_rate = (total_single_bid / total_competitive * 100) if total_competitive > 0 else 0

    print(f"  Total competitive procedures: {total_competitive:,}")
    print(f"  Total single-bid procedures: {total_single_bid:,}")
    print(f"  Overall single-bid rate: {overall_rate:.1f}%")
    print(f"  Total single-bid value: {total_single_bid_value/1e12:.2f}T MXN")

    # Get by sector
    cursor.execute("""
        SELECT
            s.name_es as sector,
            COUNT(*) as total,
            SUM(CASE WHEN c.is_single_bid = 1 THEN 1 ELSE 0 END) as single_bid,
            SUM(CASE WHEN c.is_single_bid = 1 THEN c.amount_mxn ELSE 0 END) as single_bid_value
        FROM contracts c
        JOIN sectors s ON c.sector_id = s.id
        WHERE c.is_direct_award = 0
          AND c.amount_mxn > 0
          AND c.amount_mxn < 100000000000
        GROUP BY c.sector_id
        ORDER BY single_bid DESC
    """)

    sector_stats = []
    for row in cursor.fetchall():
        rate = (row['single_bid'] / row['total'] * 100) if row['total'] > 0 else 0
        sector_stats.append({
            'sector': row['sector'],
            'total': row['total'],
            'single_bid': row['single_bid'],
            'rate': rate,
            'value_b': (row['single_bid_value'] or 0) / 1e9
        })

    print("\n  Single-bid rate by sector:")
    for s in sorted(sector_stats, key=lambda x: x['rate'], reverse=True)[:10]:
        print(f"    {s['sector']}: {s['rate']:.1f}% ({s['single_bid']:,} contracts, {s['value_b']:.1f}B MXN)")

    return {
        'pattern': 'single_bidding',
        'detectable': True,
        'total_competitive': total_competitive,
        'total_single_bid': total_single_bid,
        'overall_rate': overall_rate,
        'total_value_b': total_single_bid_value / 1e9,
        'yearly_trend': yearly_stats,
        'by_sector': sector_stats,
        'detection_criteria': 'Competitive procedure with only 1 bidder',
        'recommendation': 'Review single-bid contracts for specification manipulation'
    }


def pattern_7_threshold_splitting(conn: sqlite3.Connection) -> Dict[str, Any]:
    """
    Pattern 7: Threshold Splitting

    Detect same vendor + same institution + same day = multiple contracts.
    This pattern suggests splitting to avoid procurement thresholds.
    """
    print_section("PATTERN 7: Threshold Splitting")
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            vendor_id, institution_id, contract_date,
            COUNT(*) as same_day_count,
            SUM(amount_mxn) as total_value,
            GROUP_CONCAT(id) as contract_ids
        FROM contracts
        WHERE vendor_id IS NOT NULL
          AND institution_id IS NOT NULL
          AND contract_date IS NOT NULL
          AND amount_mxn > 0
          AND amount_mxn < 100000000000
        GROUP BY vendor_id, institution_id, contract_date
        HAVING COUNT(*) >= 2
        ORDER BY same_day_count DESC
    """)

    splitting_patterns = cursor.fetchall()
    print(f"  Potential splitting patterns found: {len(splitting_patterns):,}")

    # Categorize by severity
    splits_2 = [r for r in splitting_patterns if r['same_day_count'] == 2]
    splits_3_4 = [r for r in splitting_patterns if 3 <= r['same_day_count'] <= 4]
    splits_5_plus = [r for r in splitting_patterns if r['same_day_count'] >= 5]

    print(f"  2 contracts same day: {len(splits_2):,}")
    print(f"  3-4 contracts same day: {len(splits_3_4):,}")
    print(f"  5+ contracts same day: {len(splits_5_plus):,}")

    # Get examples of extreme splitting
    examples = []
    if splits_5_plus:
        # Get vendor and institution names
        vendor_ids = set(r['vendor_id'] for r in splits_5_plus[:20])
        inst_ids = set(r['institution_id'] for r in splits_5_plus[:20])

        vendor_names = {}
        if vendor_ids:
            placeholders = ','.join(['?' for _ in vendor_ids])
            cursor.execute(f"SELECT id, name FROM vendors WHERE id IN ({placeholders})", list(vendor_ids))
            vendor_names = {row['id']: row['name'] for row in cursor.fetchall()}

        inst_names = {}
        if inst_ids:
            placeholders = ','.join(['?' for _ in inst_ids])
            cursor.execute(f"SELECT id, name FROM institutions WHERE id IN ({placeholders})", list(inst_ids))
            inst_names = {row['id']: row['name'] for row in cursor.fetchall()}

        for r in splits_5_plus[:10]:
            examples.append({
                'vendor': vendor_names.get(r['vendor_id'], f"ID:{r['vendor_id']}")[:40],
                'institution': inst_names.get(r['institution_id'], f"ID:{r['institution_id']}")[:40],
                'date': r['contract_date'],
                'contracts': r['same_day_count'],
                'total_value_m': (r['total_value'] or 0) / 1e6
            })

    total_split_value = sum((r['total_value'] or 0) for r in splits_5_plus)

    if examples:
        print("\n  Top 10 extreme splitting cases:")
        for i, e in enumerate(examples[:10], 1):
            print(f"    {i}. {e['contracts']} contracts on {e['date']}")
            print(f"       {e['vendor'][:35]}")
            print(f"       {e['institution'][:35]}")
            print(f"       Total: {e['total_value_m']:.1f}M MXN")

    return {
        'pattern': 'threshold_splitting',
        'detectable': True,
        'total_patterns': len(splitting_patterns),
        'splits_2': len(splits_2),
        'splits_3_4': len(splits_3_4),
        'splits_5_plus': len(splits_5_plus),
        'total_split_value_b': total_split_value / 1e9,
        'detection_criteria': 'Same vendor + institution + day, multiple contracts',
        'top_examples': examples,
        'recommendation': 'Review 5+ same-day contracts for deliberate splitting'
    }


def pattern_8_direct_award_concentration(conn: sqlite3.Connection) -> Dict[str, Any]:
    """
    Pattern 8: Direct Award Concentration

    Detect institutions with unusually high direct award rates.
    High rates may indicate:
    - Abuse of exception clauses
    - Avoidance of competitive processes
    - Systematic favoritism
    """
    print_section("PATTERN 8: Direct Award Concentration by Institution")
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            i.id as institution_id,
            i.name as institution_name,
            COUNT(*) as total_contracts,
            SUM(CASE WHEN c.is_direct_award = 1 THEN 1 ELSE 0 END) as direct_awards,
            SUM(c.amount_mxn) as total_value,
            SUM(CASE WHEN c.is_direct_award = 1 THEN c.amount_mxn ELSE 0 END) as direct_value
        FROM contracts c
        JOIN institutions i ON c.institution_id = i.id
        WHERE c.amount_mxn > 0 AND c.amount_mxn < 100000000000
        GROUP BY c.institution_id
        HAVING total_contracts >= 100
        ORDER BY CAST(direct_awards AS REAL) / total_contracts DESC
    """)

    institutions = cursor.fetchall()

    high_rate = []
    for row in institutions:
        rate = (row['direct_awards'] / row['total_contracts'] * 100) if row['total_contracts'] > 0 else 0
        value_rate = (row['direct_value'] / row['total_value'] * 100) if row['total_value'] > 0 else 0

        if rate >= 90:  # 90%+ direct award
            high_rate.append({
                'institution_id': row['institution_id'],
                'institution_name': row['institution_name'][:50],
                'total_contracts': row['total_contracts'],
                'direct_awards': row['direct_awards'],
                'rate': rate,
                'value_rate': value_rate,
                'direct_value_b': (row['direct_value'] or 0) / 1e9
            })

    print(f"  Institutions analyzed (>= 100 contracts): {len(institutions):,}")
    print(f"  Institutions with >= 90% direct award rate: {len(high_rate):,}")

    # Calculate overall
    total_direct = sum(r['direct_awards'] for r in institutions)
    total_all = sum(r['total_contracts'] for r in institutions)
    overall_rate = (total_direct / total_all * 100) if total_all > 0 else 0

    print(f"  Overall direct award rate: {overall_rate:.1f}%")

    if high_rate:
        print("\n  Top 10 institutions by direct award rate:")
        for i, inst in enumerate(sorted(high_rate, key=lambda x: x['direct_value_b'], reverse=True)[:10], 1):
            print(f"    {i}. {inst['institution_name'][:45]}")
            print(f"       Rate: {inst['rate']:.1f}% | {inst['direct_awards']:,} / {inst['total_contracts']:,}")
            print(f"       Direct value: {inst['direct_value_b']:.1f}B MXN")

    return {
        'pattern': 'direct_award_concentration',
        'detectable': True,
        'institutions_analyzed': len(institutions),
        'institutions_high_rate': len(high_rate),
        'overall_rate': overall_rate,
        'detection_criteria': '>= 90% direct award rate',
        'top_institutions': high_rate[:20],
        'recommendation': 'Audit institutions with 90%+ direct award rates'
    }


def main():
    parser = argparse.ArgumentParser(description='Explore detectable patterns in COMPRANET data')
    parser.add_argument('--output-dir', type=str, default='reports', help='Output directory for reports')
    parser.add_argument('--json-output', action='store_true', help='Output JSON report')
    args = parser.parse_args()

    print("=" * 70)
    print("  PATTERN DISCOVERY: What CAN We Detect?")
    print("=" * 70)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Timestamp: {datetime.now()}")
    print("\nThis analysis explores patterns DETECTABLE in COMPRANET data.")
    print("The goal is to identify what patterns warrant investigation,")
    print("not to validate against known corruption cases.")

    conn = get_connection()

    try:
        # Run all pattern detection
        results = {
            'timestamp': datetime.now().isoformat(),
            'database': str(DB_PATH),
            'patterns': {}
        }

        # Pattern 1: Co-bidding clusters
        results['patterns']['co_bidding'] = pattern_1_co_bidding_clusters(conn)

        # Pattern 2: Rotating winners
        results['patterns']['rotating_winners'] = pattern_2_rotating_winners(conn)

        # Pattern 3: Vendor concentration
        results['patterns']['vendor_concentration'] = pattern_3_vendor_concentration(conn)

        # Pattern 4: Year-end spikes
        results['patterns']['year_end_spikes'] = pattern_4_year_end_spikes(conn)

        # Pattern 5: Price anomalies
        results['patterns']['price_anomalies'] = pattern_5_price_anomalies(conn)

        # Pattern 6: Single bidding
        results['patterns']['single_bidding'] = pattern_6_single_bidding(conn)

        # Pattern 7: Threshold splitting
        results['patterns']['threshold_splitting'] = pattern_7_threshold_splitting(conn)

        # Pattern 8: Direct award concentration
        results['patterns']['direct_award_concentration'] = pattern_8_direct_award_concentration(conn)

        # Summary
        print_section("SUMMARY: Detectable Patterns")

        detectable_count = sum(1 for p in results['patterns'].values() if p.get('detectable'))
        print(f"\nPatterns analyzed: 8")
        print(f"Patterns detectable: {detectable_count}")

        print("\nKey findings:")
        print(f"  - Co-bidding clusters: {results['patterns']['co_bidding']['high_confidence_pairs']:,} high-confidence pairs")
        print(f"  - Rotating winners: {results['patterns']['rotating_winners']['high_confidence_patterns']:,} suspicious patterns")
        print(f"  - Vendor concentration: {results['patterns']['vendor_concentration']['institutions_affected']:,} institutions affected")
        print(f"  - Year-end spikes: {results['patterns']['year_end_spikes']['years_with_spikes']} years with significant spikes")
        print(f"  - Price outliers: {results['patterns']['price_anomalies']['total_extreme_outliers']:,} extreme outliers")
        print(f"  - Single bidding: {results['patterns']['single_bidding']['overall_rate']:.1f}% overall rate")
        print(f"  - Threshold splitting: {results['patterns']['threshold_splitting']['splits_5_plus']:,} extreme cases")
        print(f"  - Direct award concentration: {results['patterns']['direct_award_concentration']['institutions_high_rate']:,} high-rate institutions")

        # Save results
        if args.json_output:
            output_dir = Path(args.output_dir)
            output_dir.mkdir(parents=True, exist_ok=True)
            output_file = output_dir / f"pattern_discovery_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

            # Clean up for JSON serialization
            clean_results = json.loads(json.dumps(results, default=str))

            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(clean_results, f, indent=2, ensure_ascii=False)
            print(f"\nResults saved to: {output_file}")

        print("\n" + "=" * 70)
        print("  Pattern discovery complete!")
        print("=" * 70)

        return results

    finally:
        conn.close()


if __name__ == '__main__':
    main()
