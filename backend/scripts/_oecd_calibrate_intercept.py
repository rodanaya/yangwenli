"""
OECD Intercept Calibration — Post-Hoc HR Adjustment

After training, if the high-risk rate (HR = P(score >= high_threshold)) exceeds
the OECD 2-15% benchmark, apply a post-hoc intercept delta to all model_calibration
rows to bring HR to the target.

Method:
  1. Sample contract_z_features (200K rows) and compute raw logits per contract
     using current model coefficients
  2. Binary search for delta where P(sigmoid(logit+delta)/c >= threshold) = target_hr
  3. Apply delta to intercept column of ALL model_calibration rows for model_version

Usage:
    cd backend && python -m scripts._oecd_calibrate_intercept
    python -m scripts._oecd_calibrate_intercept --target-hr 0.10 --threshold 0.40
"""
import json
import sqlite3
import sys
from pathlib import Path

import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
MODEL_VERSION = 'v6.0'

# v6.1 thresholds: critical>=0.60, high>=0.40, medium>=0.15
HIGH_THRESHOLD = 0.40
TARGET_HR = 0.10  # OECD target: 10% HR (within 2-15% benchmark)
SAMPLE_SIZE = 200_000


def sigmoid(x):
    return 1 / (1 + np.exp(-np.clip(x, -500, 500)))


def compute_logits(conn, global_coefs, global_intercept, factor_names):
    """Sample raw logits from contract_z_features using global model."""
    print(f"  Sampling {SAMPLE_SIZE:,} rows from contract_z_features...")

    # Build the SQL select for z-score columns
    z_cols = ', '.join(f'z_{f}' for f in factor_names)
    rows = conn.execute(f"""
        SELECT {z_cols}
        FROM contract_z_features
        WHERE rowid IN (
            SELECT rowid FROM contract_z_features
            ORDER BY RANDOM() LIMIT {SAMPLE_SIZE}
        )
    """).fetchall()

    print(f"  Got {len(rows):,} samples")
    X = np.array(rows, dtype=float)
    # Replace NaN/inf
    X = np.nan_to_num(X, nan=0.0, posinf=3.0, neginf=-3.0)
    logits = X @ np.array(global_coefs) + global_intercept
    return logits


def calibrate(target_hr, threshold, logits, pu_c):
    """Binary search for delta to hit target_hr."""
    def hr_at_delta(delta):
        scores = np.minimum(sigmoid(logits + delta) / pu_c, 1.0)
        return np.mean(scores >= threshold)

    current_hr = hr_at_delta(0.0)
    print(f"  Current HR (delta=0): {current_hr:.3%}")

    if current_hr <= target_hr:
        print(f"  HR already at or below target ({target_hr:.1%}), no calibration needed.")
        return 0.0

    lo, hi = -5.0, 0.0
    for _ in range(50):
        mid = (lo + hi) / 2
        if hr_at_delta(mid) > target_hr:
            hi = mid
        else:
            lo = mid

    delta = (lo + hi) / 2
    final_hr = hr_at_delta(delta)
    print(f"  Delta = {delta:.4f} → HR = {final_hr:.3%} (target {target_hr:.1%})")
    return delta


def apply_delta(conn, delta, model_version):
    """Apply delta to all intercept values for this model version."""
    rows = conn.execute(
        "SELECT id, sector_id, intercept FROM model_calibration WHERE model_version = ?",
        (model_version,)
    ).fetchall()

    print(f"\n  Applying delta={delta:.4f} to {len(rows)} rows...")
    for row_id, sector_id, old_intercept in rows:
        new_intercept = old_intercept + delta
        conn.execute(
            "UPDATE model_calibration SET intercept = ? WHERE id = ?",
            (new_intercept, row_id)
        )
        label = f"sector_{sector_id}" if sector_id else "global"
        print(f"    {label}: {old_intercept:.4f} → {new_intercept:.4f}")

    conn.commit()
    print(f"  Done — {len(rows)} intercepts updated.")


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--target-hr', type=float, default=TARGET_HR)
    parser.add_argument('--threshold', type=float, default=HIGH_THRESHOLD)
    parser.add_argument('--model-version', default=MODEL_VERSION)
    args = parser.parse_args()

    print("=" * 60)
    print("OECD INTERCEPT CALIBRATION")
    print("=" * 60)
    print(f"  Target HR: {args.target_hr:.1%}, Threshold: {args.threshold}")
    print(f"  Model: {args.model_version}, DB: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH, timeout=120)
    conn.execute("PRAGMA busy_timeout=120000")
    conn.row_factory = sqlite3.Row

    try:
        # Load global model
        row = conn.execute(
            "SELECT intercept, coefficients, pu_correction_factor FROM model_calibration "
            "WHERE model_version = ? AND sector_id IS NULL",
            (args.model_version,)
        ).fetchone()

        if not row:
            print(f"ERROR: No global model found for {args.model_version}")
            return 1

        global_intercept = row['intercept']
        coefs = json.loads(row['coefficients'])
        pu_c = row['pu_correction_factor']
        print(f"\n  Global model: intercept={global_intercept:.4f}, pu_c={pu_c:.4f}")

        # Factor names (must match z_feature columns)
        factor_names = [
            'price_volatility', 'vendor_concentration', 'institution_diversity',
            'price_ratio', 'network_member_count', 'direct_award', 'sector_spread',
            'same_day_count', 'ad_period_days', 'single_bid', 'win_rate',
            'year_end', 'institution_risk', 'industry_mismatch', 'co_bid_rate',
            'price_hyp_confidence',
        ]
        assert len(factor_names) == len(coefs), f"Coef count mismatch: {len(coefs)} vs {len(factor_names)}"

        # Sample logits
        logits = compute_logits(conn, coefs, global_intercept, factor_names)

        # Find delta
        delta = calibrate(args.target_hr, args.threshold, logits, pu_c)

        if delta == 0.0:
            return 0

        # Apply
        apply_delta(conn, delta, args.model_version)

        # Verify
        updated = conn.execute(
            "SELECT intercept FROM model_calibration WHERE model_version = ? AND sector_id IS NULL",
            (args.model_version,)
        ).fetchone()
        print(f"\n  Verified global intercept: {updated[0]:.4f}")
        print(f"\n  Next: run python scripts/_score_v6_now.py to rescore all contracts")
        return 0

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback; traceback.print_exc()
        return 1
    finally:
        conn.close()


if __name__ == '__main__':
    sys.exit(main())
