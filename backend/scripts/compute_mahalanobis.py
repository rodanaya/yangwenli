"""
Compute Mahalanobis Distance for Risk Model v4.0

For each sector, collects z-feature matrix and computes:
  D2(z) = z' * inv(S) * z   (Mahalanobis distance squared)
  p-value = 1 - F_chi2(k)(D2)   (from chi2 distribution with k degrees of freedom)

Uses Ledoit-Wolf shrinkage for robust covariance estimation:
  S_reg = (1-a)*S + a*tr(S)/k * I

Updates contract_z_features.mahalanobis_distance and mahalanobis_pvalue.

Prerequisites:
  - contract_z_features table populated by compute_z_features.py

Usage:
    python -m scripts.compute_mahalanobis [--batch-size 50000]
"""

import sys
import sqlite3
import argparse
import numpy as np
from pathlib import Path
from datetime import datetime

try:
    from sklearn.covariance import LedoitWolf
    from scipy.stats import chi2
    HAS_DEPS = True
except ImportError:
    HAS_DEPS = False

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# Z-score column names (must match compute_z_features.py)
Z_COLS = [
    'z_single_bid',
    'z_direct_award',
    'z_price_ratio',
    'z_vendor_concentration',
    'z_ad_period_days',
    'z_year_end',
    'z_same_day_count',
    'z_network_member_count',
    'z_co_bid_rate',
    'z_price_hyp_confidence',
    'z_industry_mismatch',
    'z_institution_risk',
]

K = len(Z_COLS)  # Degrees of freedom for chi2 test


def compute_sector_mahalanobis(conn: sqlite3.Connection, sector_id: int,
                                batch_size: int = 50000) -> int:
    """Compute Mahalanobis distance for all contracts in a sector.

    Returns number of contracts updated.
    """
    cursor = conn.cursor()
    z_select = ', '.join(Z_COLS)

    # Load all z-features for this sector
    cursor.execute(f"""
        SELECT contract_id, {z_select}
        FROM contract_z_features
        WHERE sector_id = ?
    """, (sector_id,))

    rows = cursor.fetchall()
    if len(rows) < K + 1:
        print(f"    Sector {sector_id}: only {len(rows)} contracts, need > {K}. Skipping.")
        return 0

    # Build numpy arrays
    contract_ids = np.array([r[0] for r in rows], dtype=np.int64)
    Z = np.array([[r[i+1] if r[i+1] is not None else 0.0 for i in range(K)]
                   for r in rows], dtype=np.float64)

    # Replace NaN/inf with 0
    Z = np.nan_to_num(Z, nan=0.0, posinf=10.0, neginf=-10.0)

    # Clip extreme z-scores to prevent numerical issues
    Z = np.clip(Z, -10.0, 10.0)

    # Fit Ledoit-Wolf shrinkage covariance
    lw = LedoitWolf()
    try:
        lw.fit(Z)
    except Exception as e:
        print(f"    Sector {sector_id}: LedoitWolf failed ({e}), using diagonal.")
        # Fallback to diagonal covariance
        variances = np.var(Z, axis=0)
        variances[variances < 1e-6] = 1e-6
        precision = np.diag(1.0 / variances)
        d_squared = np.sum(Z * (Z @ precision), axis=1)
        p_values = chi2.sf(d_squared, df=K)
        p_values = np.clip(p_values, 0.0, 1.0)

        # Update database
        updates = list(zip(
            d_squared.tolist(),
            p_values.tolist(),
            contract_ids.tolist()
        ))
        _batch_update(cursor, conn, updates, batch_size)
        return len(rows)

    precision = lw.precision_

    # Compute D2 = z @ inv(S) @ z' for each row
    # Efficient: D2 = sum(z * (z @ precision), axis=1)
    d_squared = np.sum(Z * (Z @ precision), axis=1)

    # Clip negative values (numerical artifacts)
    d_squared = np.maximum(d_squared, 0.0)

    # Compute p-values from chi2(K)
    p_values = chi2.sf(d_squared, df=K)
    p_values = np.clip(p_values, 0.0, 1.0)

    # Stats
    mean_d2 = np.mean(d_squared)
    median_d2 = np.median(d_squared)
    pct_1 = np.mean(p_values < 0.01) * 100
    pct_5 = np.mean(p_values < 0.05) * 100

    print(f"    Sector {sector_id}: n={len(rows):,}, "
          f"mean D2={mean_d2:.2f} (expected~{K}), median={median_d2:.2f}, "
          f"p<0.01={pct_1:.1f}%, p<0.05={pct_5:.1f}%")

    # Update database in batches
    updates = list(zip(
        d_squared.tolist(),
        p_values.tolist(),
        contract_ids.tolist()
    ))
    _batch_update(cursor, conn, updates, batch_size)

    return len(rows)


def _batch_update(cursor, conn, updates, batch_size):
    """Update mahalanobis columns in batches."""
    for i in range(0, len(updates), batch_size):
        batch = updates[i:i + batch_size]
        cursor.execute("BEGIN IMMEDIATE TRANSACTION")
        cursor.executemany("""
            UPDATE contract_z_features
            SET mahalanobis_distance = ?, mahalanobis_pvalue = ?
            WHERE contract_id = ?
        """, batch)
        cursor.execute("COMMIT")


