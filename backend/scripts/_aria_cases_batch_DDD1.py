#!/usr/bin/env python3
"""
Ground Truth Case Insertion Script: ARIA T3 Batch DDD1
Vendors investigated: v20214 (BIOSKINCO), v47299 (AISLAMIENTOS), v59510 (TAGAL), v42762 (NADRO)
Session: 2026-03-20
"""

import sys
import sqlite3

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = r"D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db"

def run():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT MAX(id) FROM ground_truth_cases")
    max_id = cursor.fetchone()[0]
    if max_id is None or max_id < 911:
        print("ERROR: max_id=" + str(max_id) + ", expected >= 911. Aborting.")
        conn.close()
        return

    print("Starting GT insertion: batch DDD1")
    print("Max case ID: " + str(max_id))
    print("")

    c0 = max_id + 1

    added = []
    skipped = []

    print("="*70)
    print("VENDOR 20214: BIOSKINCO SA DE CV")
    print("="*70)
    print("Contracts: 322 | Value: 1525.28 M | DA: 75.8% | SB: 1.2%")
    print("Top inst: IMSS (70.2% of vendor, 226 contracts, 76.1% DA)")
    print("Years: 2005-2025")
    print("")
    print("DECISION: ADD")
    print("Reason: Strong IMSS institutional capture pattern.")
    print("  - 70.2% concentration at IMSS (health sector)")
    print("  - 75.8% direct award rate")
    print("  - Specialized pharma vendor (injectable/skin grafts)")
    print("  - Meets ADD criteria: topInst>60% + DA>50%")
    print("")

    cursor.execute("""
    INSERT OR IGNORE INTO ground_truth_cases
    (id, case_id, case_name, case_type, confidence_level, year_start, year_end, notes, estimated_fraud_mxn)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        c0,
        "CASE-" + str(c0),
        "BIOSKINCO IMSS Direct Award",
        "institutional_capture",
        "high",
        2005,
        2025,
        "Specialized pharma vendor (injertos/skin grafts) concentrated at IMSS with high direct award rate. 70.2% of contracts from IMSS, 75.8% direct awards.",
        380000000
    ))

    cursor.execute("""
    INSERT OR IGNORE INTO ground_truth_vendors (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
    VALUES (?, ?, ?, ?, ?)
    """, (
        c0,
        20214,
        "BIOSKINCO, S.A. DE C.V.",
        "high",
        "exact_match"
    ))

    cursor.execute("""
    INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id)
    SELECT ?, id FROM contracts WHERE vendor_id = ?
    """, (c0, 20214))

    cursor.execute("UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?", (20214,))

    added.append((20214, "BIOSKINCO", "v20214"))
    print("OK - Case " + str(c0) + " created")
    print("")

    print("="*70)
    print("VENDOR 47299: AISLAMIENTOS Y RECUBRIMIENTOS ESPECIALES SA")
    print("="*70)
    print("Contracts: 44 | Value: 1503.59 M | DA: 36.4% | SB: 61.4%")
    print("Top inst: CFE (100% of vendor, 44 contracts, 36.4% DA, 61.4% SB)")
    print("Years: 2010-2015")
    print("")
    print("DECISION: SKIP")
    print("Reason: CFE structural monopoly for specialized energy/infrastructure supplies.")
    print("  - 100% concentration at CFE (Comision Federal de Electricidad)")
    print("  - CFE is regulated utility with limited vendor pool for insulation/coatings")
    print("  - High single-bid rate (61.4%) is normal for specialized equipment")
    print("  - Low direct award rate (36.4%) indicates competitive procedures")
    print("  - No institutional capture signal with CFE - normal procurement")
    print("")

    cursor.execute(
        "UPDATE aria_queue SET review_status=?, in_ground_truth=0, reviewer_notes=? WHERE vendor_id=?",
        ("skipped", "CFE structural monopoly - specialized insulation/coating supplier", 47299)
    )

    skipped.append((47299, "AISLAMIENTOS", "v47299"))
    print("OK - Marked as skipped")
    print("")

    print("="*70)
    print("VENDOR 59510: TAGAL SA DE CV")
    print("="*70)
    print("Contracts: 75 | Value: 1560.45 M | DA: 37.3% | SB: 40.0%")
    print("Top inst: IMSS (65.3% of vendor, 49 contracts, 30.6% DA, 53.1% SB)")
    print("Years: 2010-2025")
    print("")
    print("DECISION: SKIP")
    print("Reason: Borderline metrics, weak institutional capture, commodity supplier.")
    print("  - IMSS concentration 65.3% is below 70% strong threshold")
    print("  - Direct award 37.3% is below 50% threshold")
    print("  - Single-bid rate 40% is high but reflects commodity market")
    print("  - Diesel fuel supplier (industrial commodity)")
    print("  - Mixed institutions (also serves Ferrocarril, ISSSTE)")
    print("  - Does not meet ADD criteria")
    print("")

    cursor.execute(
        "UPDATE aria_queue SET review_status=?, in_ground_truth=0, reviewer_notes=? WHERE vendor_id=?",
        ("skipped", "Borderline concentration (65.3%), commodity supplier, weak DA signal (37.3%)", 59510)
    )

    skipped.append((59510, "TAGAL", "v59510"))
    print("OK - Marked as skipped")
    print("")

    print("="*70)
    print("VENDOR 42762: NADRO SAPI DE CV")
    print("="*70)
    print("Contracts: 172 | Value: 1520.93 M | DA: 56.4% | SB: 6.4%")
    print("Top inst: PEMEX Corporativo (57.6% of vendor, 99 contracts, 75.8% DA)")
    print("Years: 2010-2022")
    print("")
    print("DECISION: SKIP")
    print("Reason: Established pharmaceutical distributor, fp_patent_exception flagged.")
    print("  - NADRO is major legitimate pharmaceutical/medical distributor in Mexico")
    print("  - fp_patent_exception=1 flagged by ARIA (patent-protected pharma products)")
    print("  - PEMEX concentration 57.6% is below 60% institutional capture threshold")
    print("  - Direct award 56.4% is borderline, but SB only 6.4% (no single-bid capture)")
    print("  - Concentration metrics do not meet ADD criteria")
    print("  - Known distributor with structural justification")
    print("")

    cursor.execute(
        "UPDATE aria_queue SET review_status=?, in_ground_truth=0, reviewer_notes=? WHERE vendor_id=?",
        ("skipped", "Established pharma distributor, fp_patent_exception flagged, borderline metrics", 42762)
    )

    skipped.append((42762, "NADRO", "v42762"))
    print("OK - Marked as skipped")
    print("")

    print("="*70)
    print("SUMMARY")
    print("="*70)
    print("Cases added: " + str(len(added)))
    for vid, name, tag in added:
        print("  + " + tag + " - " + name)
    print("")
    print("Cases skipped: " + str(len(skipped)))
    for vid, name, tag in skipped:
        print("  - " + tag + " - " + name)
    print("")

    conn.commit()
    conn.close()
    print("Done. Database updated.")

if __name__ == "__main__":
    run()
