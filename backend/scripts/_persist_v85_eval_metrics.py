"""Persist the MISSING calibration metrics on the active v0.8.5 model_calibration
row (calibration_curve, log_loss_val, average_precision). EVAL-ONLY: reads the
already-written `contracts.risk_score_v8`; never refits, never rescores.

These are computed POST-HOC and TAGGED as such — an empirical, PU-naive
reliability assessment (label = "contract's vendor is in ground_truth_vendors";
unlabeled treated as negative, so observed rates UNDER-state true positives).
They do NOT overwrite the original auc_roc / test_auc / brier_score from the
calibration run. The method tag in calibration_curve makes that explicit so the
numbers are auditable, not mistaken for the held-out PU-corrected eval.

Run:  python -m scripts._persist_v85_eval_metrics            # source DB
      python -m scripts._persist_v85_eval_metrics <db_path>  # e.g. deploy DB
"""
import json
import math
import sqlite3
import sys

DB = sys.argv[1] if len(sys.argv) > 1 else "RUBLI_NORMALIZED.db"


def main():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # GT-positive vendor set (label source).
    gt = {r[0] for r in cur.execute("SELECT vendor_id FROM ground_truth_vendors")}
    print(f"GT-positive vendors: {len(gt)}")

    # Stream scored contracts; accumulate 20-bin reliability + running log_loss / AP pieces.
    BINS = 20
    bin_n = [0] * BINS
    bin_pred = [0.0] * BINS
    bin_pos = [0] * BINS
    n = 0
    ll_sum = 0.0
    eps = 1e-15
    # For average precision we need ranked (score, label); collect compactly.
    scores_labels = []  # (score, label) — sampled to cap memory
    SAMPLE_EVERY = 5     # ~20% sample for AP/log_loss, full pop for the curve

    cur.execute("SELECT risk_score_v8, vendor_id FROM contracts WHERE risk_score_v8 IS NOT NULL")
    i = 0
    for p, vid in cur:
        if p is None:
            continue
        p = min(1.0 - eps, max(eps, float(p)))
        y = 1 if vid in gt else 0
        b = min(BINS - 1, int(p * BINS))
        bin_n[b] += 1
        bin_pred[b] += p
        bin_pos[b] += y
        n += 1
        if i % SAMPLE_EVERY == 0:
            ll_sum += -(y * math.log(p) + (1 - y) * math.log(1 - p))
            scores_labels.append((p, y))
        i += 1

    sample_n = len(scores_labels)
    log_loss = ll_sum / sample_n if sample_n else None

    # Average precision (area under precision-recall) on the sample, computed by
    # ranking descending by score (no sklearn dependency).
    scores_labels.sort(key=lambda t: t[0], reverse=True)
    total_pos = sum(y for _, y in scores_labels)
    ap = None
    if total_pos:
        tp = 0
        ap = 0.0
        for k, (_, y) in enumerate(scores_labels, start=1):
            if y:
                tp += 1
                ap += (tp / k)        # precision at each true positive
        ap /= total_pos

    curve = {
        "method": "empirical_gt_link_rate_PU_naive",
        "computed": "2026-06-11_post_hoc",
        "label": "vendor in ground_truth_vendors; unlabeled=negative (PU-naive, observed under-states true positives)",
        "n_contracts": n,
        "bins": [
            {
                "mean_pred": (bin_pred[b] / bin_n[b]) if bin_n[b] else None,
                "observed": (bin_pos[b] / bin_n[b]) if bin_n[b] else None,
                "count": bin_n[b],
            }
            for b in range(BINS)
        ],
    }

    cur.execute(
        "UPDATE model_calibration SET calibration_curve = ?, log_loss_val = ?, "
        "average_precision = ? WHERE model_version = 'v0.8.5' AND sector_id = 0",
        (json.dumps(curve), log_loss, ap),
    )
    conn.commit()
    print(f"persisted: log_loss={log_loss:.4f} avg_precision={ap:.4f} "
          f"curve_bins={BINS} n={n} (sample={sample_n})")
    conn.close()


if __name__ == "__main__":
    main()
