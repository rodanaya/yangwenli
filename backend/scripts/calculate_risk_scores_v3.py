"""
RUBLI Risk Scoring v3.0: Enhanced Multi-Level Model

Key enhancements over v2.0:
1. Reweighted factors (redistribute 20% from unavailable factors)
2. Sector-specific baselines (contextual thresholds)
3. Interaction effects (combined patterns catch sophisticated actors)
4. Gradient scoring (near-threshold values get partial scores)

| Factor | Old Weight | New Weight | Rationale |
|--------|------------|------------|-----------|
| Single bidding | 15% | 18% | Highest evidence of favoritism |
| Non-open procedure | 15% | 18% | UNCITRAL primary indicator |
| Price anomaly | 15% | 15% | Keep, enhanced IQR |
| Vendor concentration | 10% | 12% | Sector-contextualized |
| Short ad period | 10% | 12% | Legal compliance indicator |
| Year-end timing | 5% | 8% | IMCO research supports |
| Threshold splitting | 5% | 8% | Enhanced algorithm |
| Network risk | 5% | 9% | Co-bidding patterns |
| Short decision | 10% | 0% | No data available |
| Contract modification | 10% | 0% | No data available |

Interaction Effects (up to 15% bonus):
- single_bid + short_ad_period: +5%
- direct_award + year_end: +4%
- price_anomaly + vendor_concentration: +5%
- threshold_split + same_vendor: +6%
- network_risk + single_bid: +5%

Target Distribution (vs Current):
- Low (<0.2): 60-70% (was 79.6%)
- Medium (0.2-0.4): 20-30% (was 20.3%)
- High (0.4-0.6): 5-10% (was 0.08%)
- Critical (>=0.6): 0.5-2% (was 0%)

Usage:
    python -m scripts.calculate_risk_scores_v3 [--batch-size 10000]
"""

import sys
import sqlite3
import argparse
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Database path
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Amount validation thresholds
MAX_CONTRACT_VALUE = 100_000_000_000  # 100B MXN - reject above this
FLAG_THRESHOLD = 10_000_000_000       # 10B MXN - flag for review

# v3.0 Reweighted factors (sum to 1.0)
# Redistributed 20% from short_decision (10%) and modification (10%)
WEIGHTS_V3 = {
    'single_bid': 0.18,          # +3% (highest evidence of favoritism)
    'non_open': 0.18,            # +3% (UNCITRAL primary indicator)
    'price_anomaly': 0.15,       # unchanged
    'vendor_concentration': 0.12, # +2% (sector-contextualized)
    'short_ad_period': 0.12,     # +2% (legal compliance)
    'year_end': 0.08,            # +3% (IMCO research)
    'threshold_split': 0.08,     # +3% (enhanced detection)
    'network_risk': 0.09,        # +4% (co-bidding patterns)
}

# Interaction effects (bonus on top of base score)
# Based on Italian research showing sophisticated actors avoid single obvious flags
INTERACTION_EFFECTS = {
    ('single_bid', 'short_ad_period'): 0.05,    # Rushed = only 1 bidder
    ('non_open', 'year_end'): 0.04,              # Budget exhaustion
    ('price_anomaly', 'vendor_concentration'): 0.05,  # Monopolist overcharging
    ('threshold_split', 'network_risk'): 0.06,   # Coordinated splitting
    ('network_risk', 'single_bid'): 0.05,        # Connected "competition"
}
MAX_INTERACTION_BONUS = 0.15  # Cap interaction bonus at 15%

# Additional risk weights (not part of base 100%)
ADDITIONAL_WEIGHTS = {
    'industry_mismatch': 0.03,
    'institution_baseline': 0.03,
}

# Institution type risk baselines
INSTITUTION_RISK_BASELINES = {
    'autonomous_constitutional': 0.10,
    'judicial': 0.10,
    'regulatory_agency': 0.15,
    'federal_secretariat': 0.15,
    'legislative': 0.15,
    'military': 0.15,
    'research_education': 0.18,
    'federal_agency': 0.20,
    'educational': 0.20,
    'state_enterprise_finance': 0.22,
    'health_institution': 0.25,
    'state_enterprise_infra': 0.25,
    'social_security': 0.25,
    'other': 0.25,
    'state_enterprise_energy': 0.28,
    'social_program': 0.30,
    'state_government': 0.30,
    'state_agency': 0.30,
    'municipal': 0.35,
}


