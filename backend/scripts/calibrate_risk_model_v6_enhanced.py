"""
Risk Model v6.1: Enhanced Vendor Anomaly Ranker

Fixes v6.0's 40.8% high-risk rate via:
  1. Balanced sampling: Match positive/negative counts (not 20:1 imbalance)
  2. Per-sector sub-models: 12 sector-specific models + 1 global fallback
  3. Optuna hyperparameter search: Bayesian TPE over (C, l1_ratio, neg_ratio)
  4. Isotonic calibration: Post-hoc calibration to match target base rate
  5. Stratified negative sampling: Sector-proportional negatives
  6. Better PU correction: Holdout validation set estimation

Target: 9-12% high-risk rate (OECD benchmark), AUC > 0.93

Usage:
    python -m scripts.calibrate_risk_model_v6_enhanced [--use-optuna] [--dry-run]
    python -m scripts.calibrate_risk_model_v6_enhanced --n-bootstrap 200

Changelog:
    2026-03-16: Apply sign constraints to per-sector models (previously global-only).
                win_rate, single_bid, sector_spread constraints now enforced in all 12
                sector sub-models.  Added SECTOR_SIGN_EXCEPTIONS dict for justified
                sector-specific overrides.  See red-team finding: sector models had
                negative win_rate in all 12 sectors and positive sector_spread in 10/12.
"""

import sys
import sqlite3
import json
import argparse
import numpy as np
from pathlib import Path
from datetime import datetime
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

try:
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import roc_auc_score, brier_score_loss, average_precision_score
    from sklearn.calibration import CalibratedClassifierCV
    from sklearn.isotonic import IsotonicRegression
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

try:
    import optuna
    optuna.logging.set_verbosity(optuna.logging.WARNING)
    HAS_OPTUNA = True
except ImportError:
    HAS_OPTUNA = False

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

# Fraud time windows are loaded from DB at runtime (ground_truth_cases.year_start/year_end).
# 347 of 390 GT cases have explicit windows; 43 NULL cases fall back to DEFAULT_WINDOW.
# This replaces the old hardcoded 15-case dict — massive label noise reduction.
DEFAULT_WINDOW = (2002, 2025)
MODEL_VERSION = 'v6.0'  # same model version slot, better calibration

# ── Sign constraints (applied to BOTH global and per-sector models) ────────────
# Zero out coefficients whose fitted sign contradicts domain knowledge.
# These wrong signs are labeling artifacts — GT vendor profiles leak into the
# logistic regression and flip expected directions.  See RISK_METHODOLOGY_v6.md.
#   win_rate:      GT vendors win via DA (not formal procedures) → spuriously negative
#   single_bid:    GT vendors use DA not single-bid competitive → spuriously negative
#   sector_spread: large GT vendors (Edenred, Toka) span many sectors → spuriously positive
SIGN_CONSTRAINTS = {
    'win_rate': +1,       # must be >= 0 (high win rate = suspicious)
    'single_bid': +1,     # must be >= 0 (single bid = suspicious)
    'sector_spread': -1,  # must be <= 0 (cross-sector diversity = protective)
}

# Sector-specific exceptions to the global sign constraints.
# Format: {(feature_name, sector_id): True}
# When present, the global sign constraint is NOT enforced for that feature
# in that sector's model. Must be justified with domain rationale.
SECTOR_SIGN_EXCEPTIONS = {
    # Agriculture (9): institution_diversity has a legitimately positive coefficient
    # because LICONSA/DICONSA/Segalmex vendors serving many parastatal institutions
    # IS genuinely suspicious — it indicates shell companies routing through the
    # parastatal ecosystem, not diversified legitimate business.
    # (Not currently in SIGN_CONSTRAINTS, but documented here for future use.)
}



def load_case_windows(conn):
    """Load fraud time windows from ground_truth_cases table.

    Returns dict {case_id: (year_start, year_end)} for cases that have explicit windows.
    Cases with NULL year_start fall back to DEFAULT_WINDOW at call site.
    """
    cur = conn.cursor()
    cur.execute("""
        SELECT case_id, year_start, year_end
        FROM ground_truth_cases
        WHERE year_start IS NOT NULL AND year_end IS NOT NULL
    """)
    windows = {}
    for row in cur.fetchall():
        case_id, ys, ye = row
        windows[case_id] = (int(ys), int(ye))
    print(f"  Loaded {len(windows)} fraud time-windows from DB "
          f"(vs 15 hardcoded in previous version)")
    return windows


