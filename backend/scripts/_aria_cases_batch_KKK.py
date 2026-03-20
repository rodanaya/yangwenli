#!/usr/bin/env python3
"""
GT Mining Batch KKK - ARIA T2 investigation (4 vendors)

Investigated 2026-03-20:
  v45033   SUMMA COMPANY, S.A. DE C.V. -> SKIP (legitimate food distributor)
  v45014   CONSERVAS LA COSTENA, S.A. DE C.V. -> SKIP (famous brand)
  v5072    AUTOBUSES DE LA PIEDAD -> ADD (IMSS transport capture)
  v285316  ORTHOPBONE & SPINE -> ADD (ghost company + medical device capture)

Cases added: 2  |  Vendors skipped: 2
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 882:
        print(f"ERROR: max_id={max_id}, expected >= 882. Aborting.")
        conn.close()
        return

    c0 = max_id + 1
    print(f"BATCH KKK ASSESSMENT")
    print("=" * 90)

    # Case 1: Autobuses de la Piedad
    print(f"\n[CASE {c0}] AUTOBUSES DE LA PIEDAD - IMSS Transport Capture")
    print("Contracts: 171 | Value: 2.13B MXN | DA: 26% | SB: 65%")
    print("Institution: IMSS 98.4% (147 of 171 contracts, 2.12B MXN)")
    print("Period: 2002-2025 (peak activity 2010-2025)")
    print("Pattern: Institutional capture via sustained single-bid procurement")
    print("Decision: ADD as institutional_capture case")

    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, year_start, year_end, notes, estimated_fraud_mxn)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (c0, f"CASE-{c0}", "IMSS Ambulance Transport Capture - Autobuses de la Piedad",
         "institutional_capture", "medium", 2010, 2025,
         "Bus/ambulance: 65% SB to IMSS over 16 years (2010-2025). 98.4% institutional concentration.",
         1500000000)
    )

    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?, ?, ?, ?, ?)""",
        (c0, 5072, "AUTOBUSES DE LA PIEDAD, S.A. DE C.V.", "high", "direct_investigation")
    )

    conn.execute("UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=5072")

    # Case 2: Orthopbone & Spine
    print(f"\n[CASE {c0 + 1}] ORTHOPBONE & SPINE - IMSS Medical Device Ghost Company")
    print("Contracts: 96 | Value: 2.61B MXN | DA: 58%")
    print("Institution: IMSS 93% (89 of 96, 2.06B MXN)")
    print("Period: 2022-2025 (NEW VENDOR - only 3 years)")
    print("Pattern: Ghost company (debut 2022) + institutional capture + high DA")
    print("Decision: ADD as ghost_company case")

    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, year_start, year_end, notes, estimated_fraud_mxn)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (c0 + 1, f"CASE-{c0 + 1}", "IMSS Medical Device Ghost Company - Orthopbone & Spine",
         "ghost_company", "high", 2022, 2025,
         "New medical device vendor (debut 2022, 93% IMSS concentration). Ghost pattern + high DA.",
         1800000000)
    )

    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?, ?, ?, ?, ?)""",
        (c0 + 1, 285316, "ORTHOPBONE & SPINE SA DE CV", "high", "direct_investigation")
    )

    conn.execute("UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=285316")

    # Skip: SUMMA COMPANY
    conn.execute(
        """UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes=?
        WHERE vendor_id=45033""",
        ("Food distributor to DICONSA. 18,836 contracts, 100% DA to single institution. Legitimate commodity supplier.",)
    )

    # Skip: LA COSTENA
    conn.execute(
        """UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes=?
        WHERE vendor_id=45014""",
        ("Famous LA COSTENA brand (Grupo La Costena, publicly traded). 9,038 welfare food contracts. 100% DA justified.",)
    )

    conn.commit()
    print("\n" + "=" * 90)
    print(f"RESULT: 2 cases added ({c0}, {c0 + 1}), 2 vendors skipped")
    print("=" * 90)

    conn.close()


if __name__ == "__main__":
    main()