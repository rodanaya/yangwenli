"""One-shot v6.0 scoring script with per-sector models. Run directly."""
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

def sigmoid(x):
    return np.where(x >= 0, 1.0/(1.0+np.exp(-x)), np.exp(x)/(1.0+np.exp(x)))

def get_risk_level(score):
    if score >= 0.60: return 'critical'
    if score >= 0.40: return 'high'
    if score >= 0.15: return 'medium'
    return 'low'

def load_all_calibrations(conn):
    """Load global + per-sector v6.0 calibrations."""
    rows = conn.execute('''
        SELECT sector_id, intercept, coefficients, pu_correction_factor, bootstrap_ci
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
        key = 'global' if sid is None else sid
        models[key] = {
            'intercept': intercept,
            'coef_vec': coef_vec,
            'pu_c': pu_c,
            'ci_widths': ci_widths,
        }

    return models

def main():
    conn = sqlite3.connect(DB, timeout=300)
    conn.execute('PRAGMA busy_timeout=300000')
    conn.execute('PRAGMA synchronous=OFF')
    conn.execute('PRAGMA cache_size=-200000')

    models = load_all_calibrations(conn)
    if 'global' not in models:
        print('ERROR: No global v6.0 calibration')
        return 1

    g = models['global']
    print(f'Loaded v6.0: {len(models)} models (1 global + {len(models)-1} sector)', flush=True)
    print(f'  Global: intercept={g["intercept"]:.4f}, pu_c={g["pu_c"]:.4f}', flush=True)
    sector_ids = sorted(k for k in models if k != 'global')
    print(f'  Sector models: {sector_ids}', flush=True)

    z_select = ', '.join(f'zf.{c}' for c in Z_COLS)
    batch_size = 50000
    last_id = 0
    total = 3094454
    processed = 0
    print(f'Scoring ~{total:,} contracts...', flush=True)
    dist = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
    t0 = time.time()

    while True:
        print(f'  Reading batch from id>{last_id}...', end='', flush=True)
        rows = conn.execute(f'''
            SELECT zf.contract_id, {z_select}, c.sector_id
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
        Z = np.clip(Z, -10.0, 10.0)
        sectors = np.array([r[17] or 12 for r in rows], dtype=np.int32)

        # Score using sector model where available, global fallback
        scores = np.zeros(len(ids))
        cl_arr = np.zeros(len(ids))
        cu_arr = np.zeros(len(ids))

        for sid in set(sectors):
            mask = sectors == sid
            m = models.get(int(sid), g)  # sector model or global fallback
            logits = m['intercept'] + Z[mask] @ m['coef_vec']
            raw_p = sigmoid(logits)
            s = np.minimum(raw_p / m['pu_c'], 1.0)
            scores[mask] = s

            se = np.sqrt(np.sum((Z[mask] * m['ci_widths']) ** 2, axis=1))
            cl_arr[mask] = np.maximum(np.minimum(sigmoid(logits - 1.96 * se) / m['pu_c'], s), 0.0)
            cu_arr[mask] = np.minimum(np.maximum(sigmoid(logits + 1.96 * se) / m['pu_c'], s), 1.0)

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
        print(
            f'  {processed:,}/{total:,} ({100*processed/total:.1f}%) - {rate:.0f}/sec',
            flush=True,
        )

    elapsed = time.time() - t0
    t = sum(dist.values())
    print(f'\n{"="*50}')
    print(f'v6.0 SCORING COMPLETE in {elapsed:.1f}s')
    print(f'{"="*50}')
    for lvl in ['critical', 'high', 'medium', 'low']:
        print(f'  {lvl:12s} {dist[lvl]:>10,} ({100*dist[lvl]/t:.1f}%)')
    hr = 100 * (dist['critical'] + dist['high']) / t
    print(f'\nHigh-risk rate: {hr:.1f}%')
    conn.close()
    return 0

if __name__ == '__main__':
    sys.exit(main())