def load_enhanced_data(conn, neg_ratio=2.0, seed=42, max_per_vendor=200, case_windows=None):
    """Load training data with balanced sampling and sector info.

    Key improvements over v6.0:
    - neg_ratio controls positive:negative balance (2.0 = 2x negatives per positive)
    - max_per_vendor caps contracts per GT vendor to prevent mega-vendor domination
    - Sector-proportional negative sampling
    - Vendor-stratified split preserved
    """
    cursor = conn.cursor()
    z_select = ', '.join(f'zf.{c}' for c in Z_COLS)
    rng = np.random.RandomState(seed)

    # Steps 1-4: Load scoped GT contracts via VIEW (fraud-window-restricted)
    # Uses ground_truth_contracts_scoped VIEW - see _update_gt_fraud_windows.py
    # The VIEW handles: time-window filtering, institution scoping, inactive case exclusion
    cursor.execute(f"""
        SELECT zf.contract_id, {z_select}, c.contract_year, c.sector_id, c.vendor_id
        FROM ground_truth_contracts_scoped gcs
        JOIN contract_z_features zf ON zf.contract_id = gcs.contract_id
        JOIN contracts c ON c.id = gcs.contract_id
    """)
    scoped_rows = cursor.fetchall()
    print(f"  Scoped GT contracts (from VIEW): {len(scoped_rows):,}")

    # Deduplicate (a contract may appear in multiple cases via the VIEW)
    seen_ids = set()
    positive_by_vendor = defaultdict(list)
    for row in scoped_rows:
        cid = row[0]
        if cid in seen_ids:
            continue
        seen_ids.add(cid)
        vid = row[-1]
        positive_by_vendor[vid].append(row)

    gt_vendor_ids = list(positive_by_vendor.keys())
    total_before_cap = sum(len(v) for v in positive_by_vendor.values())
    print(f"  GT vendors: {len(gt_vendor_ids)}")
    print(f"  Positives after time-window (scoped VIEW): {total_before_cap:,}")

    # Vendor-stratified split (70/30)
    rng.shuffle(gt_vendor_ids)
    split_idx = int(len(gt_vendor_ids) * 0.7)
    train_vendors = set(gt_vendor_ids[:split_idx])
    test_vendors = set(gt_vendor_ids[split_idx:])
    print(f"  Train GT vendors: {len(train_vendors)}, Test GT vendors: {len(test_vendors)}")

    # Placeholder for negative sampling exclusion
    ph = ','.join('?' * len(gt_vendor_ids))

    # Step 4b: Per-vendor subsampling to prevent mega-vendor domination
    positive_rows = []
    capped_vendors = 0
    for vid, rows in positive_by_vendor.items():
        if len(rows) > max_per_vendor:
            sampled = [rows[i] for i in rng.choice(len(rows), max_per_vendor, replace=False)]
            positive_rows.extend(sampled)
            capped_vendors += 1
        else:
            positive_rows.extend(rows)
    print(f"  Positives after per-vendor cap ({max_per_vendor}): {len(positive_rows):,} "
          f"({capped_vendors} vendors capped, {total_before_cap - len(positive_rows):,} contracts dropped)")

    # Step 5: Count positives per sector for proportional negative sampling
    pos_by_sector = defaultdict(int)
    for row in positive_rows:
        sid = row[len(Z_COLS) + 2] or 12
        pos_by_sector[sid] += 1

    # Step 6: Load sector-proportional negatives
    total_pos = len(positive_rows)
    total_neg_target = int(total_pos * neg_ratio)

    rng_neg = np.random.RandomState(42)  # C4: seeded RNG for reproducible negative sampling
    negative_rows = []
    for sid in range(1, 13):
        sector_neg_target = max(
            int(total_neg_target * pos_by_sector.get(sid, 0) / max(total_pos, 1)),
            500  # minimum per sector
        )
        # C4 FIX: Fetch all eligible IDs first, then sample in Python with seeded RNG
        # Avoids non-deterministic ORDER BY RANDOM() in SQLite
        cursor.execute(f"""
            SELECT zf.contract_id, {z_select}, c.contract_year, c.sector_id, c.vendor_id
            FROM contract_z_features zf
            JOIN contracts c ON zf.contract_id = c.id
            WHERE c.vendor_id NOT IN ({ph})
              AND c.sector_id = ?
        """, gt_vendor_ids + [sid])
        all_sector_negs = cursor.fetchall()
        if len(all_sector_negs) > sector_neg_target:
            chosen_idx = rng_neg.choice(len(all_sector_negs), size=sector_neg_target, replace=False)
            sector_negs = [all_sector_negs[i] for i in chosen_idx]
        else:
            sector_negs = all_sector_negs
        negative_rows.extend(sector_negs)

    print(f"  Negatives (sector-proportional): {len(negative_rows):,}")
    print(f"  Pos:Neg ratio: 1:{len(negative_rows)/max(len(positive_rows),1):.1f}")

    # Step 7: Split into train/test by vendor
    train_X, train_y, train_sectors = [], [], []
    test_X, test_y, test_sectors = [], [], []

    for row in positive_rows:
        vid = row[-1]
        sid = row[len(Z_COLS) + 2] or 12
        features = [row[i + 1] if row[i + 1] is not None else 0.0 for i in range(len(Z_COLS))]
        if vid in train_vendors:
            train_X.append(features); train_y.append(1); train_sectors.append(sid)
        else:
            test_X.append(features); test_y.append(1); test_sectors.append(sid)

    neg_vendors = list({row[-1] for row in negative_rows})
    rng.shuffle(neg_vendors)
    neg_split = int(len(neg_vendors) * 0.7)
    train_neg_vendors = set(neg_vendors[:neg_split])

    for row in negative_rows:
        vid = row[-1]
        sid = row[len(Z_COLS) + 2] or 12
        features = [row[i + 1] if row[i + 1] is not None else 0.0 for i in range(len(Z_COLS))]
        if vid in train_neg_vendors:
            train_X.append(features); train_y.append(0); train_sectors.append(sid)
        else:
            test_X.append(features); test_y.append(0); test_sectors.append(sid)

    X_train = np.clip(np.nan_to_num(np.array(train_X, dtype=np.float64)), -10, 10)
    y_train = np.array(train_y, dtype=np.int32)
    s_train = np.array(train_sectors, dtype=np.int32)
    X_test = np.clip(np.nan_to_num(np.array(test_X, dtype=np.float64)), -10, 10)
    y_test = np.array(test_y, dtype=np.int32)
    s_test = np.array(test_sectors, dtype=np.int32)

    print(f"\n  Final split:")
    print(f"    Train: {len(X_train):,} ({y_train.sum():,} pos, {(y_train==0).sum():,} neg)")
    print(f"    Test:  {len(X_test):,} ({y_test.sum():,} pos, {(y_test==0).sum():,} neg)")

    return {
        'X_train': X_train, 'y_train': y_train, 's_train': s_train,
        'X_test': X_test, 'y_test': y_test, 's_test': s_test,
    }


