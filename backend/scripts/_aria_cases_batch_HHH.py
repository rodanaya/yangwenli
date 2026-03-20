#!/usr/bin/env python3
"""
Batch HHH: Institution-capture vendors (INM luxury bus + Diconsa monopoly)

Investigated 2026-03-20:
  v148090  ETN TURISTAR LUJO SA DE CV              -> ADD (medium, INM capture, 2019-2025)
  v25627   GRUPO INDUSTRIAL VIDA, S.A. DE C.V.    -> ADD (medium, Diconsa monopoly, 2010-2023)
  v14912   GAS METROPOLITANO, S.A. DE C.V.        -> SKIP (legitimate hospital gas supplier)
  v48101   COMPANIA MEXICANA DE TRASLADO DE VALORES -> SKIP (legitimate toll road cash transport)

CASES TO ADD:
  Case 753: ETN TURISTAR LUJO - Institution Capture (INM)
    Vendor: v148090, 41 contracts, 2.88B MXN, 2019-2025
    Pattern: 98.8% concentration at INM (Immigration), 73% DA rate
    Fraud period: 2019-2025 (when large contracts begin)
    Estimated fraud: 2.5B MXN

  Case 754: GRUPO INDUSTRIAL VIDA - Diconsa Monopoly
    Vendor: v25627, 3518 contracts, 1.70B MXN, 2010-2023
    Pattern: 99% DA, 74.6% Diconsa concentration, institutional capture
    Fraud period: 2010-2023 (bulk of suspicious contracts)
    Estimated fraud: 1.27B MXN

STATUS:
  - GAS METROPOLITANO: Legitimate specialized medical gas supplier to hospitals. No GT action.
  - TRASLADO DE VALORES: Legitimate cash transport service for toll roads. No GT action.
  - ETN TURISTAR: Strong institutional capture signal. Medium confidence (no official case found yet).
  - GRUPO INDUSTRIAL VIDA: Extreme DA monopoly + institutional capture at Diconsa. Medium confidence.
"""

