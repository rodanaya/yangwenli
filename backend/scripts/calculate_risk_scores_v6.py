"""
Risk Scoring v6.0: Global Model Scoring Pipeline

Uses the v6.0 global model (vendor-stratified, time-windowed) to score all contracts.
No per-sector sub-models — single global ElasticNet logistic regression.

Preserves v5.1 scores in risk_score_v5 before overwriting risk_score.

Usage:
    python -m scripts.calculate_risk_scores_v6 [--batch-size 50000] [--dry-run]
    python -m scripts.calculate_risk_scores_v6 --start-id 1500000  # resume
"""

import sys
import sqlite3
import json
import argparse
import logging
import numpy as np
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

sys.path.insert(0, str(Path(__file__).parent.parent))
from api.config.constants import get_risk_level

Z_COLS = [
    'z_single_bid', 'z_direct_award', 'z_price_ratio',
    'z_vendor_concentration', 'z_ad_period_days', 'z_year_end',
    'z_same_day_count', 'z_network_member_count', 'z_co_bid_rate',
    'z_price_hyp_confidence', 'z_industry_mismatch', 'z_institution_risk',
    'z_price_volatility', 'z_sector_spread', 'z_win_rate',
    'z_institution_diversity',
]
FACTOR_NAMES = [c.replace('z_', '') for c in Z_COLS]

MODEL_VERSION = 'v6.0'


def sigmoid(x):
    """Logistic sigmoid, numerically stable."""
    return np.where(x >= 0,
                    1.0 / (1.0 + np.exp(-x)),
                    np.exp(x) / (1.0 + np.exp(x)))


def load_v6_calibration(conn):
    """Load the v6.0 global model from model_calibration."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT intercept, coefficients, pu_correction_factor, bootstrap_ci
        FROM model_calibration
        WHERE model_version = 'v6.0' AND sector_id IS NULL
        ORDER BY created_at DESC
        LIMIT 1
    """)
    row = cursor.fetchone()
    if not row:
        print("ERROR: No v6.0 calibration found. Run calibrate_risk_model_v6.py first.")
        return None

    coefficients = json.loads(row[1])
    coef_vector = np.array([coefficients.get(f, 0.0) for f in FACTOR_NAMES])
    bootstrap_ci = json.loads(row[2 + 1]) if row[3] else {}

    cal = {
        'intercept': row[0],
        'coef_vector': coef_vector,
        'pu_correction': row[2] or 1.0,
        'bootstrap_ci': bootstrap_ci,
    }

    # Sanity checks
    if not (-5.0 < cal['intercept'] < 0.0):
        raise ValueError(f"Suspicious intercept={cal['intercept']:.4f}. Expected (-5.0, 0.0).")
    if not (0.50 < cal['pu_correction'] < 0.99):
        raise ValueError(f"Suspicious pu_c={cal['pu_correction']:.4f}. Expected (0.50, 0.99).")

    print(f"  Loaded v6.0 global model:")
    print(f"    intercept={cal['intercept']:.4f}, pu_c={cal['pu_correction']:.4f}")
    print(f"    Top coefficients:")
    sorted_idx = np.argsort(np.abs(cal['coef_vector']))[::-1][:5]
    for i in sorted_idx:
        print(f"      {FACTOR_NAMES[i]:30s} {cal['coef_vector'][i]:+.4f}")

    return cal


def compute_predictions(Z, cal):
    """Compute risk scores for a batch of contracts.

    Args:
        Z: (n, k) z-score matrix
        cal: calibration dict with intercept, coef_vector, pu_correction, bootstrap_ci

    Returns: scores, ci_lower, ci_upper (each n-dimensional)
    """
    logits = cal['intercept'] + Z @ cal['coef_vector']
    raw_p = sigmoid(logits)
    scores = np.minimum(raw_p / cal['pu_correction'], 1.0)

    # Confidence intervals from bootstrap
    ci = cal.get('bootstrap_ci', {})
    if ci:
        ci_widths = np.array([
            (ci[f][1] - ci[f][0]) / 2.0 if f in ci else 0.0
            for f in FACTOR_NAMES
        ])
        se_logits = np.sqrt(np.sum((Z * ci_widths) ** 2, axis=1))
        cl = sigmoid(logits - 1.96 * se_logits) / cal['pu_correction']
        cu = sigmoid(logits + 1.96 * se_logits) / cal['pu_correction']
        ci_lower = np.maximum(np.minimum(cl, scores), 0.0)
        ci_upper = np.minimum(np.maximum(cu, scores), 1.0)
    else:
        ci_lower = np.maximum(scores - 0.10, 0.0)
        ci_upper = np.minimum(scores + 0.10, 1.0)

    return scores, ci_lower, ci_upper


