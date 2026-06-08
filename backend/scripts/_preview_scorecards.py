#!/usr/bin/env python3
"""Preview the REFORMED institution scorecards without writing.

Runs compute_institution_scorecards() against the (shared) main DB, then prints
the new federal score/grade distribution, the federal Honor Roll / Red Flags,
and a ground-truth sanity check (do institutions linked to GT corruption cases
score worse?). Read-only.
"""
import sqlite3
import statistics as st
import sys
from collections import Counter

from scripts.compute_scorecards import compute_institution_scorecards, GRADE_TIERS

DB = sys.argv[1] if len(sys.argv) > 1 else r"D:\Python\yangwenli\backend\RUBLI_NORMALIZED.db"


def main():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA query_only = ON")  # belt-and-suspenders: never write

    results = compute_institution_scorecards(conn)
    by_id = {r["institution_id"]: r for r in results}

    names = {r["id"]: r["name"] for r in conn.execute("SELECT id, name FROM institutions")}
    # GT-linked institutions (have >=1 ground-truth vendor)
    gt_inst = {r[0] for r in conn.execute(
        "SELECT DISTINCT c.institution_id FROM contracts c "
        "JOIN ground_truth_vendors gtv ON c.vendor_id = gtv.vendor_id "
        "WHERE c.institution_id IS NOT NULL")}

    fed = [r for r in results if r.get("is_federal") == 1]
    sub = [r for r in results if r.get("is_federal") == 0]

    def asc(s):
        return s.encode("ascii", "replace").decode()

    fs = [r["total_score"] for r in fed]
    print("REFORMED federal scorecards: %d" % len(fed))
    print("  score: min=%.1f p25=%.1f med=%.1f p75=%.1f max=%.1f mean=%.1f" % (
        min(fs), st.quantiles(fs, n=4)[0], st.median(fs), st.quantiles(fs, n=4)[2], max(fs), st.mean(fs)))
    gd = Counter(r["grade"] for r in fed)
    order = [g[1] for g in GRADE_TIERS]
    print("  grade distribution (federal): " + "  ".join("%s=%d" % (g, gd.get(g, 0)) for g in order if gd.get(g)))

    fed_sorted = sorted(fed, key=lambda r: -r["total_score"])
    print("\n  -- Federal HONOR ROLL (top 12) --")
    for r in fed_sorted[:12]:
        print("    %5.1f %-3s | %s" % (r["total_score"], r["grade"], asc(names.get(r["institution_id"], "?"))[:50]))
    print("  -- Federal RED FLAGS (bottom 12) --")
    for r in fed_sorted[-12:]:
        print("    %5.1f %-3s | %s" % (r["total_score"], r["grade"], asc(names.get(r["institution_id"], "?"))[:50]))

    # GT sanity check: mean reformed score for GT-linked vs non-GT federal institutions
    gt_fed = [r["total_score"] for r in fed if r["institution_id"] in gt_inst]
    nogt_fed = [r["total_score"] for r in fed if r["institution_id"] not in gt_inst]
    print("\n  GT sanity (federal): GT-linked mean=%.1f (n=%d)  vs  non-GT mean=%.1f (n=%d)  -> delta=%.1f" % (
        st.mean(gt_fed) if gt_fed else 0, len(gt_fed),
        st.mean(nogt_fed) if nogt_fed else 0, len(nogt_fed),
        (st.mean(gt_fed) - st.mean(nogt_fed)) if gt_fed and nogt_fed else 0))
    print("  (negative delta = GT-linked institutions score WORSE, as they should)")
    conn.close()


if __name__ == "__main__":
    main()
