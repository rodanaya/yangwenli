#!/usr/bin/env python3
"""
Institution Period Validation

Compare institutions during known scandal periods vs control periods.
This provides indirect validation by testing whether risk scores are elevated
during periods when we know problems existed.

Analysis Periods:
1. Health Sector (COVID): 2020-2021 (scandal) vs 2018-2019 (control)
2. Social Programs (SEDESOL): 2013-2018 (scandal) vs 2010-2012 (control)
3. Energy Sector (Odebrecht): 2010-2016 (scandal) vs 2017-2025 (control)

Hypothesis: Average risk scores should be higher during scandal periods.

Statistical Tests:
- T-test for mean risk score comparison
- Mann-Whitney U for non-parametric comparison
- Effect size (Cohen's d)

Usage:
    python backend/scripts/validate_institution_periods.py [--output-dir reports]
"""

import sqlite3
import argparse
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Tuple, Optional
import math

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Institution period configurations for scandal analysis
SCANDAL_PERIODS = {
    'health_covid': {
        'name': 'Health Sector (COVID Pandemic)',
        'description': 'IMSS, ISSSTE, SSA during COVID emergency procurement',
        'institution_types': ['health_institution', 'social_security'],
        'sector_ids': [1],  # salud
        'scandal_period': (2020, 2021),
        'control_period': (2018, 2019),
        'expected_elevation': 'Higher risk due to emergency procedures, reduced oversight',
        'source': 'IMCO COVID procurement analysis, ASF audits'
    },
    'social_sedesol': {
        'name': 'Social Programs (Estafa Maestra Era)',
        'description': 'SEDESOL/Bienestar during documented fraud schemes',
        'institution_types': ['social_program', 'federal_secretariat'],
        'sector_ids': [8],  # gobernacion (includes social)
        'scandal_period': (2013, 2018),
        'control_period': (2010, 2012),
        'expected_elevation': 'Higher risk from documented ghost company schemes',
        'source': 'ASF Estafa Maestra reports, Animal Politico investigation'
    },
    'energy_odebrecht': {
        'name': 'Energy Sector (Odebrecht Era)',
        'description': 'PEMEX, CFE during Odebrecht bribery period',
        'institution_types': ['state_enterprise_energy'],
        'sector_ids': [4],  # energia
        'scandal_period': (2010, 2016),
        'control_period': (2017, 2024),
        'expected_elevation': 'Higher risk from documented bribery, favoritism',
        'source': 'DOJ Odebrecht plea, Mexican investigations'
    }
}


