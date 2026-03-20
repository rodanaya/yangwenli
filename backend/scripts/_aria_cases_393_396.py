"""
ARIA Cases 393-396: New ground truth cases identified in March 2026 session.
Run from backend/ directory.

Cases:
  393: MARMOLES ARCA - marble/construction company selling respirators to IMSS (COVID fraud)
  394: ESTRUCTURA Y BALANCE INDUSTRIAL - 345M daycare renovation overpricing at ISSSTE
  395: SOS SISTEMAS OPCIONALES EN SALUD - 99% DA pharma capture at IMSS
  396: JAVIER ESTRADA SALGADO - persona física 439M meds distributor at IMSS
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

def run():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"Current max case ID: {max_id}")
    assert max_id == 392, f"Expected max_id=392, got {max_id}. Check for conflicts."

    # ── Case 393: MARMOLES ARCA ────────────────────────────────────────────────
    # Shell company (marble/construction) receiving emergency COVID DA contracts
    # from IMSS: 210M for respirators + 228.8M + 150M = 588M MXN total
    # RFC MAR180611TWA incorporated June 2018; no connection to medical sector
    cur.execute("""
        INSERT INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn)
        VALUES (393, 'CASE-393',
        'MARMOLES ARCA - Industry Mismatch COVID Shell',
        'ghost_company',
        'high',
        'Marble/construction company (RFC MAR180611TWA, inc. Jun 2018) receiving 588M MXN in 100% direct-award IMSS contracts including 210M for respirators and 228.8M for medical equipment (U200711). Classic COVID emergency procurement fraud: entity with no medical sector background wins DA contracts for critical medical supplies. Three contracts, all IMSS, all DA, all critical risk score.',
        588000000)
    """)
    cur.execute("""
        INSERT INTO ground_truth_vendors (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES ('CASE-393', 265454, 'MARMOLES ARCA S A P I DE CV', 'strong', 'vendor_id_direct')
    """)

    # ── Case 394: ESTRUCTURA Y BALANCE INDUSTRIAL ─────────────────────────────
    # Generic maintenance company receiving 345.8M MXN via DA from ISSSTE for
    # "renovating the institutional image" of 2 daycare centers in Veracruz.
    # Price of ~172M per daycare is extreme overpricing.
    cur.execute("""
        INSERT INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn)
        VALUES (394, 'CASE-394',
        'ESTRUCTURA Y BALANCE INDUSTRIAL - ISSSTE Daycare Overpricing',
        'overpricing',
        'medium',
        'Construction/maintenance company receiving 345.8M MXN via direct award from ISSSTE Veracruz for "institutional image change" at 2 daycare centers (Estancias de Bienestar No. 73 Boca del Rio and No. 74 Xalapa). ~172M MXN per daycare renovation is extreme overpricing. Additional 21.3M DA for maintenance. Vendor name (industrial balance/structure) has no clear connection to childcare renovation. All contracts ISSSTE Veracruz. Needs verification of actual work performed.',
        330000000)
    """)
    cur.execute("""
        INSERT INTO ground_truth_vendors (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES ('CASE-394', 277243, 'ESTRUCTURA Y BALANCE INDUSTRIAL SA DE CV', 'medium', 'vendor_id_direct')
    """)

    # ── Case 395: SOS SISTEMAS OPCIONALES EN SALUD ────────────────────────────
    # New pharma distributor (inc. 2014, active 2023-24) with 99% DA rate at IMSS,
    # 500M at IMSS + 157M at state health. "Optional Health Systems" name suggests
    # generic intermediary.
    cur.execute("""
        INSERT INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn)
        VALUES (395, 'CASE-395',
        'SOS SISTEMAS OPCIONALES EN SALUD - IMSS DA Capture',
        'procurement_fraud',
        'medium',
        'Health systems distributor (RFC SOS140225EF2) with 201 contracts at IMSS (99% DA) worth 500M MXN and 157M at Secretaria de Planeacion Finanzas (100% DA, likely Sonora state). Active 2023-2024. Extreme DA concentration at IMSS (99%) for a company doing under 5 years. Vendor name implies generic optional/alternative supplier. Pattern consistent with institutional capture of IMSS DA budget. Needs verification against SAT EFOS and investigation of IMSS buyers.',
        500000000)
    """)
    cur.execute("""
        INSERT INTO ground_truth_vendors (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES ('CASE-395', 278912, 'SOS SISTEMAS OPCIONALES EN SALUD SA DE CV', 'medium', 'vendor_id_direct')
    """)

    # ── Case 396: JAVIER ESTRADA SALGADO ─────────────────────────────────────
    # Individual (persona física) distributing 439M MXN of medicine and lab
    # materials to IMSS (2020-2022) via "solicitud de cotizaciones" mechanism.
    # No RFC registered. A single person acting as 439M pharma distributor to IMSS.
    cur.execute("""
        INSERT INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn)
        VALUES (396, 'CASE-396',
        'JAVIER ESTRADA SALGADO - Persona Fisica IMSS Pharma Distributor',
        'procurement_fraud',
        'medium',
        'Individual person (persona fisica, no RFC) distributing 439M MXN of medicine, lab materials, and medical supplies to IMSS (2020-2022) via 481 solicitudes de cotizacion. No RFC registered suggests possible informality or evasion. A single individual accumulating 439M in IMSS pharma contracts via quote-request mechanism (below-threshold DA process) is a clear red flag. Pattern consistent with proxy front person for organized DA scheme. Additional small contracts at state health agencies in Sonora, Durango, Aguascalientes.',
        439000000)
    """)
    cur.execute("""
        INSERT INTO ground_truth_vendors (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES ('CASE-396', 256744, 'JAVIER ESTRADA SALGADO', 'medium', 'vendor_id_direct')
    """)

    conn.commit()
    print("Inserted cases 393-396 into ground_truth_cases and ground_truth_vendors.")

    # Update ARIA queue review status and memos
    updates = [
        (265454, 'confirmed_corrupt',
         'MARMOLES ARCA S A P I DE CV: Marble/construction company (inc. Jun 2018, RFC MAR180611TWA) '
         'received 588M MXN in 100% direct-award IMSS contracts including 210M MXN for respirators '
         'during COVID emergency period. Zero medical sector affiliation. Classic shell company '
         'exploiting emergency procurement rules. CONFIRMED CORRUPT - Case 393.'),
        (277243, 'needs_review',
         'ESTRUCTURA Y BALANCE INDUSTRIAL: 345.8M MXN DA contract from ISSSTE Veracruz for '
         '"institutional image change" at 2 daycare centers (~172M per facility). '
         'Additional 21.3M maintenance DA. Extreme price suggests overpricing. '
         'Verify actual work performed and scope. Case 394.'),
        (278912, 'needs_review',
         'SOS SISTEMAS OPCIONALES EN SALUD: 99% DA rate at IMSS, 500M MXN (2023-24). '
         'Generic health systems distributor capturing IMSS DA budget. '
         'Cross-check SAT EFOS and IMSS buyer chain. Case 395.'),
        (256744, 'needs_review',
         'JAVIER ESTRADA SALGADO (persona fisica, no RFC): 439M MXN in 481 IMSS '
         'solicitudes de cotizacion for medicine/lab materials (2020-22). '
         'Individual acting as major pharma distributor - likely front person. Case 396.'),
    ]

    for vendor_id, status, memo in updates:
        cur.execute("""
            UPDATE aria_queue SET review_status=?, memo_text=?
            WHERE vendor_id=?
        """, (status, memo, vendor_id))
        print(f"  Updated vendor {vendor_id}: {status}")

    conn.commit()
    print("\nDone. Cases 393-396 inserted and ARIA queue updated.")

    # Mark in_ground_truth=1 for these vendors
    for vendor_id, _, _ in updates:
        cur.execute("UPDATE aria_queue SET in_ground_truth=1 WHERE vendor_id=?", (vendor_id,))
    conn.commit()
    print("in_ground_truth flags set.")

if __name__ == "__main__":
    run()
