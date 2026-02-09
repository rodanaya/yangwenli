"""
RUBLI Risk Scoring: 8-Factor Model v3.3 (Unified)

Implements IMF CRI-aligned risk scoring methodology.
v3.3 merges the best of v3.0 (redistributed weights, IQR price, interactions)
and v3.2 (co-bidding detection, lowered thresholds).

BASE FACTORS (sum to 100%):
| Factor | Weight | Data Field |
|--------|--------|------------|
| Single bidding | 18% | is_single_bid |
| Non-open procedure | 18% | is_direct_award, procedure_type |
| Price anomaly (IQR) | 18% | amount_mxn vs sector baselines |
| Vendor concentration | 12% | vendor's sector share |
| Short ad period | 12% | days_advertised |
| Year-end timing | 7% | is_year_end |
| Threshold splitting | 7% | same-day/week contracts |
| Network risk | 8% | vendor groups / aliases |

BONUS FACTORS (added on top):
| Industry-sector mismatch | +3% | vendor_classifications |
| Institution risk baseline | +3% | institution_type (taxonomy v2.0) |
| Price hypothesis | +5% | price_hypothesis_confidence (v3.1) |
| Co-bidding risk | +5% | co-bidding patterns (v3.2) |

INTERACTION EFFECTS (up to +15%):
| Pair | Bonus |
|------|-------|
| single_bid + short_ad | +5% |
| non_open + year_end | +4% |
| price_anomaly + vendor_conc | +5% |
| threshold_split + network | +6% |
| network + single_bid | +5% |

v3.3 Changes (from v3.2):
- Redistributed 20% wasted weight (short_decision + modification removed)
- IQR-based price anomaly using sector_price_baselines when available
- Added interaction effects from v3.0 (up to +15% bonus)
- Kept co-bidding detection from v3.2
- Kept v3.2 thresholds: critical >= 0.50, high >= 0.35

Usage:
    python -m scripts.calculate_risk_scores [--batch-size 10000] [--version v3.3]
"""

import sys
import sqlite3
import argparse
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Database path
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Amount validation thresholds (from CLAUDE.md data validation rules)
MAX_CONTRACT_VALUE = 100_000_000_000  # 100B MXN - reject above this
FLAG_THRESHOLD = 10_000_000_000       # 10B MXN - flag for review

# Base risk factor weights (sum to 1.0)
# v3.3: Redistributed 20% from unimplemented short_decision + modification
WEIGHTS = {
    'single_bid': 0.18,           # 18% (was 15%)
    'non_open': 0.18,             # 18% (was 15%)
    'price_anomaly': 0.18,        # 18% (was 15%) - now IQR-based
    'vendor_concentration': 0.12,  # 12% (was 10%)
    'short_ad_period': 0.12,      # 12% (was 10%)
    'year_end': 0.07,             # 7% (was 5%)
    'threshold_split': 0.07,      # 7% (was 5%)
    'network_risk': 0.08,         # 8% (was 5%)
}

# Additional risk weights (bonus factors, not part of base 100%)
ADDITIONAL_WEIGHTS = {
    'industry_mismatch': 0.03,     # Vendor industry doesn't match contract sector
    'institution_baseline': 0.03,  # Institution type risk baseline (0-100% of 0.03)
    'price_hypothesis': 0.05,      # v3.1: High-confidence price hypothesis from IQR analysis
    'co_bidding': 0.05,            # v3.2: Vendors in suspicious co-bidding patterns
}

# v3.3: Interaction effects — correlated risk factors amplify each other
# When BOTH factors in a pair are triggered, add the bonus
INTERACTION_EFFECTS = {
    ('single_bid', 'short_ad_period'): 0.05,          # Single bid + rushed = suspicious
    ('non_open', 'year_end'): 0.04,                    # Direct award in Dec = budget dump
    ('price_anomaly', 'vendor_concentration'): 0.05,   # Overpriced + dominant vendor
    ('threshold_split', 'network_risk'): 0.06,         # Split contracts + related entities
    ('network_risk', 'single_bid'): 0.05,              # Network vendor wins alone
}
MAX_INTERACTION_BONUS = 0.15  # Cap total interaction bonus at 15%

