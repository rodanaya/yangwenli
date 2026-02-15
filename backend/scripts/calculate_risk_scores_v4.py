"""
Risk Scoring v4.0: Calibrated Probability Pipeline

Transforms z-score features into calibrated corruption probabilities
using the Bayesian logistic model from calibrate_risk_model.py.

Pipeline:
  1. Load pre-computed z-features from contract_z_features
  2. Load calibrated model from model_calibration
  3. Compute P(corrupt|z) for each contract
  4. Compute confidence intervals
  5. Write to contracts: risk_score, risk_level, risk_confidence_lower/upper

Usage:
    python -m scripts.calculate_risk_scores_v4 [--batch-size 50000] [--dry-run]
"""

import sys
import sqlite3
import json
import argparse
import numpy as np
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Import canonical thresholds
sys.path.insert(0, str(Path(__file__).parent.parent))
from api.config.constants import RISK_THRESHOLDS_V4, get_risk_level

# Z-score column names
Z_COLS = [
    'z_single_bid', 'z_direct_award', 'z_price_ratio',
    'z_vendor_concentration', 'z_ad_period_days', 'z_year_end',
    'z_same_day_count', 'z_network_member_count', 'z_co_bid_rate',
    'z_price_hyp_confidence', 'z_industry_mismatch', 'z_institution_risk',
    'z_price_volatility', 'z_sector_spread', 'z_win_rate',
    'z_institution_diversity',
]


def ensure_v4_columns(conn: sqlite3.Connection):
    """Add v4.0 columns to contracts table if they don't exist."""
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(contracts)")
    existing = {r[1] for r in cursor.fetchall()}

    new_columns = [
        ("risk_confidence_lower", "REAL"),
        ("risk_confidence_upper", "REAL"),
        ("mahalanobis_distance", "REAL"),
        ("risk_model_version", "VARCHAR(10) DEFAULT 'v3.3'"),
    ]

    for col_name, col_def in new_columns:
        if col_name not in existing:
            print(f"  Adding column: contracts.{col_name}")
            cursor.execute(f"ALTER TABLE contracts ADD COLUMN {col_name} {col_def}")

    conn.commit()


def load_calibration(conn: sqlite3.Connection, model_version: str = 'v4.0'):
    """Load calibrated model weights from model_calibration table."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT intercept, coefficients, pu_correction_factor, bootstrap_ci
        FROM model_calibration
        WHERE model_version = ?
        ORDER BY created_at DESC
        LIMIT 1
    """, (model_version,))

    row = cursor.fetchone()
    if not row:
        print(f"ERROR: No calibration found for {model_version}")
        return None

    intercept = row[0]
    coefficients = json.loads(row[1])
    pu_correction = row[2] or 1.0
    bootstrap_ci = json.loads(row[3]) if row[3] else {}

    # Build coefficient vector in Z_COLS order
    factor_names = [c.replace('z_', '') for c in Z_COLS]
    coef_vector = np.array([coefficients.get(f, 0.0) for f in factor_names])

    print(f"  Loaded calibration: intercept={intercept:.4f}, PU_c={pu_correction:.3f}")
    print(f"  Coefficients: {', '.join(f'{f}={c:.3f}' for f, c in zip(factor_names, coef_vector))}")

    return {
        'intercept': intercept,
        'coef_vector': coef_vector,
        'pu_correction': pu_correction,
        'bootstrap_ci': bootstrap_ci,
    }


def sigmoid(x):
    """Logistic sigmoid, numerically stable."""
    return np.where(x >= 0,
                    1.0 / (1.0 + np.exp(-x)),
                    np.exp(x) / (1.0 + np.exp(x)))


def compute_predictions(Z: np.ndarray, calibration: dict,
                        mahalanobis: np.ndarray = None):
    """Compute calibrated probabilities and confidence intervals.

    Args:
        Z: (n, k) z-score matrix
        calibration: dict with intercept, coef_vector, pu_correction, bootstrap_ci
        mahalanobis: (n,) Mahalanobis distances (optional additional feature)

    Returns:
        probs: (n,) calibrated P(corrupt|z)
        ci_lower: (n,) lower 95% CI
        ci_upper: (n,) upper 95% CI
    """
    intercept = calibration['intercept']
    coef = calibration['coef_vector']
    c = calibration['pu_correction']

    # Linear combination: β₀ + βᵀz
    logits = intercept + Z @ coef

    # Sigmoid → raw probability
    raw_probs = sigmoid(logits)

    # PU-learning correction: P(corrupt|x) = P(labeled=1|x) / c
    probs = np.clip(raw_probs / c, 0.0, 1.0)

    # Confidence intervals via delta method approximation
    # SE(P̂) ≈ P̂ × (1 - P̂) × σ_β / c
    # Simplified: use mean bootstrap coef variance as uncertainty
    ci = calibration.get('bootstrap_ci', {})
    if ci:
        factor_names = [col.replace('z_', '') for col in Z_COLS]
        ci_widths = []
        for f in factor_names:
            if f in ci:
                width = (ci[f][1] - ci[f][0]) / 2.0  # Half-width of 95% CI
                ci_widths.append(width)
            else:
                ci_widths.append(0.0)
        ci_widths = np.array(ci_widths)

        # Propagate uncertainty: SE(logit) ≈ sqrt(sum((z_i * se_βi)²))
        se_logit = np.sqrt(np.sum((Z * ci_widths) ** 2, axis=1))

        # Transform to probability space
        ci_lower = sigmoid(logits - 1.96 * se_logit)
        ci_upper = sigmoid(logits + 1.96 * se_logit)

        # Apply PU correction to CIs
        ci_lower = np.clip(ci_lower / c, 0.0, 1.0)
        ci_upper = np.clip(ci_upper / c, 0.0, 1.0)
    else:
        # No bootstrap data — use ±10% heuristic
        ci_lower = np.clip(probs - 0.10, 0.0, 1.0)
        ci_upper = np.clip(probs + 0.10, 0.0, 1.0)

    return probs, ci_lower, ci_upper


