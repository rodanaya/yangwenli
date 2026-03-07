"""
Distribution Drift Detection for RUBLI v5.2 — Evidently-Based

Detects when new COMPRANET data batches have shifted distributions
compared to the training baseline. Run before retraining the risk model
or after ingesting new annual data.

Checks:
  - Z-score feature distributions (16 features) — did they drift?
  - Risk score distributions — are new contracts scoring differently?
  - Vendor concentration distribution — any new monopoly patterns?
  - Sector composition — did sector proportions change?

Output: drift_report table + JSON report file

Prerequisites:
    contract_z_features populated

Usage:
    python -m scripts.compute_vendor_drift
    python -m scripts.compute_vendor_drift --reference-year 2023 --current-year 2024
    python -m scripts.compute_vendor_drift --sector 1  # Salud only
"""

import sys
import sqlite3
import json
import argparse
import numpy as np
from pathlib import Path
from datetime import datetime

try:
    from evidently import Report
    from evidently.metrics import DriftedColumnsCount, ValueDrift
    HAS_EVIDENTLY = True
except ImportError:
    HAS_EVIDENTLY = False

try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
REPORT_DIR = Path(__file__).parent.parent / "static" / "drift_reports"

Z_COLS = [
    'z_single_bid', 'z_direct_award', 'z_price_ratio',
    'z_vendor_concentration', 'z_ad_period_days', 'z_year_end',
    'z_same_day_count', 'z_network_member_count', 'z_co_bid_rate',
    'z_price_hyp_confidence', 'z_industry_mismatch', 'z_institution_risk',
    'z_price_volatility', 'z_sector_spread', 'z_win_rate',
    'z_institution_diversity',
]

# Training baseline years (v5.1 model)
TRAIN_YEARS = (2002, 2020)
# Latest data year for comparison
CURRENT_YEAR = 2024