# v3.2: Adjusted risk level thresholds (lowered to increase high-risk detection)
# OECD benchmark expects 2-15% high-risk
RISK_THRESHOLDS = {
    'critical': 0.50,
    'high': 0.35,
    'medium': 0.20,
}

# Institution type risk baselines (from taxonomy v2.0)
# Lower values = lower risk institutions, higher values = higher risk
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
    """Calculate sector-level statistics for price anomaly detection.

    v3.3: Tries to load IQR-based baselines from sector_price_baselines first.
    Falls back to 3x mean if baselines table not available.
    """
    cursor = conn.cursor()

    print("Calculating sector statistics...")

    stats = {}

    # Try IQR-based baselines first (from sector_price_baselines table)
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sector_price_baselines'")
    has_baselines = cursor.fetchone() is not None

    if has_baselines:
        cursor.execute("""
            SELECT sector_id, percentile_50, percentile_75, percentile_90,
                   iqr, upper_fence
            FROM sector_price_baselines
            WHERE contract_type = 'all' AND year IS NULL
              AND percentile_50 > 0
        """)
        for row in cursor.fetchall():
            sector_id = row[0]
            p50, p75, p90, iqr, upper_fence = row[1], row[2], row[3], row[4], row[5]
            stats[sector_id] = {
                'median': p50,
                'p75': p75,
                'p90': p90,
                'iqr': iqr,
                'upper_fence': upper_fence or (p75 + 1.5 * iqr if iqr else p50 * 3),
                'method': 'iqr'
            }
        print(f"  Loaded IQR baselines for {len(stats)} sectors")

    # Fallback: use 3x mean for any missing sectors
    cursor.execute("""
        SELECT sector_id, COUNT(*) as count, AVG(amount_mxn) as mean
        FROM contracts
        WHERE amount_mxn > 0 AND sector_id IS NOT NULL
        GROUP BY sector_id
    """)
    fallback_count = 0
    for row in cursor.fetchall():
        sector_id, count, mean = row
        if sector_id and mean and sector_id not in stats:
            stats[sector_id] = {
                'median': mean,
                'upper_fence': mean * 3,
                'method': 'mean_3x'
            }
            fallback_count += 1

    if fallback_count > 0:
        print(f"  Used 3x mean fallback for {fallback_count} sectors")
    print(f"  Total: {len(stats)} sectors with price baselines")
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


def calculate_threshold_splitting_patterns(conn: sqlite3.Connection) -> dict:
    """
    Detect threshold splitting: same vendor + same institution + same day = suspicious.

    Returns dict mapping (vendor_id, institution_id, contract_date) -> count
    """
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

    # Stats
    splits_2 = sum(1 for c in patterns.values() if c == 2)
    splits_3_4 = sum(1 for c in patterns.values() if 3 <= c <= 4)
    splits_5_plus = sum(1 for c in patterns.values() if c >= 5)

    print(f"  Found {len(patterns):,} potential splitting patterns:")
    print(f"    2 contracts same day: {splits_2:,}")
    print(f"    3-4 contracts same day: {splits_3_4:,}")
    print(f"    5+ contracts same day: {splits_5_plus:,}")

    return patterns


def load_vendor_network_groups(conn: sqlite3.Connection) -> dict:
    """
    Load vendor groups for network risk calculation.

    Vendors in the same group have network exposure (potential coordinated bidding).
    Returns dict mapping vendor_id -> {'group_id': X, 'member_count': Y}
    """
    cursor = conn.cursor()

    print("Loading vendor network groups...")

    # Get group sizes
    cursor.execute("""
        SELECT group_id, COUNT(*) as member_count
        FROM vendor_aliases
        GROUP BY group_id
    """)
    group_sizes = {row[0]: row[1] for row in cursor.fetchall()}

    # Map vendors to their groups
    cursor.execute("""
        SELECT vendor_id, group_id
        FROM vendor_aliases
    """)

    vendor_groups = {}
    for row in cursor.fetchall():
        vendor_id, group_id = row
        vendor_groups[vendor_id] = {
            'group_id': group_id,
            'member_count': group_sizes.get(group_id, 1)
        }

    # Stats
    total_vendors = len(vendor_groups)
    large_groups = sum(1 for v in vendor_groups.values() if v['member_count'] >= 5)
    medium_groups = sum(1 for v in vendor_groups.values() if 3 <= v['member_count'] < 5)
    small_groups = sum(1 for v in vendor_groups.values() if v['member_count'] == 2)

    print(f"  Loaded {total_vendors:,} vendors in network groups:")
    print(f"    Large groups (5+): {large_groups:,} vendors")
    print(f"    Medium groups (3-4): {medium_groups:,} vendors")
    print(f"    Small groups (2): {small_groups:,} vendors")

    return vendor_groups


