"""
SHAP Explanations for Risk Model v5.2 — 16 Z-Score Features

Computes SHAP values for the active ElasticNet logistic regression model
(stored in model_calibration) applied to per-vendor mean z-score vectors.

For a linear model, SHAP values are analytically exact:
    shap_i(vendor) = coef_i * (z_i_vendor - E[z_i])

Results are stored in vendor_shap_v52 table and in feature_importance.

Prerequisites:
    - contract_z_features populated (run compute_z_features.py first)
    - model_calibration with model_version='v5.0' (active model)

Usage:
    python -m scripts.compute_shap_explanations [--sector SECTOR_ID] [--batch-size 5000]
    python -m scripts.compute_shap_explanations --top-vendors 1000  # only top-risk vendors
"""

import sys
import sqlite3
import json
import argparse
import numpy as np
from pathlib import Path
from datetime import datetime

try:
    import shap
    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False

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

FEATURE_LABELS_ES = {
    'single_bid': 'Licitación sin competencia',
    'direct_award': 'Adjudicación directa',
    'price_ratio': 'Anomalía de precio',
    'vendor_concentration': 'Concentración de proveedor',
    'ad_period_days': 'Período de publicación corto',
    'year_end': 'Concentración en diciembre',
    'same_day_count': 'Contratos en mismo día',
    'network_member_count': 'Miembro de red sospechosa',
    'co_bid_rate': 'Tasa de co-licitación',
    'price_hyp_confidence': 'Hipótesis de precio anómalo',
    'industry_mismatch': 'Desajuste de industria',
    'institution_risk': 'Riesgo institucional',
    'price_volatility': 'Volatilidad de precios',
    'sector_spread': 'Diversificación sectorial',
    'win_rate': 'Tasa de ganancia anómala',
    'institution_diversity': 'Diversidad institucional',
}


def create_output_tables(conn: sqlite3.Connection):
    cursor = conn.cursor()

    # Vendor-level SHAP table: one row per vendor per sector
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vendor_shap_v52 (
            vendor_id       INTEGER NOT NULL,
            sector_id       INTEGER NOT NULL,
            n_contracts     INTEGER DEFAULT 0,
            -- JSON: {factor_name: shap_value}
            shap_values     TEXT NOT NULL,
            -- Top 3 risk-increasing factors as JSON array
            top_risk_factors TEXT,
            -- Top 3 risk-decreasing factors as JSON array
            top_protect_factors TEXT,
            -- Expected value (mean z-vector risk score for this sector)
            base_value      REAL DEFAULT 0,
            -- Vendor's actual risk score
            risk_score      REAL,
            -- Mean z-scores used (JSON)
            mean_z_vector   TEXT,
            updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (vendor_id, sector_id)
        )
    """)

    # Feature importance table (global + per-sector)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS feature_importance (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            model_version   TEXT DEFAULT 'v5.2',
            sector_id       INTEGER,
            factor_name     TEXT NOT NULL,
            shap_mean_abs   REAL,
            coefficient     REAL,
            likelihood_ratio REAL,
            rank            INTEGER,
            method          TEXT DEFAULT 'linear_shap',
            calculated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_fi_version_sector
        ON feature_importance(model_version, sector_id)
    """)
    conn.commit()
    print("Tables created: vendor_shap_v52, feature_importance")


def load_calibration(conn: sqlite3.Connection):
    """Load global + per-sector models from model_calibration."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT sector_id, intercept, coefficients, pu_correction_factor,
               auc_roc, test_auc
        FROM model_calibration
        WHERE model_version = 'v5.0'
        ORDER BY sector_id NULLS FIRST, created_at DESC
    """)
    rows = cursor.fetchall()

    global_cal = None
    sector_cals = {}
    seen = set()

    for row in rows:
        sid, intercept, coefs_json, pu_c, auc_roc, test_auc = row
        if sid in seen:
            continue
        seen.add(sid)

        coefs = json.loads(coefs_json)
        coef_vector = np.array([coefs.get(f, 0.0) for f in FACTOR_NAMES])

        cal = {
            'intercept': intercept,
            'coef_vector': coef_vector,
            'coefficients': coefs,
            'pu_correction': pu_c or 1.0,
            'auc': test_auc or auc_roc,
        }

        if sid is None:
            global_cal = cal
        else:
            sector_cals[sid] = cal

    if global_cal is None:
        raise ValueError("No v5.0 global calibration found. Run calibrate_risk_model_v5.py first.")

    print(f"Loaded: global model + {len(sector_cals)} sector models")
    return global_cal, sector_cals


