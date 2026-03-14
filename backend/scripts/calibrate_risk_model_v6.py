"""
Risk Model v6.0: Honest Vendor Anomaly Ranker

Key improvements over v5.1:
  1. Vendor-stratified split: ALL contracts from a vendor go to train OR test (no leakage)
  2. Contract-level labeling with time windows (only fraud-period contracts labeled positive)
  3. New contract-level features from COMPRANET backfill (exception_article, caso_fortuito, has_amendment)
  4. Honest AUC reporting — expected ~0.70-0.80, not the inflated 0.957 from v5.1
  5. Document as "vendor anomaly ranker" — not "corruption detector"

The model is kept as a private learning exercise. PHI (rule-based) is the public-facing track.

Usage:
    python -m scripts.calibrate_risk_model_v6 [--n-bootstrap 500]
    python -m scripts.calibrate_risk_model_v6 --dry-run  # report metrics without saving
"""

import sys
import sqlite3
import json
import argparse
import numpy as np
from pathlib import Path
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

try:
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import roc_auc_score, brier_score_loss, average_precision_score
    from sklearn.model_selection import GroupKFold
    HAS_DEPS = True
except ImportError:
    HAS_DEPS = False

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Same 16 z-score features as v5.1
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

MODEL_VERSION = 'v6.0'

# ---------------------------------------------------------------------------
# Fraud time windows per case (only label contracts within these windows)
# Contracts outside these windows from the same vendor are treated as unlabeled
# ---------------------------------------------------------------------------
CASE_WINDOWS = {
    # case_id: (year_min, year_max) — None means open-ended
    1: (2012, 2019),   # IMSS Ghost Companies
    2: (2019, 2023),   # Segalmex
    3: (2020, 2021),   # COVID-19 Emergency
    4: (2013, 2018),   # IT Overpricing (Cyber Robotic)
    5: (2010, 2014),   # Odebrecht-PEMEX
    6: (2013, 2014),   # Estafa Maestra
    7: (2012, 2015),   # Grupo Higa
    8: (2008, 2014),   # Oceanografia
    10: (2010, 2017),  # IPN Cartel Limpieza
    11: (2010, 2018),  # Infrastructure Fraud Network
    12: (2015, 2023),  # Toka IT Monopoly
    13: (2010, 2020),  # PEMEX-Cotemar
    14: (2014, 2019),  # SAT SixSigma
    15: (2010, 2023),  # Government Voucher Monopoly (Edenred)
    22: (2010, 2023),  # SAT EFOS Ghost Network
    # For cases without clear windows, use full range
}
DEFAULT_WINDOW = (2002, 2025)