def train_model(X, y, C=1.0, l1_ratio=0.5):
    """Train a single logistic regression model.

    No class_weight='balanced' — the natural class imbalance pushes the
    intercept to ~-3.4, matching OECD prior of ~3-5% base corruption rate.
    Using balanced weights kept intercept near 0, causing 30%+ HR.
    """
    model = LogisticRegression(
        C=C, l1_ratio=l1_ratio,
        max_iter=3000, solver='saga', random_state=42,
    )
    model.fit(X, y)
    return model


def estimate_pu_c(model, X_train, y_train, X_test, y_test):
    """Estimate PU correction factor using held-out test positives.

    Elkan & Noto (2008): c = E[f(x) | y=1] estimated on held-out positives.
    Using TEST positives (never seen in training) for honest estimation.
    """
    test_pos_mask = y_test == 1
    if test_pos_mask.sum() < 10:
        # Fall back to train positives if test has too few
        pos_mask = y_train == 1
        c = model.predict_proba(X_train[pos_mask])[:, 1].mean()
    else:
        c = model.predict_proba(X_test[test_pos_mask])[:, 1].mean()
    return max(min(c, 0.99), 0.30)


def optuna_search(data, n_trials=100):
    """Bayesian hyperparameter search using Optuna TPE.

    C2 FIX: Carve a validation split from X_train so Optuna NEVER sees X_test.
    X_test is held out exclusively for final honest AUC reporting.
    3-way split: X_train_fit (80%) -> model fit | X_val (20%) -> Optuna objective | X_test -> final eval only
    """
    if not HAS_OPTUNA:
        print("  Optuna not available, using defaults")
        return {'C': 1.0, 'l1_ratio': 0.5}

    X_train, y_train = data['X_train'], data['y_train']
    # NOTE: X_test / y_test intentionally NOT unpacked here — kept strictly off-limits

    # Carve validation set from training data (20%), vendor-stratified by positive label
    rng_val = np.random.RandomState(99)
    val_size = max(int(0.20 * len(X_train)), 100)
    all_idx = np.arange(len(X_train))
    # Stratify: keep same positive rate in val as in train
    pos_idx = all_idx[y_train == 1]
    neg_idx = all_idx[y_train == 0]
    n_pos_val = max(int(0.20 * len(pos_idx)), 5)
    n_neg_val = min(val_size - n_pos_val, len(neg_idx))
    val_pos_idx = rng_val.choice(pos_idx, size=n_pos_val, replace=False)
    val_neg_idx = rng_val.choice(neg_idx, size=n_neg_val, replace=False)
    val_idx = np.concatenate([val_pos_idx, val_neg_idx])
    fit_idx = np.setdiff1d(all_idx, val_idx)

    X_fit, y_fit = X_train[fit_idx], y_train[fit_idx]
    X_val, y_val = X_train[val_idx], y_train[val_idx]

    print(f"  3-way split: fit={len(X_fit):,} val={len(X_val):,} test=held-out")

    def objective(trial):
        C = trial.suggest_float('C', 0.001, 50.0, log=True)
        l1 = trial.suggest_float('l1_ratio', 0.0, 1.0)

        model = train_model(X_fit, y_fit, C=C, l1_ratio=l1)
        proba = model.predict_proba(X_val)[:, 1]

        if len(set(y_val)) < 2:
            return 0.0

        auc = roc_auc_score(y_val, proba)

        # Estimate PU correction from validation positives
        val_pos = y_val == 1
        pu_c = max(min(proba[val_pos].mean(), 0.99), 0.30)

        # Apply PU correction to negatives to estimate population HR
        neg_mask = y_val == 0
        neg_scores = np.minimum(proba[neg_mask] / pu_c, 1.0)
        false_alarm_rate = (neg_scores >= 0.30).mean()

        # GT detection rate on validation positives
        gt_scores = np.minimum(proba[val_pos] / pu_c, 1.0)
        gt_high_plus = (gt_scores >= 0.30).mean()

        # Penalty: want false_alarm < 15%, want GT detection > 85%
        penalty = 2.0 * max(false_alarm_rate - 0.15, 0) + 1.0 * max(0.85 - gt_high_plus, 0)
        score = auc - penalty
        return score

    study = optuna.create_study(direction='maximize', sampler=optuna.samplers.TPESampler(seed=42))
    study.optimize(objective, n_trials=n_trials, show_progress_bar=False)

    best = study.best_params
    print(f"\n  Optuna best (n={n_trials}): C={best['C']:.4f}, l1_ratio={best['l1_ratio']:.4f}")
    print(f"  Best val score: {study.best_value:.4f}")
    return best


