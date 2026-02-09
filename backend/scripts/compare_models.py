"""
Compare Risk Model Versions

Side-by-side comparison of v3.3 (weighted checklist) vs v4.0 (statistical framework).
Computes AUC-ROC, Brier score, detection rate, lift, and statistical tests
(Wilcoxon signed-rank, McNemar) for both versions against ground truth.

Usage:
    python backend/scripts/compare_models.py
    python backend/scripts/compare_models.py --v40-column risk_score_v4
"""
import sqlite3
import sys
import os
import argparse
import json
import numpy as np
from pathlib import Path
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(BACKEND_DIR, "RUBLI_NORMALIZED.db")

# Import canonical thresholds
sys.path.insert(0, BACKEND_DIR)
from api.config.constants import RISK_THRESHOLDS

try:
    from scipy.stats import wilcoxon, chi2_contingency
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False

try:
    from sklearn.metrics import roc_auc_score, brier_score_loss
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False


def get_risk_level(score):
    """Classify score into risk level using canonical thresholds."""
    if score >= RISK_THRESHOLDS["critical"]:
        return "critical"
    if score >= RISK_THRESHOLDS["high"]:
        return "high"
    if score >= RISK_THRESHOLDS["medium"]:
        return "medium"
    return "low"


def has_column(conn, table, column):
    """Check if a column exists in a table."""
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in cursor.fetchall()]
    return column in columns


def get_ground_truth_contracts(conn, score_column):
    """Get contracts from known-bad vendors with risk scores."""
    cursor = conn.cursor()
    cursor.execute(f"""
        SELECT c.id, c.{score_column} as risk_score, c.vendor_id, c.amount_mxn
        FROM contracts c
        JOIN ground_truth_vendors gtv ON c.vendor_id = gtv.vendor_id
        WHERE gtv.vendor_id IS NOT NULL AND c.{score_column} IS NOT NULL
    """.format(score_column=score_column))
    return cursor.fetchall()


def get_random_sample(conn, score_column, n=10000):
    """Get random sample of contracts for baseline comparison."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, {col} as risk_score, vendor_id, amount_mxn
        FROM contracts
        WHERE {col} IS NOT NULL
        ORDER BY RANDOM()
        LIMIT ?
    """.format(col=score_column), (n,))
    return cursor.fetchall()


def compute_metrics(known_bad_scores, random_scores, label):
    """Compute AUC, Brier, detection rates for a single model version."""
    if not known_bad_scores:
        return {"label": label, "error": "No scored known-bad contracts"}

    kb = np.array(known_bad_scores)
    rs = np.array(random_scores)

    # Classification counts
    critical_t = RISK_THRESHOLDS["critical"]
    high_t = RISK_THRESHOLDS["high"]
    medium_t = RISK_THRESHOLDS["medium"]

    n_total = len(kb)
    n_critical = int(np.sum(kb >= critical_t))
    n_high = int(np.sum((kb >= high_t) & (kb < critical_t)))
    n_medium = int(np.sum((kb >= medium_t) & (kb < high_t)))
    n_low = int(np.sum(kb < medium_t))
    n_detected = n_critical + n_high + n_medium

    metrics = {
        "label": label,
        "n_contracts": n_total,
        "detection_rate": round(n_detected / n_total * 100, 1) if n_total else 0,
        "high_plus_rate": round((n_critical + n_high) / n_total * 100, 1) if n_total else 0,
        "critical_rate": round(n_critical / n_total * 100, 1) if n_total else 0,
        "mean_score": round(float(np.mean(kb)), 4),
        "median_score": round(float(np.median(kb)), 4),
        "p75": round(float(np.percentile(kb, 75)), 4),
        "p90": round(float(np.percentile(kb, 90)), 4),
        "risk_dist": {"critical": n_critical, "high": n_high, "medium": n_medium, "low": n_low},
    }

    # Baseline lift
    rs_detected = int(np.sum(rs >= medium_t))
    rs_rate = rs_detected / len(rs) * 100 if len(rs) else 0
    metrics["baseline_rate"] = round(rs_rate, 1)
    metrics["lift"] = round(metrics["detection_rate"] / rs_rate, 2) if rs_rate > 0 else 0

    # AUC-ROC and Brier (if sklearn available)
    if HAS_SKLEARN:
        y_true = np.array([1] * len(kb) + [0] * len(rs))
        y_score = np.concatenate([kb, rs])
        if len(set(y_true)) > 1:
            metrics["auc_roc"] = round(float(roc_auc_score(y_true, y_score)), 4)
            metrics["brier"] = round(float(brier_score_loss(y_true, np.clip(y_score, 0, 1))), 4)
    else:
        metrics["auc_roc"] = None
        metrics["brier"] = None

    return metrics


