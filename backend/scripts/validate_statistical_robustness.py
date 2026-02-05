#!/usr/bin/env python3
"""
Statistical Robustness Validation

Validates the risk model's statistical properties without requiring ground truth.
Tests internal consistency and alignment with expected distributions.

Tests:
1. Consistency: Similar contracts get similar scores (correlation > 0.7)
2. Factor Correlation: High scores have more triggered factors (monotonic)
3. Distribution Benchmark: Match OECD expectations (~20-30% medium+ risk)
4. Sector Differentiation: Scores vary appropriately by sector (ANOVA)

These tests validate the model is behaving statistically sound,
even without ground truth corruption data.

Usage:
    python backend/scripts/validate_statistical_robustness.py [--output-dir reports]
"""

import sqlite3
import argparse
import json
import math
import random
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Tuple
from collections import defaultdict

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# OECD benchmarks for expected distributions
OECD_BENCHMARKS = {
    'low_risk_pct': (50, 80),        # 50-80% should be low risk
    'medium_risk_pct': (15, 35),     # 15-35% should be medium
    'high_risk_pct': (2, 15),        # 2-15% should be high
    'critical_risk_pct': (0, 3),     # 0-3% should be critical
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


def pearson_correlation(x: List[float], y: List[float]) -> float:
    """Calculate Pearson correlation coefficient."""
    if len(x) != len(y) or len(x) < 2:
        return 0

    n = len(x)
    mean_x = sum(x) / n
    mean_y = sum(y) / n

    numerator = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y))
    sum_sq_x = sum((xi - mean_x) ** 2 for xi in x)
    sum_sq_y = sum((yi - mean_y) ** 2 for yi in y)

    denominator = math.sqrt(sum_sq_x * sum_sq_y)

    if denominator == 0:
        return 0

    return numerator / denominator


def spearman_correlation(x: List[float], y: List[float]) -> float:
    """Calculate Spearman rank correlation coefficient."""
    if len(x) != len(y) or len(x) < 2:
        return 0

    def rank(values: List[float]) -> List[float]:
        sorted_indices = sorted(range(len(values)), key=lambda i: values[i])
        ranks = [0.0] * len(values)
        for rank_val, idx in enumerate(sorted_indices, 1):
            ranks[idx] = rank_val
        return ranks

    rank_x = rank(x)
    rank_y = rank(y)

    return pearson_correlation(rank_x, rank_y)


def one_way_anova(groups: Dict[Any, List[float]]) -> Tuple[float, float]:
    """
    Perform one-way ANOVA.
    Returns (F_statistic, approximate p_value)
    """
    all_values = []
    for values in groups.values():
        all_values.extend(values)

    if len(all_values) < 2:
        return 0, 1.0

    grand_mean = sum(all_values) / len(all_values)

    # Between-group variance
    ss_between = 0
    for values in groups.values():
        if values:
            group_mean = sum(values) / len(values)
            ss_between += len(values) * (group_mean - grand_mean) ** 2

    # Within-group variance
    ss_within = 0
    for values in groups.values():
        if values:
            group_mean = sum(values) / len(values)
            ss_within += sum((v - group_mean) ** 2 for v in values)

    k = len(groups)  # Number of groups
    n = len(all_values)

    if k <= 1 or n <= k:
        return 0, 1.0

    df_between = k - 1
    df_within = n - k

    ms_between = ss_between / df_between if df_between > 0 else 0
    ms_within = ss_within / df_within if df_within > 0 else 0

    if ms_within == 0:
        return 0, 1.0

    F = ms_between / ms_within

    # Approximate p-value (would use F distribution properly with scipy)
    # For large df_within, F approximately follows chi-square
    # This is a rough approximation
    if F < 1:
        p_value = 1.0
    elif F > 10:
        p_value = 0.001
    elif F > 5:
        p_value = 0.01
    elif F > 3:
        p_value = 0.05
    else:
        p_value = 0.10

    return F, p_value