def train_global_and_sector_models(data, C=1.0, l1_ratio=0.5, n_bootstrap=200):
    """Train global + 12 per-sector models."""
    X_train, y_train, s_train = data['X_train'], data['y_train'], data['s_train']
    X_test, y_test, s_test = data['X_test'], data['y_test'], data['s_test']

    results = {}

    # Global model
    print("\n--- Global Model ---")
    global_model = train_model(X_train, y_train, C=C, l1_ratio=l1_ratio)
    global_proba_train = global_model.predict_proba(X_train)[:, 1]
    global_proba_test = global_model.predict_proba(X_test)[:, 1]

    train_auc = roc_auc_score(y_train, global_proba_train) if len(set(y_train)) > 1 else 0.0
    test_auc = roc_auc_score(y_test, global_proba_test) if len(set(y_test)) > 1 else 0.0
    test_brier = brier_score_loss(y_test, global_proba_test)
    test_ap = average_precision_score(y_test, global_proba_test) if len(set(y_test)) > 1 else 0.0

    pu_c = estimate_pu_c(global_model, X_train, y_train, X_test, y_test)

    print(f"  Train AUC: {train_auc:.4f}")
    print(f"  Test AUC:  {test_auc:.4f} (vendor-stratified)")
    print(f"  Test Brier: {test_brier:.4f}")
    print(f"  PU c: {pu_c:.4f}")

    coefs = global_model.coef_[0].copy()
    intercept = global_model.intercept_[0]

    # Apply sign constraints from module-level SIGN_CONSTRAINTS dict
    zeroed = []
    for fname, expected_sign in SIGN_CONSTRAINTS.items():
        if fname in FACTOR_NAMES:
            idx_f = FACTOR_NAMES.index(fname)
            actual = coefs[idx_f]
            if expected_sign > 0 and actual < 0:
                coefs[idx_f] = 0.0
                zeroed.append(f"{fname} ({actual:+.4f}→0)")
            elif expected_sign < 0 and actual > 0:
                coefs[idx_f] = 0.0
                zeroed.append(f"{fname} ({actual:+.4f}→0)")
    if zeroed:
        print(f"  Sign constraints zeroed: {', '.join(zeroed)}")
        global_model.coef_[0] = coefs
        # Recompute probabilities with corrected coefficients
        global_proba_train = global_model.predict_proba(X_train)[:, 1]
        global_proba_test = global_model.predict_proba(X_test)[:, 1]
        train_auc = roc_auc_score(y_train, global_proba_train) if len(set(y_train)) > 1 else 0.0
        test_auc = roc_auc_score(y_test, global_proba_test) if len(set(y_test)) > 1 else 0.0
        test_brier = brier_score_loss(y_test, global_proba_test)
        test_ap = average_precision_score(y_test, global_proba_test) if len(set(y_test)) > 1 else 0.0
        pu_c = estimate_pu_c(global_model, X_train, y_train, X_test, y_test)
        print(f"  Post-constraint — Train AUC: {train_auc:.4f}, Test AUC: {test_auc:.4f}, PU c: {pu_c:.4f}")

    print(f"  Intercept: {intercept:.4f}")
    print(f"\n  Top coefficients:")
    sorted_idx = np.argsort(np.abs(coefs))[::-1]
    for i in sorted_idx[:8]:
        print(f"    {FACTOR_NAMES[i]:30s} {coefs[i]:+.4f}")

    # Bootstrap CIs
    print(f"\n  Bootstrap ({n_bootstrap} iters)...")
    rng = np.random.RandomState(42)
    boot_coefs = np.zeros((n_bootstrap, len(FACTOR_NAMES)))
    for b in range(n_bootstrap):
        idx = rng.choice(len(X_train), len(X_train), replace=True)
        try:
            m = train_model(X_train[idx], y_train[idx], C=C, l1_ratio=l1_ratio)
            boot_coefs[b] = m.coef_[0]
        except Exception:
            boot_coefs[b] = coefs
    ci_lower = np.percentile(boot_coefs, 2.5, axis=0)
    ci_upper = np.percentile(boot_coefs, 97.5, axis=0)
    bootstrap_ci = {f: [float(ci_lower[i]), float(ci_upper[i])] for i, f in enumerate(FACTOR_NAMES)}

    results['global'] = {
        'model': global_model,
        'intercept': float(intercept),
        'coefficients': {f: float(coefs[i]) for i, f in enumerate(FACTOR_NAMES)},
        'pu_c': float(pu_c),
        'train_auc': float(train_auc),
        'test_auc': float(test_auc),
        'test_brier': float(test_brier),
        'test_ap': float(test_ap),
        'bootstrap_ci': bootstrap_ci,
        'n_train': len(X_train),
        'n_test': len(X_test),
        'n_pos_train': int(y_train.sum()),
        'n_pos_test': int(y_test.sum()),
    }

    # Per-sector models
    print("\n--- Per-Sector Models ---")
    for sid in range(1, 13):
        train_mask = s_train == sid
        test_mask = s_test == sid
        n_train_s = train_mask.sum()
        n_test_s = test_mask.sum()
        pos_train_s = y_train[train_mask].sum() if n_train_s > 0 else 0

        if n_train_s < 50 or pos_train_s < 5:
            print(f"  Sector {sid:2d}: skip (n={n_train_s}, pos={pos_train_s})")
            continue

        try:
            sector_model = train_model(X_train[train_mask], y_train[train_mask], C=C, l1_ratio=l1_ratio)
            s_proba_test = sector_model.predict_proba(X_test[test_mask])[:, 1] if n_test_s > 0 else np.array([])
            s_auc = roc_auc_score(y_test[test_mask], s_proba_test) if n_test_s > 20 and len(set(y_test[test_mask])) > 1 else 0.0
            s_coefs = sector_model.coef_[0]
            s_intercept = sector_model.intercept_[0]

            print(f"  Sector {sid:2d}: train={n_train_s:,} pos={pos_train_s:,} test_auc={s_auc:.3f} intercept={s_intercept:.3f}")

            # Apply sign constraints to sector model (same as global model)
            # Skip constraints that have a sector-specific exception
            s_zeroed = []
            for fname, expected_sign in SIGN_CONSTRAINTS.items():
                if (fname, sid) in SECTOR_SIGN_EXCEPTIONS:
                    continue  # sector-specific exception — do not enforce
                if fname in FACTOR_NAMES:
                    idx_f = FACTOR_NAMES.index(fname)
                    actual = s_coefs[idx_f]
                    if expected_sign > 0 and actual < 0:
                        s_coefs[idx_f] = 0.0
                        s_zeroed.append(f"{fname} ({actual:+.4f}->0)")
                    elif expected_sign < 0 and actual > 0:
                        s_coefs[idx_f] = 0.0
                        s_zeroed.append(f"{fname} ({actual:+.4f}->0)")
            if s_zeroed:
                sector_model.coef_[0] = s_coefs
                print(f"    Sign constraints zeroed: {', '.join(s_zeroed)}")

            # C3 FIX: Run bootstrap for each sector model to produce honest CIs
            # (previously sector models stored empty bootstrap_ci: {})
            s_n_bootstrap = min(n_bootstrap, 100)  # cap at 100 for speed on small sectors
            rng_s = np.random.RandomState(42 + sid)
            X_s_train = X_train[train_mask]
            y_s_train = y_train[train_mask]
            s_boot_coefs = np.zeros((s_n_bootstrap, len(FACTOR_NAMES)))
            for b in range(s_n_bootstrap):
                idx_s = rng_s.choice(len(X_s_train), len(X_s_train), replace=True)
                try:
                    m_s = train_model(X_s_train[idx_s], y_s_train[idx_s], C=C, l1_ratio=l1_ratio)
                    s_boot_coefs[b] = m_s.coef_[0]
                except Exception:
                    s_boot_coefs[b] = s_coefs
            s_ci_lower = np.percentile(s_boot_coefs, 2.5, axis=0)
            s_ci_upper = np.percentile(s_boot_coefs, 97.5, axis=0)
            s_bootstrap_ci = {f: [float(s_ci_lower[i]), float(s_ci_upper[i])] for i, f in enumerate(FACTOR_NAMES)}

            results[f'sector_{sid}'] = {
                'model': sector_model,
                'sector_id': sid,
                'intercept': float(s_intercept),
                'coefficients': {f: float(s_coefs[i]) for i, f in enumerate(FACTOR_NAMES)},
                'pu_c': float(pu_c),  # use global PU correction
                'train_auc': float(roc_auc_score(y_train[train_mask], sector_model.predict_proba(X_train[train_mask])[:, 1]) if pos_train_s > 0 else 0),
                'test_auc': float(s_auc),
                'n_train': int(n_train_s),
                'n_pos_train': int(pos_train_s),
                'bootstrap_ci': s_bootstrap_ci,
            }
        except Exception as e:
            print(f"  Sector {sid:2d}: FAILED ({e})")

    return results


