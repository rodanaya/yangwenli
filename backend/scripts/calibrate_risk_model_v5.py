"""
Risk Model v5.0: Honest & Diversified Calibration

Improvements over v4.0:
  1. Temporal train/test split (train <=2020, test >=2021)
  2. Elkan & Noto PU-learning correction (holdout method)
  3. ElasticNet (L1+L2) with cross-validated hyperparameters
  4. Per-sector sub-models for sectors with enough ground truth
  5. Expanded ground truth (15 cases, 27 vendors across all 12 sectors)

Usage:
    python -m scripts.calibrate_risk_model_v5 [--n-bootstrap 500] [--random-sample 15000]
"""

import sys
import sqlite3
import json
import argparse
import numpy as np
from pathlib import Path
from datetime import datetime

try:
    from sklearn.linear_model import LogisticRegression, SGDClassifier
    from sklearn.calibration import CalibratedClassifierCV, calibration_curve
    from sklearn.metrics import (
        roc_auc_score, brier_score_loss, log_loss, average_precision_score
    )
    from sklearn.model_selection import StratifiedKFold
    from sklearn.preprocessing import StandardScaler
    HAS_DEPS = True
except ImportError:
    HAS_DEPS = False

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

Z_COLS = [
    'z_single_bid', 'z_direct_award', 'z_price_ratio',
    'z_vendor_concentration', 'z_ad_period_days', 'z_year_end',
    'z_same_day_count', 'z_network_member_count', 'z_co_bid_rate',
    'z_price_hyp_confidence', 'z_industry_mismatch', 'z_institution_risk',
    'z_price_volatility', 'z_sector_spread', 'z_win_rate',
    'z_institution_diversity',
]
FACTOR_NAMES = [c.replace('z_', '') for c in Z_COLS]

OECD_PRIOR = 0.075
PRIOR_INTERCEPT = np.log(OECD_PRIOR / (1 - OECD_PRIOR))

# Temporal split boundary
TRAIN_YEAR_MAX = 2020
TEST_YEAR_MIN = 2021

# Per-sector model: minimum ground truth contracts in train set
SECTOR_MIN_TRAIN = 200