def compute_global_mahalanobis(conn: sqlite3.Connection, batch_size: int = 50000) -> int:
    """Compute Mahalanobis for contracts without a sector (fallback)."""
    cursor = conn.cursor()
    z_select = ', '.join(Z_COLS)

    cursor.execute(f"""
        SELECT contract_id, {z_select}
        FROM contract_z_features
        WHERE sector_id IS NULL OR mahalanobis_distance IS NULL
    """)

    rows = cursor.fetchall()
    if len(rows) < K + 1:
        print(f"  Global fallback: only {len(rows)} contracts without sector. Skipping.")
        return 0

    contract_ids = np.array([r[0] for r in rows], dtype=np.int64)
    Z = np.array([[r[i+1] if r[i+1] is not None else 0.0 for i in range(K)]
                   for r in rows], dtype=np.float64)
    Z = np.nan_to_num(Z, nan=0.0, posinf=10.0, neginf=-10.0)
    Z = np.clip(Z, -10.0, 10.0)

    # Use diagonal covariance for global (mixed sectors)
    variances = np.var(Z, axis=0)
    variances[variances < 1e-6] = 1e-6
    precision = np.diag(1.0 / variances)

    d_squared = np.sum(Z * (Z @ precision), axis=1)
    d_squared = np.maximum(d_squared, 0.0)
    p_values = chi2.sf(d_squared, df=K)
    p_values = np.clip(p_values, 0.0, 1.0)

    print(f"  Global fallback: n={len(rows):,}, mean D2={np.mean(d_squared):.2f}")

    updates = list(zip(d_squared.tolist(), p_values.tolist(), contract_ids.tolist()))
    _batch_update(cursor, conn, updates, batch_size)
    return len(rows)


def main():
    parser = argparse.ArgumentParser(
        description='Compute Mahalanobis distance for z-score features'
    )
    parser.add_argument('--batch-size', type=int, default=50000,
                        help='Batch size for DB updates (default: 50000)')
    args = parser.parse_args()

    if not HAS_DEPS:
        print("ERROR: scikit-learn and scipy required. Install: pip install scikit-learn scipy")
        return 1

    print("=" * 60)
    print("RISK MODEL v4.0: Compute Mahalanobis Distance")
    print("=" * 60)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Features: {K} dimensions")
    print(f"Expected mean D2 under null: {K}")

    if not DB_PATH.exists():
        print(f"ERROR: Database not found: {DB_PATH}")
        return 1

    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    try:
        start = datetime.now()
        cursor = conn.cursor()

        # Check prerequisites
        cursor.execute("SELECT COUNT(*) FROM contract_z_features")
        z_count = cursor.fetchone()[0]
        if z_count == 0:
            print("ERROR: contract_z_features is empty. Run compute_z_features.py first.")
            return 1
        print(f"Found {z_count:,} z-feature rows")

        # Get distinct sectors
        cursor.execute("""
            SELECT DISTINCT sector_id FROM contract_z_features
            WHERE sector_id IS NOT NULL
            ORDER BY sector_id
        """)
        sectors = [r[0] for r in cursor.fetchall()]
        print(f"\nProcessing {len(sectors)} sectors...")

        total_updated = 0
        for sector_id in sectors:
            updated = compute_sector_mahalanobis(conn, sector_id, args.batch_size)
            total_updated += updated

        # Global fallback for null-sector contracts
        print("\nProcessing global fallback...")
        global_updated = compute_global_mahalanobis(conn, args.batch_size)
        total_updated += global_updated

        # Verify
        cursor.execute("""
            SELECT COUNT(*) FROM contract_z_features
            WHERE mahalanobis_distance IS NOT NULL
        """)
        filled = cursor.fetchone()[0]

        cursor.execute("""
            SELECT AVG(mahalanobis_distance), AVG(mahalanobis_pvalue)
            FROM contract_z_features
            WHERE mahalanobis_distance IS NOT NULL
        """)
        avg_d2, avg_pval = cursor.fetchone()

        elapsed = (datetime.now() - start).total_seconds()

        print(f"\n{'='*60}")
        print("MAHALANOBIS COMPUTATION COMPLETE")
        print(f"{'='*60}")
        print(f"Contracts with D2: {filled:,} / {z_count:,}")
        print(f"Average D2: {avg_d2:.2f} (expected ~ {K} under null)")
        print(f"Average p-value: {avg_pval:.4f}")

        # Risk distribution by p-value
        cursor.execute("""
            SELECT
                SUM(CASE WHEN mahalanobis_pvalue < 0.01 THEN 1 ELSE 0 END) as critical,
                SUM(CASE WHEN mahalanobis_pvalue >= 0.01 AND mahalanobis_pvalue < 0.05 THEN 1 ELSE 0 END) as high,
                SUM(CASE WHEN mahalanobis_pvalue >= 0.05 AND mahalanobis_pvalue < 0.20 THEN 1 ELSE 0 END) as medium,
                SUM(CASE WHEN mahalanobis_pvalue >= 0.20 THEN 1 ELSE 0 END) as low
            FROM contract_z_features
            WHERE mahalanobis_pvalue IS NOT NULL
        """)
        c, h, m, l = cursor.fetchone()
        total_p = (c or 0) + (h or 0) + (m or 0) + (l or 0)
        if total_p > 0:
            print(f"\nAnomaly distribution (by p-value):")
            print(f"  p < 0.01 (most unusual 1%%): {c:,} ({100*c/total_p:.1f}%)")
            print(f"  p < 0.05 (top 5%%): {c+h:,} ({100*(c+h)/total_p:.1f}%)")
            print(f"  p < 0.20 (top 20%%): {c+h+m:,} ({100*(c+h+m)/total_p:.1f}%)")
            print(f"  p >= 0.20 (normal): {l:,} ({100*l/total_p:.1f}%)")

        print(f"\nTime: {elapsed:.1f}s")

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
