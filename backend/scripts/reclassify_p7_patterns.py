"""
reclassify_p7_patterns.py
─────────────────────────
Analysis-only script (NO DB writes).

Queries all P7 vendors, applies sub-pattern classification rules derived from
the data audit, and prints a reclassification report.

Sub-pattern hierarchy (mutually exclusive, applied in order):
  P2-GHOST_NEW         first_contract_year >= 2018 AND avg_risk_score >= 0.60
  BID_RIGGING          single_bid_rate >= 0.70 AND direct_award_rate < 0.50
  P6-INSTIT_CAPTURE    direct_award_rate >= 0.80 AND top_institution_ratio >= 0.60
  P6-HIGH_DA           direct_award_rate >= 0.80
  P1-MONOPOLY_CAPTURE  total_value_mxn >= 5_000_000_000 AND top_institution_ratio >= 0.60
  P6-SINGLE_INST       top_institution_ratio >= 0.75
  P7-REMAINS           everything else

Run:
  cd backend && python scripts/reclassify_p7_patterns.py
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

# ── Thresholds ──────────────────────────────────────────────────────────────
GHOST_NEW_YEAR = 2018        # first contract year >= this → potentially new ghost
GHOST_NEW_RISK = 0.60        # avg_risk_score threshold for ghost candidate
BID_RIG_SB_RATE = 0.70       # single_bid_rate threshold for bid-rigging candidate
BID_RIG_MAX_DA = 0.50        # max direct_award_rate (must be competitive, not DA)
P6_DA_RATE = 0.80            # direct_award_rate threshold for DA capture
P6_INST_RATIO = 0.60         # top_institution_ratio for institutional capture
P1_VALUE_MXN = 5_000_000_000 # 5B MXN minimum for monopoly flag
P1_INST_RATIO = 0.60         # top_institution_ratio for monopoly capture
P6_SINGLE_RATIO = 0.75       # top_institution_ratio for single-institution flag


def classify_p7(row: dict) -> str:
    da = row["direct_award_rate"] or 0.0
    sb = row["single_bid_rate"] or 0.0
    ti = row["top_institution_ratio"] or 0.0
    val = row["total_value_mxn"] or 0.0
    risk = row["avg_risk_score"] or 0.0
    first_year = row["first_contract_year"] or 0

    # 1. New vendor with high risk → ghost candidate
    if first_year >= GHOST_NEW_YEAR and risk >= GHOST_NEW_RISK:
        return "P2-GHOST_NEW"

    # 2. Competitive procedures dominated by single bidder → bid rigging
    if sb >= BID_RIG_SB_RATE and da < BID_RIG_MAX_DA:
        return "BID_RIGGING"

    # 3. High DA + single institution → institutional capture
    if da >= P6_DA_RATE and ti >= P6_INST_RATIO:
        return "P6-INSTIT_CAPTURE"

    # 4. High DA overall (less institution-concentrated)
    if da >= P6_DA_RATE:
        return "P6-HIGH_DA"

    # 5. Large value + single institution → monopoly capture
    if val >= P1_VALUE_MXN and ti >= P1_INST_RATIO:
        return "P1-MONOPOLY_CAPTURE"

    # 6. Single institution regardless of DA/value
    if ti >= P6_SINGLE_RATIO:
        return "P6-SINGLE_INST"

    return "P7-REMAINS"


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # ── Fetch all P7 vendors joined with first_contract_year ────────────────
    rows = conn.execute(
        """
        SELECT aq.vendor_id, aq.vendor_name, aq.ips_tier, aq.ips_final,
               aq.total_contracts, aq.total_value_mxn, aq.avg_risk_score,
               aq.direct_award_rate, aq.single_bid_rate,
               aq.top_institution, aq.top_institution_ratio,
               aq.years_active, aq.primary_sector_name, aq.in_ground_truth,
               vs.first_contract_year
        FROM aria_queue aq
        LEFT JOIN vendor_stats vs ON vs.vendor_id = aq.vendor_id
        WHERE aq.primary_pattern = 'P7'
        ORDER BY aq.ips_final DESC
        """
    ).fetchall()
    conn.close()

    if not rows:
        print("No P7 vendors found in aria_queue.")
        return

    total_p7 = len(rows)

    # ── Classify ─────────────────────────────────────────────────────────────
    buckets: dict[str, list] = {
        "P2-GHOST_NEW": [],
        "BID_RIGGING": [],
        "P6-INSTIT_CAPTURE": [],
        "P6-HIGH_DA": [],
        "P1-MONOPOLY_CAPTURE": [],
        "P6-SINGLE_INST": [],
        "P7-REMAINS": [],
    }

    for row in rows:
        d = dict(row)
        label = classify_p7(d)
        buckets[label].append(d)

    # ── Summary report ───────────────────────────────────────────────────────
    print("=" * 72)
    print("P7 SUB-PATTERN RECLASSIFICATION REPORT")
    print(f"Total P7 vendors: {total_p7}")
    print(f"All P7 in ground truth: {sum(1 for r in rows if r['in_ground_truth'])}/{total_p7}")
    print("=" * 72)

    reclassify_count = 0
    for label, vendors in buckets.items():
        if not vendors:
            continue
        pct = 100.0 * len(vendors) / total_p7
        avg_ips = sum(v["ips_final"] or 0 for v in vendors) / len(vendors)
        avg_risk = sum(v["avg_risk_score"] or 0 for v in vendors) / len(vendors)
        reclassified = "P7-REMAINS" not in label
        marker = " [RECLASSIFY]" if reclassified else ""
        print(f"\n{label}{marker}")
        print(f"  Count: {len(vendors)} ({pct:.1f}% of P7)")
        print(f"  Avg IPS: {avg_ips:.3f}  |  Avg risk: {avg_risk:.3f}")

        if reclassified:
            reclassify_count += len(vendors)

        # Show top 5 examples
        for v in vendors[:5]:
            val_bn = (v["total_value_mxn"] or 0) / 1e9
            print(
                f"    vendor_id={v['vendor_id']:>7} | {v['vendor_name'][:50]:<50} | "
                f"T{v['ips_tier']} IPS={v['ips_final']:.3f} | "
                f"{v['primary_sector_name'] or 'n/a':>14} | "
                f"{val_bn:.1f}B MXN | "
                f"DA={100*(v['direct_award_rate'] or 0):.0f}% "
                f"SB={100*(v['single_bid_rate'] or 0):.0f}% "
                f"TopInst={100*(v['top_institution_ratio'] or 0):.0f}%"
            )
        if len(vendors) > 5:
            print(f"    ... and {len(vendors) - 5} more")

    print("\n" + "=" * 72)
    p7_remains = len(buckets["P7-REMAINS"])
    print(f"SUMMARY: Would reclassify {reclassify_count} of {total_p7} P7 vendors")
    print(f"  P7 reduction: {total_p7} -> {p7_remains} "
          f"({100.0*p7_remains/total_p7:.1f}% remain as P7)")
    print()
    print("Breakdown of reclassifications:")
    for label, vendors in buckets.items():
        if vendors and "P7-REMAINS" not in label:
            target = label.split("-")[0].replace("BID_RIGGING", "NEW_P-BID_RIGGING")
            print(f"  {len(vendors):>4} -> {label}")
    print()
    print("Note: These are analysis-only suggestions. Run aria_pipeline.py to")
    print("      apply the updated pattern logic to the database.")
    print("=" * 72)


if __name__ == "__main__":
    main()