def main():
    parser = argparse.ArgumentParser(
        description='Risk Scoring v4.0: Calibrated Probability Pipeline'
    )
    parser.add_argument('--batch-size', type=int, default=50000)
    parser.add_argument('--dry-run', action='store_true',
                        help='Compute scores but do not write to DB')
    parser.add_argument('--model-version', type=str, default='v4.0')
    args = parser.parse_args()

    print("=" * 60)
    print(f"RISK MODEL v4.0: Calibrated Probability Scoring")
    print("=" * 60)
    print(f"\nDatabase: {DB_PATH}")

    if not DB_PATH.exists():
        print(f"ERROR: Database not found: {DB_PATH}")
        return 1

    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    try:
        start = datetime.now()
        cursor = conn.cursor()

        # Ensure v4.0 columns exist
        ensure_v4_columns(conn)

        # Load calibration
        print("\nLoading calibration...")
        calibration = load_calibration(conn, args.model_version)
        if not calibration:
            return 1

        # Get total
        cursor.execute("SELECT COUNT(*) FROM contract_z_features")
        total = cursor.fetchone()[0]
        if total == 0:
            print("ERROR: No z-features found. Run compute_z_features.py first.")
            return 1
        print(f"\nScoring {total:,} contracts...")

        # Process in batches
        z_select = ', '.join(Z_COLS)
        processed = 0
        offset = 0
        score_dist = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}

        while offset < total:
            cursor.execute(f"""
                SELECT contract_id, {z_select}, mahalanobis_distance
                FROM contract_z_features
                ORDER BY contract_id
                LIMIT ? OFFSET ?
            """, (args.batch_size, offset))

            rows = cursor.fetchall()
            if not rows:
                break

            contract_ids = np.array([r[0] for r in rows], dtype=np.int64)
            Z = np.array([[r[i+1] if r[i+1] is not None else 0.0
                          for i in range(len(Z_COLS))]
                         for r in rows], dtype=np.float64)
            Z = np.nan_to_num(Z, nan=0.0, posinf=10.0, neginf=-10.0)
            Z = np.clip(Z, -10.0, 10.0)

            mah = np.array([r[-1] if r[-1] is not None else 0.0 for r in rows])

            # Compute predictions
            probs, ci_lower, ci_upper = compute_predictions(Z, calibration, mah)

            # Determine risk levels using v4.0 thresholds
            updates = []
            for i in range(len(contract_ids)):
                score = float(probs[i])
                level = get_risk_level(score, 'v4.0')
                score_dist[level] += 1

                updates.append((
                    round(score, 6),
                    level,
                    round(float(ci_lower[i]), 6),
                    round(float(ci_upper[i]), 6),
                    round(float(mah[i]), 4) if mah[i] > 0 else None,
                    args.model_version,
                    int(contract_ids[i]),
                ))

            if not args.dry_run:
                cursor.execute("BEGIN IMMEDIATE TRANSACTION")
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
                cursor.execute("COMMIT")

            processed += len(rows)
            offset += args.batch_size

            elapsed = (datetime.now() - start).total_seconds()
            rate = processed / elapsed if elapsed > 0 else 0
            print(f"  {processed:,}/{total:,} ({100*processed/total:.1f}%) - {rate:.0f}/sec")

        # Summary
        elapsed = (datetime.now() - start).total_seconds()
        total_scored = sum(score_dist.values())

        print(f"\n{'='*60}")
        print("v4.0 SCORING COMPLETE")
        print(f"{'='*60}")
        print(f"\n{'Risk Level':<12} {'Count':>12} {'%':>8}")
        print("-" * 35)
        for level in ['critical', 'high', 'medium', 'low']:
            cnt = score_dist[level]
            pct = 100 * cnt / total_scored if total_scored > 0 else 0
            print(f"{level:<12} {cnt:>12,} {pct:>7.1f}%")

        high_risk_pct = 100 * (score_dist['critical'] + score_dist['high']) / total_scored
        print(f"\nHigh-risk rate: {high_risk_pct:.1f}% (OECD benchmark: 2-15%)")
        print(f"{'DRY RUN - no data written' if args.dry_run else 'Data written to contracts table'}")
        print(f"Time: {elapsed:.1f}s")

    except Exception as e:
        print(f"\nFATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        conn.close()

    return 0


if __name__ == '__main__':
    sys.exit(main())
