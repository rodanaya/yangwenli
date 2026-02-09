"""
Validate Risk Model Against Ground Truth

Calculates detection metrics for the risk scoring model by comparing
its output against known corruption cases.

Key metrics:
- Detection rate: % of known bad contracts flagged as medium+ risk
- Critical detection rate: % flagged as high or critical risk
- False negative analysis: Known bad contracts with low risk scores
- Factor effectiveness: Which factors best identify known bad actors
- AUC-ROC, Brier score, log loss (statistical validation)
- Per-case detection breakdown

Usage:
    python backend/scripts/validate_risk_model.py [--dry-run] [--model-version v3.3]

Output:
    - Prints detailed validation report
    - Stores results in validation_results table
"""

import sqlite3
import sys
import os
import json
import argparse
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from collections import Counter
import numpy as np

try:
    from sklearn.metrics import roc_auc_score, brier_score_loss, log_loss
    from sklearn.calibration import calibration_curve
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(BACKEND_DIR, 'RUBLI_NORMALIZED.db')

# Import canonical thresholds from constants (v3.3+)
sys.path.insert(0, BACKEND_DIR)
from api.config.constants import RISK_THRESHOLDS as _THRESHOLDS

# Build range-based lookup from canonical point thresholds
RISK_THRESHOLDS = {
    'low': (0.0, _THRESHOLDS['medium']),
    'medium': (_THRESHOLDS['medium'], _THRESHOLDS['high']),
    'high': (_THRESHOLDS['high'], _THRESHOLDS['critical']),
    'critical': (_THRESHOLDS['critical'], 1.0),
}


def get_matched_vendors(cursor: sqlite3.Cursor) -> List[Dict[str, Any]]:
    """Get all ground truth vendors that have been matched to database records."""
    cursor.execute("""
        SELECT
            gtv.id as gt_id,
            gtv.vendor_id,
            gtv.vendor_name_source,
            gtv.role,
            gtv.evidence_strength,
            gtv.match_confidence,
            gtc.case_id,
            gtc.case_name,
            gtc.case_type,
            v.name as vendor_name,
            v.total_contracts,
            v.total_amount_mxn
        FROM ground_truth_vendors gtv
        JOIN ground_truth_cases gtc ON gtv.case_id = gtc.id
        JOIN vendors v ON gtv.vendor_id = v.id
        WHERE gtv.vendor_id IS NOT NULL
    """)

    return [dict(row) for row in cursor.fetchall()]


def get_matched_institutions(cursor: sqlite3.Cursor) -> List[Dict[str, Any]]:
    """Get all ground truth institutions that have been matched."""
    cursor.execute("""
        SELECT
            gti.id as gt_id,
            gti.institution_id,
            gti.institution_name_source,
            gti.role,
            gti.evidence_strength,
            gti.match_confidence,
            gtc.case_id,
            gtc.case_name,
            gtc.case_type,
            i.name as institution_name,
            i.total_contracts,
            i.total_amount_mxn
        FROM ground_truth_institutions gti
        JOIN ground_truth_cases gtc ON gti.case_id = gtc.id
        JOIN institutions i ON gti.institution_id = i.id
        WHERE gti.institution_id IS NOT NULL
    """)

    return [dict(row) for row in cursor.fetchall()]


def get_contracts_for_vendors(cursor: sqlite3.Cursor,
                              vendor_ids: List[int],
                              year_range: Optional[Tuple[int, int]] = None) -> List[Dict[str, Any]]:
    """Get all contracts for specified vendors."""
    if not vendor_ids:
        return []

    placeholders = ','.join('?' * len(vendor_ids))

    query = f"""
        SELECT
            c.id,
            c.contract_number,
            c.vendor_id,
            c.institution_id,
            c.sector_id,
            c.amount_mxn,
            c.contract_year,
            c.contract_date,
            c.is_direct_award,
            c.is_single_bid,
            c.risk_score,
            c.risk_level,
            c.risk_factors
        FROM contracts c
        WHERE c.vendor_id IN ({placeholders})
    """
    params = list(vendor_ids)

    if year_range:
        query += " AND c.contract_year BETWEEN ? AND ?"
        params.extend(year_range)

    cursor.execute(query, params)
    return [dict(row) for row in cursor.fetchall()]