def load_institution_risk_baselines(conn: sqlite3.Connection) -> dict:
    """
    Load institution type for risk baseline calculation.

    Returns dict mapping institution_id -> institution_type
    """
    cursor = conn.cursor()

    print("Loading institution risk baselines...")

    cursor.execute("""
        SELECT id, institution_type
        FROM institutions
        WHERE institution_type IS NOT NULL
    """)

    institution_types = {}
    type_counts = defaultdict(int)

    for row in cursor.fetchall():
        inst_id, inst_type = row
        institution_types[inst_id] = inst_type
        type_counts[inst_type] += 1

    # Stats
    total = len(institution_types)
    high_risk = sum(1 for t in institution_types.values()
                    if INSTITUTION_RISK_BASELINES.get(t, 0.25) >= 0.30)
    low_risk = sum(1 for t in institution_types.values()
                   if INSTITUTION_RISK_BASELINES.get(t, 0.25) <= 0.15)

    print(f"  Loaded {total:,} institutions with type info:")
    print(f"    High risk baseline (>=0.30): {high_risk:,} institutions")
    print(f"    Low risk baseline (<=0.15): {low_risk:,} institutions")

    return institution_types


def calculate_co_bidding_risk(conn: sqlite3.Connection, min_co_bids: int = 10, min_rate: float = 0.50) -> dict:
    """
    Calculate co-bidding risk for vendors in suspicious co-bidding patterns.

    Vendors that frequently appear in the same procedures may be engaged in bid-rigging.

    Args:
        min_co_bids: Minimum co-bids to be flagged (default: 10)
        min_rate: Minimum co-bid rate to be flagged (default: 50%)

    Returns:
        Dict mapping vendor_id -> {'co_bid_count': X, 'max_rate': Y, 'partners': [ids]}
    """
    cursor = conn.cursor()

    print("Calculating co-bidding risk patterns...")

    # Find procedure participation for vendors with enough history
    cursor.execute("""
        SELECT vendor_id, procedure_number
        FROM contracts
        WHERE vendor_id IS NOT NULL
          AND procedure_number IS NOT NULL
          AND procedure_number != ''
    """)

    # Build vendor -> procedures mapping
    vendor_procedures = defaultdict(set)
    procedure_vendors = defaultdict(set)

    for row in cursor.fetchall():
        vendor_id, proc = row
        vendor_procedures[vendor_id].add(proc)
        procedure_vendors[proc].add(vendor_id)

    # Filter vendors with enough procedures (>= 5)
    active_vendors = {v for v, procs in vendor_procedures.items() if len(procs) >= 5}
    print(f"  Active vendors (>= 5 procedures): {len(active_vendors):,}")

    # Find co-bidding pairs
    co_bid_counts = defaultdict(int)
    vendor_total_procs = {}

    for vendor_id in active_vendors:
        procs = vendor_procedures[vendor_id]
        vendor_total_procs[vendor_id] = len(procs)

        # Find all other vendors that appeared in the same procedures
        for proc in procs:
            for other_vendor in procedure_vendors[proc]:
                if other_vendor != vendor_id and other_vendor in active_vendors:
                    pair = tuple(sorted([vendor_id, other_vendor]))
                    co_bid_counts[pair] += 1

    # Identify suspicious pairs (high co-bid rate)
    suspicious_vendors = defaultdict(lambda: {'co_bid_count': 0, 'max_rate': 0, 'partners': []})

    for (v1, v2), count in co_bid_counts.items():
        if count >= min_co_bids:
            # Calculate co-bid rates
            rate_v1 = count / vendor_total_procs[v1] if vendor_total_procs[v1] > 0 else 0
            rate_v2 = count / vendor_total_procs[v2] if vendor_total_procs[v2] > 0 else 0

            # Flag if either vendor has high co-bid rate
            if rate_v1 >= min_rate or rate_v2 >= min_rate:
                max_rate = max(rate_v1, rate_v2)

                # Update vendor 1
                if max_rate > suspicious_vendors[v1]['max_rate']:
                    suspicious_vendors[v1]['max_rate'] = max_rate
                suspicious_vendors[v1]['co_bid_count'] += count
                suspicious_vendors[v1]['partners'].append(v2)

                # Update vendor 2
                if max_rate > suspicious_vendors[v2]['max_rate']:
                    suspicious_vendors[v2]['max_rate'] = max_rate
                suspicious_vendors[v2]['co_bid_count'] += count
                suspicious_vendors[v2]['partners'].append(v1)

    # Stats
    high_risk = sum(1 for v in suspicious_vendors.values() if v['max_rate'] >= 0.80)
    medium_risk = sum(1 for v in suspicious_vendors.values() if 0.50 <= v['max_rate'] < 0.80)

    print(f"  Suspicious co-bidding vendors: {len(suspicious_vendors):,}")
    print(f"    High risk (>= 80% co-bid rate): {high_risk:,}")
    print(f"    Medium risk (50-80% co-bid rate): {medium_risk:,}")

    return dict(suspicious_vendors)