def load_training_data(conn, random_sample_size=15000, temporal_split=True):
    """Load z-features with temporal information.

    Returns dict with keys: X_train, y_train, X_test, y_test,
        sector_train, sector_test, ids_train, ids_test
    """
    cursor = conn.cursor()
    z_select = ', '.join(f'zf.{c}' for c in Z_COLS)

    # Load known-bad vendor contracts with year and sector
    cursor.execute(f"""
        SELECT zf.contract_id, {z_select}, c.contract_year, c.sector_id
        FROM contract_z_features zf
        JOIN contracts c ON zf.contract_id = c.id
        JOIN ground_truth_vendors gtv ON c.vendor_id = gtv.vendor_id
        WHERE gtv.vendor_id IS NOT NULL
    """)
    positive_rows = cursor.fetchall()
    print(f"  Known-bad contracts (positives): {len(positive_rows)}")

    if not positive_rows:
        print("ERROR: No positive samples found.")
        return None

    # Load random sample (negatives)
    positive_ids = {r[0] for r in positive_rows}
    placeholders = ','.join('?' * len(positive_ids))
    cursor.execute(f"""
        SELECT zf.contract_id, {z_select}, c.contract_year, c.sector_id
        FROM contract_z_features zf
        JOIN contracts c ON zf.contract_id = c.id
        WHERE zf.contract_id NOT IN ({placeholders})
        ORDER BY RANDOM()
        LIMIT ?
    """, list(positive_ids) + [random_sample_size])
    negative_rows = cursor.fetchall()
    print(f"  Random sample (negatives): {len(negative_rows)}")

    def parse_rows(rows, label):
        ids = np.array([r[0] for r in rows], dtype=np.int64)
        X = np.array([[r[i + 1] if r[i + 1] is not None else 0.0
                       for i in range(len(Z_COLS))]
                      for r in rows], dtype=np.float64)
        X = np.nan_to_num(X, nan=0.0, posinf=10.0, neginf=-10.0)
        X = np.clip(X, -10.0, 10.0)
        years = np.array([r[len(Z_COLS) + 1] or 2015 for r in rows], dtype=np.int32)
        sectors = np.array([r[len(Z_COLS) + 2] or 12 for r in rows], dtype=np.int32)
        y = np.full(len(rows), label, dtype=np.int32)
        return ids, X, y, years, sectors

    pos_ids, pos_X, pos_y, pos_years, pos_sectors = parse_rows(positive_rows, 1)
    neg_ids, neg_X, neg_y, neg_years, neg_sectors = parse_rows(negative_rows, 0)

    # Combine
    all_ids = np.concatenate([pos_ids, neg_ids])
    all_X = np.concatenate([pos_X, neg_X])
    all_y = np.concatenate([pos_y, neg_y])
    all_years = np.concatenate([pos_years, neg_years])
    all_sectors = np.concatenate([pos_sectors, neg_sectors])

    if temporal_split:
        train_mask = all_years <= TRAIN_YEAR_MAX
        test_mask = all_years >= TEST_YEAR_MIN

        print(f"\n  Temporal split: train <= {TRAIN_YEAR_MAX}, test >= {TEST_YEAR_MIN}")
        print(f"  Train: {train_mask.sum()} ({(all_y[train_mask] == 1).sum()} pos)")
        print(f"  Test:  {test_mask.sum()} ({(all_y[test_mask] == 1).sum()} pos)")

        return {
            'X_train': all_X[train_mask], 'y_train': all_y[train_mask],
            'X_test': all_X[test_mask], 'y_test': all_y[test_mask],
            'sector_train': all_sectors[train_mask],
            'sector_test': all_sectors[test_mask],
            'ids_train': all_ids[train_mask], 'ids_test': all_ids[test_mask],
            'X_all': all_X, 'y_all': all_y,
            'sector_all': all_sectors, 'ids_all': all_ids,
        }
    else:
        return {
            'X_train': all_X, 'y_train': all_y,
            'X_test': all_X, 'y_test': all_y,
            'sector_train': all_sectors, 'sector_test': all_sectors,
            'ids_train': all_ids, 'ids_test': all_ids,
            'X_all': all_X, 'y_all': all_y,
            'sector_all': all_sectors, 'ids_all': all_ids,
        }


def elkan_noto_pu_correction(X_pos, y_pos_dummy, X_neg, holdout_fraction=0.2,
                              C=0.1, random_state=42):
    """Elkan & Noto (2008) PU-learning correction.

    Holds out a fraction of labeled positives, trains on the rest + negatives,
    then estimates c = P(labeled=1|corrupt) from held-out positives.
    This breaks the circularity of the naive estimator.
    """
    rng = np.random.RandomState(random_state)
    n_pos = len(X_pos)
    n_holdout = max(int(n_pos * holdout_fraction), 5)

    # Shuffle and split positives
    perm = rng.permutation(n_pos)
    holdout_idx = perm[:n_holdout]
    train_idx = perm[n_holdout:]

    X_pos_train = X_pos[train_idx]
    X_pos_holdout = X_pos[holdout_idx]

    # Train on partial positives + all negatives
    X_train = np.vstack([X_pos_train, X_neg])
    y_train = np.array([1] * len(X_pos_train) + [0] * len(X_neg))

    weight_ratio = min(len(X_neg) / max(len(X_pos_train), 1), 20)
    model = LogisticRegression(
        C=C, class_weight={0: 1, 1: weight_ratio},
        max_iter=1000, solver='lbfgs', random_state=random_state
    )
    model.fit(X_train, y_train)

    # c = mean predicted probability on held-out positives
    holdout_probs = model.predict_proba(X_pos_holdout)[:, 1]
    c_hat = float(np.mean(holdout_probs))
    c_hat = max(c_hat, 0.05)  # Floor at 5%

    return c_hat


