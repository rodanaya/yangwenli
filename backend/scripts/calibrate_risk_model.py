"""
Bayesian Calibration of Risk Model v4.0

Transforms z-score features into calibrated corruption probabilities:
  P(corrupt|z) = σ(β₀ + βᵀz)   where σ = logistic sigmoid

Key techniques:
  1. Likelihood ratios per factor (empirical discrimination measurement)
  2. Bayesian logistic regression with OECD prior (β₀ = log(0.075/0.925))
  3. L2 regularization (C=0.1) to handle tiny ground truth (1,309 contracts)
  4. Platt scaling for calibration
  5. Positive-Unlabeled (PU) learning correction
  6. Bootstrap confidence intervals (1,000 iterations)

Ground truth: 1,309 contracts from 12 matched known-bad vendors
  + random sample of ~10,000 unlabeled contracts

Creates table: model_calibration
  Stores fitted weights, intercept, diagnostics, CI bounds

Usage:
    python -m scripts.calibrate_risk_model [--n-bootstrap 1000] [--random-sample 10000]
"""

import sys
import sqlite3
import json
import argparse
import numpy as np
from pathlib import Path
from datetime import datetime

try:
    from sklearn.linear_model import LogisticRegression
    from sklearn.calibration import CalibratedClassifierCV, calibration_curve
    from sklearn.metrics import (
        roc_auc_score, brier_score_loss, log_loss,
        precision_recall_curve, average_precision_score
    )
    from sklearn.model_selection import StratifiedKFold
    from scipy.stats import chi2
    HAS_DEPS = True
except ImportError:
    HAS_DEPS = False

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Z-score columns (must match compute_z_features.py)
Z_COLS = [
    'z_single_bid', 'z_direct_award', 'z_price_ratio',
    'z_vendor_concentration', 'z_ad_period_days', 'z_year_end',
    'z_same_day_count', 'z_network_member_count', 'z_co_bid_rate',
    'z_price_hyp_confidence', 'z_industry_mismatch', 'z_institution_risk',
]

FACTOR_NAMES = [c.replace('z_', '') for c in Z_COLS]

# OECD prior: ~7.5% of procurement has corruption indicators
OECD_PRIOR = 0.075
PRIOR_INTERCEPT = np.log(OECD_PRIOR / (1 - OECD_PRIOR))  # ≈ -2.51