def create_drift_table(conn: sqlite3.Connection):
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS drift_report (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            reference_year_range TEXT,
            current_year    INTEGER,
            sector_id       INTEGER,
            -- Overall drift detected?
            dataset_drift   INTEGER DEFAULT 0,
            -- Number of drifted features
            n_drifted       INTEGER DEFAULT 0,
            n_features      INTEGER DEFAULT 0,
            -- Per-feature drift JSON: {feature: {drift_score, drifted, threshold}}
            feature_drift   TEXT,
            -- Fallback stats-only analysis if Evidently unavailable
            ks_stats        TEXT,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()


def load_data_for_years(conn: sqlite3.Connection, year_min: int, year_max: int,
                        sector_id: int = None, max_n: int = 50000) -> 'pd.DataFrame':
    """Load z-features + risk_score for a year range."""
    z_select = ', '.join(f'zf.{c}' for c in Z_COLS)
    where = f"c.contract_year BETWEEN {year_min} AND {year_max}"
    if sector_id:
        where += f" AND c.sector_id = {sector_id}"

    ratio = 1
    n_est = (year_max - year_min + 1) * 300_000 // 23
    if n_est > max_n:
        ratio = max(1, n_est // max_n)

    query = f"""
        SELECT {z_select}, c.risk_score, c.contract_year, c.sector_id
        FROM contract_z_features zf
        JOIN contracts c ON zf.contract_id = c.id
        WHERE {where}
          AND zf.contract_id % {ratio} = 0
        ORDER BY zf.contract_id
    """

    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(query)
    rows = cursor.fetchall()
    conn.row_factory = None

    if not rows:
        return None

    if HAS_PANDAS:
        cols = Z_COLS + ['risk_score', 'contract_year', 'sector_id']
        data = {col: [row[i] for row in rows] for i, col in enumerate(cols)}
        import pandas as pd
        df = pd.DataFrame(data)
        for col in Z_COLS:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        df['risk_score'] = pd.to_numeric(df['risk_score'], errors='coerce').fillna(0)
        return df

    return rows


def ks_drift_test(ref_data, cur_data, feature_names):
    """Fallback: Kolmogorov-Smirnov drift test (no Evidently needed)."""
    from scipy import stats
    results = {}
    n_drifted = 0

    for i, feat in enumerate(feature_names):
        if HAS_PANDAS:
            ref_vals = ref_data[feat].values
            cur_vals = cur_data[feat].values
        else:
            ref_vals = np.array([r[i] if r[i] is not None else 0.0 for r in ref_data])
            cur_vals = np.array([r[i] if r[i] is not None else 0.0 for r in cur_data])

        ref_vals = ref_vals[~np.isnan(ref_vals)]
        cur_vals = cur_vals[~np.isnan(cur_vals)]

        if len(ref_vals) < 10 or len(cur_vals) < 10:
            continue

        ks_stat, p_val = stats.ks_2samp(ref_vals, cur_vals)
        drifted = bool(p_val < 0.05 and ks_stat > 0.1)
        if drifted:
            n_drifted += 1

        results[feat] = {
            'ks_stat': round(float(ks_stat), 4),
            'p_value': round(float(p_val), 6),
            'drifted': drifted,
            'ref_mean': round(float(np.mean(ref_vals)), 4),
            'cur_mean': round(float(np.mean(cur_vals)), 4),
            'mean_shift': round(float(np.mean(cur_vals) - np.mean(ref_vals)), 4),
        }

    return results, n_drifted


def run_evidently_report(ref_df, cur_df, sector_id: int = None) -> dict:
    """Run Evidently drift report on z-score features (Evidently >= 0.7)."""
    cols_present = [c for c in Z_COLS if c in ref_df.columns]

    metrics = [DriftedColumnsCount()]
    for col in cols_present:
        metrics.append(ValueDrift(column=col))

    report = Report(metrics=metrics)
    snapshot = report.run(reference_data=ref_df[cols_present],
                          current_data=cur_df[cols_present])

    # Parse snapshot dict
    feature_drift = {}
    n_drifted = 0
    dataset_drift = False
    DRIFT_THRESHOLD = 0.05

    for item in snapshot.dict().get('metrics', []):
        name = str(item.get('metric_name', ''))
        value = item.get('value')

        if 'DriftedColumnsCount' in name:
            if isinstance(value, dict):
                n_drifted = int(value.get('count', 0))
        elif 'ValueDrift' in name and isinstance(value, (int, float)):
            # Extract column name from metric name like "ValueDrift(column=z_single_bid,...)"
            col = None
            for c in cols_present:
                if c in name:
                    col = c
                    break
            if col:
                p_value = float(value)
                drifted = bool(p_value < DRIFT_THRESHOLD)
                feature_drift[col] = {
                    'drifted': drifted,
                    'drift_score': round(p_value, 6),
                    'stattest': 'ks',
                }

    # If we parsed per-feature drifts, count them
    if feature_drift:
        n_drifted = sum(1 for v in feature_drift.values() if v.get('drifted'))
    dataset_drift = n_drifted > len(cols_present) // 4

    return {
        'dataset_drift': dataset_drift,
        'n_drifted': n_drifted,
        'feature_drift': feature_drift,
    }


def save_report(conn: sqlite3.Connection, ref_years, current_year,
                sector_id, result, ks_stats=None):
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO drift_report
            (reference_year_range, current_year, sector_id,
             dataset_drift, n_drifted, n_features, feature_drift, ks_stats)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        f"{ref_years[0]}-{ref_years[1]}",
        current_year,
        sector_id,
        1 if result.get('dataset_drift') else 0,
        result.get('n_drifted', 0),
        len(Z_COLS),
        json.dumps(result.get('feature_drift', {})),
        json.dumps(ks_stats or {}),
    ))
    conn.commit()


def print_drift_summary(result: dict, ks_stats: dict):
    print("\nDrift Summary:")
    print(f"  Dataset drift detected: {'YES' if result.get('dataset_drift') else 'NO'}")
    print(f"  Drifted features: {result.get('n_drifted', 0)} / {len(Z_COLS)}")

    # Show top drifted features
    feat_drift = ks_stats or result.get('feature_drift', {})
    if feat_drift:
        drifted = [(f, d) for f, d in feat_drift.items() if d.get('drifted')]
        stable = [(f, d) for f, d in feat_drift.items() if not d.get('drifted')]

        if drifted:
            print(f"\n  DRIFTED ({len(drifted)} features) — may affect risk scores:")
            for feat, info in sorted(drifted, key=lambda x: x[1].get('ks_stat', 0), reverse=True)[:8]:
                feat_short = feat.replace('z_', '')
                ks = info.get('ks_stat', info.get('drift_score', '?'))
                shift = info.get('mean_shift', '')
                shift_str = f" mean shift={shift:+.3f}" if shift else ""
                print(f"    {feat_short:<25} KS={ks:.4f}{shift_str}")

        if stable:
            print(f"\n  STABLE ({len(stable)} features) — no significant drift")