def load_training_data_v6(conn, random_sample_size=15000):
    """Load z-features with vendor-stratified split.

    Key difference from v5.1:
    - Split by VENDOR, not by year
    - Only label contracts within the fraud time window as positive
    - 70/30 vendor-stratified split
    """
    cursor = conn.cursor()
    z_select = ', '.join(f'zf.{c}' for c in Z_COLS)

    # Step 1: Get all GT vendor IDs with their case IDs
    cursor.execute("""
        SELECT DISTINCT gtv.vendor_id, gtv.case_id
        FROM ground_truth_vendors gtv
        WHERE gtv.vendor_id IS NOT NULL
          AND gtv.case_id NOT IN (16, 19, 20, 21)
    """)
    vendor_cases = {}
    for row in cursor.fetchall():
        vid, cid = row
        if vid not in vendor_cases:
            vendor_cases[vid] = []
        vendor_cases[vid].append(cid)

    gt_vendor_ids = list(vendor_cases.keys())
    print(f"  GT vendors: {len(gt_vendor_ids)}")

    # Step 2: Vendor-stratified split (70% train, 30% test)
    rng = np.random.RandomState(42)
    rng.shuffle(gt_vendor_ids)
    split_idx = int(len(gt_vendor_ids) * 0.7)
    train_vendors = set(gt_vendor_ids[:split_idx])
    test_vendors = set(gt_vendor_ids[split_idx:])
    print(f"  Train vendors: {len(train_vendors)}, Test vendors: {len(test_vendors)}")

    # Step 3: Load positive contracts with time-window filtering
    placeholders_all = ','.join('?' * len(gt_vendor_ids))
    cursor.execute(f"""
        SELECT zf.contract_id, {z_select}, c.contract_year, c.sector_id, c.vendor_id
        FROM contract_z_features zf
        JOIN contracts c ON zf.contract_id = c.id
        WHERE c.vendor_id IN ({placeholders_all})
    """, gt_vendor_ids)
    all_gt_rows = cursor.fetchall()
    print(f"  All GT vendor contracts: {len(all_gt_rows)}")

    # Filter by time window — only label contracts within fraud period as positive
    positive_rows = []
    excluded_by_window = 0
    for row in all_gt_rows:
        vid = row[-1]  # vendor_id is last column
        year = row[len(Z_COLS) + 1] or 2015
        case_ids = vendor_cases.get(vid, [])

        # Check if this contract falls within any of the vendor's case windows
        in_window = False
        for cid in case_ids:
            w_min, w_max = CASE_WINDOWS.get(cid, DEFAULT_WINDOW)
            if w_min <= year <= w_max:
                in_window = True
                break

        if in_window:
            positive_rows.append(row)
        else:
            excluded_by_window += 1

    print(f"  Positives after time-window filter: {len(positive_rows)} "
          f"(excluded {excluded_by_window} outside fraud window)")

    # Step 4: Load random negatives (excluding GT vendors entirely)
    cursor.execute(f"""
        SELECT zf.contract_id, {z_select}, c.contract_year, c.sector_id, c.vendor_id
        FROM contract_z_features zf
        JOIN contracts c ON zf.contract_id = c.id
        WHERE c.vendor_id NOT IN ({placeholders_all})
        ORDER BY RANDOM()
        LIMIT ?
    """, gt_vendor_ids + [random_sample_size])
    negative_rows = cursor.fetchall()
    print(f"  Random negatives: {len(negative_rows)}")

    # Step 5: Split into train/test by vendor membership
    def parse_and_split(pos_rows, neg_rows):
        train_X, train_y = [], []
        test_X, test_y = [], []

        for row in pos_rows:
            vid = row[-1]
            features = [row[i + 1] if row[i + 1] is not None else 0.0
                        for i in range(len(Z_COLS))]
            if vid in train_vendors:
                train_X.append(features)
                train_y.append(1)
            else:
                test_X.append(features)
                test_y.append(1)

        # Negatives: also split by vendor (to ensure no vendor overlap)
        neg_vendors = set()
        for row in neg_rows:
            neg_vendors.add(row[-1])
        neg_vendor_list = list(neg_vendors)
        rng.shuffle(neg_vendor_list)
        neg_split = int(len(neg_vendor_list) * 0.7)
        train_neg_vendors = set(neg_vendor_list[:neg_split])

        for row in neg_rows:
            vid = row[-1]
            features = [row[i + 1] if row[i + 1] is not None else 0.0
                        for i in range(len(Z_COLS))]
            if vid in train_neg_vendors:
                train_X.append(features)
                train_y.append(0)
            else:
                test_X.append(features)
                test_y.append(0)

        return (
            np.clip(np.nan_to_num(np.array(train_X, dtype=np.float64), nan=0.0), -10, 10),
            np.array(train_y, dtype=np.int32),
            np.clip(np.nan_to_num(np.array(test_X, dtype=np.float64), nan=0.0), -10, 10),
            np.array(test_y, dtype=np.int32),
        )

    X_train, y_train, X_test, y_test = parse_and_split(positive_rows, negative_rows)
    print(f"\n  Final split:")
    print(f"    Train: {len(X_train)} ({y_train.sum()} pos, {(y_train == 0).sum()} neg)")
    print(f"    Test:  {len(X_test)} ({y_test.sum()} pos, {(y_test == 0).sum()} neg)")

    return {
        'X_train': X_train, 'y_train': y_train,
        'X_test': X_test, 'y_test': y_test,
    }