def ensure_risk_columns(conn: sqlite3.Connection):
    """Add risk score columns if they don't exist."""
    cursor = conn.cursor()

    cursor.execute("PRAGMA table_info(contracts)")
    existing_cols = {row[1] for row in cursor.fetchall()}

    new_columns = [
        ("risk_score", "REAL DEFAULT 0"),
        ("risk_level", "VARCHAR(20)"),
        ("risk_factors", "TEXT"),
        ("risk_model_version", "VARCHAR(10) DEFAULT 'v3.0'"),
    ]

    for col_name, col_def in new_columns:
        if col_name not in existing_cols:
            print(f"Adding column: {col_name}...")
            cursor.execute(f"ALTER TABLE contracts ADD COLUMN {col_name} {col_def}")

    conn.commit()


def load_sector_baselines(conn: sqlite3.Connection) -> dict:
    """Load sector-specific baselines for contextual scoring."""
    cursor = conn.cursor()

    print("Loading sector baselines...")

    # Check if table exists
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='sector_baselines'
    """)
    if not cursor.fetchone():
        print("  WARNING: sector_baselines table not found. Run calculate_sector_baselines.py first.")
        return {}

    cursor.execute("""
        SELECT sector_id, metric_name, percentile_50, percentile_75, percentile_90, red_flag_threshold
        FROM sector_baselines
    """)

    baselines = defaultdict(dict)
    for row in cursor.fetchall():
        sector_id, metric, p50, p75, p90, red_flag = row
        baselines[sector_id][metric] = {
            'median': p50,
            'p75': p75,
            'p90': p90,
            'red_flag': red_flag
        }

    print(f"  Loaded baselines for {len(baselines)} sectors")
    return dict(baselines)


def load_vendor_industries(conn: sqlite3.Connection) -> dict:
    """Load verified vendor industry classifications."""
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

    print(f"  Loaded {len(vendor_industries):,} verified classifications")
    return vendor_industries


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

    concentration = {}
    for vendor_id, sectors in vendor_sector.items():
        max_concentration = 0
        for sector_id, stats in sectors.items():
            if sector_totals[sector_id]['value'] > 0:
                ratio = stats['value'] / sector_totals[sector_id]['value']
                max_concentration = max(max_concentration, ratio)
        concentration[vendor_id] = max_concentration

    print(f"  Calculated concentration for {len(concentration):,} vendors")
    return concentration


def calculate_threshold_splitting_patterns(conn: sqlite3.Connection) -> dict:
    """Detect threshold splitting patterns."""
    cursor = conn.cursor()

    print("Detecting threshold splitting patterns...")

    cursor.execute("""
        SELECT vendor_id, institution_id, contract_date, COUNT(*) as same_day_count
        FROM contracts
        WHERE vendor_id IS NOT NULL
          AND institution_id IS NOT NULL
          AND contract_date IS NOT NULL
        GROUP BY vendor_id, institution_id, contract_date
        HAVING COUNT(*) >= 2
    """)

    patterns = {}
    for row in cursor.fetchall():
        vendor_id, institution_id, contract_date, count = row
        patterns[(vendor_id, institution_id, contract_date)] = count

    total_patterns = len(patterns)
    high_count = sum(1 for c in patterns.values() if c >= 5)
    print(f"  Found {total_patterns:,} splitting patterns ({high_count:,} with 5+ contracts)")

    return patterns


def load_vendor_network_groups(conn: sqlite3.Connection) -> dict:
    """Load vendor network groups for network risk calculation."""
    cursor = conn.cursor()

    print("Loading vendor network groups...")

    cursor.execute("""
        SELECT group_id, COUNT(*) as member_count
        FROM vendor_aliases
        GROUP BY group_id
    """)
    group_sizes = {row[0]: row[1] for row in cursor.fetchall()}

    cursor.execute("SELECT vendor_id, group_id FROM vendor_aliases")

    vendor_groups = {}
    for row in cursor.fetchall():
        vendor_id, group_id = row
        vendor_groups[vendor_id] = {
            'group_id': group_id,
            'member_count': group_sizes.get(group_id, 1)
        }

    print(f"  Loaded {len(vendor_groups):,} vendors in network groups")
    return vendor_groups


def load_institution_types(conn: sqlite3.Connection) -> dict:
    """Load institution types for baseline risk calculation."""
    cursor = conn.cursor()

    print("Loading institution types...")

    cursor.execute("""
        SELECT id, institution_type
        FROM institutions
        WHERE institution_type IS NOT NULL
    """)

    institution_types = {}
    for row in cursor.fetchall():
        inst_id, inst_type = row
        institution_types[inst_id] = inst_type

    print(f"  Loaded {len(institution_types):,} institutions with type info")
    return institution_types


def calculate_gradient_score(value: float, thresholds: list, max_score: float) -> float:
    """
    Calculate gradient score based on thresholds.

    thresholds = [(threshold, score_pct), ...] sorted ascending
    Returns score between 0 and max_score
    """
    if not thresholds:
        return 0.0

    for threshold, score_pct in thresholds:
        if value <= threshold:
            return max_score * score_pct

    return max_score


def calculate_risk_batch_v3(
    conn: sqlite3.Connection,
    contracts: list[dict],
    sector_baselines: dict,
    vendor_concentration: dict,
    vendor_industries: dict,
    splitting_patterns: dict,
    vendor_network: dict,
    institution_types: dict
) -> list[tuple]:
    """Calculate v3.0 risk scores with sector context and interaction effects."""

    results = []

    for c in contracts:
        factors = []
        base_score = 0.0
        triggered_factors = set()

        sector_id = c.get('sector_id')
        vendor_id = c.get('vendor_id')
        institution_id = c.get('institution_id')
        amount = c.get('amount_mxn') or 0

        # Get sector-specific baselines
        sector_base = sector_baselines.get(sector_id, {})

        # CRITICAL: Amount validation
        if amount > MAX_CONTRACT_VALUE:
            amount = 0.0
            factors.append('data_error:amount_rejected')
        elif amount > FLAG_THRESHOLD:
            factors.append('data_flag:amount_flagged')

        # ========== FACTOR 1: Single Bidding (18%) ==========
        if c.get('is_single_bid'):
            base_score += WEIGHTS_V3['single_bid']
            factors.append('single_bid')
            triggered_factors.add('single_bid')

        # ========== FACTOR 2: Non-Open Procedure (18%) ==========
        if c.get('is_direct_award'):
            # Check against sector baseline
            da_baseline = sector_base.get('direct_award_rate', {})
            da_threshold = da_baseline.get('red_flag', 0.90)  # Default 90%

            # Full score for direct award
            base_score += WEIGHTS_V3['non_open']
            factors.append('direct_award')
            triggered_factors.add('non_open')
        elif c.get('procedure_type_normalized') == 'invitacion':
            base_score += WEIGHTS_V3['non_open'] * 0.4  # Partial for restricted
            factors.append('restricted_procedure')
            triggered_factors.add('non_open')

        # ========== FACTOR 3: Price Anomaly (15%) ==========
        if sector_id and amount > 0:
            amount_baseline = sector_base.get('contract_amount', {})
            red_flag = amount_baseline.get('red_flag', amount * 3)  # Default: 3x
            median = amount_baseline.get('median', amount)

            if amount > red_flag:
                # Gradient scoring based on how far above red flag
                ratio = amount / red_flag
                if ratio >= 3.0:
                    score = WEIGHTS_V3['price_anomaly']
                elif ratio >= 2.0:
                    score = WEIGHTS_V3['price_anomaly'] * 0.8
                elif ratio >= 1.5:
                    score = WEIGHTS_V3['price_anomaly'] * 0.6
                else:
                    score = WEIGHTS_V3['price_anomaly'] * 0.4

                base_score += score
                factors.append(f'price_anomaly:{ratio:.1f}x')
                triggered_factors.add('price_anomaly')

        # ========== FACTOR 4: Vendor Concentration (12%) ==========
        if vendor_id in vendor_concentration:
            conc = vendor_concentration[vendor_id]
            conc_baseline = sector_base.get('vendor_concentration', {})
            red_flag = conc_baseline.get('red_flag', 0.30)  # Default 30%

            if conc > red_flag:
                # Gradient based on how far above threshold
                ratio = conc / red_flag
                if ratio >= 2.0:
                    score = WEIGHTS_V3['vendor_concentration']
                elif ratio >= 1.5:
                    score = WEIGHTS_V3['vendor_concentration'] * 0.7
                else:
                    score = WEIGHTS_V3['vendor_concentration'] * 0.5

                base_score += score
                factors.append(f'vendor_concentration:{conc*100:.1f}%')
                triggered_factors.add('vendor_concentration')
            elif conc > red_flag * 0.7:  # Approaching threshold
                base_score += WEIGHTS_V3['vendor_concentration'] * 0.3
                factors.append(f'vendor_concentration_near:{conc*100:.1f}%')

        # ========== FACTOR 5: Short Advertisement Period (12%) ==========
        pub_date = c.get('publication_date')
        contract_date = c.get('contract_date')
        if pub_date and contract_date and pub_date != '' and contract_date != '':
            try:
                from datetime import datetime as dt
                pub = dt.strptime(pub_date, '%Y-%m-%d')
                con = dt.strptime(contract_date, '%Y-%m-%d')
                days = (con - pub).days

                if days >= 0:
                    ad_baseline = sector_base.get('ad_period_days', {})
                    red_flag = ad_baseline.get('red_flag', 5)  # Default 5 days

                    # Gradient scoring - shorter = higher risk
                    if days < red_flag:
                        base_score += WEIGHTS_V3['short_ad_period']
                        factors.append(f'short_ad:{days}d')
                        triggered_factors.add('short_ad_period')
                    elif days < red_flag * 2:
                        base_score += WEIGHTS_V3['short_ad_period'] * 0.6
                        factors.append(f'short_ad:{days}d')
                        triggered_factors.add('short_ad_period')
                    elif days < 15:  # Legal minimum
                        base_score += WEIGHTS_V3['short_ad_period'] * 0.3
                        factors.append(f'short_ad_near:{days}d')
            except (ValueError, TypeError):
                pass

        # ========== FACTOR 6: Year-End Timing (8%) ==========
        if c.get('is_year_end'):
            base_score += WEIGHTS_V3['year_end']
            factors.append('year_end')
            triggered_factors.add('year_end')

        # ========== FACTOR 7: Threshold Splitting (8%) ==========
        if vendor_id and institution_id and contract_date:
            key = (vendor_id, institution_id, contract_date)
            same_day_count = splitting_patterns.get(key, 1)

            if same_day_count >= 5:
                base_score += WEIGHTS_V3['threshold_split']
                factors.append(f'split_{same_day_count}')
                triggered_factors.add('threshold_split')
            elif same_day_count >= 3:
                base_score += WEIGHTS_V3['threshold_split'] * 0.6
                factors.append(f'split_{same_day_count}')
                triggered_factors.add('threshold_split')
            elif same_day_count >= 2:
                base_score += WEIGHTS_V3['threshold_split'] * 0.3
                factors.append(f'split_{same_day_count}')

        # ========== FACTOR 8: Network Risk (9%) ==========
        if vendor_id in vendor_network:
            group_info = vendor_network[vendor_id]
            member_count = group_info['member_count']

            if member_count >= 5:
                base_score += WEIGHTS_V3['network_risk']
                factors.append(f'network_{member_count}')
                triggered_factors.add('network_risk')
            elif member_count >= 3:
                base_score += WEIGHTS_V3['network_risk'] * 0.6
                factors.append(f'network_{member_count}')
                triggered_factors.add('network_risk')
            elif member_count >= 2:
                base_score += WEIGHTS_V3['network_risk'] * 0.3
                factors.append(f'network_{member_count}')

        # ========== INTERACTION EFFECTS (up to 15% bonus) ==========
        interaction_bonus = 0.0
        for (factor1, factor2), bonus in INTERACTION_EFFECTS.items():
            if factor1 in triggered_factors and factor2 in triggered_factors:
                interaction_bonus += bonus
                factors.append(f'interaction:{factor1}+{factor2}')

        interaction_bonus = min(interaction_bonus, MAX_INTERACTION_BONUS)

        # ========== ADDITIONAL: Industry Mismatch (+3%) ==========
        if vendor_id in vendor_industries:
            industry_info = vendor_industries[vendor_id]
            expected_sector = industry_info.get('sector_affinity')
            if expected_sector and sector_id and expected_sector != sector_id:
                base_score += ADDITIONAL_WEIGHTS['industry_mismatch']
                factors.append(f'industry_mismatch:s{sector_id}')

        # ========== ADDITIONAL: Institution Baseline (+3%) ==========
        if institution_id in institution_types:
            inst_type = institution_types[institution_id]
            baseline = INSTITUTION_RISK_BASELINES.get(inst_type, 0.25)
            if baseline > 0.25:
                contribution = (baseline - 0.25) / 0.10 * ADDITIONAL_WEIGHTS['institution_baseline']
                base_score += min(contribution, ADDITIONAL_WEIGHTS['institution_baseline'])
                factors.append(f'inst_risk:{inst_type}')

        # ========== FINAL SCORE ==========
        total_score = base_score + interaction_bonus

        # Determine risk level
        if total_score >= 0.6:
            risk_level = 'critical'
        elif total_score >= 0.4:
            risk_level = 'high'
        elif total_score >= 0.2:
            risk_level = 'medium'
        else:
            risk_level = 'low'

        results.append((
            c['id'],
            round(total_score, 4),
            risk_level,
            ','.join(factors) if factors else None,
            'v3.0'
        ))

    return results


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='RUBLI Risk Scoring v3.0: Enhanced Multi-Level Model'
    )
    parser.add_argument('--batch-size', type=int, default=50000, help='Batch size')
    args = parser.parse_args()

    print("=" * 70)
    print("RUBLI RISK SCORING v3.0: ENHANCED MULTI-LEVEL MODEL")
    print("=" * 70)

    if not DB_PATH.exists():
        print(f"ERROR: Database not found: {DB_PATH}")
        return 1

    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        print(f"\nDatabase: {DB_PATH}")

        # Ensure columns exist
        ensure_risk_columns(conn)

        # Load helper data
        sector_baselines = load_sector_baselines(conn)
        vendor_concentration = calculate_vendor_concentration(conn)
        vendor_industries = load_vendor_industries(conn)
        splitting_patterns = calculate_threshold_splitting_patterns(conn)
        vendor_network = load_vendor_network_groups(conn)
        institution_types = load_institution_types(conn)

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
            cursor.execute("""
                SELECT id, vendor_id, institution_id, sector_id,
                       amount_mxn, is_direct_award, is_single_bid,
                       is_year_end, procedure_type_normalized,
                       publication_date, contract_date
                FROM contracts
                ORDER BY id
                LIMIT ? OFFSET ?
            """, (args.batch_size, offset))

            contracts = [dict(zip(
                ['id', 'vendor_id', 'institution_id', 'sector_id',
                 'amount_mxn', 'is_direct_award', 'is_single_bid',
                 'is_year_end', 'procedure_type_normalized',
                 'publication_date', 'contract_date'],
                row
            )) for row in cursor.fetchall()]

            if not contracts:
                break

            # Calculate risk scores
            results = calculate_risk_batch_v3(
                conn, contracts, sector_baselines, vendor_concentration,
                vendor_industries, splitting_patterns, vendor_network,
                institution_types
            )

            # Update database
            try:
                cursor.execute("BEGIN TRANSACTION")
                cursor.executemany("""
                    UPDATE contracts
                    SET risk_score = ?, risk_level = ?, risk_factors = ?, risk_model_version = ?
                    WHERE id = ?
                """, [(r[1], r[2], r[3], r[4], r[0]) for r in results])
                cursor.execute("COMMIT")
            except Exception as e:
                cursor.execute("ROLLBACK")
                print(f"ERROR: Batch update failed at offset {offset}: {e}")
                raise

            processed += len(contracts)
            offset += args.batch_size

            elapsed = (datetime.now() - start_time).total_seconds()
            rate = processed / elapsed if elapsed > 0 else 0
            print(f"  Processed {processed:,} / {total:,} ({100*processed/total:.1f}%) - {rate:.0f}/sec")

        # Summary statistics
        print("\n" + "=" * 70)
        print("RISK SCORING v3.0 SUMMARY")
        print("=" * 70)

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

        # Interaction effects triggered
        cursor.execute("""
            SELECT risk_factors, COUNT(*) as cnt
            FROM contracts
            WHERE risk_factors LIKE '%interaction:%'
            GROUP BY risk_factors
            ORDER BY cnt DESC
            LIMIT 10
        """)

        print("\nTop Interaction Effects:")
        for row in cursor.fetchall():
            factors, cnt = row
            print(f"  {factors}: {cnt:,}")

        elapsed = (datetime.now() - start_time).total_seconds()
        print(f"\nTotal time: {elapsed:.1f} seconds")
        print(f"Rate: {total/elapsed:.0f} contracts/second")

    except Exception as e:
        print(f"\nFATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        if conn:
            conn.close()

    print("\n" + "=" * 70)
    print("Risk scoring v3.0 complete!")
    print("=" * 70)

    return 0


if __name__ == '__main__':
    sys.exit(main())