def cross_validate_hyperparams(X, y, n_folds=5):
    """Cross-validate C and l1_ratio for ElasticNet logistic regression.

    Returns best (C, l1_ratio) by OOB AUC.
    """
    C_values = [0.01, 0.1, 1.0, 10.0]
    l1_ratios = [0.0, 0.25, 0.5]  # 0.0 = pure L2, 1.0 = pure L1

    n_pos = np.sum(y == 1)
    n_neg = np.sum(y == 0)
    weight_ratio = min(n_neg / max(n_pos, 1), 20)

    best_score = -1
    best_params = (0.1, 0.0)
    results = []

    # Ensure enough samples per fold
    actual_folds = min(n_folds, n_pos, n_neg)
    if actual_folds < 2:
        print("  WARNING: Not enough samples for CV, using defaults")
        return 0.1, 0.0

    skf = StratifiedKFold(n_splits=actual_folds, shuffle=True, random_state=42)

    for C in C_values:
        for l1_ratio in l1_ratios:
            fold_aucs = []
            for fold_train, fold_test in skf.split(X, y):
                X_tr, X_te = X[fold_train], X[fold_test]
                y_tr, y_te = y[fold_train], y[fold_test]

                if np.sum(y_te == 1) < 1 or np.sum(y_te == 0) < 1:
                    continue

                try:
                    if l1_ratio == 0.0:
                        # Pure L2 — use lbfgs
                        model = LogisticRegression(
                            C=C, penalty='l2',
                            class_weight={0: 1, 1: weight_ratio},
                            max_iter=1000, solver='lbfgs', random_state=42
                        )
                    else:
                        # ElasticNet — use saga
                        model = LogisticRegression(
                            C=C, penalty='elasticnet', l1_ratio=l1_ratio,
                            class_weight={0: 1, 1: weight_ratio},
                            max_iter=2000, solver='saga', random_state=42
                        )
                    model.fit(X_tr, y_tr)
                    y_prob = model.predict_proba(X_te)[:, 1]
                    fold_aucs.append(roc_auc_score(y_te, y_prob))
                except Exception:
                    continue

            if fold_aucs:
                mean_auc = np.mean(fold_aucs)
                results.append((C, l1_ratio, mean_auc, np.std(fold_aucs)))
                if mean_auc > best_score:
                    best_score = mean_auc
                    best_params = (C, l1_ratio)

    print(f"\n  Hyperparameter CV results ({actual_folds}-fold):")
    for C, l1, mean_auc, std_auc in sorted(results, key=lambda x: -x[2])[:6]:
        marker = " <-- BEST" if (C, l1) == best_params else ""
        print(f"    C={C:<6} l1_ratio={l1:<5} AUC={mean_auc:.4f} +/- {std_auc:.4f}{marker}")

    return best_params


