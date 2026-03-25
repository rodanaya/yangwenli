"""
recompute_ips_with_novelty.py
──────────────────────────────
Analysis-only script (NO DB writes).

Adds a novelty component to the IPS formula to surface vendors NOT already
in ground truth. New weights:

  Current (no novelty):
    IPS = 0.40*risk + 0.20*ensemble + 0.20*financial + 0.20*external

  Proposed (with novelty):
    IPS = 0.30*risk + 0.10*ensemble + 0.20*financial + 0.20*external + 0.20*novelty

  Novelty score:
    - Known GT vendors:              novelty = 0.0
    - Novel + on external registry:  novelty = 0.5  (EFOS/SFP already flagged)
    - Novel + no external registry:  novelty = 1.0  (purest new lead)

Run:
  cd backend && python scripts/recompute_ips_with_novelty.py
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# ── Weight sets ──────────────────────────────────────────────────────────────
W_RISK_OLD      = 0.40
W_ENSEMBLE_OLD  = 0.20
W_FINANCIAL_OLD = 0.20
W_EXTERNAL_OLD  = 0.20

W_RISK_NEW      = 0.30
W_ENSEMBLE_NEW  = 0.10
W_FINANCIAL_NEW = 0.20
W_EXTERNAL_NEW  = 0.20
W_NOVELTY_NEW   = 0.20


def novelty_score(in_gt: int, on_external: bool) -> float:
    if in_gt:
        return 0.0
    # On external registries (EFOS/SFP) -> half novelty credit
    # (they're worth investigating but already partially known)
    if on_external:
        return 0.5
    return 1.0


def recompute_ips(row: dict) -> tuple[float, float]:
    """Return (ips_old, ips_new) for a row."""
    risk   = row["risk_score_norm"]   or 0.0
    ens    = row["ensemble_norm"]     or 0.0
    fin    = row["financial_scale_norm"] or 0.0
    ext    = row["external_flags_score"] or 0.0
    in_gt  = row["in_ground_truth"]  or 0
    efos   = row["is_efos_definitivo"] or 0
    sfp    = row["is_sfp_sanctioned"]  or 0
    fp     = row["fp_penalty"]        or 0.0

    on_external = bool(efos or sfp)
    nov = novelty_score(in_gt, on_external)

    ips_old = (W_RISK_OLD * risk + W_ENSEMBLE_OLD * ens
               + W_FINANCIAL_OLD * fin + W_EXTERNAL_OLD * ext)
    ips_new = (W_RISK_NEW * risk + W_ENSEMBLE_NEW * ens
               + W_FINANCIAL_NEW * fin + W_EXTERNAL_NEW * ext
               + W_NOVELTY_NEW * nov)

    # Apply FP penalty to both (same as current pipeline)
    ips_old_fp = max(0.0, ips_old - fp)
    ips_new_fp = max(0.0, ips_new - fp)

    return ips_old_fp, ips_new_fp


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    rows = conn.execute(
        """
        SELECT aq.vendor_id, aq.vendor_name, aq.ips_tier, aq.ips_final,
               aq.risk_score_norm, aq.ensemble_norm, aq.financial_scale_norm,
               aq.external_flags_score, aq.fp_penalty,
               aq.in_ground_truth, aq.is_efos_definitivo, aq.is_sfp_sanctioned,
               aq.primary_pattern, aq.total_value_mxn, aq.avg_risk_score,
               aq.primary_sector_name
        FROM aria_queue aq
        ORDER BY aq.ips_final DESC
        """
    ).fetchall()
    conn.close()

    if not rows:
        print("aria_queue is empty.")
        return

    # Compute new IPS for every vendor
    results = []
    for row in rows:
        d = dict(row)
        ips_old, ips_new = recompute_ips(d)
        d["ips_old_recalc"] = ips_old
        d["ips_new"] = ips_new
        d["delta"] = ips_new - ips_old
        d["is_novel"] = not bool(d["in_ground_truth"])
        results.append(d)

    # Sort by new IPS
    results_sorted = sorted(results, key=lambda x: x["ips_new"], reverse=True)

    # Novel leads only
    novel_sorted = [r for r in results_sorted if r["is_novel"]]

    print("=" * 72)
    print("IPS NOVELTY BONUS — ANALYSIS REPORT")
    print()
    print("Weight changes:")
    print(f"  W_RISK:     {W_RISK_OLD:.2f} -> {W_RISK_NEW:.2f}")
    print(f"  W_ENSEMBLE: {W_ENSEMBLE_OLD:.2f} -> {W_ENSEMBLE_NEW:.2f}")
    print(f"  W_FINANCIAL:{W_FINANCIAL_OLD:.2f} -> {W_FINANCIAL_NEW:.2f}")
    print(f"  W_EXTERNAL: {W_EXTERNAL_OLD:.2f} -> {W_EXTERNAL_NEW:.2f}")
    print(f"  W_NOVELTY:  0.00 -> {W_NOVELTY_NEW:.2f}")
    print()

    total = len(results)
    novel_count = len(novel_sorted)
    gt_count = total - novel_count
    print(f"Queue: {total:,} vendors ({gt_count:,} GT, {novel_count:,} novel)")
    print()

    # --- Tier distribution under new scoring ---
    t1_old = sum(1 for r in results if r["ips_tier"] == 1)
    # Estimate new T1 (top same count as before using new IPS)
    t1_threshold_new = sorted(
        [r["ips_new"] for r in results], reverse=True
    )[t1_old - 1] if t1_old > 0 else 0.0
    t1_novel_new = sum(
        1 for r in results_sorted[:t1_old] if r["is_novel"]
    )
    print(f"Tier 1 size (kept same): {t1_old}")
    print(f"Novel vendors in new T1: {t1_novel_new} (was 1 under current weighting)")
    print(f"New T1 IPS threshold:    {t1_threshold_new:.4f}")
    print()

    # --- Top 20 novel leads under new weighting ---
    print("-" * 72)
    print(f"TOP 20 NOVEL LEADS under new IPS (novelty bonus active)")
    print("-" * 72)
    header = (
        f"{'#':>3} {'vendor_id':>8} {'name':<42} "
        f"{'T':>2} {'IPS_new':>8} {'IPS_old':>8} {'delta':>7} "
        f"{'pattern':<8} {'sector':<14} {'risk':>6}"
    )
    print(header)
    print("-" * len(header))

    for rank, r in enumerate(novel_sorted[:20], 1):
        name = (r["vendor_name"] or "")[:42]
        pat = r["primary_pattern"] or "NULL"
        sector = (r["primary_sector_name"] or "")[:14]
        print(
            f"{rank:>3} {r['vendor_id']:>8} {name:<42} "
            f"{r['ips_tier']:>2} {r['ips_new']:>8.4f} {r['ips_old_recalc']:>8.4f} "
            f"{r['delta']:>+7.4f} {pat:<8} {sector:<14} {r['avg_risk_score']:>6.3f}"
        )

    print()
    print("-" * 72)
    # --- GT displacement: how many GT vendors would drop below new T1 threshold ---
    gt_displaced = sum(
        1 for r in results
        if not r["is_novel"] and r["ips_new"] < t1_threshold_new
        and r["ips_tier"] == 1
    )
    print(f"GT vendors displaced out of T1 by novelty reweighting: {gt_displaced}")
    print()

    # --- Distribution of novel vendors gaining most from reweighting ---
    top_gainers = sorted(
        [r for r in results if r["is_novel"]],
        key=lambda x: x["delta"], reverse=True
    )[:10]
    print("Top 10 novel vendors gaining most from novelty bonus (by delta):")
    for r in top_gainers:
        name = (r["vendor_name"] or "")[:40]
        print(
            f"  vendor_id={r['vendor_id']:>7} | {name:<40} | "
            f"delta={r['delta']:>+.4f} | IPS: {r['ips_old_recalc']:.4f}->{r['ips_new']:.4f} | "
            f"T{r['ips_tier']}"
        )

    print()
    print("Note: This is analysis only. No DB changes made.")
    print("      To apply: update aria_pipeline.py IPS weights and rerun pipeline.")
    print("=" * 72)


if __name__ == "__main__":
    main()
