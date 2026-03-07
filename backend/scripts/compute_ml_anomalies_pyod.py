"""
PyOD-Based Multi-Algorithm Anomaly Detection — v5.2

Scales contract anomaly detection from 1,004 rows (current Isolation Forest)
to all 3.1M contracts using PyOD 2's unified API with 3 complementary algorithms:

  - IForest  (Isolation Forest): Tree-based, good for global outliers
  - COPOD    (Copula-based OD):  Tail-probability, fastest at scale
  - LOF      (Local Outlier Factor): Density-based, catches local clusters

Ensemble score = mean of normalized scores across all models.

Output: contract_anomaly_scores table (contract_id, model_name, score)
        + updates contracts table with ensemble_anomaly_score

Prerequisites:
    contract_z_features must be populated (run compute_z_features.py first)

Usage:
    python -m scripts.compute_ml_anomalies_pyod [--sample 500000] [--models iforest,copod,lof]
    python -m scripts.compute_ml_anomalies_pyod  # default: all 3.1M, IForest+COPOD
"""

import sys
import sqlite3
import argparse
import numpy as np
from pathlib import Path
from datetime import datetime

try:
    from pyod.models.iforest import IForest
    from pyod.models.copod import COPOD
    from pyod.models.lof import LOF
    HAS_PYOD = True
except ImportError:
    HAS_PYOD = False

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

Z_COLS = [
    'z_single_bid', 'z_direct_award', 'z_price_ratio',
    'z_vendor_concentration', 'z_ad_period_days', 'z_year_end',
    'z_same_day_count', 'z_network_member_count', 'z_co_bid_rate',
    'z_price_hyp_confidence', 'z_industry_mismatch', 'z_institution_risk',
    'z_price_volatility', 'z_sector_spread', 'z_win_rate',
    'z_institution_diversity',
]

# Contamination: expected fraction of true outliers (~9% high-risk from v5.1)
CONTAMINATION = 0.09