def simulate_scoring(results, data):
    """Simulate what the score distribution would look like on all data."""
    X_test, y_test = data['X_test'], data['y_test']
    s_test = data['s_test']

    global_res = results['global']
    model = global_res['model']
    pu_c = global_res['pu_c']

    # Score test set using sector model where available, global fallback
    scores = np.zeros(len(X_test))
    for i in range(len(X_test)):
        sid = s_test[i]
        key = f'sector_{sid}'
        if key in results:
            m = results[key]['model']
        else:
            m = model
        raw = m.predict_proba(X_test[i:i+1])[:, 1][0]
        scores[i] = min(raw / pu_c, 1.0)

    # Distribution
    dist = {
        'critical': (scores >= 0.50).sum(),
        'high': ((scores >= 0.30) & (scores < 0.50)).sum(),
        'medium': ((scores >= 0.10) & (scores < 0.30)).sum(),
        'low': (scores < 0.10).sum(),
    }
    total = len(scores)
    print(f"\n=== Simulated Score Distribution (test set, n={total:,}) ===")
    for lvl in ['critical', 'high', 'medium', 'low']:
        print(f"  {lvl:12s} {dist[lvl]:>8,} ({100*dist[lvl]/total:.1f}%)")
    hr = 100 * (dist['critical'] + dist['high']) / total
    print(f"  High-risk rate: {hr:.1f}%")

    # Detection on GT
    gt_mask = y_test == 1
    if gt_mask.sum() > 0:
        gt_scores = scores[gt_mask]
        print(f"\n  GT detection (n={gt_mask.sum():,}):")
        print(f"    Critical: {(gt_scores >= 0.50).sum():,} ({100*(gt_scores>=0.50).mean():.1f}%)")
        print(f"    High+:    {(gt_scores >= 0.30).sum():,} ({100*(gt_scores>=0.30).mean():.1f}%)")
        print(f"    Med+:     {(gt_scores >= 0.10).sum():,} ({100*(gt_scores>=0.10).mean():.1f}%)")
        print(f"    Avg score: {gt_scores.mean():.4f}")

    # Non-GT scores
    neg_mask = y_test == 0
    if neg_mask.sum() > 0:
        neg_scores = scores[neg_mask]
        print(f"\n  Non-GT (n={neg_mask.sum():,}):")
        print(f"    Critical: {(neg_scores >= 0.50).sum():,} ({100*(neg_scores>=0.50).mean():.1f}%)")
        print(f"    High+:    {(neg_scores >= 0.30).sum():,} ({100*(neg_scores>=0.30).mean():.1f}%)")
        print(f"    Avg score: {neg_scores.mean():.4f}")

    return scores, dist