def fit_global_model(X_train, y_train, X_test, y_test, C, l1_ratio,
                     n_bootstrap=500):
    """Fit global model with best hyperparameters.

    Returns model, diagnostics dict.
    """
    n_pos = np.sum(y_train == 1)
    n_neg = np.sum(y_train == 0)
    weight_ratio = min(n_neg / max(n_pos, 1), 20)

    # Fit primary model
    if l1_ratio == 0.0:
        base_model = LogisticRegression(
            C=C, penalty='l2',
            class_weight={0: 1, 1: weight_ratio},
            max_iter=1000, solver='lbfgs', random_state=42
        )
    else:
        base_model = LogisticRegression(
            C=C, penalty='elasticnet', l1_ratio=l1_ratio,
            class_weight={0: 1, 1: weight_ratio},
            max_iter=2000, solver='saga', random_state=42
        )
    base_model.fit(X_train, y_train)

    # Platt scaling
    try:
        n_splits = min(3, n_pos)
        if n_splits >= 2:
            calibrated = CalibratedClassifierCV(base_model, cv=n_splits, method='sigmoid')
            calibrated.fit(X_train, y_train)
        else:
            calibrated = base_model
    except Exception:
        calibrated = base_model

    # Metrics on TRAIN set
    y_train_prob = (calibrated.predict_proba(X_train)[:, 1]
                    if hasattr(calibrated, 'predict_proba')
                    else base_model.predict_proba(X_train)[:, 1])
    train_auc = roc_auc_score(y_train, y_train_prob)

    # Metrics on TEST set (honest generalization)
    y_test_prob = (calibrated.predict_proba(X_test)[:, 1]
                   if hasattr(calibrated, 'predict_proba')
                   else base_model.predict_proba(X_test)[:, 1])

    test_metrics = {}
    if np.sum(y_test == 1) >= 1 and np.sum(y_test == 0) >= 1:
        test_auc = roc_auc_score(y_test, y_test_prob)
        test_brier = brier_score_loss(y_test, np.clip(y_test_prob, 0.001, 0.999))
        test_ap = average_precision_score(y_test, y_test_prob)
        test_metrics = {
            'test_auc': float(test_auc),
            'test_brier': float(test_brier),
            'test_average_precision': float(test_ap),
        }
        print(f"  Train AUC: {train_auc:.4f}  |  Test AUC: {test_auc:.4f}")
        print(f"  Test Brier: {test_brier:.4f}  |  Test AP: {test_ap:.4f}")
    else:
        print(f"  Train AUC: {train_auc:.4f}  |  Test: insufficient data")

    # Coefficients
    coefficients = {}
    for i, factor in enumerate(FACTOR_NAMES):
        coefficients[factor] = float(base_model.coef_[0][i])

    # Bootstrap CIs
    print(f"\n  Running {n_bootstrap} bootstrap iterations...")
    bootstrap_coefs = []
    rng = np.random.RandomState(42)
    for b in range(n_bootstrap):
        idx = rng.choice(len(y_train), size=len(y_train), replace=True)
        X_b, y_b = X_train[idx], y_train[idx]
        if np.sum(y_b == 1) < 2:
            continue
        try:
            if l1_ratio == 0.0:
                m = LogisticRegression(C=C, penalty='l2',
                                       class_weight={0: 1, 1: weight_ratio},
                                       max_iter=500, solver='lbfgs', random_state=b)
            else:
                m = LogisticRegression(C=C, penalty='elasticnet', l1_ratio=l1_ratio,
                                       class_weight={0: 1, 1: weight_ratio},
                                       max_iter=1000, solver='saga', random_state=b)
            m.fit(X_b, y_b)
            bootstrap_coefs.append(m.coef_[0].tolist())
        except Exception:
            continue
        if (b + 1) % 100 == 0:
            print(f"    Bootstrap {b + 1}/{n_bootstrap}")

    bootstrap_ci = {}
    if bootstrap_coefs:
        coef_array = np.array(bootstrap_coefs)
        ci_lower = np.percentile(coef_array, 2.5, axis=0)
        ci_upper = np.percentile(coef_array, 97.5, axis=0)
        for i, factor in enumerate(FACTOR_NAMES):
            bootstrap_ci[factor] = [float(ci_lower[i]), float(ci_upper[i])]

    diagnostics = {
        'intercept': float(base_model.intercept_[0]),
        'coefficients': coefficients,
        'train_auc': float(train_auc),
        'bootstrap_ci': bootstrap_ci,
        'C': C,
        'l1_ratio': l1_ratio,
        'n_pos_train': int(np.sum(y_train == 1)),
        'n_neg_train': int(np.sum(y_train == 0)),
        **test_metrics,
    }

    return base_model, calibrated, diagnostics