def get_contracts_from_institutions(cursor: sqlite3.Cursor,
                                    institution_ids: List[int],
                                    vendor_ids: Optional[List[int]] = None,
                                    year_range: Optional[Tuple[int, int]] = None) -> List[Dict[str, Any]]:
    """Get contracts awarded by specified institutions, optionally filtered by vendors."""
    if not institution_ids:
        return []

    placeholders = ','.join('?' * len(institution_ids))
    query = f"""
        SELECT
            c.id,
            c.contract_number,
            c.vendor_id,
            c.institution_id,
            c.sector_id,
            c.amount_mxn,
            c.contract_year,
            c.contract_date,
            c.is_direct_award,
            c.is_single_bid,
            c.risk_score,
            c.risk_level,
            c.risk_factors
        FROM contracts c
        WHERE c.institution_id IN ({placeholders})
    """
    params = list(institution_ids)

    if vendor_ids:
        vendor_placeholders = ','.join('?' * len(vendor_ids))
        query += f" AND c.vendor_id IN ({vendor_placeholders})"
        params.extend(vendor_ids)

    if year_range:
        query += " AND c.contract_year BETWEEN ? AND ?"
        params.extend(year_range)

    cursor.execute(query, params)
    return [dict(row) for row in cursor.fetchall()]


def calculate_risk_distribution(contracts: List[Dict[str, Any]]) -> Dict[str, int]:
    """Calculate risk level distribution for a set of contracts."""
    dist = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0, 'null': 0}

    for c in contracts:
        level = c.get('risk_level')
        if level in dist:
            dist[level] += 1
        else:
            dist['null'] += 1

    return dist


def calculate_factor_triggers(contracts: List[Dict[str, Any]]) -> Dict[str, int]:
    """Count how often each risk factor was triggered."""
    factor_counts = Counter()

    for c in contracts:
        factors_json = c.get('risk_factors')
        if factors_json:
            try:
                factors = json.loads(factors_json) if isinstance(factors_json, str) else factors_json
                if isinstance(factors, list):
                    for f in factors:
                        factor_counts[f] += 1
            except (json.JSONDecodeError, TypeError):
                pass

    return dict(factor_counts)


def get_baseline_distribution(cursor: sqlite3.Cursor,
                              sample_size: int = 10000) -> Dict[str, int]:
    """Get risk distribution for a random sample of contracts."""
    cursor.execute(f"""
        SELECT risk_level, COUNT(*) as count
        FROM (
            SELECT risk_level FROM contracts
            WHERE risk_score IS NOT NULL
            ORDER BY RANDOM()
            LIMIT ?
        )
        GROUP BY risk_level
    """, (sample_size,))

    dist = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
    for row in cursor.fetchall():
        if row['risk_level'] in dist:
            dist[row['risk_level']] = row['count']

    return dist


def calculate_detection_metrics(risk_dist: Dict[str, int]) -> Dict[str, float]:
    """Calculate detection metrics from risk distribution."""
    total = sum(risk_dist.values())
    if total == 0:
        return {
            'detection_rate': 0.0,
            'critical_detection_rate': 0.0,
            'medium_plus_rate': 0.0,
            'high_plus_rate': 0.0
        }

    critical = risk_dist.get('critical', 0)
    high = risk_dist.get('high', 0)
    medium = risk_dist.get('medium', 0)
    low = risk_dist.get('low', 0)

    return {
        'detection_rate': (critical + high + medium) / total * 100,
        'critical_detection_rate': critical / total * 100,
        'high_plus_rate': (critical + high) / total * 100,
        'medium_plus_rate': (critical + high + medium) / total * 100,
        'low_rate': low / total * 100
    }


def identify_false_negatives(contracts: List[Dict[str, Any]],
                             threshold: float = 0.2) -> List[Dict[str, Any]]:
    """Identify contracts with low risk scores that should be flagged."""
    false_negatives = []

    for c in contracts:
        risk_score = c.get('risk_score')
        if risk_score is not None and risk_score < threshold:
            false_negatives.append({
                'contract_id': c['id'],
                'vendor_id': c['vendor_id'],
                'institution_id': c['institution_id'],
                'amount_mxn': c['amount_mxn'],
                'year': c['contract_year'],
                'risk_score': risk_score,
                'risk_level': c['risk_level'],
                'is_direct_award': c['is_direct_award'],
                'is_single_bid': c['is_single_bid']
            })

    return false_negatives