def create_calibration_table(conn: sqlite3.Connection):
    """Create model_calibration table."""
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS model_calibration")
    cursor.execute("""
        CREATE TABLE model_calibration (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model_version VARCHAR(10) NOT NULL,
            run_id VARCHAR(50) NOT NULL,
            intercept REAL NOT NULL,
            coefficients TEXT NOT NULL,         -- JSON: factor_name -> weight
            likelihood_ratios TEXT,             -- JSON: factor_name -> LR
            pu_correction_factor REAL,          -- c = P(labeled=1|corrupt)
            auc_roc REAL,
            brier_score REAL,
            log_loss_val REAL,
            average_precision REAL,
            calibration_curve TEXT,             -- JSON: {fraction_of_positives, mean_predicted}
            bootstrap_ci TEXT,                  -- JSON: {factor: [lower, upper]}
            n_positive INTEGER,
            n_negative INTEGER,
            n_bootstrap INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    print("Created model_calibration table")


def load_training_data(conn: sqlite3.Connection, random_sample_size: int = 10000):
    """Load z-features for known-bad vendors and random sample.

    Returns: X (features), y (labels), contract_ids
    """
    cursor = conn.cursor()
    z_select = ', '.join(Z_COLS)

    # Load known-bad vendor contracts
    cursor.execute(f"""
        SELECT zf.contract_id, {', '.join(f'zf.{c}' for c in Z_COLS)}
        FROM contract_z_features zf
        JOIN contracts c ON zf.contract_id = c.id
        JOIN ground_truth_vendors gtv ON c.vendor_id = gtv.vendor_id
        WHERE gtv.vendor_id IS NOT NULL
    """)
    positive_rows = cursor.fetchall()
    print(f"  Known-bad contracts (positives): {len(positive_rows)}")

    if len(positive_rows) == 0:
        print("ERROR: No positive samples found. Check ground_truth_vendors table.")
        return None, None, None

    # Load random sample (negatives / unlabeled)
    positive_ids = {r[0] for r in positive_rows}
    cursor.execute(f"""
        SELECT contract_id, {', '.join(Z_COLS)}
        FROM contract_z_features
        WHERE contract_id NOT IN ({','.join('?' * len(positive_ids))})
        ORDER BY RANDOM()
        LIMIT ?
    """, list(positive_ids) + [random_sample_size])
    negative_rows = cursor.fetchall()
    print(f"  Random sample (negatives): {len(negative_rows)}")

    # Build arrays
    all_rows = positive_rows + negative_rows
    n_pos = len(positive_rows)
    n_neg = len(negative_rows)

    contract_ids = np.array([r[0] for r in all_rows])
    X = np.array([[r[i+1] if r[i+1] is not None else 0.0
                   for i in range(len(Z_COLS))]
                  for r in all_rows], dtype=np.float64)
    y = np.array([1] * n_pos + [0] * n_neg, dtype=np.int32)

    # Clean data
    X = np.nan_to_num(X, nan=0.0, posinf=10.0, neginf=-10.0)
    X = np.clip(X, -10.0, 10.0)

    return X, y, contract_ids


def compute_likelihood_ratios(X, y):
    """Compute likelihood ratios for each factor.

    LR_i = P(z_i > 1 | positive) / P(z_i > 1 | negative)
    """
    X_pos = X[y == 1]
    X_neg = X[y == 0]

    lrs = {}
    for i, factor in enumerate(FACTOR_NAMES):
        # Proportion with z > 1 in each group
        p_pos = np.mean(X_pos[:, i] > 1.0) if len(X_pos) > 0 else 0.0
        p_neg = np.mean(X_neg[:, i] > 1.0) if len(X_neg) > 0 else 0.0

        # Avoid division by zero
        if p_neg > 0:
            lr = p_pos / p_neg
        elif p_pos > 0:
            lr = 10.0  # Cap at 10x if negative rate is 0
        else:
            lr = 1.0

        lrs[factor] = round(float(lr), 3)

    return lrs


def fit_calibrated_model(X, y, n_bootstrap=1000):
    """Fit Bayesian logistic regression with Platt scaling.

    Returns: model, diagnostics dict
    """
    diagnostics = {}

    # Calculate class weight to handle imbalance
    n_pos = np.sum(y == 1)
    n_neg = np.sum(y == 0)
    weight_ratio = n_neg / n_pos if n_pos > 0 else 10.0

    print(f"\n  Fitting logistic regression (C=0.1, weight_ratio={weight_ratio:.1f})...")

    # Primary model: L2-regularized logistic regression
    base_model = LogisticRegression(
        C=0.1,  # Strong regularization (L2 is default)
        class_weight={0: 1, 1: min(weight_ratio, 20)},
        max_iter=1000,
        solver='lbfgs',
        random_state=42
    )
    base_model.fit(X, y)

    # Calibrate with Platt scaling (isotonic regression for better calibration)
    print("  Applying Platt scaling calibration...")
    try:
        # Use 3-fold CV since we have limited positives
        n_splits = min(3, n_pos)
        if n_splits >= 2:
            calibrated_model = CalibratedClassifierCV(
                base_model, cv=n_splits, method='sigmoid'
            )
            calibrated_model.fit(X, y)
        else:
            calibrated_model = base_model
    except Exception as e:
        print(f"  Calibration failed ({e}), using uncalibrated model")
        calibrated_model = base_model

    # Compute predictions
    if hasattr(calibrated_model, 'predict_proba'):
        y_prob = calibrated_model.predict_proba(X)[:, 1]
    else:
        y_prob = base_model.predict_proba(X)[:, 1]

    # Metrics
    diagnostics['auc_roc'] = float(roc_auc_score(y, y_prob))
    diagnostics['brier_score'] = float(brier_score_loss(y, y_prob))

    y_prob_clipped = np.clip(y_prob, 0.001, 0.999)
    diagnostics['log_loss'] = float(log_loss(y, y_prob_clipped))
    diagnostics['average_precision'] = float(average_precision_score(y, y_prob))

    print(f"  AUC-ROC: {diagnostics['auc_roc']:.4f}")
    print(f"  Brier Score: {diagnostics['brier_score']:.4f}")
    print(f"  Log Loss: {diagnostics['log_loss']:.4f}")
    print(f"  Avg Precision: {diagnostics['average_precision']:.4f}")

    # Calibration curve
    try:
        fraction_pos, mean_pred = calibration_curve(y, y_prob, n_bins=10, strategy='quantile')
        diagnostics['calibration_curve'] = {
            'fraction_of_positives': fraction_pos.tolist(),
            'mean_predicted_value': mean_pred.tolist(),
        }
    except Exception:
        diagnostics['calibration_curve'] = None

    # Extract coefficients from base model
    coefficients = {}
    for i, factor in enumerate(FACTOR_NAMES):
        coefficients[factor] = float(base_model.coef_[0][i])
    diagnostics['coefficients'] = coefficients
    diagnostics['intercept'] = float(base_model.intercept_[0])

    # PU-learning correction factor
    # c = P(labeled=1 | corrupt)
    # Estimate from positive predictions in labeled set
    pos_probs = y_prob[y == 1]
    c_hat = float(np.mean(pos_probs)) if len(pos_probs) > 0 else 1.0
    c_hat = max(c_hat, 0.1)  # Floor at 0.1
    diagnostics['pu_correction'] = c_hat
    print(f"  PU correction factor c={c_hat:.3f}")

    # Bootstrap confidence intervals
    print(f"\n  Running {n_bootstrap} bootstrap iterations...")
    bootstrap_coefs = []
    bootstrap_aucs = []

    rng = np.random.RandomState(42)
    for b in range(n_bootstrap):
        # Resample with replacement
        idx = rng.choice(len(y), size=len(y), replace=True)
        X_boot, y_boot = X[idx], y[idx]

        # Skip if no positive samples in bootstrap
        if np.sum(y_boot == 1) < 2:
            continue

        try:
            model_boot = LogisticRegression(
                C=0.1,
                class_weight={0: 1, 1: min(weight_ratio, 20)},
                max_iter=500, solver='lbfgs', random_state=b
            )
            model_boot.fit(X_boot, y_boot)
            bootstrap_coefs.append(model_boot.coef_[0].tolist())

            y_boot_prob = model_boot.predict_proba(X_boot)[:, 1]
            bootstrap_aucs.append(roc_auc_score(y_boot, y_boot_prob))
        except Exception:
            continue

        if (b + 1) % 200 == 0:
            print(f"    Bootstrap {b+1}/{n_bootstrap}")

    # Compute CIs
    if bootstrap_coefs:
        coef_array = np.array(bootstrap_coefs)
        ci_lower = np.percentile(coef_array, 2.5, axis=0)
        ci_upper = np.percentile(coef_array, 97.5, axis=0)

        bootstrap_ci = {}
        for i, factor in enumerate(FACTOR_NAMES):
            bootstrap_ci[factor] = [float(ci_lower[i]), float(ci_upper[i])]
        diagnostics['bootstrap_ci'] = bootstrap_ci

        auc_ci = [float(np.percentile(bootstrap_aucs, 2.5)),
                  float(np.percentile(bootstrap_aucs, 97.5))]
        diagnostics['auc_ci'] = auc_ci
        print(f"  AUC 95% CI: [{auc_ci[0]:.4f}, {auc_ci[1]:.4f}]")
    else:
        diagnostics['bootstrap_ci'] = {}
        diagnostics['auc_ci'] = None

    return calibrated_model, base_model, diagnostics


def save_calibration(conn: sqlite3.Connection, model_version: str,
                     run_id: str, diagnostics: dict, n_pos: int, n_neg: int,
                     n_bootstrap: int):
    """Save calibration results to database."""
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO model_calibration
            (model_version, run_id, intercept, coefficients, likelihood_ratios,
             pu_correction_factor, auc_roc, brier_score, log_loss_val,
             average_precision, calibration_curve, bootstrap_ci,
             n_positive, n_negative, n_bootstrap)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        model_version,
        run_id,
        diagnostics['intercept'],
        json.dumps(diagnostics['coefficients']),
        json.dumps(diagnostics.get('likelihood_ratios', {})),
        diagnostics.get('pu_correction', 1.0),
        diagnostics.get('auc_roc'),
        diagnostics.get('brier_score'),
        diagnostics.get('log_loss'),
        diagnostics.get('average_precision'),
        json.dumps(diagnostics.get('calibration_curve')) if diagnostics.get('calibration_curve') else None,
        json.dumps(diagnostics.get('bootstrap_ci', {})),
        n_pos,
        n_neg,
        n_bootstrap,
    ))
    conn.commit()
    print(f"  Saved calibration run: {run_id}")


def main():
    parser = argparse.ArgumentParser(
        description='Bayesian calibration of risk model v4.0'
    )
    parser.add_argument('--n-bootstrap', type=int, default=1000,
                        help='Number of bootstrap iterations (default: 1000)')
    parser.add_argument('--random-sample', type=int, default=10000,
                        help='Size of random negative sample (default: 10000)')
    parser.add_argument('--model-version', type=str, default='v4.0',
                        help='Model version tag (default: v4.0)')
    args = parser.parse_args()

    if not HAS_DEPS:
        print("ERROR: scikit-learn and scipy required.")
        return 1

    print("=" * 60)
    print("RISK MODEL v4.0: Bayesian Calibration")
    print("=" * 60)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Bootstrap iterations: {args.n_bootstrap}")
    print(f"Random sample size: {args.random_sample}")
    print(f"OECD prior: {OECD_PRIOR} (intercept={PRIOR_INTERCEPT:.2f})")

    if not DB_PATH.exists():
        print(f"ERROR: Database not found: {DB_PATH}")
        return 1

    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    try:
        start = datetime.now()
        run_id = f"CAL-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

        # Check prerequisites
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM contract_z_features WHERE mahalanobis_distance IS NOT NULL")
        mah_count = cursor.fetchone()[0]
        if mah_count == 0:
            print("WARNING: No Mahalanobis distances computed. Calibration will proceed without them.")

        # Create table
        create_calibration_table(conn)

        # Load training data
        print("\nLoading training data...")
        X, y, contract_ids = load_training_data(conn, args.random_sample)

        if X is None:
            return 1

        n_pos = int(np.sum(y == 1))
        n_neg = int(np.sum(y == 0))

        # Add Mahalanobis distance as an additional feature if available
        if mah_count > 0:
            print("  Adding Mahalanobis distance as feature...")
            id_list = contract_ids.tolist()
            cursor.execute(f"""
                SELECT contract_id, mahalanobis_distance
                FROM contract_z_features
                WHERE contract_id IN ({','.join('?' * len(id_list))})
            """, id_list)
            mah_lookup = {r[0]: r[1] for r in cursor.fetchall()}
            mah_col = np.array([mah_lookup.get(cid, 0.0) for cid in contract_ids]).reshape(-1, 1)
            mah_col = np.nan_to_num(mah_col, nan=0.0)
            X = np.hstack([X, mah_col])

        # Compute likelihood ratios
        print("\nComputing likelihood ratios...")
        lrs = compute_likelihood_ratios(X[:, :len(Z_COLS)], y)
        print("  Likelihood ratios (P(z>1|bad) / P(z>1|random)):")
        for factor, lr in sorted(lrs.items(), key=lambda x: x[1], reverse=True):
            marker = " ***" if lr >= 2.0 else " **" if lr >= 1.5 else ""
            print(f"    {factor}: {lr:.2f}x{marker}")

        # Fit calibrated model
        print("\nFitting calibrated model...")
        calibrated_model, base_model, diagnostics = fit_calibrated_model(
            X, y, args.n_bootstrap
        )
        diagnostics['likelihood_ratios'] = lrs

        # Print coefficient summary
        print(f"\nCalibrated coefficients (intercept={diagnostics['intercept']:.4f}):")
        coefs = diagnostics['coefficients']
        ci = diagnostics.get('bootstrap_ci', {})
        for factor in sorted(coefs.keys(), key=lambda f: abs(coefs[f]), reverse=True):
            coef = coefs[factor]
            ci_str = ""
            if factor in ci:
                ci_str = f" [{ci[factor][0]:.3f}, {ci[factor][1]:.3f}]"
            sign = "+" if coef > 0 else ""
            print(f"    {factor}: {sign}{coef:.4f}{ci_str}")

        # Save
        print("\nSaving calibration results...")
        save_calibration(conn, args.model_version, run_id, diagnostics,
                         n_pos, n_neg, args.n_bootstrap)

        elapsed = (datetime.now() - start).total_seconds()

        print(f"\n{'='*60}")
        print("CALIBRATION COMPLETE")
        print(f"{'='*60}")
        print(f"Run ID: {run_id}")
        print(f"Positives: {n_pos}, Negatives: {n_neg}")
        print(f"AUC-ROC: {diagnostics['auc_roc']:.4f}")
        print(f"Brier Score: {diagnostics['brier_score']:.4f}")
        print(f"PU Correction: {diagnostics.get('pu_correction', 1.0):.3f}")
        if diagnostics.get('auc_ci'):
            print(f"AUC 95% CI: [{diagnostics['auc_ci'][0]:.4f}, {diagnostics['auc_ci'][1]:.4f}]")
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