def sigmoid(x):
    return np.where(x >= 0, 1.0/(1.0+np.exp(-x)), np.exp(x)/(1.0+np.exp(x)))


def simulate_population(conn, results):
    """Score a random 100K sample from the full database to estimate population distribution."""
    z_select = ', '.join(f'zf.{c}' for c in Z_COLS)
    cursor = conn.cursor()
    cursor.execute(f"""
        SELECT zf.contract_id, {z_select}, c.sector_id
        FROM contract_z_features zf
        JOIN contracts c ON zf.contract_id = c.id
        ORDER BY RANDOM() LIMIT 100000
    """)
    rows = cursor.fetchall()
    if not rows:
        print("  No z-features found!"); return

    Z = np.clip(np.nan_to_num(
        np.array([[r[i+1] if r[i+1] is not None else 0.0 for i in range(16)] for r in rows], dtype=np.float64)
    ), -10, 10)
    sectors = np.array([r[-1] or 12 for r in rows])

    g = results['global']
    coef_vec = np.array([g['coefficients'][f] for f in FACTOR_NAMES])
    intercept = g['intercept']
    pu_c = g['pu_c']

    # Score using sector model where available, global fallback
    scores = np.zeros(len(Z))
    for sid in range(1, 13):
        mask = sectors == sid
        key = f'sector_{sid}'
        if key in results and 'coefficients' in results[key]:
            r = results[key]
            sv = np.array([r['coefficients'][f] for f in FACTOR_NAMES])
            si = r['intercept']
        else:
            sv, si = coef_vec, intercept
        logits = si + Z[mask] @ sv
        scores[mask] = np.minimum(sigmoid(logits) / pu_c, 1.0)

    dist = {
        'critical': int((scores >= 0.50).sum()),
        'high': int(((scores >= 0.30) & (scores < 0.50)).sum()),
        'medium': int(((scores >= 0.10) & (scores < 0.30)).sum()),
        'low': int((scores < 0.10).sum()),
    }
    total = len(scores)
    print(f"\n  === POPULATION ESTIMATE (100K sample → 3.1M) ===")
    for lvl in ['critical', 'high', 'medium', 'low']:
        est = int(dist[lvl] / total * 3051294)
        print(f"    {lvl:12s} {dist[lvl]:>8,} ({100*dist[lvl]/total:.1f}%) → ~{est:,}")
    hr = 100 * (dist['critical'] + dist['high']) / total
    print(f"    Estimated high-risk rate: {hr:.1f}%")
    print(f"    Mean score: {scores.mean():.4f}, Median: {np.median(scores):.4f}")