def main():
    parser = argparse.ArgumentParser(description='Risk Scoring v6.0')
    parser.add_argument('--batch-size', type=int, default=50000)
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--start-id', type=int, default=0)
    args = parser.parse_args()

    print("=" * 60)
    print("RISK MODEL v6.0: Vendor Anomaly Ranker — Scoring Pipeline")
    print("=" * 60)

    if not DB_PATH.exists():
        print(f"ERROR: Database not found: {DB_PATH}")
        return 1

    conn = sqlite3.connect(DB_PATH, timeout=300)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=300000")
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA cache_size=-200000")

    try:
        start = datetime.now()
        cursor = conn.cursor()

        # Check v5.1 scores are preserved
        row = cursor.execute(
            "SELECT COUNT(*) FROM contracts WHERE risk_score_v5 IS NOT NULL"
        ).fetchone()
        if row[0] == 0:
            print("\nERROR: v5.1 scores not preserved yet. Run preservation step first.")
            return 1
        else:
            print(f"\nv5.1 scores already preserved ({row[0]:,} rows in risk_score_v5)")

        # Load calibration
        print("\nLoading v6.0 calibration...")
        cal = load_v6_calibration(conn)
        if cal is None:
            return 1

        # Count total
        cursor.execute("SELECT COUNT(*) FROM contract_z_features")
        total = cursor.fetchone()[0]
        print(f"\nScoring {total:,} contracts...")

        processed = 0
        last_id = args.start_id
        score_dist = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}

        z_select = ', '.join(f'zf.{c}' for c in Z_COLS)

        while True:
            cursor.execute(f"""
                SELECT zf.contract_id, {z_select}, zf.mahalanobis_distance
                FROM contract_z_features zf
                WHERE zf.contract_id > ?
                ORDER BY zf.contract_id
                LIMIT ?
            """, (last_id, args.batch_size))

            rows = cursor.fetchall()
            if not rows:
                break

            contract_ids = np.array([r[0] for r in rows], dtype=np.int64)
            Z = np.array([[r[i + 1] if r[i + 1] is not None else 0.0
                          for i in range(len(Z_COLS))]
                         for r in rows], dtype=np.float64)
            Z = np.nan_to_num(Z, nan=0.0, posinf=10.0, neginf=-10.0)
            Z = np.clip(Z, -10.0, 10.0)

            mah = np.array([r[len(Z_COLS) + 1] if r[len(Z_COLS) + 1] is not None else 0.0
                           for r in rows])

            # Compute predictions (global model only)
            scores, ci_lower, ci_upper = compute_predictions(Z, cal)

            scores_r = np.round(scores, 6)
            ci_lo_r = np.round(ci_lower, 6)
            ci_hi_r = np.round(ci_upper, 6)
            mah_r = np.round(mah, 4)

            updates = []
            for i in range(len(contract_ids)):
                score = float(scores_r[i])
                level = get_risk_level(score, 'v4.0')  # same thresholds
                score_dist[level] += 1
                updates.append((
                    score, level,
                    float(ci_lo_r[i]),
                    float(ci_hi_r[i]),
                    float(mah_r[i]) if mah[i] > 0 else None,
                    'v6.0',
                    int(contract_ids[i]),
                ))

            if not args.dry_run:
                cursor.executemany("""
                    UPDATE contracts
                    SET risk_score = ?,
                        risk_level = ?,
                        risk_confidence_lower = ?,
                        risk_confidence_upper = ?,
                        mahalanobis_distance = ?,
                        risk_model_version = ?
                    WHERE id = ?
                """, updates)
                conn.commit()

            processed += len(rows)
            last_id = int(contract_ids[-1])
            elapsed = (datetime.now() - start).total_seconds()
            rate = processed / elapsed if elapsed > 0 else 0
            print(f"  {processed:,}/{total:,} ({100 * processed / total:.1f}%) "
                  f"- {rate:.0f}/sec")

        # Summary
        elapsed = (datetime.now() - start).total_seconds()
        total_scored = sum(score_dist.values())

        print(f"\n{'=' * 60}")
        print("v6.0 SCORING COMPLETE")
        print(f"{'=' * 60}")
        print(f"\n{'Risk Level':<12} {'Count':>12} {'%':>8}")
        print("-" * 35)
        for level in ['critical', 'high', 'medium', 'low']:
            cnt = score_dist[level]
            pct = 100 * cnt / total_scored if total_scored > 0 else 0
            print(f"{level:<12} {cnt:>12,} {pct:>7.1f}%")

        high_risk_pct = 100 * (score_dist['critical'] + score_dist['high']) / total_scored
        print(f"\nHigh-risk rate: {high_risk_pct:.1f}% (OECD benchmark: 2-15%)")
        print(f"{'DRY RUN' if args.dry_run else 'Written to DB'}")
        print(f"Time: {elapsed:.1f}s")

    except Exception as e:
        print(f"\nFATAL: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        conn.close()

    return 0


if __name__ == '__main__':
    sys.exit(main())
