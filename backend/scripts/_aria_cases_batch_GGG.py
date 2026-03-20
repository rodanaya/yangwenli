#!/usr/bin/env python3
"""
Batch GGG: Three vendors already in ground truth — verification only.

Investigated 2026-03-20:
  v108513  MOTA-ENGIL MEXICO SA DE CV                   -> ALREADY GT (Case 11)
  v12036   COAHUILA INDUSTRIAL MINERA S.A DE C.V.        -> ALREADY GT (Case 289)
  v114024  CIC CORPORATIVO INDUSTRIAL COAHUILA SA DE CV  -> ALREADY GT (Case 289)

STATUS:
  All three vendors are already assigned to ground truth cases:
  - v108513: Case 11 (Infrastructure Procurement Fraud Network) — HIGH confidence
  - v12036:  Case 289 (CFE Carbon Coahuila Monopoly) — LOW confidence
  - v114024: Case 289 (CFE Carbon Coahuila Monopoly) — LOW confidence
  
NOTE: This batch script is for verification and documentation only.
No new cases are added (all vendors already in GT).
The two Coahuila vendors represent STRUCTURAL MONOPOLY in coal supply to CFE,
not clear-cut procurement fraud. Case 289 may warrant reclassification as
structural FP rather than overpricing case.
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 879:
        print(f"ERROR: max_id={max_id}, expected >= 879. Aborting.")
        conn.close()
        return

    print(f"Max GT case id: {max_id}")
    print("\n" + "="*80)
    print("VENDOR VERIFICATION REPORT — Batch GGG")
    print("="*80)

    # Verify all three vendors are already in ground_truth_vendors
    vendors_to_check = [108513, 12036, 114024]
    vendor_info = {
        108513: "MOTA-ENGIL MEXICO SA DE CV",
        12036: "COAHUILA INDUSTRIAL MINERA S.A DE C.V.",
        114024: "CIC CORPORATIVO INDUSTRIAL COAHUILA SA DE CV"
    }

    for vendor_id in vendors_to_check:
        result = conn.execute(
            "SELECT case_id, evidence_strength FROM ground_truth_vendors WHERE vendor_id = ?",
            (vendor_id,)
        ).fetchone()
        
        if result:
            case_id_num = result[0]
            evidence = result[1]
            
            # Get case details
            case_info = conn.execute(
                "SELECT case_id, case_name, confidence_level FROM ground_truth_cases WHERE id = ?",
                (case_id_num,)
            ).fetchone()
            
            print(f"\nVendor {vendor_id}: {vendor_info[vendor_id]}")
            print(f"  Status: ALREADY IN GROUND TRUTH")
            print(f"  Case ID: {case_id_num} ({case_info[0]})")
            print(f"  Case Name: {case_info[1]}")
            print(f"  Case Confidence: {case_info[2]}")
            print(f"  Evidence Strength: {evidence}")
        else:
            print(f"\nVendor {vendor_id}: {vendor_info[vendor_id]}")
            print(f"  Status: ERROR - NOT FOUND in ground_truth_vendors!")

    # Verify aria_queue flags
    print("\n" + "="*80)
    print("ARIA QUEUE STATUS")
    print("="*80)
    for vendor_id in vendors_to_check:
        result = conn.execute(
            "SELECT in_ground_truth, review_status FROM aria_queue WHERE vendor_id = ?",
            (vendor_id,)
        ).fetchone()
        
        if result:
            in_gt = result[0]
            review_status = result[1]
            print(f"Vendor {vendor_id}: in_ground_truth={in_gt}, review_status='{review_status}'")

    print("\n" + "="*80)
    print("DECISION: NO ACTION")
    print("="*80)
    print("""
All three vendors are already assigned to ground truth cases:

1. MOTA-ENGIL MEXICO SA DE CV (v108513)
   -> Case 11: Infrastructure Procurement Fraud Network (HIGH confidence)
   -> Legitimate Portuguese multinational with 18 contracts 2013-2025
   -> 30.1B MXN total, 78% single-bid in competitive procedures
   -> Infrastructure sector (road, port, mining projects)
   
2. COAHUILA INDUSTRIAL MINERA S.A DE C.V. (v12036)
   -> Case 289: CFE Carbon Coahuila Monopoly (LOW confidence)
   -> Coal supplier to CFE, 3 contracts 2003-2006, 24.8B MXN
   -> 100% single-bid rate is STRUCTURAL (limited coal suppliers per region)
   -> No RFC in COMPRANET data
   
3. CIC CORPORATIVO INDUSTRIAL COAHUILA SA DE CV (v114024)
   -> Case 289: CFE Carbon Coahuila Monopoly (LOW confidence)
   -> Coal supplier to CFE, 1 contract in 2013, 23.7B MXN
   -> Only 1 contract (below 3-contract minimum threshold)
   -> Likely restructuring of vendor 12036 or separate legal entity

ASSESSMENT:
  - Case 11 (MOTA-ENGIL): Appears legitimate infrastructure multinational
    assigned to broad Infrastructure Fraud Network case
  
  - Case 289 (Coahuila vendors): STRUCTURAL MONOPOLY in coal supply.
    These are not clear procurement fraud cases — they reflect CFE's
    limited qualified coal suppliers per region. May warrant reclassification
    as structural FP (fp_structural_monopoly=1) rather than overpricing case.

NO CHANGES MADE — all vendors already in GT with appropriate case assignments.
    """)

    conn.close()
    print("\nVerification complete.")


if __name__ == "__main__":
    main()