def fit_sector_models(data, C, l1_ratio):
    """Fit per-sector sub-models for sectors with enough data.

    Returns dict: sector_id -> {intercept, coefficients, auc, n_contracts}
    """
    sector_models = {}
    X_train = data['X_train']
    y_train = data['y_train']
    sectors_train = data['sector_train']
    X_test = data['X_test']
    y_test = data['y_test']
    sectors_test = data['sector_test']

    for sector_id in range(1, 13):
        train_mask = sectors_train == sector_id
        n_pos = np.sum(y_train[train_mask] == 1)
        n_neg = np.sum(y_train[train_mask] == 0)

        if n_pos < 20 or n_neg < 20:
            continue  # Not enough data for sector model

        X_s_train = X_train[train_mask]
        y_s_train = y_train[train_mask]

        weight_ratio = min(n_neg / max(n_pos, 1), 20)

        try:
            if l1_ratio == 0.0:
                model = LogisticRegression(
                    C=C, penalty='l2',
                    class_weight={0: 1, 1: weight_ratio},
                    max_iter=1000, solver='lbfgs', random_state=42
                )
            else:
                model = LogisticRegression(
                    C=C, penalty='elasticnet', l1_ratio=l1_ratio,
                    class_weight={0: 1, 1: weight_ratio},
                    max_iter=2000, solver='saga', random_state=42
                )
            model.fit(X_s_train, y_s_train)
        except Exception as e:
            print(f"  Sector {sector_id}: FAILED ({e})")
            continue

        # Train AUC
        y_s_train_prob = model.predict_proba(X_s_train)[:, 1]
        train_auc = roc_auc_score(y_s_train, y_s_train_prob) if n_pos >= 2 else 0

        # Test AUC
        test_mask = sectors_test == sector_id
        test_auc = None
        if test_mask.sum() > 0:
            X_s_test = X_test[test_mask]
            y_s_test = y_test[test_mask]
            if np.sum(y_s_test == 1) >= 1 and np.sum(y_s_test == 0) >= 1:
                y_s_test_prob = model.predict_proba(X_s_test)[:, 1]
                test_auc = float(roc_auc_score(y_s_test, y_s_test_prob))

        coefs = {}
        for i, factor in enumerate(FACTOR_NAMES):
            coefs[factor] = float(model.coef_[0][i])

        sector_models[sector_id] = {
            'intercept': float(model.intercept_[0]),
            'coefficients': coefs,
            'train_auc': float(train_auc),
            'test_auc': test_auc,
            'n_pos_train': int(n_pos),
            'n_neg_train': int(n_neg),
        }

        test_str = f"test={test_auc:.4f}" if test_auc else "test=N/A"
        print(f"  Sector {sector_id:>2}: train={train_auc:.4f} {test_str} "
              f"(pos={n_pos}, neg={n_neg})")

    return sector_models


def compute_likelihood_ratios(X, y):
    """Compute likelihood ratios for each factor."""
    X_pos = X[y == 1]
    X_neg = X[y == 0]
    lrs = {}
    for i, factor in enumerate(FACTOR_NAMES):
        p_pos = np.mean(X_pos[:, i] > 1.0) if len(X_pos) > 0 else 0.0
        p_neg = np.mean(X_neg[:, i] > 1.0) if len(X_neg) > 0 else 0.0
        if p_neg > 0:
            lr = p_pos / p_neg
        elif p_pos > 0:
            lr = 10.0
        else:
            lr = 1.0
        lrs[factor] = round(float(lr), 3)
    return lrs


