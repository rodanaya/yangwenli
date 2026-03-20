"""One-shot v6.0 scoring script with per-sector models. Run directly.

Fixes applied (Mar 2026):
  1. Z-score winsorization: clamp z-scores to [-5, +5] SD before logit computation
     to prevent epsilon-floor artifacts (z_vendor_concentration reaches 999.9 for
     thin sector-year cells with 1-2 contracts).
  2. Global model fallback for small sectors: sectors with n_positive < 500 in
     model_calibration use the global model instead of an unreliable per-sector fit.
  3. Ghost companion integration: blend new_vendor_risk_score from vendor_stats
     into the final risk_score as an additive boost for new/suspicious vendors.
"""
import argparse
import sqlite3, json, sys, time
import numpy as np

DB = r"D:\Python\yangwenli\backend\RUBLI_NORMALIZED.db"

Z_COLS = [
    'z_single_bid', 'z_direct_award', 'z_price_ratio',
    'z_vendor_concentration', 'z_ad_period_days', 'z_year_end',
    'z_same_day_count', 'z_network_member_count', 'z_co_bid_rate',
    'z_price_hyp_confidence', 'z_industry_mismatch', 'z_institution_risk',
    'z_price_volatility', 'z_sector_spread', 'z_win_rate',
    'z_institution_diversity',
]
FACTOR_NAMES = [c.replace('z_', '') for c in Z_COLS]


# Fix 1: Cap z-scores at +/-5 SD at scoring time to prevent epsilon-floor artifacts.
# z_vendor_concentration can reach 999.9 for thin sector-year cells where the
# baseline stddev collapses to epsilon=0.001. These extreme values dominate the
# logit and saturate the sigmoid. We do NOT recompute z-scores in the DB -- only
# clamp at scoring time so SHAP/PyOD enrichment layers can apply their own logic.
ZSCORE_CAP = 5.0

# Fix 2: Sectors fall back to global model if they have too few positive training
# examples OR if the sector model AUC is below a useful discrimination threshold.
# Reason: extreme L1 regularization (C=0.0013) can produce sector models with
# 0-1 active coefficients (e.g., Energia: only network_member_count=0.067 active,
# AUC=0.680, HR=0.5%). A global model is strictly better in such cases.
MIN_SECTOR_POSITIVES = 500
MIN_SECTOR_AUC = 0.70  # Fallback to global if sector model AUC < this threshold

# Fix 3: Ghost companion boost weight. A max-confidence ghost flag (score=1.0)
# adds this much to the base risk_score, enough to push a zero-scored new vendor
# into medium risk territory (threshold=0.25) for investigation triage.
GHOST_BOOST_WEIGHT = 0.4

# v6.4 thresholds — medium raised from 0.15→0.25 (audit finding: 76.7% medium at 0.15
# provided near-zero lift over random; 0.25 gives 18.1% medium, actionable tier).
THRESHOLD_CRITICAL = 0.60
THRESHOLD_HIGH     = 0.40
THRESHOLD_MEDIUM   = 0.25  # was 0.15


def sigmoid(x):
    return np.where(x >= 0, 1.0/(1.0+np.exp(-x)), np.exp(x)/(1.0+np.exp(x)))

def get_risk_level(score):
    if score >= THRESHOLD_CRITICAL: return 'critical'
    if score >= THRESHOLD_HIGH:     return 'high'
    if score >= THRESHOLD_MEDIUM:   return 'medium'
    return 'low'


def load_all_calibrations(conn):
    """Load global + per-sector v6.0 calibrations with n_positive for fallback logic."""
    rows = conn.execute('''
        SELECT sector_id, intercept, coefficients, pu_correction_factor, bootstrap_ci, n_positive,
               auc_roc
        FROM model_calibration WHERE model_version='v6.0'
        ORDER BY created_at DESC
    ''').fetchall()

    models = {}
    for row in rows:
        sid = row[0]  # None for global
        intercept = row[1]
        coefs = json.loads(row[2])
        coef_vec = np.array([coefs.get(f, 0.0) for f in FACTOR_NAMES])
        pu_c = row[3] or 1.0
        ci_data = json.loads(row[4]) if row[4] else {}
        ci_widths = np.array([
            (ci_data[f][1] - ci_data[f][0]) / 2.0 if f in ci_data else 0.0
            for f in FACTOR_NAMES
        ])
        n_positive = row[5] or 0
        auc_roc = row[6] or 0.0
        key = 'global' if sid is None else sid
        models[key] = {
            'intercept': intercept,
            'coef_vec': coef_vec,
            'pu_c': pu_c,
            'ci_widths': ci_widths,
            'n_positive': n_positive,
            'auc_roc': auc_roc,
        }

    return models

