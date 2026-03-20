#!/usr/bin/env python3
"""
GT Mining Batch LLL - ARIA T3 investigation (4 vendors)

Investigated 2026-03-20:
  v13723   ISA CORPORATIVO SA DE CV           -> SKIP (government media PNCE vendor)
  v47494   STEREOREY MEXICO SA                -> SKIP (government media PNCE vendor)
  v51488   LRHG INFORMATIVO SA DE CV          -> SKIP (government media PNCE vendor)
  v165033  PROVECTUS TECNOLOGIA SA DE CV      -> ADD (single-bid mega-contract at IMSS)

Cases added: 1  |  Vendors skipped: 3
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 884:
        print(f"ERROR: max_id={max_id}, expected >= 884. Aborting.")
        conn.close()
        return

    c0 = max_id + 1
    print(f"BATCH LLL ASSESSMENT")
    print("=" * 80)
    print(f"Next case ID: {c0}")
    print()

    # CASE 1: PROVECTUS TECNOLOGIA — Single-bid mega-contract at IMSS
    vendor_id = 165033
    vendor_name = "PROVECTUS TECNOLOGIA SA DE CV"
    
    conn.execute(
        "INSERT OR IGNORE INTO ground_truth_cases "
        "(id, case_id, case_name, case_type, confidence_level, year_start, year_end, notes, estimated_fraud_mxn) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            c0,
            f"CASE-{c0}",
            "PROVECTUS TECNOLOGIA — Single-Bid IMSS Mega-Contract",
            "single_bid_capture",
            "medium",
            2023,
            2023,
            "Tech vendor with 98.1% of lifetime value (722M MXN) concentrated in one single-bid "
            "invitacion contract at IMSS in 2023. Only 12 total contracts across 6 years. Remaining "
            "contracts trivial (0.1-2.5M). Pattern consistent with shell company or intermediary "
            "winning high-value institutional procurement via limited competition.",
            720_000_000
        )
    )
    
    conn.execute(
        "INSERT OR IGNORE INTO ground_truth_vendors "
        "(case_id, vendor_id, vendor_name_source, evidence_strength, match_method) "
        "VALUES (?, ?, ?, ?, ?)",
        (c0, vendor_id, vendor_name, "high", "direct_investigation")
    )
    
    conn.execute("UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?", (vendor_id,))
    
    print(f"CASE {c0} ADDED: {vendor_name}")
    print(f"  Type: single_bid_capture")
    print(f"  Confidence: medium")
    print(f"  Period: 2023")
    print(f"  Estimated fraud: 720M MXN")
    print()
    
    # SKIP v13723, v47494, v51488 (government media vendors)
    skipped = [
        (13723, "ISA CORPORATIVO, S.A. DE C.V.", "government media vendor (PNCE) — 99% DA dispersed across 12 sectors, no concentration"),
        (47494, "STEREOREY MEXICO SA", "government media vendor (PNCE) — 100% DA dispersed, no concentration signal"),
        (51488, "L.R.H.G. INFORMATIVO SA DE CV", "government media vendor (PNCE) — 100% DA dispersed, informational services only")
    ]
    
    for vid, vname, reason in skipped:
        conn.execute(
            "UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes=? WHERE vendor_id=?",
            (reason, vid)
        )
        print(f"SKIPPED v{vid}: {vname}")
        print(f"  Reason: {reason}")
        print()
    
    conn.commit()
    print("=" * 80)
    print(f"RESULT: 1 case added, 3 vendors skipped")
    conn.close()


if __name__ == "__main__":
    main()