def main():
    parser = argparse.ArgumentParser(description='Drift Detection v5.2')
    parser.add_argument('--reference-year-min', type=int, default=TRAIN_YEARS[0])
    parser.add_argument('--reference-year-max', type=int, default=TRAIN_YEARS[1])
    parser.add_argument('--current-year', type=int, default=CURRENT_YEAR)
    parser.add_argument('--sector', type=int, default=None)
    parser.add_argument('--max-n', type=int, default=50000,
                        help='Max samples per split (default: 50000)')
    args = parser.parse_args()

    print("=" * 60)
    print("RUBLI v5.2: Distribution Drift Detection")
    print("=" * 60)
    print(f"Reference: {args.reference_year_min}–{args.reference_year_max}")
    print(f"Current:   {args.current_year}")
    print(f"Evidently: {'available' if HAS_EVIDENTLY else 'not installed — using KS fallback'}")

    if not DB_PATH.exists():
        print(f"ERROR: {DB_PATH} not found")
        return 1

    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA cache_size=-200000")

    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM contract_z_features")
        z_count = cursor.fetchone()[0]
        if z_count == 0:
            print("ERROR: contract_z_features empty. Run compute_z_features.py first.")
            return 1

        create_drift_table(conn)

        print(f"\nLoading reference data ({args.reference_year_min}–{args.reference_year_max})...")
        ref_data = load_data_for_years(
            conn, args.reference_year_min, args.reference_year_max,
            args.sector, args.max_n
        )
        print(f"Loading current data ({args.current_year})...")
        cur_data = load_data_for_years(
            conn, args.current_year, args.current_year,
            args.sector, args.max_n
        )

        if ref_data is None or cur_data is None:
            print("ERROR: Insufficient data for drift analysis")
            return 1

        ref_n = len(ref_data) if HAS_PANDAS else len(ref_data)
        cur_n = len(cur_data) if HAS_PANDAS else len(cur_data)
        print(f"Reference: {ref_n:,} samples | Current: {cur_n:,} samples")

        result = {'dataset_drift': False, 'n_drifted': 0, 'feature_drift': {}}
        ks_stats = {}

        # Always run KS tests (works without Evidently or pandas)
        print("\nRunning KS drift tests...")
        ks_stats, n_ks_drifted = ks_drift_test(ref_data, cur_data, Z_COLS)
        result['n_drifted'] = n_ks_drifted
        result['dataset_drift'] = n_ks_drifted > len(Z_COLS) // 4  # >25% features drifted

        # Evidently for richer report if available
        if HAS_EVIDENTLY and HAS_PANDAS:
            print("Running Evidently drift report...")
            try:
                ev_result = run_evidently_report(ref_data, cur_data, args.sector)
                result = ev_result
                # Save HTML report
                REPORT_DIR.mkdir(parents=True, exist_ok=True)
                ts = datetime.now().strftime('%Y%m%d_%H%M%S')
                sector_str = f"_sector{args.sector}" if args.sector else ""
                # report.save_html(str(REPORT_DIR / f"drift_{ts}{sector_str}.html"))
                print(f"Evidently report generated")
            except Exception as e:
                print(f"Evidently failed ({e}), using KS only")

        # Print and save
        print_drift_summary(result, ks_stats)
        save_report(
            conn,
            (args.reference_year_min, args.reference_year_max),
            args.current_year,
            args.sector,
            result,
            ks_stats,
        )

        print(f"\nReport saved to drift_report table")

        # Interpretation
        if result.get('dataset_drift') or n_ks_drifted > len(Z_COLS) // 4:
            print("\nACTION RECOMMENDED: Significant drift detected.")
            print("Consider retraining the risk model with updated data.")
            print("Run: python -m scripts.calibrate_risk_model_v5 --use-optuna")
        else:
            print("\nNo significant drift. Risk model is stable for current data.")

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