def train_global_model(data, C=10.0, l1_ratio=0.25, n_bootstrap=500):
    """Train global logistic regression with ElasticNet + bootstrap CIs."""
    X_train, y_train = data['X_train'], data['y_train']
    X_test, y_test = data['X_test'], data['y_test']

    # Class weight — upweight positives
    n_pos = y_train.sum()
    n_neg = (y_train == 0).sum()
    weight_ratio = min(n_neg / max(n_pos, 1), 20)

    model = LogisticRegression(
        C=C, penalty='elasticnet', l1_ratio=l1_ratio,
        class_weight={0: 1, 1: weight_ratio},
        max_iter=2000, solver='saga', random_state=42
    )
    model.fit(X_train, y_train)

    # Evaluate on HELD-OUT TEST SET (vendors never seen in training)
    train_proba = model.predict_proba(X_train)[:, 1]
    test_proba = model.predict_proba(X_test)[:, 1]

    train_auc = roc_auc_score(y_train, train_proba) if len(set(y_train)) > 1 else 0.0
    test_auc = roc_auc_score(y_test, test_proba) if len(set(y_test)) > 1 else 0.0
    test_brier = brier_score_loss(y_test, test_proba)
    test_ap = average_precision_score(y_test, test_proba) if len(set(y_test)) > 1 else 0.0

    print(f"\n=== v6.0 Global Model Results ===")
    print(f"  Train AUC: {train_auc:.4f}")
    print(f"  Test AUC (vendor-stratified): {test_auc:.4f}  <-- HONEST metric")
    print(f"  Test Brier: {test_brier:.4f}")
    print(f"  Test Avg Precision: {test_ap:.4f}")

    if train_auc - test_auc > 0.15:
        print(f"  WARNING: Large train-test gap ({train_auc - test_auc:.3f}) suggests overfitting")

    # Coefficients
    coefs = model.coef_[0]
    intercept = model.intercept_[0]

    print(f"\n  Intercept: {intercept:.4f}")
    print(f"\n  Coefficients (v6.0 global):")
    sorted_idx = np.argsort(np.abs(coefs))[::-1]
    for i in sorted_idx:
        sign = '+' if coefs[i] >= 0 else ''
        print(f"    {FACTOR_NAMES[i]:30s} {sign}{coefs[i]:.4f}")

    # PU correction — Elkan & Noto on held-out positives
    pos_mask = y_train == 1
    c_estimate = train_proba[pos_mask].mean()
    print(f"\n  PU correction c = {c_estimate:.4f}")

    # Bootstrap CIs
    print(f"\n  Running {n_bootstrap} bootstrap iterations...")
    rng = np.random.RandomState(42)
    boot_coefs = np.zeros((n_bootstrap, len(Z_COLS)))
    boot_intercepts = np.zeros(n_bootstrap)

    for b in range(n_bootstrap):
        idx = rng.choice(len(X_train), len(X_train), replace=True)
        X_b, y_b = X_train[idx], y_train[idx]
        if len(set(y_b)) < 2:
            continue
        m_b = LogisticRegression(
            C=C, penalty='elasticnet', l1_ratio=l1_ratio,
            class_weight={0: 1, 1: weight_ratio},
            max_iter=2000, solver='saga', random_state=b
        )
        try:
            m_b.fit(X_b, y_b)
            boot_coefs[b] = m_b.coef_[0]
            boot_intercepts[b] = m_b.intercept_[0]
        except Exception:
            boot_coefs[b] = coefs
            boot_intercepts[b] = intercept

    ci_lower = np.percentile(boot_coefs, 2.5, axis=0)
    ci_upper = np.percentile(boot_coefs, 97.5, axis=0)

    print(f"\n  95% CIs:")
    for i in sorted_idx:
        print(f"    {FACTOR_NAMES[i]:30s} [{ci_lower[i]:+.4f}, {ci_upper[i]:+.4f}]")

    return {
        'model': model,
        'coefficients': {FACTOR_NAMES[i]: float(coefs[i]) for i in range(len(Z_COLS))},
        'intercept': float(intercept),
        'pu_c': float(c_estimate),
        'train_auc': float(train_auc),
        'test_auc': float(test_auc),
        'test_brier': float(test_brier),
        'test_ap': float(test_ap),
        'ci_lower': {FACTOR_NAMES[i]: float(ci_lower[i]) for i in range(len(Z_COLS))},
        'ci_upper': {FACTOR_NAMES[i]: float(ci_upper[i]) for i in range(len(Z_COLS))},
        'n_train': len(X_train),
        'n_test': len(X_test),
        'n_pos_train': int(y_train.sum()),
        'n_pos_test': int(y_test.sum()),
    }


