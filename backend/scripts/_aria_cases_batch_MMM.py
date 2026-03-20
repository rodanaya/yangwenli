#!/usr/bin/env python3
"""
GT Mining Batch MMM - ARIA T3 investigation (4 vendors)

Investigated 2026-03-20:
  v207289  NUDOMI SA DE CV               -> SKIP (legitimate healthcare distributor)
  v94974   DISEÑO Y MANUFACTURA DIGITAL  -> ADD (institutional capture)
  v256417  JUAN RAMON CARDENAS SALAZAR   -> ADD (ghost individual intermediary)
  v38197   COMERCIALIZADORA REYSON       -> SKIP (insufficient evidence)

Cases added: 2 | Vendors skipped: 2
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
    if max_id is None or max_id < 884:
        print(f"ERROR: max_id={max_id}, expected >= 884. Aborting.")
        conn.close()
        return

    c0 = max_id + 1

    cases_inserted = 0
    vendors_skipped = 0

    print("\n" + "="*80)
    print("BATCH MMM: ARIA T3 INVESTIGATION")
    print("="*80)

    # CASE 1: v94974 - DISEÑO Y MANUFACTURA DIGITAL
    print(f"\nCASE {c0}: DISEÑO Y MANUFACTURA DIGITAL (v94974)")
    print("-" * 80)
    print("Type: institutional_capture (state university concentration)")
    print("Confidence: MEDIUM")
    print("Year window: 2013-2016 (contract concentration period)")
    print("Estimated fraud: 200M MXN (80% of concentrated value at UdT)")
    print()

    try:
        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level, 
             year_start, year_end, notes, estimated_fraud_mxn)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            c0,
            f"CASE-{c0}",
            "DISEÑO Y MANUFACTURA DIGITAL - UdT Monopoly",
            "institutional_capture",
            "medium",
            2013,
            2016,
            "Digital design/manufacturing vendor concentrated 98% of value (295M) at Universidad Tecnologica de Torreon via state university contracts. 74% DA rate, 26% SB rate. Appears to be service intermediary or ghost company winning large framework contract.",
            200_000_000
        ))

        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?, ?, ?, ?, ?)
        """, (
            c0,
            94974,
            "DISEÑO Y MANUFACTURA DIGITAL",
            "high",
            "vendor_id_exact"
        ))

        conn.execute("""
            UPDATE aria_queue SET in_ground_truth = 1
            WHERE vendor_id = 94974
        """)

        cases_inserted += 1
        print(f"Status: INSERTED")

    except Exception as e:
        print(f"Status: FAILED - {e}")

    c0 += 1

    # CASE 2: v256417 - JUAN RAMON CARDENAS SALAZAR
    print(f"\nCASE {c0}: JUAN RAMON CARDENAS SALAZAR (v256417)")
    print("-" * 80)
    print("Type: ghost_company (natural person intermediary)")
    print("Confidence: HIGH")
    print("Year window: 2019-2022 (DICONSA direct awards)")
    print("Estimated fraud: 228M MXN (DICONSA concentration)")
    print()

    try:
        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level, 
             year_start, year_end, notes, estimated_fraud_mxn)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            c0,
            f"CASE-{c0}",
            "JUAN RAMON CARDENAS SALAZAR - DICONSA Intermediary",
            "ghost_company",
            "high",
            2019,
            2022,
            "Natural person (not company) vendor receiving 228M (79% of total value) from DICONSA via 100% direct awards (2019-2022). Classic intermediary pattern: natural individual, food/welfare parastatal, large DA concentration. 290M total across 13 contracts (2019-2024).",
            228_000_000
        ))

        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?, ?, ?, ?, ?)
        """, (
            c0,
            256417,
            "JUAN RAMON CARDENAS SALAZAR",
            "high",
            "vendor_id_exact"
        ))

        conn.execute("""
            UPDATE aria_queue SET in_ground_truth = 1
            WHERE vendor_id = 256417
        """)

        cases_inserted += 1
        print(f"Status: INSERTED")

    except Exception as e:
        print(f"Status: FAILED - {e}")

    # SKIP: v207289 - NUDOMI SA DE CV
    print(f"\nSKIP: NUDOMI SA DE CV (v207289)")
    print("-" * 80)
    print("Reason: Legitimate healthcare supplier with expected distribution")
    print("Pattern: Distributed across ISSSTE (40%), IMSS (33%), SEDENA (22%)")
    print("DA rate: 27% (low, suggests competitive procedures)")
    print("SB rate: 6% (minimal)")
    print()
    vendors_skipped += 1
    print("Status: SKIPPED")

    # SKIP: v38197 - COMERCIALIZADORA DE SERVICIOS REYSON
    print(f"\nSKIP: COMERCIALIZADORA DE SERVICIOS REYSON (v38197)")
    print("-" * 80)
    print("Reason: Insufficient evidence (inactive since 2019, mixed record)")
    print("Pattern: 51% value from SSA (2014-2015), but multi-institutional history")
    print("DA rate: 61% (elevated but not extreme)")
    print("SB rate: 22% (moderate)")
    print("Recommendation: Would need audit findings or scandal documentation")
    print()
    vendors_skipped += 1
    print("Status: SKIPPED")

    conn.commit()
    conn.close()

    print("\n" + "="*80)
    print(f"BATCH SUMMARY")
    print("="*80)
    print(f"Cases inserted: {cases_inserted}")
    print(f"Vendors skipped: {vendors_skipped}")
    print(f"Next case_id: {c0 + cases_inserted}")
    print("="*80 + "\n")


if __name__ == "__main__":
    main()