def calculate_risk_batch(
    conn: sqlite3.Connection,
    contracts: list[dict],
    sector_stats: dict,
    vendor_concentration: dict,
    vendor_industries: dict = None,
    splitting_patterns: dict = None,
    vendor_network: dict = None,
    institution_types: dict = None,
    co_bidding_risk: dict = None
) -> list[tuple]:
    """Calculate risk scores for a batch of contracts.

    Args:
        vendor_industries: Dict mapping vendor_id to industry info with sector_affinity
        splitting_patterns: Dict mapping (vendor_id, institution_id, date) -> count
        vendor_network: Dict mapping vendor_id -> {'group_id': X, 'member_count': Y}
        institution_types: Dict mapping institution_id -> institution_type
        co_bidding_risk: Dict mapping vendor_id -> {'max_rate': X, 'co_bid_count': Y}
    """
    results = []
    vendor_industries = vendor_industries or {}
    splitting_patterns = splitting_patterns or {}
    vendor_network = vendor_network or {}
    institution_types = institution_types or {}
    co_bidding_risk = co_bidding_risk or {}

    from datetime import datetime as dt

    for c in contracts:
        factors = []
        score = 0.0
        triggered = set()  # Track which base factors fired (for interaction effects)

        # Factor 1: Single Bidding (18%)
        if c.get('is_single_bid'):
            score += WEIGHTS['single_bid']
            factors.append('single_bid')
            triggered.add('single_bid')

        # Factor 2: Non-Open Procedure (18%)
        if c.get('is_direct_award'):
            score += WEIGHTS['non_open']
            factors.append('direct_award')
            triggered.add('non_open')
        elif c.get('procedure_type_normalized') == 'invitacion':
            score += WEIGHTS['non_open'] * 0.5
            factors.append('restricted_procedure')
            triggered.add('non_open')

        # Factor 3: Price Anomaly (18%) — IQR-based when available
        sector_id = c.get('sector_id')
        amount = c.get('amount_mxn') or 0

        # CRITICAL: Amount validation
        if amount > MAX_CONTRACT_VALUE:
            amount = 0.0
            factors.append('data_error:amount_rejected')
        elif amount > FLAG_THRESHOLD:
            factors.append('data_flag:amount_flagged')

        if sector_id in sector_stats and amount > 0:
            ss = sector_stats[sector_id]
            fence = ss.get('upper_fence', ss.get('median', 1) * 3)
            if fence > 0 and amount > fence:
                ratio = amount / fence
                # Gradient scoring based on how far above the fence
                if ratio >= 3.0:
                    score += WEIGHTS['price_anomaly']           # Full 18%
                elif ratio >= 2.0:
                    score += WEIGHTS['price_anomaly'] * 0.8     # ~14%
                elif ratio >= 1.5:
                    score += WEIGHTS['price_anomaly'] * 0.6     # ~11%
                else:
                    score += WEIGHTS['price_anomaly'] * 0.4     # ~7%
                factors.append('price_anomaly')
                triggered.add('price_anomaly')

        # Factor 4: Vendor Concentration (12%)
        vendor_id = c.get('vendor_id')
        if vendor_id in vendor_concentration:
            conc = vendor_concentration[vendor_id]
            if conc > 0.30:
                score += WEIGHTS['vendor_concentration']
                factors.append('vendor_concentration_high')
                triggered.add('vendor_concentration')
            elif conc > 0.20:
                score += WEIGHTS['vendor_concentration'] * 0.7
                factors.append('vendor_concentration_med')
                triggered.add('vendor_concentration')
            elif conc > 0.10:
                score += WEIGHTS['vendor_concentration'] * 0.5
                factors.append('vendor_concentration_low')

        # Factor 5: Short Advertisement Period (12%)
        pub_date = c.get('publication_date')
        contract_date = c.get('contract_date')
        if pub_date and contract_date and pub_date != '' and contract_date != '':
            try:
                pub = dt.strptime(pub_date, '%Y-%m-%d')
                con = dt.strptime(contract_date, '%Y-%m-%d')
                days = (con - pub).days
                if days >= 0:
                    if days < 5:
                        score += WEIGHTS['short_ad_period']
                        factors.append('short_ad_<5d')
                        triggered.add('short_ad_period')
                    elif days < 15:
                        score += WEIGHTS['short_ad_period'] * 0.7
                        factors.append('short_ad_<15d')
                        triggered.add('short_ad_period')
                    elif days < 30:
                        score += WEIGHTS['short_ad_period'] * 0.3
                        factors.append('short_ad_<30d')
            except (ValueError, TypeError):
                pass

        # Factor 6: Year-End Timing (7%)
        if c.get('is_year_end'):
            score += WEIGHTS['year_end']
            factors.append('year_end')
            triggered.add('year_end')

        # Factor 7: Threshold Splitting (7%)
        vendor_id = c.get('vendor_id')
        institution_id = c.get('institution_id')
        contract_date = c.get('contract_date')
        if vendor_id and institution_id and contract_date:
            key = (vendor_id, institution_id, contract_date)
            same_day_count = splitting_patterns.get(key, 1)
            if same_day_count >= 5:
                score += WEIGHTS['threshold_split']
                factors.append(f'split_{same_day_count}')
                triggered.add('threshold_split')
            elif same_day_count >= 3:
                score += WEIGHTS['threshold_split'] * 0.6
                factors.append(f'split_{same_day_count}')
                triggered.add('threshold_split')
            elif same_day_count >= 2:
                score += WEIGHTS['threshold_split'] * 0.3
                factors.append(f'split_{same_day_count}')

        # Factor 8: Network Risk (8%)
        vendor_id = c.get('vendor_id')
        if vendor_id in vendor_network:
            group_info = vendor_network[vendor_id]
            member_count = group_info['member_count']
            if member_count >= 5:
                score += WEIGHTS['network_risk']
                factors.append(f'network_{member_count}')
                triggered.add('network_risk')
            elif member_count >= 3:
                score += WEIGHTS['network_risk'] * 0.6
                factors.append(f'network_{member_count}')
                triggered.add('network_risk')
            elif member_count >= 2:
                score += WEIGHTS['network_risk'] * 0.3
                factors.append(f'network_{member_count}')

        # v3.3: INTERACTION EFFECTS (up to +15%)
        interaction_bonus = 0.0
        for (f1, f2), bonus in INTERACTION_EFFECTS.items():
            if f1 in triggered and f2 in triggered:
                interaction_bonus += bonus
                factors.append(f'interaction:{f1}+{f2}')
        interaction_bonus = min(interaction_bonus, MAX_INTERACTION_BONUS)
        score += interaction_bonus

        # ADDITIONAL: Industry-Sector Mismatch (+3%)
        vendor_id = c.get('vendor_id')
        if vendor_id in vendor_industries:
            industry_info = vendor_industries[vendor_id]
            expected_sector = industry_info.get('sector_affinity')
            actual_sector = c.get('sector_id')
            if expected_sector and actual_sector and expected_sector != actual_sector:
                score += ADDITIONAL_WEIGHTS['industry_mismatch']
                factors.append(f'industry_mismatch:{industry_info["industry_code"]}->s{actual_sector}')

        # ADDITIONAL: Institution Risk Baseline (+3% scaled)
        institution_id = c.get('institution_id')
        if institution_id in institution_types:
            inst_type = institution_types[institution_id]
            baseline = INSTITUTION_RISK_BASELINES.get(inst_type, 0.25)
            if baseline > 0.25:
                contribution = (baseline - 0.25) / 0.10 * ADDITIONAL_WEIGHTS['institution_baseline']
                score += min(contribution, ADDITIONAL_WEIGHTS['institution_baseline'])
                factors.append(f'inst_risk:{inst_type}')

        # ADDITIONAL (v3.1): Price Hypothesis (+5% max)
        price_hyp_conf = c.get('price_hypothesis_confidence')
        price_hyp_type = c.get('price_hypothesis_type')
        if price_hyp_conf is not None:
            if price_hyp_conf >= 0.85:
                score += ADDITIONAL_WEIGHTS['price_hypothesis']
                factors.append(f'price_hyp:{price_hyp_type}:{price_hyp_conf:.2f}')
            elif price_hyp_conf >= 0.65:
                score += ADDITIONAL_WEIGHTS['price_hypothesis'] * 0.6
                factors.append(f'price_hyp:{price_hyp_type}:{price_hyp_conf:.2f}')

        # ADDITIONAL (v3.2): Co-Bidding Risk (+5% max)
        vendor_id = c.get('vendor_id')
        if vendor_id in co_bidding_risk:
            co_bid_info = co_bidding_risk[vendor_id]
            max_rate = co_bid_info['max_rate']
            partner_count = len(co_bid_info.get('partners', []))
            if max_rate >= 0.80:
                score += ADDITIONAL_WEIGHTS['co_bidding']
                factors.append(f'co_bid_high:{max_rate:.0%}:{partner_count}p')
            elif max_rate >= 0.50:
                score += ADDITIONAL_WEIGHTS['co_bidding'] * 0.6
                factors.append(f'co_bid_med:{max_rate:.0%}:{partner_count}p')

        # Determine risk level
        if score >= RISK_THRESHOLDS['critical']:
            risk_level = 'critical'
        elif score >= RISK_THRESHOLDS['high']:
            risk_level = 'high'
        elif score >= RISK_THRESHOLDS['medium']:
            risk_level = 'medium'
        else:
            risk_level = 'low'

        # Cap score at 1.0 — bonus/interaction effects can push above 1.0
        score = min(score, 1.0)

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
        description='RUBLI Risk Scoring: 8-Factor Model v3.3 (Unified)'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=50000,
        help='Batch size for processing'
    )
    parser.add_argument(
        '--version',
        type=str,
        default='v3.3',
        help='Model version (default: v3.3)'
    )
    args = parser.parse_args()

    print("=" * 60)
    print(f"RUBLI Risk Scoring: IMF CRI Model {args.version}")
    print("=" * 60)
    print(f"\nModel version: {args.version}")
    print("  - 8 base factors (100% weight, no wasted stubs)")
    print("  - IQR-based price anomaly with sector baselines")
    print("  - Interaction effects: up to +15% bonus")
    print("  - Co-bidding risk integration: ENABLED")
    print(f"  - Thresholds: critical >= {RISK_THRESHOLDS['critical']}, high >= {RISK_THRESHOLDS['high']}")
    print("  - Price hypothesis integration: ENABLED")
    print(f"  - Bonus factors: industry_mismatch, institution_baseline, co_bidding, price_hypothesis")

    if not DB_PATH.exists():
        print(f"ERROR: Database not found: {DB_PATH}")
        return 1

    conn = None
    try:
        conn = sqlite3.connect(DB_PATH, timeout=60)  # 60 second timeout
        cursor = conn.cursor()
        # Enable WAL mode for better concurrency
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=60000")  # 60 second busy timeout
        print(f"\nDatabase: {DB_PATH}")

        # Ensure columns exist
        ensure_risk_columns(conn)

        # Calculate helper statistics
        sector_stats = calculate_sector_stats(conn)
        vendor_concentration = calculate_vendor_concentration(conn)
        vendor_industries = load_vendor_industries(conn)
        splitting_patterns = calculate_threshold_splitting_patterns(conn)
        vendor_network = load_vendor_network_groups(conn)
        institution_types = load_institution_risk_baselines(conn)
        co_bidding_risk = calculate_co_bidding_risk(conn)

        # Get total contracts
        cursor.execute("SELECT COUNT(*) FROM contracts")
        total = cursor.fetchone()[0]
        print(f"\nTotal contracts to process: {total:,}")

        # Process in batches with explicit transaction handling
        print(f"\nProcessing in batches of {args.batch_size:,}...")
        start_time = datetime.now()

        processed = 0
        offset = 0

        while offset < total:
            # Use parameterized query for LIMIT/OFFSET
            cursor.execute("""
                SELECT id, vendor_id, institution_id, sector_id,
                       amount_mxn, is_direct_award, is_single_bid,
                       is_year_end, procedure_type_normalized,
                       publication_date, contract_date,
                       price_hypothesis_confidence, price_hypothesis_type
                FROM contracts
                ORDER BY id
                LIMIT ? OFFSET ?
            """, (args.batch_size, offset))

            contracts = [dict(zip(
                ['id', 'vendor_id', 'institution_id', 'sector_id',
                 'amount_mxn', 'is_direct_award', 'is_single_bid',
                 'is_year_end', 'procedure_type_normalized',
                 'publication_date', 'contract_date',
                 'price_hypothesis_confidence', 'price_hypothesis_type'],
                row
            )) for row in cursor.fetchall()]

            if not contracts:
                break

            # Calculate risk scores
            results = calculate_risk_batch(
                conn, contracts, sector_stats, vendor_concentration,
                vendor_industries, splitting_patterns, vendor_network,
                institution_types, co_bidding_risk
            )

            # Update database with retry logic for lock handling
            import time
            max_retries = 5
            retry_delay = 2
            for attempt in range(max_retries):
                try:
                    cursor.execute("BEGIN IMMEDIATE TRANSACTION")
                    cursor.executemany("""
                        UPDATE contracts
                        SET risk_score = ?, risk_level = ?, risk_factors = ?
                        WHERE id = ?
                    """, [(r[1], r[2], r[3], r[0]) for r in results])
                    cursor.execute("COMMIT")
                    break  # Success
                except sqlite3.OperationalError as e:
                    if "locked" in str(e) and attempt < max_retries - 1:
                        try:
                            cursor.execute("ROLLBACK")
                        except:
                            pass
                        print(f"  Database locked, retry {attempt + 1}/{max_retries}...")
                        time.sleep(retry_delay)
                    else:
                        try:
                            cursor.execute("ROLLBACK")
                        except:
                            pass
                        print(f"ERROR: Batch update failed at offset {offset}: {e}")
                        raise
                except Exception as e:
                    try:
                        cursor.execute("ROLLBACK")
                    except:
                        pass
                    print(f"ERROR: Batch update failed at offset {offset}: {e}")
                    raise

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

    except Exception as e:
        print(f"\nFATAL ERROR: {e}")
        raise
    finally:
        if conn:
            conn.close()

    print("\n" + "=" * 60)
    print("Risk scoring complete!")
    print("=" * 60)

    return 0


if __name__ == '__main__':
    sys.exit(main())
