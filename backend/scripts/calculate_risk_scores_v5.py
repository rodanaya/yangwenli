"""
Risk Scoring v5.0: Per-Sector Calibrated Probability Pipeline

Applies the v5.0 model (global + per-sector sub-models) to all contracts.
For sectors with a dedicated sub-model, uses sector coefficients.
For others, falls back to the global model.

Pipeline:
  1. Load global + sector calibrations from model_calibration
  2. Load z-features per batch
  3. Route each contract to its sector model (or global fallback)
  4. Apply PU correction and confidence intervals
  5. Write risk_score, risk_level, CIs to contracts table

Usage:
    python -m scripts.calculate_risk_scores_v5 [--batch-size 50000] [--dry-run]
"""

import sys
import sqlite3
import json
import argparse
import numpy as np
from pathlib import Path
from datetime import datetime

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


def sigmoid(x):
    """Logistic sigmoid, numerically stable."""
    return np.where(x >= 0,
                    1.0 / (1.0 + np.exp(-x)),
                    np.exp(x) / (1.0 + np.exp(x)))


def load_v5_calibrations(conn):
    """Load global + per-sector models from model_calibration.

    Returns: global_cal, sector_cals (dict: sector_id -> cal)
    """
    cursor = conn.cursor()

    def parse_cal(row):
        coefficients = json.loads(row[1])
        coef_vector = np.array([coefficients.get(f, 0.0) for f in FACTOR_NAMES])
        return {
            'intercept': row[0],
            'coef_vector': coef_vector,
            'pu_correction': row[2] or 1.0,
            'bootstrap_ci': json.loads(row[3]) if row[3] else {},
        }

    # Load global model (sector_id IS NULL)
    cursor.execute("""
        SELECT intercept, coefficients, pu_correction_factor, bootstrap_ci
        FROM model_calibration
        WHERE model_version = 'v5.0' AND sector_id IS NULL
        ORDER BY created_at DESC
        LIMIT 1
    """)
    row = cursor.fetchone()
    if not row:
        print("ERROR: No v5.0 global calibration found")
        return None, None

    global_cal = parse_cal(row)
    print(f"  Global model: intercept={global_cal['intercept']:.4f}, "
          f"PU_c={global_cal['pu_correction']:.4f}")

    # Load sector models
    cursor.execute("""
        SELECT sector_id, intercept, coefficients, pu_correction_factor
        FROM model_calibration
        WHERE model_version = 'v5.0' AND sector_id IS NOT NULL
        ORDER BY created_at DESC
    """)
    sector_cals = {}
    seen = set()
    for row in cursor.fetchall():
        sid = row[0]
        if sid in seen:
            continue  # Take most recent per sector
        seen.add(sid)
        coefficients = json.loads(row[2])
        coef_vector = np.array([coefficients.get(f, 0.0) for f in FACTOR_NAMES])
        sector_cals[sid] = {
            'intercept': row[1],
            'coef_vector': coef_vector,
            'pu_correction': row[3] or global_cal['pu_correction'],
            'bootstrap_ci': global_cal['bootstrap_ci'],  # Use global CIs
        }

    print(f"  Sector models: {sorted(sector_cals.keys())}")
    print(f"  Global fallback for: {sorted(set(range(1,13)) - set(sector_cals.keys()))}")

    return global_cal, sector_cals


def compute_predictions(Z, sectors, global_cal, sector_cals):
    """Compute calibrated probabilities using per-sector or global model.

    Vectorized: processes each sector as a batch with numpy matrix ops.

    Args:
        Z: (n, k) z-score matrix
        sectors: (n,) sector IDs
        global_cal: global calibration dict
        sector_cals: dict sector_id -> calibration dict

    Returns: probs, ci_lower, ci_upper (each n-dimensional)
    """
    n = Z.shape[0]
    probs = np.zeros(n)
    ci_lower = np.zeros(n)
    ci_upper = np.zeros(n)

    # Precompute CI widths per model (avoid repeated dict lookups)
    ci_widths_cache = {}
    for sid, cal in list(sector_cals.items()) + [(None, global_cal)]:
        ci = cal.get('bootstrap_ci', {})
        if ci:
            ci_widths_cache[sid] = np.array([
                (ci[f][1] - ci[f][0]) / 2.0 if f in ci else 0.0
                for f in FACTOR_NAMES
            ])
        else:
            ci_widths_cache[sid] = None

    # Process each sector as a vectorized batch
    unique_sectors = np.unique(sectors)
    for sid in unique_sectors:
        sid_int = int(sid)
        mask = sectors == sid
        Z_sect = Z[mask]  # (m, k) subset

        cal = sector_cals.get(sid_int, global_cal)
        cal_key = sid_int if sid_int in sector_cals else None

        # Vectorized logit: (m,) = intercept + Z @ coef
        logits = cal['intercept'] + Z_sect @ cal['coef_vector']
        raw_p = sigmoid(logits)
        p = np.minimum(raw_p / cal['pu_correction'], 1.0)
        probs[mask] = p

        # Vectorized CI
        cw = ci_widths_cache.get(cal_key)
        if cw is not None:
            # se_logit per contract: sqrt(sum((z_i * cw_i)^2))
            se_logits = np.sqrt(np.sum((Z_sect * cw) ** 2, axis=1))
            cl = sigmoid(logits - 1.96 * se_logits) / cal['pu_correction']
            cu = sigmoid(logits + 1.96 * se_logits) / cal['pu_correction']
            ci_lower[mask] = np.maximum(np.minimum(cl, p), 0.0)
            ci_upper[mask] = np.minimum(np.maximum(cu, p), 1.0)
        else:
            ci_lower[mask] = np.maximum(p - 0.10, 0.0)
            ci_upper[mask] = np.minimum(p + 0.10, 1.0)

    return probs, ci_lower, ci_upper


