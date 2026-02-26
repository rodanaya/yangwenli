"""
compute_fullvector_anomalies.py
Run Isolation Forest on the full 16-dimensional z-score vector per contract.

Ouyang, Goh & Lim (2022) showed that Isolation Forest on the full feature vector
outperforms price-only detection by 23% recall. This extends the existing price-only
model to the complete risk feature space.

Usage:
    python -m scripts.compute_fullvector_anomalies [--contamination 0.05] [--top-n 50]

Runtime: ~20-30 minutes on 3.1M contracts (200 trees).
"""
import argparse
import sqlite3
import time
from pathlib import Path

import numpy as np

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

Z_FEATURES = [
    "z_single_bid",
    "z_direct_award",
    "z_price_ratio",
    "z_vendor_concentration",
    "z_ad_period_days",
    "z_year_end",
    "z_same_day_count",
    "z_network_member_count",
    "z_co_bid_rate",
    "z_price_hyp_confidence",
    "z_industry_mismatch",
    "z_institution_risk",
    "z_price_volatility",
    "z_sector_spread",
    "z_win_rate",
    "z_institution_diversity",
]

SECTORS = list(range(1, 13))


def main(contamination: float = 0.05, top_n: int = 50):
    try:
        from sklearn.ensemble import IsolationForest
    except ImportError:
        print("ERROR: scikit-learn not installed. Run: pip install scikit-learn")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA cache_size=-200000")
    cursor = conn.cursor()

    print("=" * 60)
    print("FULL-VECTOR ISOLATION FOREST ANOMALY DETECTION")
    print(f"Contamination: {contamination}, Top-N per sector: {top_n}")
    print("=" * 60)
    t0 = time.time()

    # Ensure model column has the right default for existing rows
    cursor.execute("""
        UPDATE contract_ml_anomalies SET model = 'price_only'
        WHERE model IS NULL
    """)
    conn.commit()

    # Remove old full_z_vector rows
    cursor.execute("DELETE FROM contract_ml_anomalies WHERE model = 'full_z_vector'")
    conn.commit()

    total_inserted = 0
    feature_cols = ", ".join(f"czf.{f}" for f in Z_FEATURES)

    for sector_id in SECTORS:
        ts = time.time()
        print(f"\nSector {sector_id:2d}:", end=" ", flush=True)

        rows = cursor.execute(f"""
            SELECT czf.contract_id, c.sector_id, {feature_cols}
            FROM contract_z_features czf
            JOIN contracts c ON czf.contract_id = c.id
            WHERE c.sector_id = ?
              AND czf.z_single_bid IS NOT NULL
        """, (sector_id,)).fetchall()

        if len(rows) < 100:
            print(f"skipped ({len(rows)} rows < 100)")
            continue

        contract_ids = np.array([r["contract_id"] for r in rows])
        X = np.array([[r[f] if r[f] is not None else 0.0 for f in Z_FEATURES] for r in rows], dtype=np.float32)
        X = np.nan_to_num(X, nan=0.0, posinf=5.0, neginf=-5.0)

        # Clip extreme z-scores to ±10
        np.clip(X, -10.0, 10.0, out=X)

        clf = IsolationForest(
            n_estimators=200,
            contamination=contamination,
            random_state=42,
            n_jobs=-1,
        )
        # Raw scores: negative = more anomalous; typically range -0.5 to 0.5
        raw_scores = clf.fit(X).score_samples(X)

        # Convert: lower raw score = more anomalous.
        # Invert and normalize to [0, 1] where 1 = most anomalous
        # anomaly_score = 1 - (raw_score - min) / (max - min)
        min_s, max_s = raw_scores.min(), raw_scores.max()
        if max_s - min_s > 1e-9:
            anomaly_scores = 1.0 - (raw_scores - min_s) / (max_s - min_s)
        else:
            anomaly_scores = np.zeros(len(raw_scores))

        # Take top-N by anomaly score
        top_idx = np.argsort(anomaly_scores)[-top_n:][::-1]

        inserts = [
            (int(contract_ids[i]), int(sector_id), float(anomaly_scores[i]), 0, "full_z_vector")
            for i in top_idx
        ]
        cursor.executemany("""
            INSERT OR REPLACE INTO contract_ml_anomalies (contract_id, sector_id, anomaly_score, iqr_flagged, model)
            VALUES (?, ?, ?, ?, ?)
        """, inserts)
        conn.commit()
        total_inserted += len(inserts)
        print(f"{len(rows):7,} contracts — top {top_n} anomalies stored ({time.time() - ts:.1f}s)")

    # Update ml_anomaly_score_full on contracts table for top anomalies
    print("\nUpdating ml_anomaly_score_full on contracts table...")
    cursor.execute("""
        UPDATE contracts SET ml_anomaly_score_full = (
            SELECT anomaly_score FROM contract_ml_anomalies
            WHERE contract_ml_anomalies.contract_id = contracts.id
              AND contract_ml_anomalies.model = 'full_z_vector'
            LIMIT 1
        )
        WHERE id IN (
            SELECT contract_id FROM contract_ml_anomalies WHERE model = 'full_z_vector'
        )
    """)
    conn.commit()

    elapsed = time.time() - t0
    print(f"\nDone in {elapsed/60:.1f} min")
    print(f"Total full-vector anomalies stored: {total_inserted}")
    print("=" * 60)
    conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Full-vector Isolation Forest anomaly detection")
    parser.add_argument("--contamination", type=float, default=0.05)
    parser.add_argument("--top-n", type=int, default=50)
    args = parser.parse_args()
    main(contamination=args.contamination, top_n=args.top_n)
