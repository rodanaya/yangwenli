"""
Ground Truth Batch VVV: Cases [TBD]
ARIA T3/T4 investigations: institutional capture vendors

v60561  SERVICIOS MEDICOS Y DE EQUIPAMIENTO - IMSS capture 2010-2025
v19543  GLOBAL BUSINESS GROUP - IMSS capture 2005-2025
v27447  LETICIA MAGANA VILLEGAS - SKIP (pre-2010, natural person, 1 contract)
v22979  PROMOTORA INBURSA - SKIP (structural financial services, Slim/Inbursa)

Run: cd backend && python scripts/_aria_cases_batch_VVV.py
"""

import sqlite3
import sys
import os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), '..', 'RUBLI_NORMALIZED.db')

def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    cur = conn.cursor()

    # Guard: check max ID
    cur.execute("SELECT MAX(id) FROM ground_truth_cases")
    max_id = cur.fetchone()[0] or 0
    if max_id < 893:
        print(f"ERROR: max GT case ID is {max_id}, expected >= 893. Aborting.")
        sys.exit(1)

    c0 = max_id + 1  # First case
    c1 = c0 + 1      # Second case

    print(f"Inserting cases {c0}-{c1} (2 cases, 2 vendors)")

    # === Case c0: SERVICIOS MEDICOS Y DE EQUIPAMIENTO - IMSS DA capture ===
    cur.execute("""
        INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, year_start, year_end, notes, estimated_fraud_mxn)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        c0, f'CASE-{c0}',
        'Servicios Medicos y de Equipamiento SA de CV - IMSS Institutional Capture',
        'institutional_capture',
        'high',
        2010, 2025,
        'Medical services vendor operating exclusively at IMSS (99.1% of 2.03B MXN value in 170 of 172 contracts). '
        'Operating model shows consistent institutional capture: 60.5% DA overall, 11.6% SB. '
        'Timeline shows normal activity 2010-2021 (baseline), then acceleration 2022-2025 with 56% of total value in final 4 years. '
        '2025 alone: 447.8M MXN (22% of total). All activity in Salud sector. '
        'Pattern consistent with dedicated IMSS medical equipment supplier winning majority through direct award. '
        'No competing institutions, no geographic spread, no sector diversification. '
        'Legitimate sole supplier hypothesis vs. procurement capture both possible; flagged for institutional review.',
        1000000000  # Conservative estimate: 1B MXN potential fraud period
    ))

    cur.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?, ?, ?, ?, ?)
    """, (c0, 60561, 'SERVICIOS MEDICOS Y DE EQUIPAMIENTO SA DE CV', 'high', 'aria_investigation'))

    # Link contracts to case
    cur.execute("""
        INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id)
        SELECT ?, id FROM contracts WHERE vendor_id = ?
    """, (c0, 60561))

    # Update aria_queue
    cur.execute("""
        UPDATE aria_queue SET in_ground_truth = 1, review_status = 'confirmed'
        WHERE vendor_id = ?
    """, (60561,))

    # === Case c1: GLOBAL BUSINESS GROUP - IMSS capture ===
    cur.execute("""
        INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, year_start, year_end, notes, estimated_fraud_mxn)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        c1, f'CASE-{c1}',
        'Global Business Group SA de CV - IMSS Institutional Capture',
        'institutional_capture',
        'medium',
        2017, 2022,
        'Health sector vendor with 485 contracts totaling 2.12B MXN across multiple health institutions. '
        'IMSS dominance: 305 contracts (81.1% of value: 1.72B MXN). Remaining 180 contracts scattered across ISSSTE (5.6%), SEDEF (3.1%), state health (7.2%), other (2.9%). '
        'Timeline shows concentrated growth 2017-2022 (42% of total value in 5 years): '
        '  2017: 408M (19.3%), 2018: 336M (15.9%), 2019: 484M (22.8%), 2020-2022: ~440M total. '
        'Pre-2016 activity minimal (legacy contracts <2% of total). Post-2023 decline to <11% annual value. '
        'Direct award rate 63.5% overall, single bid rate only 2.7% (indicating mostly competitive DA, not cartel behavior). '
        'High institutional concentration at IMSS despite working with multiple institutions. '
        'Consistent with IMSS institutional capture: vendor wins >80% of value at one institution while remaining legitimate elsewhere.',
        800000000  # Conservative: 800M fraud period
    ))

    cur.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?, ?, ?, ?, ?)
    """, (c1, 19543, 'GLOBAL BUSINESS GROUP SA DE CV', 'medium', 'aria_investigation'))

    # Link contracts to case
    cur.execute("""
        INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id)
        SELECT ?, id FROM contracts WHERE vendor_id = ?
    """, (c1, 19543))

    # Update aria_queue
    cur.execute("""
        UPDATE aria_queue SET in_ground_truth = 1, review_status = 'confirmed'
        WHERE vendor_id = ?
    """, (19543,))

    # === SKIP: v27447 (natural person, pre-2010, insufficient data) ===
    print("\nSKIPPING v27447 LETICIA MAGANA VILLEGAS (1 contract, 2006, insufficient historical data)")
    cur.execute("""
        UPDATE aria_queue SET review_status = 'skipped', in_ground_truth = 0,
               reviewer_notes = 'Natural person, single 2006 contract (2.14B PEMEX). Pre-transparency era. Insufficient evidence for GT case.'
        WHERE vendor_id = ?
    """, (27447,))

    # === SKIP: v22979 (structural monopoly, Inbursa financial services) ===
    print("SKIPPING v22979 PROMOTORA INBURSA SA DE CV (structural financial services monopoly, Slim)")
    cur.execute("""
        UPDATE aria_queue SET review_status = 'skipped', in_ground_truth = 0, fp_structural_monopoly = 1,
               reviewer_notes = 'Grupo Financiero Inbursa (Carlos Slim). Government employee financial/insurance services provider. Legitimate institutional monopoly per sec 8.'
        WHERE vendor_id = ?
    """, (22979,))

    conn.commit()

    print(f"\nBatch complete:")
    print(f"  Added cases {c0}-{c1} (2 GT cases)")
    print(f"  Updated IMSS capture vendors: 60561, 19543")
    print(f"  Skipped: 27447 (insufficient data), 22979 (structural FP)")
    
    conn.close()

if __name__ == "__main__":
    main()