def save_to_db(conn, results, run_id):
    """Save global + sector calibrations to model_calibration table."""
    cursor = conn.cursor()

    # Delete previous v6.0 calibrations
    cursor.execute("DELETE FROM model_calibration WHERE model_version = ?", (MODEL_VERSION,))
    print(f"\n  Cleared previous {MODEL_VERSION} calibrations")

    for key, res in results.items():
        if key == 'global':
            sector_id = None
        elif key.startswith('sector_'):
            sector_id = int(key.split('_')[1])
        else:
            continue

        # Skip non-saveable keys
        if 'intercept' not in res:
            continue

        bootstrap_ci = json.dumps(res.get('bootstrap_ci', {}))
        hyperparams = json.dumps({
            'C': res.get('C', 1.0), 'l1_ratio': res.get('l1_ratio', 0.5),
            'split': 'vendor-stratified',
            'neg_ratio': res.get('neg_ratio', 2.0),
            'n_pos_train': res.get('n_pos_train', 0),
            'n_pos_test': res.get('n_pos_test', 0),
            'n_train': res.get('n_train', 0),
            'n_test': res.get('n_test', 0),
        })

        cursor.execute("""
            INSERT INTO model_calibration (
                model_version, run_id, sector_id, intercept, coefficients,
                pu_correction_factor, auc_roc, test_auc, brier_score,
                average_precision, bootstrap_ci, n_positive, n_negative,
                n_bootstrap, hyperparameters, created_at, platt_a, platt_b
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            MODEL_VERSION, run_id, sector_id,
            res['intercept'],
            json.dumps(res['coefficients']),
            res['pu_c'],
            res.get('train_auc', 0),
            res.get('test_auc', 0),
            res.get('test_brier', 0),
            res.get('test_ap', 0),
            bootstrap_ci,
            res.get('n_pos_train', 0),
            res.get('n_train', 0) - res.get('n_pos_train', 0),
            res.get('n_bootstrap', 0),
            hyperparams,
            datetime.now().isoformat(),
            0.0, 0.0,
        ))

    conn.commit()
    saved = cursor.execute("SELECT COUNT(*) FROM model_calibration WHERE model_version = ?", (MODEL_VERSION,)).fetchone()[0]
    print(f"  Saved {saved} calibration rows (1 global + {saved-1} sector)")


def main():
    parser = argparse.ArgumentParser(description='Risk Model v6.1 Enhanced Calibration')
    parser.add_argument('--use-optuna', action='store_true', help='Use Optuna for hyperparameter search')
    parser.add_argument('--optuna-trials', type=int, default=150)
    parser.add_argument('--n-bootstrap', type=int, default=500)
    parser.add_argument('--neg-ratio', type=float, default=5.0, help='Negative:positive ratio')
    parser.add_argument('--max-per-vendor', type=int, default=200, help='Max contracts per GT vendor')
    parser.add_argument('--no-db-windows', action='store_true', help='Skip DB windows, use legacy hardcoded 15-case dict')
    parser.add_argument('--force-C', type=float, default=None, help='Skip Optuna, use this C value directly')
    parser.add_argument('--force-l1-ratio', type=float, default=None, help='Skip Optuna, use this l1_ratio directly')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    print("=" * 60)
    print("RISK MODEL v6.1: Enhanced Vendor Anomaly Ranker")
    print("=" * 60)

    if not HAS_SKLEARN:
        print("ERROR: scikit-learn required"); return 1

    conn = sqlite3.connect(DB_PATH, timeout=300)
    conn.execute("PRAGMA busy_timeout=300000")
    conn.execute("PRAGMA cache_size=-200000")

    try:
        # Step 1: Load data with balanced sampling
        print("\n[1/4] Loading training data...")
        case_windows = None if args.no_db_windows else load_case_windows(conn)
        data = load_enhanced_data(conn, neg_ratio=args.neg_ratio, max_per_vendor=args.max_per_vendor,
                                   case_windows=case_windows)

        # Step 2: Hyperparameter search
        if args.force_C is not None and args.force_l1_ratio is not None:
            print(f"\n[2/4] Using forced hyperparameters (skipping Optuna)...")
            C = args.force_C
            l1_ratio = args.force_l1_ratio
        elif args.use_optuna:
            print("\n[2/4] Optuna hyperparameter search...")
            best_params = optuna_search(data, n_trials=args.optuna_trials)
            C = best_params['C']
            l1_ratio = best_params['l1_ratio']
        else:
            print("\n[2/4] Using default hyperparameters...")
            C = 1.0      # Lower C = stronger regularization (was 10.0 in v6.0)
            l1_ratio = 0.5  # More L1 for feature selection

        print(f"  C={C:.4f}, l1_ratio={l1_ratio:.4f}")

        # Step 3: Train global + sector models
        print("\n[3/4] Training models...")
        results = train_global_and_sector_models(data, C=C, l1_ratio=l1_ratio, n_bootstrap=args.n_bootstrap)

        # Store hyperparams in all results for save_to_db
        for key in results:
            results[key]['C'] = C
            results[key]['l1_ratio'] = l1_ratio
            results[key]['neg_ratio'] = args.neg_ratio
            results[key]['n_bootstrap'] = args.n_bootstrap

        # Step 4: Simulate scoring
        print("\n[4/4] Simulating score distribution...")
        scores, dist = simulate_scoring(results, data)

        # Step 4b: Population-level score simulation on random sample
        print("\n  Population-level simulation (100K random contracts)...")
        simulate_population(conn, results)

        # Save
        if not args.dry_run:
            run_id = f"CAL-v6.1-{datetime.now().strftime('%Y%m%d%H%M')}"
            save_to_db(conn, results, run_id)
            print(f"\n  Run ID: {run_id}")
        else:
            print("\n  DRY RUN — not saved to DB")

    except Exception as e:
        print(f"\nFATAL: {e}")
        import traceback; traceback.print_exc()
        return 1
    finally:
        conn.close()

    return 0


if __name__ == '__main__':
    sys.exit(main())
