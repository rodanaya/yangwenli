"""
Ground Truth Batch ZZ: Cases 869-872
ARIA T3/T4 investigation -- PEMEX PEP single-bid capture vendors (energia sector)

v7570   QUIMICA APOLLO S.A. DE C.V. -- PEMEX/CFE chemical supplier, 89% SB, 4.857B (2002-2010)
v32189  GPA ENERGY S.A. DE C.V. -- Single 4.843B SB contract at PEP (2007)
v15242  MARITIMA DE ECOLOGIA S.A. DE C.V. -- PEP marine/environmental, 100% SB, 4.543B (2003-2009)
v15243  MEYER & ASOCIATES S.A. DE C.V. -- PEP services, 100% SB, 4.323B (2003-2007)

All four are energia-sector vendors with extreme single-bid rates at PEMEX subsidiaries.
No co-bidders found in any of their procedures. All Structure A data (2002-2010, no descriptions).
v7570 is a DIFFERENT entity from v70277 (QUIMICA APOLLO at CFE, already GT case 815).

Run: cd backend && python scripts/_aria_cases_batch_ZZ.py
"""

import sqlite3
import sys
import os

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    cur = conn.cursor()

    cur.execute("SELECT MAX(id) FROM ground_truth_cases")
    max_id = cur.fetchone()[0] or 0
    if max_id < 865:
        print(f"ERROR: max GT case ID is {max_id}, expected >= 865. Aborting.")
        sys.exit(1)

    c0 = max_id + 1
    c1 = c0 + 1
    c2 = c1 + 1
    c3 = c2 + 1

    print(f"Inserting cases {c0}-{c3} (4 GT cases, 4 vendors)")

    # ----------------------------------------------------------------
    # Case c0: QUIMICA APOLLO S.A. DE C.V. (v7570)
    # ----------------------------------------------------------------
    c0_notes = (
        "4.857B across PEMEX Refinacion (2.0B, 96% SB), PEP (1.4B, 84% SB), "
        "CFE (1.3B, 80% SB), plus smaller PEMEX subsidiaries. 135 contracts "
        "2002-2010, 0% DA, 89% overall SB. Different entity from v70277 "
        "(QUIMICA APOLLO at CFE, GT case 815 -- no S.A. DE C.V. suffix, CFE-only). "
        "Name Quimica (chemical) but winning multi-billion energy infra contracts. "
        "Consistent with PEMEX-era SB capture across multiple subsidiaries."
    )
    cur.execute(
        "INSERT OR IGNORE INTO ground_truth_cases "
        "(id, case_id, case_name, case_type, confidence_level, "
        "year_start, year_end, estimated_fraud_mxn, notes) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (c0, f"CASE-{c0}",
         "Quimica Apollo SA - PEMEX/CFE Multi-Subsidiary SB Capture 4.86B",
         "single_bid_capture", "medium",
         2002, 2010, 4857000000.0, c0_notes)
    )
    cur.execute(
        "INSERT OR IGNORE INTO ground_truth_vendors "
        "(case_id, vendor_id, vendor_name_source, evidence_strength, match_method) "
        "VALUES (?, ?, ?, ?, ?)",
        (c0, 7570, "QUIMICA APOLLO S.A. DE C.V.",
         "medium", "aria_queue_investigation")
    )

    # ----------------------------------------------------------------
    # Case c1: GPA ENERGY S.A. DE C.V. (v32189)
    # ----------------------------------------------------------------
    c1_notes = (
        "Single 4.843B single-bid contract at PEMEX Exploracion y Produccion (2007). "
        "No other contracts in entire COMPRANET history. 100% SB rate. "
        "A company with zero competitive procurement track record winning a "
        "near-5B peso contract through a procedure where it was the sole bidder. "
        "Consistent with PEP single-bid capture pattern in Calderon era."
    )
    cur.execute(
        "INSERT OR IGNORE INTO ground_truth_cases "
        "(id, case_id, case_name, case_type, confidence_level, "
        "year_start, year_end, estimated_fraud_mxn, notes) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (c1, f"CASE-{c1}",
         "GPA Energy - PEP Single 4.84B SB Contract (2007)",
         "single_bid_capture", "medium",
         2007, 2007, 4843000000.0, c1_notes)
    )
    cur.execute(
        "INSERT OR IGNORE INTO ground_truth_vendors "
        "(case_id, vendor_id, vendor_name_source, evidence_strength, match_method) "
        "VALUES (?, ?, ?, ?, ?)",
        (c1, 32189, "GPA ENERGY, S.A. DE C.V.",
         "medium", "aria_queue_investigation")
    )

    # ----------------------------------------------------------------
    # Case c2: MARITIMA DE ECOLOGIA S.A. DE C.V. (v15242)
    # ----------------------------------------------------------------
    c2_notes = (
        "4.543B across 6 contracts at PEMEX Exploracion y Produccion (2003-2009). "
        "100% single-bid rate. Individual contract values: 1.73B (2009), 1.11B (2008), "
        "1.04B (2006), 588M (2003). No co-bidders found in any procedure. "
        "Marine/ecological services company winning billion-peso PEP contracts "
        "as sole bidder. Consistent with PEP institutional SB capture pattern."
    )
    cur.execute(
        "INSERT OR IGNORE INTO ground_truth_cases "
        "(id, case_id, case_name, case_type, confidence_level, "
        "year_start, year_end, estimated_fraud_mxn, notes) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (c2, f"CASE-{c2}",
         "Maritima de Ecologia - PEP Marine Services SB Capture 4.54B",
         "single_bid_capture", "medium",
         2003, 2009, 4543000000.0, c2_notes)
    )
    cur.execute(
        "INSERT OR IGNORE INTO ground_truth_vendors "
        "(case_id, vendor_id, vendor_name_source, evidence_strength, match_method) "
        "VALUES (?, ?, ?, ?, ?)",
        (c2, 15242, "MARITIMA DE ECOLOGIA, S.A. DE C.V.",
         "medium", "aria_queue_investigation")
    )

    # ----------------------------------------------------------------
    # Case c3: MEYER & ASOCIATES S.A. DE C.V. (v15243)
    # ----------------------------------------------------------------
    c3_notes = (
        "4.323B across 3 contracts at PEMEX Exploracion y Produccion (2003-2007). "
        "100% single-bid rate. Dominated by single 4.27B contract in 2007. "
        "Name uses English misspelling ASOCIATES instead of Spanish ASOCIADOS, "
        "suggesting possible foreign shell or hastily registered entity. "
        "No co-bidders found in any procedure. P3 intermediary flagged by ARIA. "
        "Consistent with PEP single-bid capture in Fox/Calderon era."
    )
    cur.execute(
        "INSERT OR IGNORE INTO ground_truth_cases "
        "(id, case_id, case_name, case_type, confidence_level, "
        "year_start, year_end, estimated_fraud_mxn, notes) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (c3, f"CASE-{c3}",
         "Meyer and Asociates - PEP Single-Bid Capture 4.32B",
         "single_bid_capture", "medium",
         2003, 2007, 4323000000.0, c3_notes)
    )
    cur.execute(
        "INSERT OR IGNORE INTO ground_truth_vendors "
        "(case_id, vendor_id, vendor_name_source, evidence_strength, match_method) "
        "VALUES (?, ?, ?, ?, ?)",
        (c3, 15243, "MEYER & ASOCIATES, S.A. DE C.V.",
         "medium", "aria_queue_investigation")
    )

    # ARIA queue updates -- all 4 vendors marked as GT
    for vid in [7570, 32189, 15242, 15243]:
        cur.execute(
            "UPDATE aria_queue SET in_ground_truth = 1, review_status = ?, "
            "reviewer_notes = ? WHERE vendor_id = ?",
            ("reviewed", "Batch ZZ GT case - PEMEX SB capture", vid)
        )

    conn.commit()

    # Verification
    print()
    print("=== Verification ===")
    for cid in [c0, c1, c2, c3]:
        r = cur.execute(
            "SELECT id, case_name, confidence_level, year_start, year_end "
            "FROM ground_truth_cases WHERE id=?", (cid,)
        ).fetchone()
        if r:
            print(f"  Case {r[0]}: {r[1]} [{r[2]}] {r[3]}-{r[4]}")
        else:
            print(f"  WARNING: Case {cid} NOT found!")
        vr = cur.execute(
            "SELECT vendor_id, vendor_name_source FROM ground_truth_vendors WHERE case_id=?",
            (cid,)
        ).fetchone()
        if vr:
            print(f"    -> Vendor v{vr[0]}: {vr[1]}")
        else:
            print(f"    -> WARNING: No vendor for case {cid}!")

    print()
    labels = {7570: "QUIMICA", 32189: "GPA", 15242: "MARITIMA", 15243: "MEYER"}
    for vid, label in labels.items():
        r = cur.execute(
            "SELECT in_ground_truth, review_status FROM aria_queue WHERE vendor_id=?",
            (vid,)
        ).fetchone()
        if r:
            gt_flag = "GT=1" if r[0] else "GT=0"
            print(f"  v{vid} ({label}): {gt_flag}, status={r[1]}")

    total = cur.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
    total_v = cur.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    print()
    print(f"Total GT cases: {total}, Total GT vendors: {total_v}")

    conn.close()
    print("Done.")


if __name__ == "__main__":
    main()