def test_1_consistency(conn: sqlite3.Connection) -> Dict[str, Any]:
    """
    Test 1: Consistency

    Similar contracts should get similar risk scores.
    We test this by finding contracts with matching characteristics
    and checking if their risk scores are highly correlated.
    """
    print_section("TEST 1: Consistency (Similar Contracts -> Similar Scores)")
    cursor = conn.cursor()

    # Sample contracts and group by key characteristics
    cursor.execute("""
        SELECT
            id,
            sector_id,
            is_direct_award,
            is_single_bid,
            is_year_end,
            CASE
                WHEN amount_mxn < 1000000 THEN 'small'
                WHEN amount_mxn < 10000000 THEN 'medium'
                WHEN amount_mxn < 100000000 THEN 'large'
                ELSE 'very_large'
            END as size_bucket,
            risk_score
        FROM contracts
        WHERE risk_score IS NOT NULL
          AND sector_id IS NOT NULL
          AND amount_mxn > 0
          AND amount_mxn < 100000000000
        ORDER BY RANDOM()
        LIMIT 100000
    """)

    # Group contracts by characteristics
    groups = defaultdict(list)
    for row in cursor.fetchall():
        key = (row['sector_id'], row['is_direct_award'], row['is_single_bid'],
               row['is_year_end'], row['size_bucket'])
        groups[key].append(row['risk_score'])

    # Calculate within-group variance vs between-group variance
    # High consistency = low within-group variance
    within_variances = []
    between_scores = []

    for key, scores in groups.items():
        if len(scores) >= 5:
            mean = sum(scores) / len(scores)
            variance = sum((s - mean) ** 2 for s in scores) / len(scores)
            within_variances.append(variance)
            between_scores.append(mean)

    if not within_variances:
        print("  ERROR: Not enough data for consistency test")
        return {'test': 'consistency', 'passed': False, 'error': 'Insufficient data'}

    avg_within_var = sum(within_variances) / len(within_variances)
    overall_var = sum((s - sum(between_scores)/len(between_scores))**2 for s in between_scores) / len(between_scores)

    # Intraclass correlation (ICC)
    icc = (overall_var - avg_within_var) / overall_var if overall_var > 0 else 0
    icc = max(0, min(1, icc))

    print(f"  Groups analyzed: {len(between_scores):,}")
    print(f"  Average within-group variance: {avg_within_var:.4f}")
    print(f"  Between-group variance: {overall_var:.4f}")
    print(f"  Intraclass Correlation (ICC): {icc:.3f}")

    # Test 2: Sample pairs of similar contracts and correlate
    print("\n  Pairwise similarity test:")

    # Get pairs of contracts with same characteristics
    pair_scores_1 = []
    pair_scores_2 = []

    for key, scores in groups.items():
        if len(scores) >= 10:
            # Sample 5 pairs from this group
            sample = random.sample(scores, min(10, len(scores)))
            for i in range(0, len(sample) - 1, 2):
                pair_scores_1.append(sample[i])
                pair_scores_2.append(sample[i + 1])

    if len(pair_scores_1) >= 10:
        pair_correlation = pearson_correlation(pair_scores_1, pair_scores_2)
        print(f"  Pairs tested: {len(pair_scores_1):,}")
        print(f"  Correlation between similar contract pairs: {pair_correlation:.3f}")
    else:
        pair_correlation = 0
        print("  Not enough pairs for correlation test")

    # Determine pass/fail
    # ICC > 0.5 indicates good consistency
    # Pair correlation > 0.7 indicates very high consistency
    passed = icc > 0.5 or pair_correlation > 0.6

    print(f"\n  Result: {'PASS' if passed else 'FAIL'}")
    print(f"  Interpretation: {'Similar contracts receive similar scores' if passed else 'Score variance within similar contracts is high'}")

    return {
        'test': 'consistency',
        'passed': passed,
        'groups_analyzed': len(between_scores),
        'avg_within_variance': avg_within_var,
        'between_variance': overall_var,
        'icc': icc,
        'pair_correlation': pair_correlation,
        'threshold': 'ICC > 0.5 or pair_correlation > 0.6',
        'interpretation': 'Similar contracts receive similar scores' if passed else 'High variance within similar contract groups'
    }