def save_calibration(conn, diagnostics, pu_correction, sector_models,
                     n_bootstrap):
    """Save v5.0 calibration results."""
    cursor = conn.cursor()

    # Create table if needed (extends v4.0 table)
    cursor.execute("DROP TABLE IF EXISTS model_calibration")
    cursor.execute("""
        CREATE TABLE model_calibration (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model_version VARCHAR(10) NOT NULL,
            run_id VARCHAR(50) NOT NULL,
            sector_id INTEGER,
            intercept REAL NOT NULL,
            coefficients TEXT NOT NULL,
            likelihood_ratios TEXT,
            pu_correction_factor REAL,
            auc_roc REAL,
            brier_score REAL,
            log_loss_val REAL,
            average_precision REAL,
            calibration_curve TEXT,
            bootstrap_ci TEXT,
            n_positive INTEGER,
            n_negative INTEGER,
            n_bootstrap INTEGER,
            hyperparameters TEXT,
            temporal_metrics TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    run_id = f"CAL-v5-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

    # Save global model (sector_id = NULL)
    hyper = json.dumps({'C': diagnostics['C'], 'l1_ratio': diagnostics['l1_ratio']})
    temporal = json.dumps({
        'train_auc': diagnostics.get('train_auc'),
        'test_auc': diagnostics.get('test_auc'),
        'test_brier': diagnostics.get('test_brier'),
        'test_average_precision': diagnostics.get('test_average_precision'),
    })

    cursor.execute("""
        INSERT INTO model_calibration
            (model_version, run_id, sector_id, intercept, coefficients,
             likelihood_ratios, pu_correction_factor, auc_roc,
             brier_score, log_loss_val, average_precision,
             bootstrap_ci, n_positive, n_negative, n_bootstrap,
             hyperparameters, temporal_metrics)
        VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        'v5.0', run_id,
        diagnostics['intercept'],
        json.dumps(diagnostics['coefficients']),
        json.dumps(diagnostics.get('likelihood_ratios', {})),
        pu_correction,
        diagnostics.get('test_auc') or diagnostics['train_auc'],
        diagnostics.get('test_brier'),
        None,
        diagnostics.get('test_average_precision'),
        json.dumps(diagnostics.get('bootstrap_ci', {})),
        diagnostics['n_pos_train'], diagnostics['n_neg_train'],
        n_bootstrap, hyper, temporal,
    ))

    # Save per-sector models
    for sector_id, sm in sector_models.items():
        cursor.execute("""
            INSERT INTO model_calibration
                (model_version, run_id, sector_id, intercept, coefficients,
                 pu_correction_factor, auc_roc, n_positive, n_negative,
                 hyperparameters, temporal_metrics)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            'v5.0', run_id, sector_id,
            sm['intercept'], json.dumps(sm['coefficients']),
            pu_correction,
            sm.get('test_auc') or sm['train_auc'],
            sm['n_pos_train'], sm['n_neg_train'],
            hyper,
            json.dumps({'train_auc': sm['train_auc'], 'test_auc': sm.get('test_auc')}),
        ))

    conn.commit()
    print(f"\n  Saved: global model + {len(sector_models)} sector models (run={run_id})")
    return run_id


def main():
    parser = argparse.ArgumentParser(description='Risk Model v5.0 Calibration')
    parser.add_argument('--n-bootstrap', type=int, default=500)
    parser.add_argument('--random-sample', type=int, default=15000)
    parser.add_argument('--no-temporal-split', action='store_true',
                        help='Disable temporal split (use all data for train+test)')
    parser.add_argument('--skip-sector-models', action='store_true')
    args = parser.parse_args()

    if not HAS_DEPS:
        print("ERROR: scikit-learn required. pip install scikit-learn")
        return 1

    print("=" * 60)
    print("RISK MODEL v5.0: Honest & Diversified Calibration")
    print("=" * 60)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Bootstrap: {args.n_bootstrap}")
    print(f"Random sample: {args.random_sample}")
    print(f"Temporal split: {'Yes' if not args.no_temporal_split else 'No'}")

    if not DB_PATH.exists():
        print(f"ERROR: Database not found: {DB_PATH}")
        return 1

    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    try:
        start = datetime.now()

        # ================================================================
        # STEP 1: Load training data with temporal split
        # ================================================================
        print("\n" + "=" * 60)
        print("STEP 1: Loading training data")
        print("=" * 60)
        data = load_training_data(
            conn, args.random_sample,
            temporal_split=not args.no_temporal_split
        )
        if data is None:
            return 1

        X_train, y_train = data['X_train'], data['y_train']
        X_test, y_test = data['X_test'], data['y_test']

        # ================================================================
        # STEP 2: Likelihood ratios (diagnostic)
        # ================================================================
        print("\n" + "=" * 60)
        print("STEP 2: Likelihood ratios")
        print("=" * 60)
        lrs = compute_likelihood_ratios(X_train, y_train)
        for factor, lr in sorted(lrs.items(), key=lambda x: x[1], reverse=True):
            marker = " ***" if lr >= 2.0 else " **" if lr >= 1.5 else ""
            print(f"  {factor:<25} {lr:.2f}x{marker}")

        # ================================================================
        # STEP 3: Elkan & Noto PU correction
        # ================================================================
        print("\n" + "=" * 60)
        print("STEP 3: Elkan & Noto PU-learning correction")
        print("=" * 60)
        X_pos = X_train[y_train == 1]
        X_neg = X_train[y_train == 0]
        pu_c = elkan_noto_pu_correction(X_pos, None, X_neg, holdout_fraction=0.2)
        print(f"  PU correction factor c = {pu_c:.4f}")
        print(f"  (v4.0 had c = 0.890 — circular estimate)")
        print(f"  (Elkan & Noto holdout gives honest estimate)")

        # ================================================================
        # STEP 4: Cross-validate hyperparameters
        # ================================================================
        print("\n" + "=" * 60)
        print("STEP 4: Hyperparameter cross-validation")
        print("=" * 60)
        best_C, best_l1 = cross_validate_hyperparams(X_train, y_train, n_folds=5)
        print(f"\n  Best: C={best_C}, l1_ratio={best_l1}")

        # ================================================================
        # STEP 5: Fit global model
        # ================================================================
        print("\n" + "=" * 60)
        print("STEP 5: Fitting global model")
        print("=" * 60)
        base_model, calibrated_model, diagnostics = fit_global_model(
            X_train, y_train, X_test, y_test,
            best_C, best_l1, args.n_bootstrap
        )
        diagnostics['likelihood_ratios'] = lrs

        # Print coefficient summary
        print(f"\n  Coefficients (intercept={diagnostics['intercept']:.4f}):")
        coefs = diagnostics['coefficients']
        ci = diagnostics.get('bootstrap_ci', {})
        for factor in sorted(coefs.keys(), key=lambda f: abs(coefs[f]), reverse=True):
            coef = coefs[factor]
            ci_str = ""
            if factor in ci:
                ci_str = f" [{ci[factor][0]:.3f}, {ci[factor][1]:.3f}]"
            zeroed = " (zeroed by L1)" if abs(coef) < 0.001 else ""
            print(f"    {factor:<25} {coef:+.4f}{ci_str}{zeroed}")

        # ================================================================
        # STEP 6: Per-sector sub-models
        # ================================================================
        sector_models = {}
        if not args.skip_sector_models:
            print("\n" + "=" * 60)
            print("STEP 6: Per-sector sub-models")
            print("=" * 60)
            sector_models = fit_sector_models(data, best_C, best_l1)
            print(f"\n  Trained {len(sector_models)} sector models")
            print(f"  Sectors using global fallback: "
                  f"{sorted(set(range(1,13)) - set(sector_models.keys()))}")

        # ================================================================
        # STEP 7: Save results
        # ================================================================
        print("\n" + "=" * 60)
        print("STEP 7: Saving calibration")
        print("=" * 60)
        run_id = save_calibration(conn, diagnostics, pu_c, sector_models,
                                  args.n_bootstrap)

        # ================================================================
        # SUMMARY
        # ================================================================
        elapsed = (datetime.now() - start).total_seconds()
        print(f"\n{'=' * 60}")
        print("v5.0 CALIBRATION COMPLETE")
        print(f"{'=' * 60}")
        print(f"Run ID: {run_id}")
        print(f"Hyperparams: C={best_C}, l1_ratio={best_l1}")
        print(f"PU correction (Elkan & Noto): c={pu_c:.4f}")
        print(f"Train AUC: {diagnostics['train_auc']:.4f}")
        if diagnostics.get('test_auc'):
            print(f"Test AUC (temporal, >={TEST_YEAR_MIN}): {diagnostics['test_auc']:.4f}")
        print(f"Sector models: {len(sector_models)}")
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
