"""
Ensemble Model: v3.3 + v4.0 Weighted Average Sweep

Sweeps alpha from 0.0 to 1.0:
  ensemble = alpha * v3.3_score + (1-alpha) * v4.0_score

Evaluates AUC-ROC on ground truth for each alpha.

Result (2026-02-09):
  Best alpha = 0.1 (AUC=0.9428), only +0.0011 over pure v4.0 (0.9416)
  FINDING: Ensemble does NOT meaningfully improve over pure v4.0.
  Recommendation: Use v4.0 alone.

Usage:
    python -m scripts.ensemble_model [--fine-grid]
"""

import sys
import sqlite3
import argparse
import numpy as np
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

try:
    from sklearn.metrics import roc_auc_score
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False


def main():
    parser = argparse.ArgumentParser(description='Ensemble model sweep')
    parser.add_argument('--fine-grid', action='store_true',
                        help='Use 0.01 step instead of 0.1')
    parser.add_argument('--store', action='store_true',
                        help='Store best ensemble scores in risk_score_ensemble column')
    args = parser.parse_args()

    if not HAS_SKLEARN:
        print("ERROR: scikit-learn required.")
        return 1

    print("=" * 60)
    print("ENSEMBLE MODEL: v3.3 + v4.0 Weighted Average Sweep")
    print("=" * 60)

    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.execute("PRAGMA busy_timeout=60000")
    cur = conn.cursor()

    # Load GT vendor IDs
    cur.execute("SELECT DISTINCT vendor_id FROM ground_truth_vendors WHERE vendor_id IS NOT NULL")
    gt_vids = set(r[0] for r in cur.fetchall())
    print(f"\nGround truth vendors: {len(gt_vids)}")

    # Load scores
    print("Loading scores...")
    cur.execute("SELECT vendor_id, risk_score, risk_score_v3 FROM contracts "
                "WHERE risk_score IS NOT NULL AND risk_score_v3 IS NOT NULL")
    labels, v4_scores, v3_scores = [], [], []
    for vid, v4, v3 in cur.fetchall():
        labels.append(1 if vid in gt_vids else 0)
        v4_scores.append(v4)
        v3_scores.append(v3)

    y = np.array(labels)
    v4 = np.array(v4_scores)
    v3 = np.array(v3_scores)

    n_pos = int(np.sum(y == 1))
    n_neg = int(np.sum(y == 0))
    print(f"Contracts: {len(y):,} (positive: {n_pos:,}, negative: {n_neg:,})")

    # Baselines
    auc_v4 = roc_auc_score(y, v4)
    auc_v3 = roc_auc_score(y, v3)
    print(f"\nBaseline AUC-ROC:")
    print(f"  v4.0: {auc_v4:.4f}")
    print(f"  v3.3: {auc_v3:.4f}")

    # Sweep
    step = 0.01 if args.fine_grid else 0.1
    alphas = np.arange(0.0, 1.0 + step / 2, step)

    print(f"\n{'Alpha':>6} | {'AUC-ROC':>8} | {'vs v4.0':>8} | {'vs v3.3':>8}")
    print("-" * 42)

    best_alpha = 0.0
    best_auc = 0.0
    results = []

    for alpha in alphas:
        ensemble = alpha * v3 + (1 - alpha) * v4
        auc = roc_auc_score(y, ensemble)
        results.append((alpha, auc))

        if auc > best_auc:
            best_auc = auc
            best_alpha = alpha

        # Only print every 0.1 for fine grid
        if not args.fine_grid or abs(alpha * 10 - round(alpha * 10)) < 0.01:
            marker = " <<<" if abs(alpha - best_alpha) < 0.001 else ""
            print(f"{alpha:>6.2f} | {auc:>8.4f} | {auc - auc_v4:>+8.4f} | {auc - auc_v3:>+8.4f}{marker}")

    improvement = best_auc - auc_v4
    print(f"\nBest alpha: {best_alpha:.2f} (AUC={best_auc:.4f}, delta vs v4.0: {improvement:+.4f})")

    if improvement > 0.01:
        print("\nRECOMMENDATION: Ensemble improves AUC by > 0.01.")
        if args.store:
            print("Storing ensemble scores...")
            # Add column if needed
            cur.execute("PRAGMA table_info(contracts)")
            cols = {r[1] for r in cur.fetchall()}
            if 'risk_score_ensemble' not in cols:
                cur.execute("ALTER TABLE contracts ADD COLUMN risk_score_ensemble REAL")

            cur.execute("UPDATE contracts SET risk_score_ensemble = ? * risk_score_v3 + ? * risk_score "
                        "WHERE risk_score IS NOT NULL AND risk_score_v3 IS NOT NULL",
                        (best_alpha, 1 - best_alpha))
            conn.commit()
            print(f"Stored {cur.rowcount:,} ensemble scores (alpha={best_alpha:.2f})")
        else:
            print("Use --store flag to save ensemble scores to database.")
    else:
        print(f"\nFINDING: Ensemble does NOT improve AUC by > 0.01 over pure v4.0.")
        print("Recommendation: Use v4.0 alone. No ensemble needed.")

    conn.close()
    return 0


if __name__ == '__main__':
    sys.exit(main())