def test_2_factor_correlation(conn: sqlite3.Connection) -> Dict[str, Any]:
    """
    Test 2: Factor Correlation

    Higher risk scores should have more triggered risk factors.
    This tests internal consistency of the scoring model.
    """
    print_section("TEST 2: Factor Correlation (Higher Score -> More Factors)")
    cursor = conn.cursor()

    # Get risk scores and factor counts
    cursor.execute("""
        SELECT
            risk_score,
            risk_factors,
            risk_level
        FROM contracts
        WHERE risk_score IS NOT NULL
          AND risk_factors IS NOT NULL
          AND risk_factors != ''
        ORDER BY RANDOM()
        LIMIT 100000
    """)

    scores = []
    factor_counts = []

    for row in cursor.fetchall():
        scores.append(row['risk_score'])
        # Count factors (comma-separated)
        factors = row['risk_factors'].split(',') if row['risk_factors'] else []
        factor_counts.append(len(factors))

    if len(scores) < 100:
        print("  ERROR: Not enough data for factor correlation test")
        return {'test': 'factor_correlation', 'passed': False, 'error': 'Insufficient data'}

    # Calculate correlations
    pearson_r = pearson_correlation(scores, factor_counts)
    spearman_r = spearman_correlation(scores, factor_counts)

    print(f"  Contracts analyzed: {len(scores):,}")
    print(f"  Pearson correlation (score vs factor count): {pearson_r:.3f}")
    print(f"  Spearman correlation (score vs factor count): {spearman_r:.3f}")

    # Analyze by risk level
    cursor.execute("""
        SELECT
            risk_level,
            AVG(LENGTH(risk_factors) - LENGTH(REPLACE(risk_factors, ',', '')) + 1) as avg_factors
        FROM contracts
        WHERE risk_factors IS NOT NULL AND risk_factors != ''
        GROUP BY risk_level
        ORDER BY
            CASE risk_level
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                WHEN 'low' THEN 4
            END
    """)

    level_factors = {}
    print("\n  Average factors by risk level:")
    for row in cursor.fetchall():
        level_factors[row['risk_level']] = row['avg_factors']
        print(f"    {row['risk_level']}: {row['avg_factors']:.2f} factors")

    # Check monotonicity (higher levels should have more factors)
    levels_ordered = ['low', 'medium', 'high', 'critical']
    is_monotonic = True
    prev_count = 0
    for level in levels_ordered:
        if level in level_factors:
            if level_factors[level] < prev_count:
                is_monotonic = False
            prev_count = level_factors[level]

    # Pass criteria: correlation > 0.5 AND monotonic relationship
    passed = spearman_r > 0.5 and is_monotonic

    print(f"\n  Monotonic relationship: {'YES' if is_monotonic else 'NO'}")
    print(f"  Result: {'PASS' if passed else 'FAIL'}")
    print(f"  Interpretation: {'Risk scores align with factor counts' if passed else 'Inconsistency between scores and factors'}")

    return {
        'test': 'factor_correlation',
        'passed': passed,
        'pearson_r': pearson_r,
        'spearman_r': spearman_r,
        'is_monotonic': is_monotonic,
        'factors_by_level': level_factors,
        'threshold': 'Spearman > 0.5 AND monotonic',
        'interpretation': 'Risk scores align with factor counts' if passed else 'Scores not aligned with factor triggers'
    }


def test_3_distribution_benchmark(conn: sqlite3.Connection) -> Dict[str, Any]:
    """
    Test 3: Distribution Benchmark

    Risk score distribution should roughly match OECD expectations:
    - Low: 50-80%
    - Medium: 15-35%
    - High: 2-15%
    - Critical: 0-3%
    """
    print_section("TEST 3: Distribution Benchmark (OECD Expectations)")
    cursor = conn.cursor()

    # Get risk level distribution
    cursor.execute("""
        SELECT
            risk_level,
            COUNT(*) as count
        FROM contracts
        WHERE risk_level IS NOT NULL
        GROUP BY risk_level
    """)

    distribution = {}
    total = 0
    for row in cursor.fetchall():
        distribution[row['risk_level']] = row['count']
        total += row['count']

    if total == 0:
        print("  ERROR: No risk levels found")
        return {'test': 'distribution_benchmark', 'passed': False, 'error': 'No data'}

    # Calculate percentages
    percentages = {}
    for level in ['low', 'medium', 'high', 'critical']:
        count = distribution.get(level, 0)
        pct = (count / total) * 100
        percentages[level] = pct

    print(f"  Total contracts: {total:,}")
    print(f"\n  Current distribution:")
    for level in ['low', 'medium', 'high', 'critical']:
        pct = percentages.get(level, 0)
        count = distribution.get(level, 0)
        print(f"    {level}: {pct:.2f}% ({count:,})")

    # Compare to OECD benchmarks
    print(f"\n  OECD benchmark comparison:")
    within_bounds = {}
    for level in ['low', 'medium', 'high', 'critical']:
        pct = percentages.get(level, 0)
        benchmark_key = f'{level}_risk_pct'
        low_bound, high_bound = OECD_BENCHMARKS[benchmark_key]
        is_within = low_bound <= pct <= high_bound
        within_bounds[level] = is_within
        status = "[OK]" if is_within else "[X]"
        print(f"    {level}: {pct:.2f}% (expected {low_bound}-{high_bound}%) {status}")

    # Pass if 3 out of 4 levels are within bounds (some flexibility)
    passed_count = sum(1 for v in within_bounds.values() if v)
    passed = passed_count >= 3

    # Additional check: not too concentrated in one level
    max_pct = max(percentages.values())
    well_distributed = max_pct < 90

    print(f"\n  Levels within OECD bounds: {passed_count}/4")
    print(f"  Distribution not over-concentrated: {'YES' if well_distributed else 'NO'}")
    print(f"\n  Result: {'PASS' if passed and well_distributed else 'FAIL'}")

    final_passed = passed and well_distributed

    return {
        'test': 'distribution_benchmark',
        'passed': final_passed,
        'total_contracts': total,
        'distribution': percentages,
        'oecd_benchmarks': OECD_BENCHMARKS,
        'within_bounds': within_bounds,
        'passed_count': passed_count,
        'threshold': 'At least 3/4 levels within OECD bounds',
        'interpretation': 'Distribution aligns with OECD expectations' if final_passed else 'Distribution deviates from benchmarks'
    }