def create_output_table(conn: sqlite3.Connection):
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS contract_anomaly_scores (
            contract_id     INTEGER NOT NULL,
            model_name      TEXT NOT NULL,
            anomaly_score   REAL NOT NULL,
            is_outlier      INTEGER DEFAULT 0,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (contract_id, model_name)
        )
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_anomaly_contract
        ON contract_anomaly_scores(contract_id)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_anomaly_score
        ON contract_anomaly_scores(model_name, anomaly_score DESC)
    """)

    # Add ensemble_anomaly_score column to contracts if missing
    cursor.execute("PRAGMA table_info(contracts)")
    existing = {r[1] for r in cursor.fetchall()}
    if 'ensemble_anomaly_score' not in existing:
        cursor.execute("ALTER TABLE contracts ADD COLUMN ensemble_anomaly_score REAL")
        print("Added ensemble_anomaly_score column to contracts")

    conn.commit()
    print("Table contract_anomaly_scores ready")


def load_z_features(conn: sqlite3.Connection, sample_n: int = None,
                    sector_id: int = None) -> tuple:
    """Load z-features from contract_z_features.

    Returns (contract_ids, X_matrix, sector_ids)
    """
    cursor = conn.cursor()
    z_select = ', '.join(f'zf.{c}' for c in Z_COLS)

    where = []
    params = []
    if sector_id:
        where.append("zf.sector_id = ?")
        params.append(sector_id)

    where_clause = f"WHERE {' AND '.join(where)}" if where else ""

    limit_clause = f"LIMIT {sample_n}" if sample_n else ""
    # Stratified sample for speed: ORDER BY RANDOM() is slow on 3.1M rows
    # Use modulo sampling instead for large datasets
    if sample_n and sample_n < 3_000_000:
        # Approximate stratified sample using row modulo
        ratio = max(1, 3_100_000 // sample_n)
        where_clause_mod = (f"{where_clause} AND zf.contract_id % {ratio} = 0"
                            if where_clause else f"WHERE zf.contract_id % {ratio} = 0")
        query = f"""
            SELECT zf.contract_id, {z_select}, zf.sector_id
            FROM contract_z_features zf
            {where_clause_mod}
            ORDER BY zf.contract_id
        """
    else:
        query = f"""
            SELECT zf.contract_id, {z_select}, zf.sector_id
            FROM contract_z_features zf
            {where_clause}
            ORDER BY zf.contract_id
            {limit_clause}
        """

    print(f"Loading z-features...")
    cursor.execute(query, params)
    rows = cursor.fetchall()
    print(f"  Loaded {len(rows):,} rows")

    if not rows:
        return np.array([]), np.array([]), np.array([])

    contract_ids = np.array([r[0] for r in rows], dtype=np.int64)
    X = np.array([[r[i + 1] if r[i + 1] is not None else 0.0
                   for i in range(len(Z_COLS))]
                  for r in rows], dtype=np.float64)
    X = np.nan_to_num(X, nan=0.0, posinf=10.0, neginf=-10.0)
    X = np.clip(X, -10.0, 10.0)
    sectors = np.array([r[len(Z_COLS) + 1] or 12 for r in rows], dtype=np.int32)

    return contract_ids, X, sectors


def fit_and_score(X: np.ndarray, model_names: list, contamination: float) -> dict:
    """Fit PyOD models and return normalized scores.

    Returns dict: model_name -> normalized_scores (0-1, higher = more anomalous)
    """
    results = {}

    for model_name in model_names:
        print(f"\n  Fitting {model_name} on {len(X):,} samples × {X.shape[1]} features...")
        t0 = datetime.now()

        try:
            if model_name == 'iforest':
                model = IForest(
                    contamination=contamination,
                    n_estimators=200,      # More trees for stable scores
                    max_samples='auto',
                    random_state=42,
                    n_jobs=-1,
                )
            elif model_name == 'copod':
                model = COPOD(contamination=contamination, n_jobs=-1)
            elif model_name == 'lof':
                # LOF is O(n²) — only feasible for smaller datasets
                n = len(X)
                k = min(20, n - 1)
                model = LOF(
                    contamination=contamination,
                    n_neighbors=k,
                    n_jobs=-1,
                )
            else:
                print(f"  Unknown model: {model_name}, skipping")
                continue

            model.fit(X)
            raw_scores = model.decision_scores_  # Higher = more anomalous

            # Normalize to [0, 1] using min-max within this run
            score_min, score_max = raw_scores.min(), raw_scores.max()
            score_range = score_max - score_min
            if score_range > 0:
                normalized = (raw_scores - score_min) / score_range
            else:
                normalized = np.zeros_like(raw_scores)

            results[model_name] = normalized
            elapsed = (datetime.now() - t0).total_seconds()
            top5pct = np.percentile(normalized, 95)
            print(f"  {model_name}: {elapsed:.1f}s, P95={top5pct:.4f}, "
                  f"outliers={model.labels_.sum():,}")

        except Exception as e:
            print(f"  {model_name} FAILED: {e}")
            import traceback
            traceback.print_exc()

    return results


def save_scores(conn: sqlite3.Connection, contract_ids: np.ndarray,
                scores_by_model: dict, batch_size: int = 50000):
    """Save individual model scores and ensemble to DB."""
    cursor = conn.cursor()
    ts = datetime.now().isoformat()

    # Compute ensemble (mean of available scores)
    model_arrays = list(scores_by_model.values())
    if not model_arrays:
        print("No scores to save")
        return

    ensemble = np.mean(np.stack(model_arrays, axis=1), axis=1)

    # Determine outlier threshold per model (top contamination%)
    for model_name, scores in scores_by_model.items():
        threshold = np.percentile(scores, (1 - CONTAMINATION) * 100)
        is_outlier = (scores >= threshold).astype(int)

        rows = list(zip(
            contract_ids.tolist(),
            [model_name] * len(contract_ids),
            scores.tolist(),
            is_outlier.tolist(),
            [ts] * len(contract_ids),
        ))

        # Batch insert
        for start in range(0, len(rows), batch_size):
            batch = rows[start:start + batch_size]
            cursor.executemany("""
                INSERT OR REPLACE INTO contract_anomaly_scores
                    (contract_id, model_name, anomaly_score, is_outlier, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, batch)
            conn.commit()

        print(f"  {model_name}: saved {len(rows):,} scores")

    # Save ensemble scores + update contracts table
    ensemble_threshold = float(np.percentile(ensemble, (1 - CONTAMINATION) * 100))
    ensemble_rows = list(zip(
        contract_ids.tolist(),
        ['ensemble_v52'] * len(contract_ids),
        ensemble.tolist(),
        (ensemble >= ensemble_threshold).astype(int).tolist(),
        [ts] * len(contract_ids),
    ))

    for start in range(0, len(ensemble_rows), batch_size):
        batch = ensemble_rows[start:start + batch_size]
        cursor.executemany("""
            INSERT OR REPLACE INTO contract_anomaly_scores
                (contract_id, model_name, anomaly_score, is_outlier, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, batch)
        conn.commit()

    # Update contracts.ensemble_anomaly_score in bulk
    print("Updating contracts.ensemble_anomaly_score...")
    conn.execute("PRAGMA synchronous=OFF")
    updates_all = list(zip(ensemble.tolist(), contract_ids.tolist()))
    for start in range(0, len(updates_all), batch_size):
        batch = updates_all[start:start + batch_size]
        cursor.executemany(
            "UPDATE contracts SET ensemble_anomaly_score = ? WHERE id = ?",
            batch
        )
        conn.commit()
    conn.execute("PRAGMA synchronous=NORMAL")

    print(f"  Ensemble: saved {len(ensemble_rows):,} scores")

    # Summary stats
    print(f"\n  Ensemble score distribution:")
    for pct in [50, 75, 90, 95, 99]:
        val = np.percentile(ensemble, pct)
        print(f"    P{pct}: {val:.4f}")


def main():
    parser = argparse.ArgumentParser(description='PyOD Anomaly Detection v5.2')
    parser.add_argument('--sample', type=int, default=None,
                        help='Sample N contracts (default: all 3.1M). Use 500000 for testing.')
    parser.add_argument('--models', type=str, default='iforest,copod',
                        help='Comma-separated models: iforest,copod,lof (default: iforest,copod)')
    parser.add_argument('--sector', type=int, default=None,
                        help='Process only one sector (default: all)')
    parser.add_argument('--contamination', type=float, default=CONTAMINATION,
                        help=f'Expected outlier fraction (default: {CONTAMINATION})')
    args = parser.parse_args()

    print("=" * 60)
    print("RUBLI v5.2: PyOD Multi-Algorithm Anomaly Detection")
    print("=" * 60)

    if not HAS_PYOD:
        print("ERROR: PyOD not installed. pip install pyod")
        return 1

    if not DB_PATH.exists():
        print(f"ERROR: {DB_PATH} not found")
        return 1

    model_names = [m.strip() for m in args.models.split(',')]
    print(f"Models: {model_names}")
    print(f"Sample: {args.sample or 'ALL'}")
    print(f"Contamination: {args.contamination}")

    conn = sqlite3.connect(DB_PATH, timeout=300)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=120000")
    conn.execute("PRAGMA cache_size=-400000")  # 400MB

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
        create_output_table(conn)

        start = datetime.now()

        # Load z-features
        contract_ids, X, sectors = load_z_features(conn, args.sample, args.sector)
        if len(contract_ids) == 0:
            print("No contracts to process")
            return 0

        # LOF warning
        if 'lof' in model_names and len(X) > 100_000:
            print(f"WARNING: LOF on {len(X):,} samples may be very slow (O(n²)).")
            print("Consider using --sample 100000 with LOF, or remove it from --models.")

        # Fit models
        scores = fit_and_score(X, model_names, args.contamination)

        if not scores:
            print("No models succeeded")
            return 1

        # Save
        print("\nSaving scores to database...")
        save_scores(conn, contract_ids, scores)

        elapsed = (datetime.now() - start).total_seconds()
        print(f"\n{'=' * 60}")
        print("PyOD ANOMALY DETECTION COMPLETE")
        print(f"{'=' * 60}")
        print(f"Contracts processed: {len(contract_ids):,}")
        print(f"Models: {list(scores.keys())}")
        print(f"Time: {elapsed:.1f}s ({len(contract_ids)/elapsed:.0f} contracts/sec)")

        # Validate vs risk_score
        cursor.execute("""
            SELECT
                AVG(c.risk_score) as avg_risk,
                AVG(cas.anomaly_score) as avg_anomaly
            FROM contract_anomaly_scores cas
            JOIN contracts c ON cas.contract_id = c.id
            WHERE cas.model_name = 'ensemble_v52'
              AND cas.is_outlier = 1
        """)
        row = cursor.fetchone()
        if row and row[0]:
            print(f"\nEnsemble outliers: avg risk_score={row[0]:.4f}, "
                  f"avg anomaly_score={row[1]:.4f}")
            print("(Higher avg risk_score in outliers = good correlation)")

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