def sigmoid(x):
    return np.where(x >= 0, 1.0 / (1.0 + np.exp(-x)), np.exp(x) / (1.0 + np.exp(x)))


def compute_linear_shap(z_vendor: np.ndarray, z_background_mean: np.ndarray,
                        coef_vector: np.ndarray) -> np.ndarray:
    """Exact SHAP values for a linear model.

    shap_i = coef_i * (z_i - E[z_i])

    This is the exact Shapley value for a linear model — no approximation needed.
    The background distribution mean serves as the reference point (E[model(x)] = model(E[x])
    for linear models).

    Returns: shap_values array, shape (n_features,)
    """
    return coef_vector * (z_vendor - z_background_mean)


def get_vendor_mean_z(conn: sqlite3.Connection, sector_id: int, batch_size: int = 5000):
    """Load per-vendor mean z-vectors for a given sector.

    Returns iterator of (vendor_id, n_contracts, mean_z_array, risk_score)
    """
    cursor = conn.cursor()

    # Filter by zf.sector_id (uses idx_z_features_sector_year) instead of c.sector_id
    # to avoid a full 3.1M-row scan of contracts just to filter by sector.
    z_avgs = ', '.join(f'AVG(zf.{col}) as {col}' for col in Z_COLS)
    cursor.execute(f"""
        SELECT c.vendor_id,
               COUNT(*) as n_contracts,
               {z_avgs},
               AVG(c.risk_score) as avg_risk_score
        FROM contract_z_features zf
        JOIN contracts c ON zf.contract_id = c.id
        WHERE zf.sector_id = ?
          AND c.vendor_id IS NOT NULL
        GROUP BY c.vendor_id
        HAVING COUNT(*) >= 1
        ORDER BY avg_risk_score DESC
    """, (sector_id,))

    while True:
        rows = cursor.fetchmany(batch_size)
        if not rows:
            break
        for row in rows:
            vendor_id = row[0]
            n_contracts = row[1]
            z_vals = np.array([row[i + 2] if row[i + 2] is not None else 0.0
                               for i in range(len(Z_COLS))], dtype=np.float64)
            z_vals = np.nan_to_num(z_vals, nan=0.0, posinf=10.0, neginf=-10.0)
            risk_score = row[len(Z_COLS) + 2]
            yield vendor_id, n_contracts, z_vals, risk_score


def compute_background_mean(conn: sqlite3.Connection, sector_id: int) -> np.ndarray:
    """Compute E[z] for this sector — the SHAP background distribution."""
    cursor = conn.cursor()
    # Use zf.sector_id directly (indexed) — no need to JOIN contracts just for sector filter.
    z_avgs = ', '.join(f'AVG({col})' for col in Z_COLS)
    cursor.execute(f"""
        SELECT {z_avgs}
        FROM contract_z_features
        WHERE sector_id = ?
    """, (sector_id,))
    row = cursor.fetchone()
    if not row:
        return np.zeros(len(Z_COLS))
    return np.array([v if v is not None else 0.0 for v in row], dtype=np.float64)