def save_validation_results(cursor: sqlite3.Cursor, run_id: str,
                            model_version: str, results: Dict[str, Any]) -> None:
    """Save validation results to database."""
    cursor.execute("""
        INSERT INTO validation_results
        (run_id, model_version, total_known_bad_contracts, total_known_bad_vendors,
         flagged_critical, flagged_high, flagged_medium, flagged_low,
         detection_rate, critical_detection_rate, false_negative_count,
         factor_trigger_counts, factor_effectiveness, baseline_detection_rate, lift, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        run_id,
        model_version,
        results['total_contracts'],
        results['total_vendors'],
        results['risk_distribution']['critical'],
        results['risk_distribution']['high'],
        results['risk_distribution']['medium'],
        results['risk_distribution']['low'],
        results['metrics']['detection_rate'],
        results['metrics']['critical_detection_rate'],
        results['false_negative_count'],
        json.dumps(results['factor_triggers']),
        json.dumps(results.get('factor_effectiveness', {})),
        results['baseline_metrics']['detection_rate'],
        results['lift'],
        results.get('notes', '')
    ))


def run_validation(conn: sqlite3.Connection,
                   model_version: str = 'v3.1',
                   dry_run: bool = False) -> Dict[str, Any]:
    """
    Run full validation of risk model against ground truth.

    Returns comprehensive validation results.
    """
    cursor = conn.cursor()
    results = {
        'run_id': f"VAL-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{str(uuid.uuid4())[:8]}",
        'model_version': model_version,
        'timestamp': datetime.now().isoformat()
    }

    print("\n" + "=" * 70)
    print("PHASE 1: GATHERING GROUND TRUTH DATA")
    print("=" * 70)

    # Get matched entities
    matched_vendors = get_matched_vendors(cursor)
    matched_institutions = get_matched_institutions(cursor)

    print(f"\nMatched ground truth entities:")
    print(f"  Vendors: {len(matched_vendors)}")
    print(f"  Institutions: {len(matched_institutions)}")

    vendor_ids = list(set(v['vendor_id'] for v in matched_vendors))
    institution_ids = list(set(i['institution_id'] for i in matched_institutions))

    results['total_vendors'] = len(vendor_ids)
    results['total_institutions'] = len(institution_ids)

    # Breakdown by case
    print("\n  By case:")
    cases = {}
    for v in matched_vendors:
        case = v['case_name']
        if case not in cases:
            cases[case] = {'vendors': 0, 'institutions': 0}
        cases[case]['vendors'] += 1

    for i in matched_institutions:
        case = i['case_name']
        if case not in cases:
            cases[case] = {'vendors': 0, 'institutions': 0}
        cases[case]['institutions'] += 1

    for case, counts in cases.items():
        print(f"    {case}: {counts['vendors']} vendors, {counts['institutions']} institutions")

    print("\n" + "=" * 70)
    print("PHASE 2: GATHERING CONTRACTS FROM KNOWN BAD ACTORS")
    print("=" * 70)

    # Get contracts from known bad vendors
    vendor_contracts = get_contracts_for_vendors(cursor, vendor_ids)
    print(f"\nContracts from known bad vendors: {len(vendor_contracts)}")

    # Get contracts awarded by known bad institutions TO known bad vendors
    # This is a more targeted set
    targeted_contracts = get_contracts_from_institutions(
        cursor, institution_ids, vendor_ids
    )
    print(f"Contracts from known institutions to known vendors: {len(targeted_contracts)}")

    # Combine unique contracts
    all_contract_ids = set(c['id'] for c in vendor_contracts)
    all_contract_ids.update(c['id'] for c in targeted_contracts)

    # Use vendor contracts as primary set for validation
    known_bad_contracts = vendor_contracts
    results['total_contracts'] = len(known_bad_contracts)

    if not known_bad_contracts:
        print("\nWARNING: No contracts found for known bad actors.")
        print("This could mean:")
        print("  - Ground truth matching needs more manual review")
        print("  - Shell companies operated outside COMPRANET")
        print("  - Different time periods than database coverage")
        results['status'] = 'no_data'
        return results

    print("\n" + "=" * 70)
    print("PHASE 3: ANALYZING RISK SCORES")
    print("=" * 70)

    # Calculate risk distribution
    risk_dist = calculate_risk_distribution(known_bad_contracts)
    results['risk_distribution'] = risk_dist

    print(f"\nRisk distribution for known bad contracts:")
    for level, count in sorted(risk_dist.items(), key=lambda x: ['critical', 'high', 'medium', 'low', 'null'].index(x[0])):
        pct = count / len(known_bad_contracts) * 100 if known_bad_contracts else 0
        print(f"  {level.capitalize()}: {count} ({pct:.1f}%)")

    # Calculate detection metrics
    metrics = calculate_detection_metrics(risk_dist)
    results['metrics'] = metrics

    print(f"\nDetection metrics:")
    print(f"  Detection rate (medium+): {metrics['detection_rate']:.1f}%")
    print(f"  High+ rate: {metrics['high_plus_rate']:.1f}%")
    print(f"  Critical rate: {metrics['critical_detection_rate']:.1f}%")
    print(f"  False negative rate (low risk): {metrics['low_rate']:.1f}%")

    # Analyze factor triggers
    factor_triggers = calculate_factor_triggers(known_bad_contracts)
    results['factor_triggers'] = factor_triggers

    print(f"\nRisk factors triggered on known bad contracts:")
    sorted_factors = sorted(factor_triggers.items(), key=lambda x: x[1], reverse=True)
    for factor, count in sorted_factors[:10]:
        pct = count / len(known_bad_contracts) * 100
        print(f"  {factor}: {count} ({pct:.1f}%)")

    # Identify false negatives
    false_negatives = identify_false_negatives(known_bad_contracts)
    results['false_negative_count'] = len(false_negatives)
    results['false_negatives'] = false_negatives[:20]  # Keep top 20 for review

    print(f"\nFalse negatives (known bad with low risk): {len(false_negatives)}")

    print("\n" + "=" * 70)
    print("PHASE 4: BASELINE COMPARISON")
    print("=" * 70)

    # Get baseline distribution from random sample
    baseline_dist = get_baseline_distribution(cursor)
    baseline_total = sum(baseline_dist.values())
    baseline_metrics = calculate_detection_metrics(baseline_dist)
    results['baseline_distribution'] = baseline_dist
    results['baseline_metrics'] = baseline_metrics

    print(f"\nBaseline risk distribution (random sample of {baseline_total}):")
    for level, count in sorted(baseline_dist.items()):
        pct = count / baseline_total * 100 if baseline_total else 0
        print(f"  {level.capitalize()}: {count} ({pct:.1f}%)")

    # Calculate lift
    baseline_medium_plus = baseline_metrics['medium_plus_rate']
    known_bad_medium_plus = metrics['medium_plus_rate']

    if baseline_medium_plus > 0:
        lift = known_bad_medium_plus / baseline_medium_plus
    else:
        lift = float('inf') if known_bad_medium_plus > 0 else 0

    results['lift'] = round(lift, 2)

    print(f"\nModel lift (known bad vs baseline): {lift:.2f}x")


    print("\n" + "=" * 70)
    print("PHASE 5: STATISTICAL VALIDATION METRICS")
    print("=" * 70)

    if not HAS_SKLEARN:
        print("\nsklearn not installed - skipping statistical metrics.")
        print("  Install with: pip install scikit-learn")
        results["statistical_metrics"] = None
    else:
        # Get random sample of contracts for negative class
        cursor.execute("""
            SELECT id, risk_score FROM contracts
            WHERE risk_score IS NOT NULL
            ORDER BY RANDOM()
            LIMIT 10000
        """)
        random_rows = cursor.fetchall()
        random_scores = [(row["id"], row["risk_score"]) for row in random_rows]

        # Build binary classification arrays
        known_bad_ids = set(c["id"] for c in known_bad_contracts)
        # Filter random sample to exclude known-bad contracts (avoid label leakage)
        random_scores = [(cid, s) for cid, s in random_scores if cid not in known_bad_ids]

        # y_true: 1 for known bad, 0 for random sample
        known_bad_scored = [
            (c["id"], c.get("risk_score", 0) or 0)
            for c in known_bad_contracts
            if c.get("risk_score") is not None
        ]

        y_true = np.array([1] * len(known_bad_scored) + [0] * len(random_scores))
        y_score = np.array([s for _, s in known_bad_scored] + [s for _, s in random_scores])

        print(f"\nPositive samples (known bad): {len(known_bad_scored)}")
        print(f"  Negative samples (random): {len(random_scores)}")
        print(f"  Total evaluation set: {len(y_true)}")

        stat_metrics = {}

        # AUC-ROC
        if len(set(y_true)) > 1:
            auc = roc_auc_score(y_true, y_score)
            stat_metrics["auc_roc"] = round(auc, 4)
            print(f"\nAUC-ROC: {auc:.4f}")
            if auc >= 0.8:
                print("    Interpretation: GOOD discriminative ability")
            elif auc >= 0.7:
                print("    Interpretation: ACCEPTABLE discriminative ability")
            elif auc >= 0.6:
                print("    Interpretation: POOR - model barely better than random")
            else:
                print("    Interpretation: FAILING - model near random chance (0.5)")
        else:
            print("\nAUC-ROC: Cannot compute (only one class present)")
            stat_metrics["auc_roc"] = None
        # Brier Score (lower is better, 0 = perfect)
        brier = brier_score_loss(y_true, np.clip(y_score, 0, 1))
        stat_metrics["brier_score"] = round(brier, 4)
        print(f"  Brier Score: {brier:.4f} (lower is better, 0 = perfect)")

        # Log Loss (clip predictions to avoid log(0))
        y_score_clipped = np.clip(y_score, 0.001, 0.999)
        ll = log_loss(y_true, y_score_clipped)
        stat_metrics["log_loss"] = round(ll, 4)
        print(f"  Log Loss: {ll:.4f} (lower is better)")

        # Calibration Curve
        try:
            fraction_pos, mean_pred = calibration_curve(
                y_true, y_score, n_bins=10, strategy="uniform"
            )
            stat_metrics["calibration_curve"] = {
                "fraction_of_positives": [round(float(v), 4) for v in fraction_pos],
                "mean_predicted_value": [round(float(v), 4) for v in mean_pred]
            }
            print(f"  Calibration curve computed ({len(fraction_pos)} bins)")

            calibration_error = float(np.mean(np.abs(fraction_pos - mean_pred)))
            stat_metrics["mean_calibration_error"] = round(calibration_error, 4)
            print(f"  Mean Calibration Error: {calibration_error:.4f}")
        except Exception as e:
            print(f"  Calibration curve failed: {e}")
            stat_metrics["calibration_curve"] = None
            stat_metrics["mean_calibration_error"] = None

        # Score distribution comparison
        known_bad_scores_arr = np.array([s for _, s in known_bad_scored])
        random_sample_scores_arr = np.array([s for _, s in random_scores])

        stat_metrics["score_distribution"] = {
            "known_bad": {
                "mean": round(float(np.mean(known_bad_scores_arr)), 4),
                "median": round(float(np.median(known_bad_scores_arr)), 4),
                "p75": round(float(np.percentile(known_bad_scores_arr, 75)), 4),
                "p90": round(float(np.percentile(known_bad_scores_arr, 90)), 4),
                "std": round(float(np.std(known_bad_scores_arr)), 4),
            },
            "random_sample": {
                "mean": round(float(np.mean(random_sample_scores_arr)), 4),
                "median": round(float(np.median(random_sample_scores_arr)), 4),
                "p75": round(float(np.percentile(random_sample_scores_arr, 75)), 4),
                "p90": round(float(np.percentile(random_sample_scores_arr, 90)), 4),
                "std": round(float(np.std(random_sample_scores_arr)), 4),
            }
        }
        kb_d = stat_metrics["score_distribution"]["known_bad"]
        rs_d = stat_metrics["score_distribution"]["random_sample"]
        print(f"\nScore Distribution Comparison:")
        print(f"    {'Metric':<10} {'Known Bad':>12} {'Random':>12} {'Delta':>12}")
        print(f"    {'-'*10} {'-'*12} {'-'*12} {'-'*12}")
        for mn in ["mean", "median", "p75", "p90"]:
            kb_v = kb_d[mn]
            rs_v = rs_d[mn]
            delta = kb_v - rs_v
            print(f"    {mn:<10} {kb_v:>12.4f} {rs_v:>12.4f} {delta:>+12.4f}")

        results["statistical_metrics"] = stat_metrics

    print("\n" + "=" * 70)
    print("PHASE 6: PER-CASE DETECTION")
    print("=" * 70)

    per_case_results = {}
    for case_name, case_info in cases.items():
        case_vendor_ids = [v["vendor_id"] for v in matched_vendors if v["case_name"] == case_name]
        if not case_vendor_ids:
            continue

        case_contracts = [c for c in known_bad_contracts if c["vendor_id"] in case_vendor_ids]
        if not case_contracts:
            per_case_results[case_name] = {"contracts": 0, "detection_rate": 0.0}
            continue

        case_dist = calculate_risk_distribution(case_contracts)
        case_det_metrics = calculate_detection_metrics(case_dist)
        case_scores = [
            c.get("risk_score", 0) or 0
            for c in case_contracts
            if c.get("risk_score") is not None
        ]

        per_case_results[case_name] = {
            "contracts": len(case_contracts),
            "vendors": len(case_vendor_ids),
            "risk_distribution": case_dist,
            "detection_rate": case_det_metrics["detection_rate"],
            "high_plus_rate": case_det_metrics["high_plus_rate"],
            "avg_score": round(float(np.mean(case_scores)), 4) if case_scores else 0.0,
            "median_score": round(float(np.median(case_scores)), 4) if case_scores else 0.0,
        }

    results["per_case_detection"] = per_case_results

    print(f"\n{'Case':<45} {'Contracts':>10} {'Detect%':>10} {'High+%':>10} {'AvgScore':>10}")
    print(f"  {'-'*45} {'-'*10} {'-'*10} {'-'*10} {'-'*10}")
    for case_name, case_data in per_case_results.items():
        cname = case_name[:45]
        ccount = case_data["contracts"]
        drate = case_data["detection_rate"]
        hrate = case_data["high_plus_rate"]
        ascore = case_data.get("avg_score", 0)
        print(f"  {cname:<45} {ccount:>10} {drate:>9.1f}% {hrate:>9.1f}% {ascore:>10.4f}")

    print("\n" + "=" * 70)
    print("PHASE 7: VENDOR-LEVEL ANALYSIS")
    print("=" * 70)

    # Analyze by vendor
    vendor_analysis = []
    for vendor_id in vendor_ids:
        vendor_contracts = [c for c in known_bad_contracts if c['vendor_id'] == vendor_id]
        if vendor_contracts:
            v_dist = calculate_risk_distribution(vendor_contracts)
            v_metrics = calculate_detection_metrics(v_dist)
            vendor_info = next((v for v in matched_vendors if v['vendor_id'] == vendor_id), {})

            vendor_analysis.append({
                'vendor_id': vendor_id,
                'vendor_name': vendor_info.get('vendor_name', 'Unknown'),
                'case_name': vendor_info.get('case_name', 'Unknown'),
                'role': vendor_info.get('role', 'Unknown'),
                'contract_count': len(vendor_contracts),
                'total_value': sum(c.get('amount_mxn', 0) or 0 for c in vendor_contracts),
                'detection_rate': v_metrics['detection_rate'],
                'avg_risk': sum(c.get('risk_score', 0) or 0 for c in vendor_contracts) / len(vendor_contracts)
            })

    # Sort by contract count
    vendor_analysis.sort(key=lambda x: x['contract_count'], reverse=True)
    results['vendor_analysis'] = vendor_analysis[:20]

    print(f"\nTop vendors by contract count:")
    for va in vendor_analysis[:10]:
        print(f"  {va['vendor_name'][:40]}: {va['contract_count']} contracts, "
              f"detection rate {va['detection_rate']:.1f}%, avg risk {va['avg_risk']:.3f}")

    # Save results
    if not dry_run:
        print("\n" + "=" * 70)
        print("SAVING RESULTS")
        print("=" * 70)

        save_validation_results(cursor, results['run_id'], model_version, results)
        conn.commit()
        print(f"\nResults saved with run_id: {results['run_id']}")

    results['status'] = 'success'
    return results


def print_summary(results: Dict[str, Any]) -> None:
    """Print validation summary."""
    print("\n" + "=" * 70)
    print("VALIDATION SUMMARY")
    print("=" * 70)

    if results.get('status') == 'no_data':
        print("\nNo data available for validation.")
        return

    print(f"\nRun ID: {results['run_id']}")
    print(f"Model Version: {results['model_version']}")
    print(f"Timestamp: {results['timestamp']}")

    print(f"\nGround Truth Coverage:")
    print(f"  Vendors matched: {results['total_vendors']}")
    print(f"  Institutions matched: {results['total_institutions']}")
    print(f"  Contracts analyzed: {results['total_contracts']}")

    print(f"\nKEY METRICS:")
    metrics = results['metrics']
    print(f"  Detection Rate (medium+ risk): {metrics['detection_rate']:.1f}%")
    print(f"  High/Critical Rate: {metrics['high_plus_rate']:.1f}%")
    print(f"  False Negative Rate: {metrics['low_rate']:.1f}%")
    print(f"  Model Lift vs Baseline: {results['lift']:.2f}x")

    print(f"\nINTERPRETATION:")
    detection = metrics['detection_rate']
    if detection >= 80:
        print(f"  EXCELLENT: Model flags >{detection:.0f}% of known bad contracts")
    elif detection >= 60:
        print(f"  GOOD: Model flags {detection:.0f}% of known bad contracts")
    elif detection >= 40:
        print(f"  MODERATE: Model flags {detection:.0f}% - consider weight adjustments")
    else:
        print(f"  LOW: Only {detection:.0f}% detected - model needs recalibration")

    lift = results['lift']
    if lift >= 2.0:
        print(f"  Strong lift ({lift:.1f}x) indicates model discriminates well")
    elif lift >= 1.5:
        print(f"  Moderate lift ({lift:.1f}x) shows useful discrimination")
    else:
        print(f"  Low lift ({lift:.1f}x) suggests model may need improvement")

    # Statistical metrics
    stat_metrics = results.get("statistical_metrics")
    if stat_metrics:
        print(f"\nSTATISTICAL METRICS:")
        if stat_metrics.get("auc_roc") is not None:
            auc_val = stat_metrics["auc_roc"]
            print(f"  AUC-ROC: {auc_val:.4f}")
        brier_val = stat_metrics["brier_score"]
        print(f"  Brier Score: {brier_val:.4f}")
        ll_val = stat_metrics["log_loss"]
        print(f"  Log Loss: {ll_val:.4f}")
        if stat_metrics.get("mean_calibration_error") is not None:
            mce_val = stat_metrics["mean_calibration_error"]
            print(f"  Mean Calibration Error: {mce_val:.4f}")
    elif stat_metrics is None and "statistical_metrics" in results:
        print(f"\nSTATISTICAL METRICS: Skipped (sklearn not installed)")

    # Per-case detection
    per_case = results.get("per_case_detection")
    if per_case:
        print(f"\nPER-CASE DETECTION:")
        for case_name, case_data in per_case.items():
            dr = case_data["detection_rate"]
            cc = case_data["contracts"]
            avs = case_data.get("avg_score", 0)
            print(f"  {case_name}: {dr:.1f}% detected ({cc} contracts, avg score {avs:.3f})")


def main():
    parser = argparse.ArgumentParser(
        description='Validate risk model against ground truth corruption cases'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Run validation without saving results'
    )
    parser.add_argument(
        '--model-version',
        type=str,
        default='v3.3',
        help='Model version being validated (default: v3.1)'
    )
    args = parser.parse_args()

    print("=" * 70)
    print("YANG WEN-LI: RISK MODEL VALIDATION")
    print("=" * 70)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Model version: {args.model_version}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    if args.dry_run:
        print("\n*** DRY RUN MODE - Results will not be saved ***")

    if not os.path.exists(DB_PATH):
        print(f"\nERROR: Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    try:
        results = run_validation(conn, args.model_version, args.dry_run)
        print_summary(results)

        print("\n" + "=" * 70)
        print("VALIDATION COMPLETE")
        print("=" * 70)

        if results.get('status') == 'success':
            print("\nNext steps:")
            print("  1. Review false negatives for patterns")
            print("  2. Analyze factor effectiveness")
            print("  3. Consider weight adjustments if detection < 80%")
            print("  4. Run /validation/summary API endpoint for dashboard")

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    main()