def get_connection() -> sqlite3.Connection:
    """Get database connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def calculate_statistics(values: List[float]) -> Dict[str, float]:
    """Calculate basic statistics for a list of values."""
    if not values:
        return {'mean': 0, 'median': 0, 'std': 0, 'n': 0}

    n = len(values)
    mean = sum(values) / n

    # Median
    sorted_values = sorted(values)
    if n % 2 == 0:
        median = (sorted_values[n//2 - 1] + sorted_values[n//2]) / 2
    else:
        median = sorted_values[n//2]

    # Standard deviation
    variance = sum((x - mean) ** 2 for x in values) / n if n > 0 else 0
    std = math.sqrt(variance)

    return {
        'mean': mean,
        'median': median,
        'std': std,
        'n': n,
        'min': min(values) if values else 0,
        'max': max(values) if values else 0
    }


def t_test(group1: List[float], group2: List[float]) -> Tuple[float, float]:
    """
    Perform independent samples t-test.
    Returns (t_statistic, p_value approximation)
    """
    if len(group1) < 2 or len(group2) < 2:
        return 0, 1.0

    n1, n2 = len(group1), len(group2)
    mean1 = sum(group1) / n1
    mean2 = sum(group2) / n2

    var1 = sum((x - mean1) ** 2 for x in group1) / (n1 - 1)
    var2 = sum((x - mean2) ** 2 for x in group2) / (n2 - 1)

    # Pooled standard error
    se = math.sqrt(var1/n1 + var2/n2)

    if se == 0:
        return 0, 1.0

    t = (mean1 - mean2) / se

    # Degrees of freedom (Welch's approximation)
    df_num = (var1/n1 + var2/n2) ** 2
    df_denom = ((var1/n1)**2 / (n1-1)) + ((var2/n2)**2 / (n2-1))
    df = df_num / df_denom if df_denom > 0 else 1

    # Approximate p-value using normal distribution for large samples
    # For proper implementation, use scipy.stats.t.sf
    p_value = 2 * (1 - normal_cdf(abs(t)))

    return t, p_value


def normal_cdf(x: float) -> float:
    """Approximate cumulative distribution function for standard normal."""
    # Using error function approximation
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))


def mann_whitney_u(group1: List[float], group2: List[float]) -> Tuple[float, float]:
    """
    Perform Mann-Whitney U test (non-parametric).
    Returns (U_statistic, approximate p_value)
    """
    if len(group1) < 2 or len(group2) < 2:
        return 0, 1.0

    n1, n2 = len(group1), len(group2)

    # Combine and rank
    combined = [(v, 1) for v in group1] + [(v, 2) for v in group2]
    combined.sort(key=lambda x: x[0])

    # Assign ranks
    ranks = {}
    i = 0
    while i < len(combined):
        j = i
        while j < len(combined) and combined[j][0] == combined[i][0]:
            j += 1
        avg_rank = (i + j + 1) / 2  # 1-indexed
        for k in range(i, j):
            if combined[k][1] == 1:
                ranks.setdefault(1, []).append(avg_rank)
            else:
                ranks.setdefault(2, []).append(avg_rank)
        i = j

    R1 = sum(ranks.get(1, [0]))
    U1 = R1 - n1 * (n1 + 1) / 2
    U2 = n1 * n2 - U1
    U = min(U1, U2)

    # Normal approximation for p-value
    mean_U = n1 * n2 / 2
    std_U = math.sqrt(n1 * n2 * (n1 + n2 + 1) / 12)

    if std_U == 0:
        return U, 1.0

    z = (U - mean_U) / std_U
    p_value = 2 * (1 - normal_cdf(abs(z)))

    return U, p_value


def cohens_d(group1: List[float], group2: List[float]) -> float:
    """Calculate Cohen's d effect size."""
    if len(group1) < 2 or len(group2) < 2:
        return 0

    n1, n2 = len(group1), len(group2)
    mean1 = sum(group1) / n1
    mean2 = sum(group2) / n2

    var1 = sum((x - mean1) ** 2 for x in group1) / (n1 - 1)
    var2 = sum((x - mean2) ** 2 for x in group2) / (n2 - 1)

    # Pooled standard deviation
    pooled_std = math.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2))

    if pooled_std == 0:
        return 0

    return (mean1 - mean2) / pooled_std