def main():
    parser = argparse.ArgumentParser(description='Risk Scoring v5.0')
    parser.add_argument('--batch-size', type=int, default=50000)
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--start-id', type=int, default=0,
                        help='Resume from this contract_id (skip already-scored rows)')
    args = parser.parse_args()

    print("=" * 60)
    print("RISK MODEL v5.0: Per-Sector Calibrated Scoring")
    print("=" * 60)

    if not DB_PATH.exists():
        print(f"ERROR: Database not found: {DB_PATH}")
        return 1

    conn = sqlite3.connect(DB_PATH, timeout=300, isolation_level=None)  # autocommit mode
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=300000")  # 5 min wait for lock
    conn.execute("PRAGMA synchronous=OFF")  # Fast writes (safe: we can re-score if interrupted)
    conn.execute("PRAGMA cache_size=-200000")  # 200MB page cache

    try:
        start = datetime.now()
        cursor = conn.cursor()

        # Ensure columns exist
        cursor.execute("PRAGMA table_info(contracts)")
        existing = {r[1] for r in cursor.fetchall()}
        for col, typedef in [
            ("risk_confidence_lower", "REAL"),
            ("risk_confidence_upper", "REAL"),
            ("mahalanobis_distance", "REAL"),
            ("risk_model_version", "VARCHAR(10) DEFAULT 'v3.3'"),
        ]:
            if col not in existing:
                cursor.execute(f"ALTER TABLE contracts ADD COLUMN {col} {typedef}")
        conn.commit()

        # Load calibrations
        print("\nLoading v5.0 calibrations...")
        global_cal, sector_cals = load_v5_calibrations(conn)
        if global_cal is None:
            return 1

        # Count
        cursor.execute("SELECT COUNT(*) FROM contract_z_features")
        total = cursor.fetchone()[0]
        print(f"\nScoring {total:,} contracts...")

        processed = 0
        last_id = args.start_id  # cursor-based pagination (avoids slow OFFSET)
        score_dist = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}

        while True:
            cursor.execute(f"""
                SELECT zf.contract_id, {', '.join(f'zf.{c}' for c in Z_COLS)},
                       zf.mahalanobis_distance, c.sector_id
                FROM contract_z_features zf
                JOIN contracts c ON zf.contract_id = c.id
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
            sectors = np.array([r[len(Z_COLS) + 2] or 12 for r in rows], dtype=np.int32)

            # Compute predictions with per-sector routing
            probs, ci_lower, ci_upper = compute_predictions(
                Z, sectors, global_cal, sector_cals
            )

            # Build updates (vectorized score rounding)
            scores_r = np.round(probs, 6)
            ci_lo_r = np.round(ci_lower, 6)
            ci_hi_r = np.round(ci_upper, 6)
            mah_r = np.round(mah, 4)

            updates = []
            for i in range(len(contract_ids)):
                score = float(scores_r[i])
                level = get_risk_level(score, 'v4.0')  # v5 uses same thresholds as v4
                score_dist[level] += 1
                updates.append((
                    score, level,
                    float(ci_lo_r[i]),
                    float(ci_hi_r[i]),
                    float(mah_r[i]) if mah[i] > 0 else None,
                    'v5.0',
                    int(contract_ids[i]),
                ))

            if not args.dry_run:
                conn.execute("BEGIN")
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
                conn.execute("COMMIT")

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
        print("v5.0 SCORING COMPLETE")
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