def compare_models(conn, v33_col, v40_col):
    """Run side-by-side comparison of two model versions."""
    v40_exists = has_column(conn, "contracts", v40_col)

    print("=" * 70)
    print("RISK MODEL COMPARISON")
    print("=" * 70)
    print("Timestamp:", datetime.now().isoformat())
    print("Database:", DB_PATH)
    print("v3.3 column:", v33_col)
    col_status = "found" if v40_exists else "NOT FOUND"
    print(f"v4.0 column: {v40_col} ({col_status})")
    crit_t = RISK_THRESHOLDS["critical"]
    high_t = RISK_THRESHOLDS["high"]
    med_t = RISK_THRESHOLDS["medium"]
    print(f"Thresholds: critical >= {crit_t}, high >= {high_t}, medium >= {med_t}")

    if not v40_exists:
        print()
        print("NOTE: v4.0 score column not found. Running v3.3-only analysis.")
        print("To generate v4.0 scores, run: python backend/scripts/calculate_risk_scores_v4.py")

    # Fetch data
    print()
    print("Fetching ground truth contracts...")
    gt_v33 = get_ground_truth_contracts(conn, v33_col)
    print(f"  v3.3: {len(gt_v33)} contracts with scores")

    random_v33 = get_random_sample(conn, v33_col)
    print(f"  Random sample: {len(random_v33)} contracts")

    # Compute v3.3 metrics
    kb_scores_v33 = [row["risk_score"] for row in gt_v33]
    rs_scores_v33 = [row["risk_score"] for row in random_v33]
    m33 = compute_metrics(kb_scores_v33, rs_scores_v33, "v3.3")

    # Compute v4.0 metrics if available
    m40 = None
    kb_scores_v40 = None
    if v40_exists:
        gt_v40 = get_ground_truth_contracts(conn, v40_col)
        random_v40 = get_random_sample(conn, v40_col)
        print(f"  v4.0: {len(gt_v40)} contracts with scores")
        kb_scores_v40 = [row["risk_score"] for row in gt_v40]
        rs_scores_v40 = [row["risk_score"] for row in random_v40]
        m40 = compute_metrics(kb_scores_v40, rs_scores_v40, "v4.0")

    # Print comparison table
    print()
    print("=" * 70)
    print("SIDE-BY-SIDE METRICS")
    print("=" * 70)

    def row(label, key, fmt="{}"):
        v33_val = m33.get(key, "N/A")
        v40_val = m40.get(key, "N/A") if m40 else "--"
        v33_str = fmt.format(v33_val) if v33_val != "N/A" else "N/A"
        v40_str = fmt.format(v40_val) if v40_val not in ("N/A", "--", None) else str(v40_val)
        print(f"  {label:<25} {v33_str:>15} {v40_str:>15}")

    header_v40 = "v4.0" if m40 else "v4.0 (n/a)"
    print(f"  {chr(32)*25} {chr(32)*9}v3.3   {chr(32)*5}{header_v40}")
    print(f"  {chr(45)*25} {chr(45)*15} {chr(45)*15}")
    row("Contracts scored", "n_contracts", "{:,}")
    row("Detection rate (med+)", "detection_rate", "{}%")
    row("High+ rate", "high_plus_rate", "{}%")
    row("Critical rate", "critical_rate", "{}%")
    row("Mean score (known bad)", "mean_score", "{:.4f}")
    row("Median score", "median_score", "{:.4f}")
    row("P75 score", "p75", "{:.4f}")
    row("P90 score", "p90", "{:.4f}")
    row("Baseline rate (random)", "baseline_rate", "{}%")
    row("Lift vs baseline", "lift", "{}x")
    if HAS_SKLEARN:
        row("AUC-ROC", "auc_roc", "{:.4f}")
        row("Brier Score", "brier", "{:.4f}")

    # Score distribution comparison
    print()
    print("=" * 70)
    print("SCORE DISTRIBUTION (Known Bad Contracts)")
    print("=" * 70)
    kb_arr_v33 = np.array(kb_scores_v33)
    print()
    print(f"  v3.3: mean={np.mean(kb_arr_v33):.4f}, median={np.median(kb_arr_v33):.4f}, "
          f"std={np.std(kb_arr_v33):.4f}, min={np.min(kb_arr_v33):.4f}, max={np.max(kb_arr_v33):.4f}")
    if kb_scores_v40:
        kb_arr_v40 = np.array(kb_scores_v40)
        print(f"  v4.0: mean={np.mean(kb_arr_v40):.4f}, median={np.median(kb_arr_v40):.4f}, "
              f"std={np.std(kb_arr_v40):.4f}, min={np.min(kb_arr_v40):.4f}, max={np.max(kb_arr_v40):.4f}")

    # Statistical tests (only if both versions available)
    if m40 and HAS_SCIPY and kb_scores_v40:
        print()
        print("=" * 70)
        print("STATISTICAL TESTS")
        print("=" * 70)
        print()

        # Wilcoxon signed-rank test: are v4.0 scores higher for known-bad?
        # Need paired samples - use contracts scored by both
        gt_v33_ids = {row["id"]: row["risk_score"] for row in gt_v33}
        gt_v40_map = {}
        for row in get_ground_truth_contracts(conn, v40_col):
            gt_v40_map[row["id"]] = row["risk_score"]

        paired_ids = set(gt_v33_ids.keys()) & set(gt_v40_map.keys())
        if len(paired_ids) >= 10:
            paired_v33 = np.array([gt_v33_ids[cid] for cid in paired_ids])
            paired_v40 = np.array([gt_v40_map[cid] for cid in paired_ids])
            try:
                stat, p_val = wilcoxon(paired_v40, paired_v33, alternative="greater")
                print(f"  Wilcoxon signed-rank test (v4.0 > v3.3 for known bad):")
                print(f"    Paired contracts: {len(paired_ids)}")
                print(f"    Test statistic: {stat:.2f}")
                print(f"    p-value: {p_val:.6f}")
                if p_val < 0.05:
                    print("    Result: SIGNIFICANT - v4.0 assigns higher scores to known-bad")
                else:
                    print("    Result: NOT significant at p<0.05")
            except Exception as e:
                print(f"  Wilcoxon test failed: {e}")
        else:
            print(f"  Wilcoxon test: insufficient paired samples ({len(paired_ids)} < 10)")

        # McNemar test: does v4.0 detect different contracts?
        detected_v33 = set(cid for cid in paired_ids if gt_v33_ids[cid] >= RISK_THRESHOLDS["medium"])
        detected_v40 = set(cid for cid in paired_ids if gt_v40_map[cid] >= RISK_THRESHOLDS["medium"])

        both = len(detected_v33 & detected_v40)
        only_v33 = len(detected_v33 - detected_v40)
        only_v40 = len(detected_v40 - detected_v33)
        neither = len(paired_ids) - both - only_v33 - only_v40

        print()
        print(f"  McNemar test (detection at medium+ threshold):")
        print(f"    Detected by both: {both}")
        print(f"    Only v3.3: {only_v33}")
        print(f"    Only v4.0: {only_v40}")
        print(f"    Missed by both: {neither}")

        # Build 2x2 contingency table for McNemar
        if only_v33 + only_v40 > 0:
            table = np.array([[both, only_v33], [only_v40, neither]])
            try:
                chi2, p_val_mc = chi2_contingency(table, correction=True)[:2]
                print(f"    Chi-squared: {chi2:.2f}")
                print(f"    p-value: {p_val_mc:.6f}")
                if p_val_mc < 0.05:
                    print("    Result: SIGNIFICANT - models detect different contracts")
                else:
                    print("    Result: NOT significant - models detect similar contracts")
            except Exception as e:
                print(f"    McNemar test failed: {e}")
        else:
            print("    McNemar test: no discordant pairs")

    elif not m40:
        print()
        print("Statistical tests skipped (v4.0 data not available).")
    elif not HAS_SCIPY:
        print()
        print("Statistical tests skipped (scipy not installed).")
        print("Install with: pip install scipy")

    return {
        "v33": m33,
        "v40": m40,
        "v40_available": v40_exists,
    }


def main():
    parser = argparse.ArgumentParser(description="Compare risk model versions")
    parser.add_argument("--v33-column", default="risk_score", help="v3.3 score column (default: risk_score)")
    parser.add_argument("--v40-column", default="risk_score_v4", help="v4.0 score column (default: risk_score_v4)")
    args = parser.parse_args()

    if not os.path.exists(DB_PATH):
        print(f"ERROR: Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    try:
        results = compare_models(conn, args.v33_column, args.v40_column)
        print()
        print("=" * 70)
        print("COMPARISON COMPLETE")
        print("=" * 70)
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()