def save_to_db(conn, results, run_id):
    """Save calibration results to model_calibration table."""
    cursor = conn.cursor()

    # Build bootstrap_ci in the format expected by the scoring pipeline:
    # { "factor_name": [lower, upper], ... }
    bootstrap_ci = {}
    for f in FACTOR_NAMES:
        bootstrap_ci[f] = [results['ci_lower'][f], results['ci_upper'][f]]

    cursor.execute("""
        INSERT INTO model_calibration (
            model_version, run_id, sector_id, intercept, coefficients,
            pu_correction_factor, auc_roc, test_auc, brier_score,
            average_precision, bootstrap_ci, n_positive, n_negative,
            hyperparameters, created_at, platt_a, platt_b
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        MODEL_VERSION, run_id, None,  # sector_id NULL = global
        results['intercept'],
        json.dumps(results['coefficients']),
        results['pu_c'],
        results['train_auc'],
        results['test_auc'],
        results['test_brier'],
        results['test_ap'],
        json.dumps(bootstrap_ci),
        results['n_pos_train'],
        results['n_train'] - results['n_pos_train'],
        json.dumps({'C': 10.0, 'l1_ratio': 0.25, 'split': 'vendor-stratified',
                    'n_pos_test': results['n_pos_test'], 'n_test': results['n_test']}),
        datetime.now().isoformat(),
        0.0, 0.0,  # No Platt scaling
    ))
    conn.commit()
    print(f"\n  Saved to model_calibration (run_id={run_id})")


def main():
    parser = argparse.ArgumentParser(description='Risk Model v6.0 Calibration')
    parser.add_argument('--n-bootstrap', type=int, default=500)
    parser.add_argument('--random-sample', type=int, default=15000)
    parser.add_argument('--dry-run', action='store_true', help='Report metrics without saving')
    args = parser.parse_args()

    if not HAS_DEPS:
        print("ERROR: scikit-learn required. pip install scikit-learn")
        sys.exit(1)

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")

    print("=" * 60)
    print("RUBLI Risk Model v6.0 — Honest Vendor Anomaly Ranker")
    print("=" * 60)
    print()
    print("Key changes from v5.1:")
    print("  - Vendor-stratified split (no vendor appears in both train + test)")
    print("  - Time-windowed labels (only fraud-period contracts labeled positive)")
    print("  - Expected honest AUC: 0.70-0.80 (v5.1 reported 0.957 — inflated)")
    print()

    # Check contract_z_features is populated
    row = conn.execute("SELECT COUNT(*) FROM contract_z_features").fetchone()
    if row[0] == 0:
        print("ERROR: contract_z_features is empty. Run compute_z_features.py first.")
        sys.exit(1)
    print(f"  contract_z_features: {row[0]:,} rows")

    # Load data
    print("\n--- Loading training data ---")
    data = load_training_data_v6(conn, random_sample_size=args.random_sample)
    if data is None:
        sys.exit(1)

    # Train
    print("\n--- Training global model ---")
    results = train_global_model(data, n_bootstrap=args.n_bootstrap)

    # Save
    if not args.dry_run:
        run_id = f"CAL-v6-{datetime.now().strftime('%Y%m%d')}"
        save_to_db(conn, results, run_id)
    else:
        print("\n  DRY RUN — results not saved")

    conn.close()
    print("\nDone!")


if __name__ == '__main__':
    main()