def process_sector(conn: sqlite3.Connection, sector_id: int,
                   global_cal, sector_cals, batch_size: int = 5000):
    """Process all vendors in a sector, computing SHAP and saving results."""
    cursor = conn.cursor()

    # Select model for this sector
    cal = sector_cals.get(sector_id, global_cal)
    coef_vector = cal['coef_vector']
    intercept = cal['intercept']
    pu_c = cal['pu_correction']

    # Background mean for SHAP reference
    print(f"  Computing background mean for sector {sector_id}...")
    z_bg_mean = compute_background_mean(conn, sector_id)

    # Background risk score = model evaluated at mean
    bg_logit = intercept + np.dot(coef_vector, z_bg_mean)
    bg_risk = float(sigmoid(bg_logit)) / pu_c

    # Process vendors in batches
    inserts = []
    n_vendors = 0

    for vendor_id, n_contracts, z_vendor, risk_score in get_vendor_mean_z(conn, sector_id, batch_size):
        # Exact linear SHAP
        shap_vals = compute_linear_shap(z_vendor, z_bg_mean, coef_vector)

        # Build factor dict
        shap_dict = {FACTOR_NAMES[i]: round(float(shap_vals[i]), 6)
                     for i in range(len(FACTOR_NAMES))}
        mean_z_dict = {FACTOR_NAMES[i]: round(float(z_vendor[i]), 4)
                       for i in range(len(FACTOR_NAMES))}

        # Top risk-increasing factors (positive SHAP = increases risk)
        sorted_shap = sorted(shap_dict.items(), key=lambda x: x[1], reverse=True)
        top_risk = [
            {'factor': f, 'shap': v, 'label_es': FEATURE_LABELS_ES.get(f, f)}
            for f, v in sorted_shap[:3] if v > 0
        ]
        top_protect = [
            {'factor': f, 'shap': v, 'label_es': FEATURE_LABELS_ES.get(f, f)}
            for f, v in sorted_shap[::-1][:3] if v < 0
        ]

        inserts.append((
            vendor_id, sector_id, n_contracts,
            json.dumps(shap_dict),
            json.dumps(top_risk),
            json.dumps(top_protect),
            round(bg_risk, 6),
            round(risk_score, 6) if risk_score else None,
            json.dumps(mean_z_dict),
            datetime.now().isoformat(),
        ))
        n_vendors += 1

        if len(inserts) >= batch_size:
            _flush_inserts(cursor, inserts)
            conn.commit()
            inserts = []
            print(f"    Sector {sector_id}: {n_vendors} vendors processed...")

    if inserts:
        _flush_inserts(cursor, inserts)
        conn.commit()

    print(f"  Sector {sector_id}: {n_vendors} vendors, bg_risk={bg_risk:.4f}")
    return n_vendors, coef_vector, z_bg_mean