def analyze_period(conn: sqlite3.Connection, config: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze a single scandal/control period comparison."""
    cursor = conn.cursor()
    name = config['name']
    scandal_start, scandal_end = config['scandal_period']
    control_start, control_end = config['control_period']

    print(f"\n  Analyzing: {name}")
    print(f"  Scandal period: {scandal_start}-{scandal_end}")
    print(f"  Control period: {control_start}-{control_end}")

    # Build institution filter
    inst_types = config.get('institution_types', [])
    sector_ids = config.get('sector_ids', [])

    # Get scandal period data
    query = """
        SELECT
            c.risk_score,
            c.is_direct_award,
            c.is_single_bid,
            c.amount_mxn
        FROM contracts c
        JOIN institutions i ON c.institution_id = i.id
        WHERE c.contract_year >= ? AND c.contract_year <= ?
          AND c.risk_score IS NOT NULL
          AND c.amount_mxn > 0
          AND c.amount_mxn < 100000000000
    """
    params_scandal = [scandal_start, scandal_end]
    params_control = [control_start, control_end]

    if inst_types:
        placeholders = ','.join(['?' for _ in inst_types])
        query += f" AND i.institution_type IN ({placeholders})"
        params_scandal.extend(inst_types)
        params_control.extend(inst_types)

    if sector_ids:
        placeholders = ','.join(['?' for _ in sector_ids])
        query += f" AND c.sector_id IN ({placeholders})"
        params_scandal.extend(sector_ids)
        params_control.extend(sector_ids)

    # Get scandal period data
    cursor.execute(query, params_scandal)
    scandal_data = cursor.fetchall()

    scandal_risks = [row['risk_score'] for row in scandal_data if row['risk_score'] is not None]
    scandal_direct = sum(1 for row in scandal_data if row['is_direct_award'])
    scandal_single = sum(1 for row in scandal_data if row['is_single_bid'])
    scandal_total = len(scandal_data)
    scandal_value = sum(row['amount_mxn'] for row in scandal_data if row['amount_mxn'])

    # Get control period data
    cursor.execute(query, params_control)
    control_data = cursor.fetchall()

    control_risks = [row['risk_score'] for row in control_data if row['risk_score'] is not None]
    control_direct = sum(1 for row in control_data if row['is_direct_award'])
    control_single = sum(1 for row in control_data if row['is_single_bid'])
    control_total = len(control_data)
    control_value = sum(row['amount_mxn'] for row in control_data if row['amount_mxn'])

    print(f"  Scandal period contracts: {scandal_total:,}")
    print(f"  Control period contracts: {control_total:,}")

    # Calculate statistics
    scandal_stats = calculate_statistics(scandal_risks)
    control_stats = calculate_statistics(control_risks)

    print(f"\n  Risk score comparison:")
    print(f"    Scandal mean: {scandal_stats['mean']:.4f} (std: {scandal_stats['std']:.4f})")
    print(f"    Control mean: {control_stats['mean']:.4f} (std: {control_stats['std']:.4f})")

    # Statistical tests
    t_stat, t_pvalue = t_test(scandal_risks, control_risks)
    u_stat, u_pvalue = mann_whitney_u(scandal_risks, control_risks)
    effect_size = cohens_d(scandal_risks, control_risks)

    print(f"\n  Statistical tests:")
    print(f"    T-test: t={t_stat:.3f}, p={t_pvalue:.4f}")
    print(f"    Mann-Whitney U: U={u_stat:.0f}, p={u_pvalue:.4f}")
    print(f"    Cohen's d: {effect_size:.3f}")

    # Interpret effect size
    if abs(effect_size) < 0.2:
        effect_interpretation = "negligible"
    elif abs(effect_size) < 0.5:
        effect_interpretation = "small"
    elif abs(effect_size) < 0.8:
        effect_interpretation = "medium"
    else:
        effect_interpretation = "large"

    # Determine if hypothesis confirmed
    hypothesis_confirmed = (
        scandal_stats['mean'] > control_stats['mean'] and
        t_pvalue < 0.05
    )

    direction = "higher" if scandal_stats['mean'] > control_stats['mean'] else "lower"
    difference = abs(scandal_stats['mean'] - control_stats['mean'])
    pct_difference = (difference / control_stats['mean'] * 100) if control_stats['mean'] > 0 else 0

    print(f"\n  Result: Scandal period risk is {direction} by {pct_difference:.1f}%")
    print(f"  Statistically significant (p<0.05): {'YES' if t_pvalue < 0.05 else 'NO'}")
    print(f"  Effect size: {effect_interpretation}")
    print(f"  Hypothesis confirmed: {'YES' if hypothesis_confirmed else 'NO'}")

    # Additional metrics
    scandal_direct_rate = (scandal_direct / scandal_total * 100) if scandal_total > 0 else 0
    control_direct_rate = (control_direct / control_total * 100) if control_total > 0 else 0
    scandal_single_rate = (scandal_single / max(1, scandal_total - scandal_direct) * 100) if scandal_total > scandal_direct else 0
    control_single_rate = (control_single / max(1, control_total - control_direct) * 100) if control_total > control_direct else 0

    return {
        'name': name,
        'description': config['description'],
        'scandal_period': config['scandal_period'],
        'control_period': config['control_period'],
        'scandal_stats': {
            'contracts': scandal_total,
            'value_b': scandal_value / 1e9,
            'mean_risk': scandal_stats['mean'],
            'median_risk': scandal_stats['median'],
            'std_risk': scandal_stats['std'],
            'direct_award_rate': scandal_direct_rate,
            'single_bid_rate': scandal_single_rate
        },
        'control_stats': {
            'contracts': control_total,
            'value_b': control_value / 1e9,
            'mean_risk': control_stats['mean'],
            'median_risk': control_stats['median'],
            'std_risk': control_stats['std'],
            'direct_award_rate': control_direct_rate,
            'single_bid_rate': control_single_rate
        },
        'comparison': {
            'direction': direction,
            'difference': difference,
            'pct_difference': pct_difference,
            't_statistic': t_stat,
            't_pvalue': t_pvalue,
            'mann_whitney_u': u_stat,
            'u_pvalue': u_pvalue,
            'cohens_d': effect_size,
            'effect_size': effect_interpretation
        },
        'hypothesis_confirmed': hypothesis_confirmed,
        'significant': t_pvalue < 0.05,
        'expected_elevation': config['expected_elevation'],
        'source': config['source']
    }


def analyze_risk_level_distribution(conn: sqlite3.Connection, config: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze risk level distribution between periods."""
    cursor = conn.cursor()
    scandal_start, scandal_end = config['scandal_period']
    control_start, control_end = config['control_period']

    inst_types = config.get('institution_types', [])
    sector_ids = config.get('sector_ids', [])

    query = """
        SELECT
            risk_level,
            COUNT(*) as count
        FROM contracts c
        JOIN institutions i ON c.institution_id = i.id
        WHERE c.contract_year >= ? AND c.contract_year <= ?
          AND c.risk_level IS NOT NULL
          AND c.amount_mxn > 0
          AND c.amount_mxn < 100000000000
    """

    if inst_types:
        placeholders = ','.join(['?' for _ in inst_types])
        query += f" AND i.institution_type IN ({placeholders})"

    if sector_ids:
        placeholders = ','.join(['?' for _ in sector_ids])
        query += f" AND c.sector_id IN ({placeholders})"

    query += " GROUP BY risk_level"

    # Scandal period
    params = [scandal_start, scandal_end]
    if inst_types:
        params.extend(inst_types)
    if sector_ids:
        params.extend(sector_ids)

    cursor.execute(query, params)
    scandal_dist = {row['risk_level']: row['count'] for row in cursor.fetchall()}

    # Control period
    params = [control_start, control_end]
    if inst_types:
        params.extend(inst_types)
    if sector_ids:
        params.extend(sector_ids)

    cursor.execute(query, params)
    control_dist = {row['risk_level']: row['count'] for row in cursor.fetchall()}

    # Calculate percentages
    scandal_total = sum(scandal_dist.values())
    control_total = sum(control_dist.values())

    levels = ['critical', 'high', 'medium', 'low']
    scandal_pcts = {l: (scandal_dist.get(l, 0) / scandal_total * 100) if scandal_total > 0 else 0 for l in levels}
    control_pcts = {l: (control_dist.get(l, 0) / control_total * 100) if control_total > 0 else 0 for l in levels}

    # Calculate high+critical as key metric
    scandal_high_critical = scandal_pcts.get('critical', 0) + scandal_pcts.get('high', 0)
    control_high_critical = control_pcts.get('critical', 0) + control_pcts.get('high', 0)

    return {
        'scandal_distribution': scandal_pcts,
        'control_distribution': control_pcts,
        'scandal_high_critical_pct': scandal_high_critical,
        'control_high_critical_pct': control_high_critical,
        'change_in_high_critical': scandal_high_critical - control_high_critical
    }


def main():
    parser = argparse.ArgumentParser(description='Validate risk model using institution period comparison')
    parser.add_argument('--output-dir', type=str, default='reports', help='Output directory for reports')
    parser.add_argument('--json-output', action='store_true', help='Output JSON report')
    args = parser.parse_args()

    print("=" * 70)
    print("  INSTITUTION PERIOD VALIDATION")
    print("=" * 70)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Timestamp: {datetime.now()}")
    print("\nThis analysis compares risk scores during known scandal periods")
    print("vs control periods to indirectly validate the risk model.")
    print("\nHypothesis: Risk scores should be elevated during scandal periods.")

    conn = get_connection()

    try:
        results = {
            'timestamp': datetime.now().isoformat(),
            'database': str(DB_PATH),
            'methodology': 'Institution period comparison with t-test and Mann-Whitney U',
            'analyses': {}
        }

        # Analyze each scandal period
        for key, config in SCANDAL_PERIODS.items():
            print("\n" + "=" * 70)
            results['analyses'][key] = analyze_period(conn, config)
            results['analyses'][key]['risk_distribution'] = analyze_risk_level_distribution(conn, config)

        # Overall summary
        print("\n" + "=" * 70)
        print("  VALIDATION SUMMARY")
        print("=" * 70)

        confirmed_count = sum(1 for a in results['analyses'].values() if a['hypothesis_confirmed'])
        significant_count = sum(1 for a in results['analyses'].values() if a['significant'])
        total = len(results['analyses'])

        print(f"\n  Total period comparisons: {total}")
        print(f"  Statistically significant (p<0.05): {significant_count}")
        print(f"  Hypothesis confirmed (higher + significant): {confirmed_count}")

        # Detailed summary
        print("\n  Per-analysis results:")
        for key, analysis in results['analyses'].items():
            status = "CONFIRMED" if analysis['hypothesis_confirmed'] else "NOT CONFIRMED"
            direction = analysis['comparison']['direction']
            pct = analysis['comparison']['pct_difference']
            p_val = analysis['comparison']['t_pvalue']
            print(f"\n    {analysis['name']}:")
            print(f"      Scandal risk is {direction} by {pct:.1f}% (p={p_val:.4f})")
            print(f"      Status: {status}")
            print(f"      Effect size: {analysis['comparison']['effect_size']}")

        # Interpretation
        print("\n" + "-" * 70)
        print("  INTERPRETATION")
        print("-" * 70)

        if confirmed_count >= total * 0.5:
            overall_status = "VALIDATED"
            interpretation = """
  The risk model shows elevated scores during known scandal periods
  in at least half of the analyses. This provides indirect validation
  that the model captures procurement risk patterns.

  The model can be used for investigation prioritization.
"""
        elif significant_count >= 1:
            overall_status = "PARTIALLY VALIDATED"
            interpretation = """
  The risk model shows some correlation with scandal periods,
  but results are mixed. The model may still be useful for
  investigation prioritization with appropriate caveats.

  Consider adding more risk factors or adjusting weights.
"""
        else:
            overall_status = "NOT VALIDATED"
            interpretation = """
  The risk model does not consistently show elevated scores
  during known scandal periods. This could indicate:
  - The model factors don't capture these specific corruption types
  - Data quality issues in these periods
  - The scandal periods involved different patterns than our model detects

  Consider pivoting to descriptive analytics approach.
"""

        print(f"\n  Overall Status: {overall_status}")
        print(interpretation)

        results['summary'] = {
            'total_analyses': total,
            'significant_count': significant_count,
            'confirmed_count': confirmed_count,
            'overall_status': overall_status,
            'validation_result': 'pass' if confirmed_count >= total * 0.5 else 'fail'
        }

        # Save results
        if args.json_output:
            output_dir = Path(args.output_dir)
            output_dir.mkdir(parents=True, exist_ok=True)
            output_file = output_dir / f"institution_validation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=2, ensure_ascii=False, default=str)
            print(f"\nResults saved to: {output_file}")

        print("\n" + "=" * 70)
        print("  Institution period validation complete!")
        print("=" * 70)

        return results

    finally:
        conn.close()


if __name__ == '__main__':
    main()
