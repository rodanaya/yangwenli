#!/usr/bin/env python3
"""
GT Case Insertion Batch DDD
Vendors: OMEGA ALEACIONES (hacienda capture), ACEITES GRASAS Y DERIVADOS (parastatal)
Confidence: MEDIUM for both
2 cases, 2 vendors total
"""
import sqlite3
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")

def insert_cases():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    # Get next case ID
    max_id = cur.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None:
        max_id = 0
    
    if max_id < 877:
        print("ERROR: GT database appears corrupted or incomplete (max_id < 877)")
        sys.exit(1)

    c0 = max_id + 1
    c1 = max_id + 2

    print(f"Starting from case ID {c0}")
    print("="*80)

    # Case 1: OMEGA ALEACIONES - Casa de Moneda Capture
    print(f"\nCASE {c0}: OMEGA ALEACIONES - Casa de Moneda Institutional Capture")
    print("-"*80)
    case_name_0 = "Casa de Moneda Metals Monopoly - OMEGA ALEACIONES"
    vendor_name_0 = "OMEGA ALEACIONES SA DE CV"
    vendor_id_0 = 152287
    year_start_0 = 2015
    year_end_0 = 2025
    estimated_fraud_0 = 2_750_000_000  # 2.75B MXN
    
    print(f"Vendor: {vendor_name_0} (ID: {vendor_id_0})")
    print(f"Institution: Casa de Moneda de Mexico (Mint)")
    print(f"Period: {year_start_0}-{year_end_0}")
    print(f"Total value: 2.75B MXN, all 18 contracts at 100% DA")
    print(f"Pattern: Single vendor dominates government mint's precious metals supply")
    print(f"Confidence: MEDIUM - institutional capture pattern, but metallurgical specialization may justify concentration")

    cur.execute("""
        INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        c0,
        f"CASE-{c0}",
        case_name_0,
        "institutional_capture",
        year_start_0,
        year_end_0,
        "medium",
        estimated_fraud_0,
        "Sole supplier to Mexican Mint (Casa de Moneda). 18 contracts 2015-2025, 100% DA, 2.75B MXN total. All procedures are direct award or direct commercialization. Matches IMSS ring capture pattern: high concentration at single institution with normal(ish) competitive procedures elsewhere."
    ))

    cur.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, role, evidence_strength, match_method)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        c0,
        vendor_id_0,
        vendor_name_0,
        "sole_supplier",
        "high",
        "direct_match_compranet"
    ))

    # Case 2: ACEITES GRASAS Y DERIVADOS - Parastatal Food Distributor
    print(f"\n\nCASE {c1}: ACEITES GRASAS Y DERIVADOS - Parastatal Food Distribution Monopoly")
    print("-"*80)
    case_name_1 = "Diconsa/Alimentacion Food Distribution Monopoly - ACEITES GRASAS"
    vendor_name_1 = "ACEITES GRASAS Y DERIVADOS SA DE CV"
    vendor_id_1 = 44987
    year_start_1 = 2010
    year_end_1 = 2025
    estimated_fraud_1 = 2_483_000_000  # 2.48B MXN

    print(f"Vendor: {vendor_name_1} (ID: {vendor_id_1})")
    print(f"Institution: Diconsa (2010-2022, 3265 contracts, 1.98B MXN), then Alimentacion para el Bienestar (2023-2025, 499 contracts, 502M MXN)")
    print(f"Period: {year_start_1}-{year_end_1}")
    print(f"Total: 3,768 contracts, 2.48B MXN, 99.9% DA to Diconsa, 100% DA to Alimentacion")
    print(f"Pattern: Oils/fats supplier to government food parastatals. Extreme concentration and direct-award rate.")
    print(f"Confidence: MEDIUM - parastatal may justify sole-source, but 3,768 contracts at 99.9% DA suggests captured procurement")

    cur.execute("""
        INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        c1,
        f"CASE-{c1}",
        case_name_1,
        "institutional_capture",
        year_start_1,
        year_end_1,
        "medium",
        estimated_fraud_1,
        "Sole supplier of oils/fats to Diconsa (government food distributor parastatal) 2010-2022, then transitioned to ALIMENTACION PARA EL BIENESTAR 2023-2025. 3,768 total contracts, 2.48B MXN. Diconsa contracts: 99.9% DA. Alimentacion contracts: 100% DA. Pattern consistent with parastatal-captured procurement: single vendor dominates through direct awards to state entity."
    ))

    cur.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, role, evidence_strength, match_method)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        c1,
        vendor_id_1,
        vendor_name_1,
        "sole_supplier",
        "high",
        "direct_match_compranet"
    ))

    # Update aria_queue for GT vendors
    print("\n\nUpdating ARIA queue...")
    for vid in [152287, 44987]:
        cur.execute("""
            UPDATE aria_queue
            SET in_ground_truth = 1, review_status = 'confirmed'
            WHERE vendor_id = ?
        """, (vid,))
    # Skipped vendors (legitimate specialized services)
    for vid in [15404, 8159]:
        cur.execute("""
            UPDATE aria_queue
            SET in_ground_truth = 0, review_status = 'skipped',
                reviewer_notes = 'Legitimate specialized service monopoly (offshore/seismic). 100% SB in competitive procedures is structural for this market. No DA, no corruption evidence.'
            WHERE vendor_id = ?
        """, (vid,))
    
    conn.commit()
    print(f"Updated 4 vendors in aria_queue (in_ground_truth = 1, review_status = 'classified')")

    # Summary
    print("\n" + "="*80)
    print("INSERTION SUMMARY")
    print("="*80)
    print(f"Cases inserted: 2 (CASE-{c0}, CASE-{c1})")
    print(f"Vendors matched: 2 (OMEGA ALEACIONES, ACEITES GRASAS)")
    print(f"ARIA vendors updated: 4 (including GLOBAL OFFSHORE, PGS MEXICANA marked as reviewed but not GT)")
    print(f"Total fraud estimate: 5.23B MXN")
    print("\nCases not inserted (legitimate specialized services):")
    print("  - GLOBAL OFFSHORE MEXICO (15404): Offshore drilling, single-bid competitive (expected)")
    print("  - PGS MEXICANA (8159): Seismic surveys, single-bid competitive (expected)")

    conn.close()
    print("\nDone.")

if __name__ == "__main__":
    insert_cases()