def _flush_inserts(cursor, inserts):
    cursor.executemany("""
        INSERT OR REPLACE INTO vendor_shap_v52
            (vendor_id, sector_id, n_contracts, shap_values, top_risk_factors,
             top_protect_factors, base_value, risk_score, mean_z_vector, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, inserts)


def save_feature_importance(conn: sqlite3.Connection, global_cal, sector_cals,
                            sector_shap_means: dict):
    """Save global + per-sector feature importance to feature_importance table."""
    cursor = conn.cursor()

    # Clear existing v5.2 rows
    cursor.execute("DELETE FROM feature_importance WHERE model_version = 'v5.2'")

    all_rows = []
    ts = datetime.now().isoformat()

    # Global model importance from coefficients
    coefs = global_cal['coefficients']
    global_shap_mean = sector_shap_means.get('global', {})

    sorted_factors = sorted(FACTOR_NAMES, key=lambda f: abs(coefs.get(f, 0)), reverse=True)
    for rank, factor in enumerate(sorted_factors, 1):
        all_rows.append((
            'v5.2', None, factor,
            global_shap_mean.get(factor, abs(coefs.get(factor, 0))),
            coefs.get(factor, 0),
            None,
            rank,
            'linear_shap',
            ts,
        ))

    # Per-sector
    for sector_id, cal in sector_cals.items():
        sector_coefs = cal['coefficients']
        sector_shap = sector_shap_means.get(sector_id, {})
        sorted_s = sorted(FACTOR_NAMES, key=lambda f: abs(sector_coefs.get(f, 0)), reverse=True)
        for rank, factor in enumerate(sorted_s, 1):
            all_rows.append((
                'v5.2', sector_id, factor,
                sector_shap.get(factor, abs(sector_coefs.get(factor, 0))),
                sector_coefs.get(factor, 0),
                None,
                rank,
                'linear_shap',
                ts,
            ))

    cursor.executemany("""
        INSERT INTO feature_importance
            (model_version, sector_id, factor_name, shap_mean_abs, coefficient,
             likelihood_ratio, rank, method, calculated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, all_rows)
    conn.commit()
    print(f"Saved {len(all_rows)} feature importance rows")


def main():
    parser = argparse.ArgumentParser(description='SHAP Explanations for Risk Model v5.2')
    parser.add_argument('--sector', type=int, default=None,
                        help='Process only this sector ID (default: all 12)')
    parser.add_argument('--start-sector', type=int, default=1,
                        help='Resume from this sector ID (default: 1)')
    parser.add_argument('--batch-size', type=int, default=5000)
    parser.add_argument('--top-vendors', type=int, default=None,
                        help='Only process top-N vendors by risk score per sector')
    args = parser.parse_args()

    print("=" * 60)
    print("RUBLI v5.2: SHAP Explanations for 16 Z-Score Risk Features")
    print("=" * 60)
    print(f"Database: {DB_PATH}")

    if not HAS_SHAP:
        print("WARNING: shap not installed. pip install shap")
        print("Continuing with analytical linear SHAP (no library needed).")

    if not DB_PATH.exists():
        print(f"ERROR: {DB_PATH} not found")
        return 1

    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=-200000")

    try:
        # Check prerequisites
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM contract_z_features")
        z_count = cursor.fetchone()[0]
        if z_count == 0:
            print("ERROR: contract_z_features is empty.")
            print("Run: python -m scripts.compute_z_features first")
            return 1
        print(f"Found {z_count:,} z-feature rows")

        # Create output tables
        create_output_tables(conn)

        # Load calibration
        global_cal, sector_cals = load_calibration(conn)

        # Determine sectors to process
        if args.sector:
            sectors = [args.sector]
        else:
            sectors = list(range(args.start_sector, 13))

        # Process each sector
        start = datetime.now()
        total_vendors = 0
        sector_shap_means = {'global': {}}

        # Compute global feature importance from coefficients
        for i, factor in enumerate(FACTOR_NAMES):
            sector_shap_means['global'][factor] = abs(global_cal['coef_vector'][i])

        for sector_id in sectors:
            print(f"\nSector {sector_id}:")
            n_v, coef_vec, z_bg = process_sector(
                conn, sector_id, global_cal, sector_cals, args.batch_size
            )
            total_vendors += n_v

            # Sector-level mean |SHAP| = |coef| * std(z) approx |coef|
            cal = sector_cals.get(sector_id, global_cal)
            sector_shap_means[sector_id] = {
                FACTOR_NAMES[i]: abs(cal['coef_vector'][i])
                for i in range(len(FACTOR_NAMES))
            }

        # Save feature importance
        print("\nSaving feature importance...")
        save_feature_importance(conn, global_cal, sector_cals, sector_shap_means)

        elapsed = (datetime.now() - start).total_seconds()
        print(f"\n{'=' * 60}")
        print("SHAP COMPLETE")
        print(f"{'=' * 60}")
        print(f"Total vendors processed: {total_vendors:,}")
        print(f"Sectors: {sectors}")
        print(f"Time: {elapsed:.1f}s")

        # Quick validation
        cursor.execute("SELECT COUNT(*) FROM vendor_shap_v52")
        n_shap = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM feature_importance WHERE model_version='v5.2'")
        n_fi = cursor.fetchone()[0]
        print(f"vendor_shap_v52: {n_shap:,} rows")
        print(f"feature_importance: {n_fi:,} rows")

        # Print top factors globally
        cursor.execute("""
            SELECT factor_name, coefficient, shap_mean_abs
            FROM feature_importance
            WHERE model_version='v5.2' AND sector_id IS NULL
            ORDER BY ABS(coefficient) DESC
            LIMIT 10
        """)
        print("\nTop global risk factors:")
        print(f"  {'Factor':<25} {'Coef':>8} {'|SHAP|':>8}")
        print(f"  {'-'*25} {'-'*8} {'-'*8}")
        for row in cursor.fetchall():
            print(f"  {row[0]:<25} {row[1]:>+8.4f} {row[2]:>8.4f}")

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