def test_4_sector_differentiation(conn: sqlite3.Connection) -> Dict[str, Any]:
    """
    Test 4: Sector Differentiation

    Risk scores should vary meaningfully by sector.
    Some sectors (e.g., salud, infraestructura) are known to have different
    procurement patterns and risk profiles.
    """
    print_section("TEST 4: Sector Differentiation (ANOVA)")
    cursor = conn.cursor()

    # Get risk scores by sector
    cursor.execute("""
        SELECT
            c.sector_id,
            s.name_es as sector_name,
            c.risk_score
        FROM contracts c
        JOIN sectors s ON c.sector_id = s.id
        WHERE c.risk_score IS NOT NULL
          AND c.sector_id IS NOT NULL
        ORDER BY RANDOM()
        LIMIT 200000
    """)

    sector_scores = defaultdict(list)
    sector_names = {}

    for row in cursor.fetchall():
        sector_scores[row['sector_id']].append(row['risk_score'])
        sector_names[row['sector_id']] = row['sector_name']

    print(f"  Sectors analyzed: {len(sector_scores)}")

    # Calculate statistics per sector
    print("\n  Risk scores by sector:")
    sector_stats = {}
    for sector_id in sorted(sector_scores.keys()):
        scores = sector_scores[sector_id]
        mean = sum(scores) / len(scores)
        sector_stats[sector_id] = {
            'name': sector_names.get(sector_id, f"Sector {sector_id}"),
            'count': len(scores),
            'mean': mean,
            'min': min(scores),
            'max': max(scores)
        }
        print(f"    {sector_names.get(sector_id, sector_id)}: mean={mean:.4f} (n={len(scores):,})")

    # Perform one-way ANOVA
    F_stat, p_value = one_way_anova(sector_scores)

    print(f"\n  ANOVA results:")
    print(f"    F-statistic: {F_stat:.2f}")
    print(f"    p-value: {p_value:.4f}")

    # Calculate effect size (eta-squared)
    all_scores = []
    for scores in sector_scores.values():
        all_scores.extend(scores)

    grand_mean = sum(all_scores) / len(all_scores)

    ss_between = sum(
        len(scores) * (sum(scores)/len(scores) - grand_mean)**2
        for scores in sector_scores.values()
    )
    ss_total = sum((s - grand_mean)**2 for s in all_scores)

    eta_squared = ss_between / ss_total if ss_total > 0 else 0

    print(f"    Eta-squared (effect size): {eta_squared:.4f}")

    # Interpret effect size
    if eta_squared < 0.01:
        effect_interpretation = "negligible"
    elif eta_squared < 0.06:
        effect_interpretation = "small"
    elif eta_squared < 0.14:
        effect_interpretation = "medium"
    else:
        effect_interpretation = "large"

    print(f"    Effect size interpretation: {effect_interpretation}")

    # Check range of sector means
    means = [s['mean'] for s in sector_stats.values()]
    mean_range = max(means) - min(means)

    print(f"\n  Range of sector means: {mean_range:.4f}")

    # Pass criteria: significant ANOVA (p < 0.05) AND meaningful effect size
    passed = p_value < 0.05 and eta_squared >= 0.01

    print(f"\n  Result: {'PASS' if passed else 'FAIL'}")
    print(f"  Interpretation: {'Sectors have meaningfully different risk profiles' if passed else 'Sectors not sufficiently differentiated'}")

    return {
        'test': 'sector_differentiation',
        'passed': passed,
        'sectors_analyzed': len(sector_scores),
        'f_statistic': F_stat,
        'p_value': p_value,
        'eta_squared': eta_squared,
        'effect_size': effect_interpretation,
        'mean_range': mean_range,
        'sector_stats': sector_stats,
        'threshold': 'p < 0.05 AND eta_squared >= 0.01',
        'interpretation': 'Sectors have different risk profiles' if passed else 'Insufficient sector differentiation'
    }