def load_ghost_scores(conn):
    """Load new_vendor_risk_score keyed by vendor_id from vendor_stats."""
    rows = conn.execute('''
        SELECT vendor_id, new_vendor_risk_score
        FROM vendor_stats
        WHERE new_vendor_risk_score > 0
    ''').fetchall()
    return {r[0]: r[1] for r in rows}

def main():
    parser = argparse.ArgumentParser(description='v6.0 risk scoring with per-sector models')
    parser.add_argument('--start-id', type=int, default=0,
                        help='Resume scoring from this contract ID')
    parser.add_argument('--skip-ghost-blend', action='store_true',
                        help='Disable ghost companion score blending (Fix 3)')
    args = parser.parse_args()

    conn = sqlite3.connect(DB, timeout=300)
    conn.execute('PRAGMA busy_timeout=300000')
    conn.execute('PRAGMA synchronous=OFF')
    conn.execute('PRAGMA cache_size=-200000')

    models = load_all_calibrations(conn)
    if 'global' not in models:
        print('ERROR: No global v6.0 calibration')
        return 1

    g = models['global']
    n_models = len(models)
    n_sector = n_models - 1
    print(f'Loaded v6.0: {n_models} models (1 global + {n_sector} sector)', flush=True)
    g_intercept = g["intercept"]
    g_pu_c = g["pu_c"]
    print(f'  Global: intercept={g_intercept:.4f}, pu_c={g_pu_c:.4f}', flush=True)

    # Fix 2: Identify sectors that fall back to global due to small n_positive or low AUC
    sector_ids = sorted(k for k in models if k != 'global')
    fallback_sectors = []
    for sid in sector_ids:
        n_pos = models[sid]['n_positive']
        auc = models[sid].get('auc_roc', 1.0)
        if n_pos < MIN_SECTOR_POSITIVES:
            fallback_sectors.append(sid)
            print(f'  Sector {sid}: n_positive={n_pos} < {MIN_SECTOR_POSITIVES} -> GLOBAL FALLBACK', flush=True)
        elif auc < MIN_SECTOR_AUC:
            fallback_sectors.append(sid)
            print(f'  Sector {sid}: auc={auc:.3f} < {MIN_SECTOR_AUC} -> GLOBAL FALLBACK (underpowered model)', flush=True)
        else:
            print(f'  Sector {sid}: n_positive={n_pos}, auc={auc:.3f} -> sector model', flush=True)

    print(f'  Z-score cap: +/-{ZSCORE_CAP} SD', flush=True)
    if fallback_sectors:
        print(f'  Sectors using global fallback: {fallback_sectors}', flush=True)

    # Fix 3: Load ghost companion scores
    ghost_scores = {}
    if not args.skip_ghost_blend:
        ghost_scores = load_ghost_scores(conn)
        n_ghost = len(ghost_scores)
        print(f'  Ghost companion: {n_ghost:,} vendors with boost (weight={GHOST_BOOST_WEIGHT})', flush=True)
    else:
        print('  Ghost companion: DISABLED (--skip-ghost-blend)', flush=True)

    z_select = ', '.join(f'zf.{c}' for c in Z_COLS)
    batch_size = 50000
    last_id = args.start_id
    total = 3094454
    processed = 0
    print(f'Scoring ~{total:,} contracts (start_id={last_id})...', flush=True)
    dist = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
    ghost_boosts_applied = 0
    global_fallback_count = 0
    t0 = time.time()

    while True:
        print(f'  Reading batch from id>{last_id}...', end='', flush=True)
        # Join vendor_id from contracts for ghost companion lookup
        rows = conn.execute(f'''
            SELECT zf.contract_id, {z_select}, c.sector_id, c.vendor_id
            FROM contract_z_features zf
            JOIN contracts c ON zf.contract_id = c.id
            WHERE zf.contract_id > ?
            ORDER BY zf.contract_id LIMIT ?
        ''', (last_id, batch_size)).fetchall()
        print(f' got {len(rows)}', flush=True)
        if not rows:
            break

        ids = np.array([r[0] for r in rows], dtype=np.int64)
        Z = np.array(
            [[r[i+1] if r[i+1] is not None else 0.0 for i in range(16)] for r in rows],
            dtype=np.float64
        )
        Z = np.nan_to_num(Z, nan=0.0, posinf=10.0, neginf=-10.0)

        # Fix 1: Clamp z-scores at +/-ZSCORE_CAP SD before logit computation.
        # This prevents epsilon-floor artifacts in z_vendor_concentration (can
        # reach 999.9 for thin sector-year cells) from saturating the sigmoid.
        Z = np.clip(Z, -ZSCORE_CAP, ZSCORE_CAP)

        # sector_id is column index 17 (after contract_id + 16 z-scores)
        # vendor_id is column index 18 (added for ghost companion)
        sectors = np.array([r[17] or 12 for r in rows], dtype=np.int32)
        vendor_ids = [r[18] for r in rows]

        # Score using sector model where available, global fallback
        scores = np.zeros(len(ids))
        cl_arr = np.zeros(len(ids))
        cu_arr = np.zeros(len(ids))
        batch_fallback_count = 0

        for sid in set(sectors):
            mask = sectors == sid
            sid_int = int(sid)
            # Fix 2: Fall back to global model for sectors with too few positives
            if sid_int in fallback_sectors:
                m = g
                batch_fallback_count += int(np.sum(mask))
            else:
                m = models.get(sid_int, g)  # sector model or global if no model exists

            logits = m['intercept'] + Z[mask] @ m['coef_vec']
            raw_p = sigmoid(logits)
            s = np.minimum(raw_p / m['pu_c'], 1.0)
            scores[mask] = s

            se = np.sqrt(np.sum((Z[mask] * m['ci_widths']) ** 2, axis=1))
            cl_arr[mask] = np.maximum(np.minimum(sigmoid(logits - 1.96 * se) / m['pu_c'], s), 0.0)
            cu_arr[mask] = np.minimum(np.maximum(sigmoid(logits + 1.96 * se) / m['pu_c'], s), 1.0)

        global_fallback_count += batch_fallback_count

        # Fix 3: Apply ghost companion boost for new/suspicious vendors.
        # Additive-clamped: final_score = min(1.0, base_score + ghost_score * weight).
        # This boosts new vendors the ML model structurally cannot detect (2.9% HR)
        # without overriding the base score when the model already flags them high.
        batch_ghost_count = 0
        if ghost_scores:
            for i in range(len(ids)):
                vid = vendor_ids[i]
                if vid is not None and vid in ghost_scores:
                    ghost_s = ghost_scores[vid]
                    if ghost_s > 0:
                        boost = ghost_s * GHOST_BOOST_WEIGHT
                        scores[i] = min(1.0, float(scores[i]) + boost)
                        # Boost CI upper bound too (lower stays as base model CI)
                        cu_arr[i] = min(1.0, float(cu_arr[i]) + boost)
                        batch_ghost_count += 1
            ghost_boosts_applied += batch_ghost_count

        updates = []
        for i in range(len(ids)):
            s = float(np.round(scores[i], 6))
            lvl = get_risk_level(s)
            dist[lvl] += 1
            updates.append((
                s, lvl,
                float(np.round(cl_arr[i], 6)),
                float(np.round(cu_arr[i], 6)),
                'v6.0',
                int(ids[i]),
            ))

        conn.executemany('''
            UPDATE contracts SET risk_score=?, risk_level=?,
                risk_confidence_lower=?, risk_confidence_upper=?,
                risk_model_version=?
            WHERE id=?
        ''', updates)
        conn.commit()

        processed += len(rows)
        last_id = int(ids[-1])
        elapsed = time.time() - t0
        rate = processed / elapsed if elapsed > 0 else 0
        pct = 100 * processed / total
        print(
            f'  {processed:,}/{total:,} ({pct:.1f}%) - {rate:.0f}/sec',
            flush=True,
        )

    elapsed = time.time() - t0
    t = sum(dist.values())
    print('\n' + '=' * 50)
    print(f'v6.0 SCORING COMPLETE in {elapsed:.1f}s')
    print('=' * 50)
    for lvl in ['critical', 'high', 'medium', 'low']:
        pct = 100 * dist[lvl] / t
        print(f'  {lvl:12s} {dist[lvl]:>10,} ({pct:.1f}%)')
    hr = 100 * (dist['critical'] + dist['high']) / t
    print(f'High-risk rate: {hr:.1f}%')
    print(f'Z-score cap applied: +/-{ZSCORE_CAP} SD')
    print(f'Global fallback contracts: {global_fallback_count:,} (sectors: {fallback_sectors})')
    print(f'Ghost companion boosts: {ghost_boosts_applied:,}')
    conn.close()
    return 0

if __name__ == '__main__':
    sys.exit(main())
