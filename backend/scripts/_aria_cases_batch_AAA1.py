#!/usr/bin/env python3
"""
GT Case Insertion Script: Batch AAA1
Vendors: 13650 (Medical Life Supply), 10307 (Construcciones y Carreteras), 148962 (Especialistas)
Assessment: 13650 ADD, 10307 ADD, 148962 ADD
"""

import sqlite3
import sys

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = "D:/Python/yangwenli/backend/RUBLI_NORMALIZED.db"

def main():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Get next case ID
    c.execute("SELECT MAX(id) FROM ground_truth_cases")
    max_id = c.fetchone()[0]

    if max_id is None or max_id < 903:
        print("ERROR: max_id=" + str(max_id) + ", expected >= 903. Aborting.")
        conn.close()
        return

    c0 = max_id + 1
    c1 = max_id + 2
    c2 = max_id + 3

    print("=" * 80)
    print("BATCH AAA1: 3 VENDORS FROM ARIA T3 QUEUE")
    print("=" * 80)

    # CASE 1: v13650
    print("")
    print("CASE 1: v13650 - MEDICAL LIFE SUPPLY, S.A. DE C.V.")
    print("-" * 80)
    print("Assessment: ADD as institutional_capture")
    print("Confidence: HIGH")
    print("Evidence:")
    print("- 241 contracts, 1.75B MXN, 2003-2025")
    print("- 72.7% concentration at IMSS (156 contracts, 1.27B MXN)")
    print("- 51.9% DA and 23.1% SB at IMSS")
    print("- Salud sector (97.9% of contracts)")
    print("- No structural FP flags")

    c.execute(
        "INSERT OR IGNORE INTO ground_truth_cases "
        "(id, case_id, case_name, case_type, confidence_level, year_start, year_end, notes, estimated_fraud_mxn) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (c0, "CASE-" + str(c0), "Medical Life Supply IMSS Institutional Capture",
         "institutional_capture", "high", 2003, 2025,
         "Large pharma distributor, 72.7% IMSS concentration, 51.9% DA at IMSS.",
         500000000)
    )

    c.execute(
        "INSERT OR IGNORE INTO ground_truth_vendors "
        "(case_id, vendor_id, vendor_name_source, evidence_strength, match_method) "
        "VALUES (?, ?, ?, ?, ?)",
        (c0, 13650, "MEDICAL LIFE SUPPLY, S.A. DE C.V.", "high", "aria_queue_vendor_id")
    )

    c.execute(
        "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) "
        "SELECT ?, id FROM contracts WHERE vendor_id = ?",
        (c0, 13650)
    )

    c.execute("UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?", (13650,))
    print("INSERT OK: ground_truth_cases id=" + str(c0))

    # CASE 2: v10307
    print("")
    print("=" * 80)
    print("CASE 2: v10307 - CONSTRUCCIONES Y CARRETERAS, S.A. DE C.V.")
    print("-" * 80)
    print("Assessment: ADD as single_bid_capture")
    print("Confidence: HIGH")
    print("Evidence:")
    print("- 32 contracts, 1.72B MXN, 2002-2020")
    print("- 87.5% single bid rate")
    print("- Major 1.14B MXN single-bid contract at BANOBRAS")
    print("- Infrastructure sector (96.9%)")
    print("- No structural FP flags")

    c.execute(
        "INSERT OR IGNORE INTO ground_truth_cases "
        "(id, case_id, case_name, case_type, confidence_level, year_start, year_end, notes, estimated_fraud_mxn) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (c1, "CASE-" + str(c1), "Construcciones y Carreteras Single Bid Infrastructure",
         "single_bid_capture", "high", 2002, 2020,
         "Construction firm, 87.5% single-bid rate, 1.14B MXN BANOBRAS single-bid contract.",
         400000000)
    )

    c.execute(
        "INSERT OR IGNORE INTO ground_truth_vendors "
        "(case_id, vendor_id, vendor_name_source, evidence_strength, match_method) "
        "VALUES (?, ?, ?, ?, ?)",
        (c1, 10307, "CONSTRUCCIONES Y CARRETERAS, S.A. DE C.V.", "high", "aria_queue_vendor_id")
    )

    c.execute(
        "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) "
        "SELECT ?, id FROM contracts WHERE vendor_id = ?",
        (c1, 10307)
    )

    c.execute("UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?", (10307,))
    print("INSERT OK: ground_truth_cases id=" + str(c1))

    # CASE 3: v148962
    print("")
    print("=" * 80)
    print("CASE 3: v148962 - ESPECIALISTAS EN APLICACIONES Y SOPORTE TECNICO")
    print("-" * 80)
    print("Assessment: ADD as institutional_capture")
    print("Confidence: HIGH")
    print("Evidence:")
    print("- 2819 contracts, 1.70B MXN, 2015-2025")
    print("- 74.9% concentration at IMSS (2561 contracts, 1.28B MXN)")
    print("- 85.6% DA at IMSS, 1.3% SB")
    print("- IT support services, Salud sector (99.7%)")
    print("- Systematic direct award pattern")
    print("- No structural FP flags")

    c.execute(
        "INSERT OR IGNORE INTO ground_truth_cases "
        "(id, case_id, case_name, case_type, confidence_level, year_start, year_end, notes, estimated_fraud_mxn) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (c2, "CASE-" + str(c2), "IMSS IT Support Services Monopoly (Especialistas)",
         "institutional_capture", "high", 2015, 2025,
         "IT support vendor, 2819 IMSS contracts, 74.9% concentration, 85.6% DA rate. Systematic direct award.",
         1000000000)
    )

    c.execute(
        "INSERT OR IGNORE INTO ground_truth_vendors "
        "(case_id, vendor_id, vendor_name_source, evidence_strength, match_method) "
        "VALUES (?, ?, ?, ?, ?)",
        (c2, 148962, "ESPECIALISTAS EN APLICACIONES Y SOPORTE TECNICO MEDICO SA DE CV", "high", "aria_queue_vendor_id")
    )

    c.execute(
        "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) "
        "SELECT ?, id FROM contracts WHERE vendor_id = ?",
        (c2, 148962)
    )

    c.execute("UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?", (148962,))
    print("INSERT OK: ground_truth_cases id=" + str(c2))

    conn.commit()
    print("")
    print("=" * 80)
    print("COMMIT OK")
    print("=" * 80)
    print("Cases added: 3 (IDs " + str(c0) + "-" + str(c2) + ")")
    print("Estimated fraud: 1.9B MXN total")
    print("Vendors flagged in_ground_truth: 13650, 10307, 148962")

    conn.close()


if __name__ == "__main__":
    main()