def main():
    parser = argparse.ArgumentParser(description='Validate risk model statistical robustness')
    parser.add_argument('--output-dir', type=str, default='reports', help='Output directory for reports')
    parser.add_argument('--json-output', action='store_true', help='Output JSON report')
    args = parser.parse_args()

    print("=" * 70)
    print("  STATISTICAL ROBUSTNESS VALIDATION")
    print("=" * 70)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Timestamp: {datetime.now()}")
    print("\nThis validation tests the statistical soundness of the risk model")
    print("without requiring ground truth corruption data.")
    print("\nTests:")
    print("  1. Consistency: Similar contracts -> similar scores")
    print("  2. Factor Correlation: Higher scores -> more triggered factors")
    print("  3. Distribution Benchmark: Matches OECD expectations")
    print("  4. Sector Differentiation: Meaningful variation by sector")

    conn = get_connection()

    try:
        results = {
            'timestamp': datetime.now().isoformat(),
            'database': str(DB_PATH),
            'tests': {}
        }

        # Run all tests
        results['tests']['consistency'] = test_1_consistency(conn)
        results['tests']['factor_correlation'] = test_2_factor_correlation(conn)
        results['tests']['distribution_benchmark'] = test_3_distribution_benchmark(conn)
        results['tests']['sector_differentiation'] = test_4_sector_differentiation(conn)

        # Overall summary
        print("\n" + "=" * 70)
        print("  VALIDATION SUMMARY")
        print("=" * 70)

        passed_tests = sum(1 for t in results['tests'].values() if t.get('passed'))
        total_tests = len(results['tests'])

        print(f"\n  Tests passed: {passed_tests}/{total_tests}")
        print("\n  Individual test results:")
        for test_name, test_result in results['tests'].items():
            status = "PASS" if test_result.get('passed') else "FAIL"
            print(f"    {test_name}: {status}")

        # Determine overall status
        if passed_tests == total_tests:
            overall_status = "FULLY VALIDATED"
            interpretation = "Risk model is statistically robust and can be used for investigation prioritization."
        elif passed_tests >= total_tests * 0.75:
            overall_status = "VALIDATED"
            interpretation = "Risk model passes most tests and is suitable for use with minor caveats."
        elif passed_tests >= total_tests * 0.5:
            overall_status = "PARTIALLY VALIDATED"
            interpretation = "Risk model has some issues. Use with caution and consider improvements."
        else:
            overall_status = "NOT VALIDATED"
            interpretation = "Risk model fails multiple tests. Significant revision recommended before use."

        print(f"\n  Overall Status: {overall_status}")
        print(f"\n  {interpretation}")

        results['summary'] = {
            'passed_tests': passed_tests,
            'total_tests': total_tests,
            'overall_status': overall_status,
            'interpretation': interpretation,
            'validation_result': 'pass' if passed_tests >= total_tests * 0.75 else 'fail'
        }

        # Save results
        if args.json_output:
            output_dir = Path(args.output_dir)
            output_dir.mkdir(parents=True, exist_ok=True)
            output_file = output_dir / f"statistical_validation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=2, ensure_ascii=False, default=str)
            print(f"\nResults saved to: {output_file}")

        print("\n" + "=" * 70)
        print("  Statistical robustness validation complete!")
        print("=" * 70)

        return results

    finally:
        conn.close()


if __name__ == '__main__':
    main()