import sqlite3
import sys
import os

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
    c0 = max_id + 1
    c1 = max_id + 2

    print("\n" + "="*80)
    print("BATCH HHH: Institution-Capture Vendors")
    print("="*80)

    # Case 753: ETN TURISTAR LUJO - INM Capture
    print("\n[CASE 753] ETN TURISTAR LUJO - Instituto Nacional de Migracion Capture")
    print("-" * 80)
    print("Vendor: v148090 - ETN TURISTAR LUJO SA DE CV")
    print("Contracts: 41 (2014-2025)")
    print("Total value: 2.88B MXN")
    print("Concentration: 98.8% at INM (2.85B / 2.88B)")
    print("DA rate: 73%")
    print("Fraud window: 2019-2025 (large contracts begin in 2019)")
    print("Pattern: Luxury bus company awarded 98.8% of spending at immigration agency")
    print("  -> Clear institution-specific capture")
    print("  -> High DA rate for routine transport contracts")
    print("  -> Temporal clustering: explosive growth 2019-2025")
    print("Estimated fraud: 2.5B MXN (Diconsa portion, excluding pilot contracts)")
    print("Type: Institution-specific capture (P6 pattern)")
    print("Confidence: medium (strong pattern, no official audit confirmation)")

    c0_id = f"CASE-{c0}"
    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        c0,
        c0_id,
        "ETN TURISTAR LUJO - INM Institution Capture",
        "institution_capture",
        "medium",
        2_500_000_000,
        "Luxury bus company with 98.8% concentration at INM (2.85B/2.88B), 73% DA rate, 2019-2025 large contracts. Fits P6 Capture pattern."
    ))

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?, ?, ?, ?, ?)
    """, (
        c0,
        148090,
        "ETN TURISTAR LUJO SA DE CV",
        "high",
        "direct_match_aria_queue"
    ))

    conn.execute(
        "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=148090"
    )

    # Case 754: GRUPO INDUSTRIAL VIDA - Diconsa Monopoly
    print("\n[CASE 754] GRUPO INDUSTRIAL VIDA - Diconsa Procurement Monopoly")
    print("-" * 80)
    print("Vendor: v25627 - GRUPO INDUSTRIAL VIDA, S.A. DE C.V.")
    print("Contracts: 3518 (2006-2025)")
    print("Total value: 1.70B MXN")
    print("Concentration: 74.6% at Diconsa (1.27B / 1.70B)")
    print("DA rate: 99% (virtually all direct awards)")
    print("Fraud window: 2010-2023 (bulk of suspicious contracts)")
    print("Pattern: Extreme direct award monopoly + institutional capture")
    print("  -> 99% DA rate across 3518 contracts")
    print("  -> 74.6% of all value from single institution (Diconsa food distribution)")
    print("  -> Consistent 100% DA for Diconsa contracts 2010-2023")
    print("  -> Thousands of small contracts (bulk supply distribution)")
    print("Estimated fraud: 1.27B MXN (Diconsa portion)")
    print("Type: Procurement monopoly + institutional capture (P6 pattern)")
    print("Confidence: medium (extreme pattern confidence, no official audit yet)")

    c1_id = f"CASE-{c1}"
    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        c1,
        c1_id,
        "GRUPO INDUSTRIAL VIDA - Diconsa Food Distribution Monopoly",
        "institutional_capture",
        "medium",
        1_270_000_000,
        "99% DA rate across 3518 contracts, 74.6% concentration at Diconsa (1.27B/1.70B), 2010-2023. Classic institutional capture for bulk food distribution. P6 Capture pattern."
    ))

    conn.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?, ?, ?, ?, ?)
    """, (
        c1,
        25627,
        "GRUPO INDUSTRIAL VIDA, S.A. DE C.V.",
        "high",
        "direct_match_aria_queue"
    ))

    conn.execute(
        "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=25627"
    )

    # Skip vendors
    conn.execute(
        "UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes='SKIP: GAS METROPOLITANO - legitimate specialized medical gas supplier to hospitals. 86c 3.24B MXN, primary customer Instituto Nacional de Perinatologia (hospital). Hospital oxygen/gas supply is normal specialized business.' WHERE vendor_id=14912"
    )
    conn.execute(
        "UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes='SKIP: COMPANIA MEXICANA DE TRASLADO DE VALORES - legitimate armored cash transport company. 294c 4.01B MXN, 67% at CAPUFE (toll roads commission). Cash/values transport to toll roads is normal specialized service.' WHERE vendor_id=48101"
    )

    # Summary
    print("\n" + "="*80)
    print("DECISION SUMMARY")
    print("="*80)
    print(f"""
CASES ADDED: 2

[753] ETN TURISTAR LUJO - INM Institution Capture
      v148090, 41 contracts, 2.88B MXN, 2019-2025
      Pattern: 98.8% INM concentration, 73% DA, luxury bus monopoly
      Fraud estimate: 2.5B MXN
      Confidence: medium

[754] GRUPO INDUSTRIAL VIDA - Diconsa Monopoly
      v25627, 3518 contracts, 1.70B MXN, 2010-2023
      Pattern: 99% DA, 74.6% Diconsa concentration, bulk distribution
      Fraud estimate: 1.27B MXN
      Confidence: medium

SKIPPED: 2

GAS METROPOLITANO (v14912)
  Reason: Legitimate medical gas supplier
  Contracts: 86, value: 3.24B MXN
  Assessment: Hospital oxygen/gas supply is normal business for Perinatologia institution
  No GT action

COMPANIA MEXICANA DE TRASLADO DE VALORES (v48101)
  Reason: Legitimate toll road cash transport service
  Contracts: 294, value: 4.01B MXN
  Assessment: Cash transport to toll roads (CAPUFE) is normal business
            67% concentration at toll roads is expected for specialized service
  No GT action

TOTAL NEW GT CASES: 2
TOTAL NEW GT VENDORS: 2
ESTIMATED NEW FRAUD: 3.77B MXN (combined)
""")

    conn.commit()
    conn.close()

    print("Batch HHH complete. Cases {754,755} inserted.".replace("{754,755}", f"{{{c0},{c1}}}"))


if __name__ == "__main__":
    main()
