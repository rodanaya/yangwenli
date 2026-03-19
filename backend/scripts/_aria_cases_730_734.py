"""
ARIA Cases 730-734: March 19 2026 GT mining session (Batch A).

Cases:
  730: INGENIERIA MANT SERVICIOS INTEGRA - IMSS/ISSSTE Construction Capture 564M
  731: INFRAESTRUCTURA MARITIMA PORTUARIA SURESTE - Yucatan Port SB Monopoly 482M
  732: INAGRO DEL SUR - Diconsa/Segalmex DA Saturation 916M
  733: CONSULEZA PROFESIONALE - Puebla State 100% SB Infrastructure 583M
  734: ALVARGA CONSTRUCCIONES - Infrastructure SB Capture 2.2B

Skipped: 6798 CORPORATIVO NEOMEDICA - legitimate diversified medical supplier

Run from backend/ directory: python scripts/_aria_cases_730_734.py
"""

import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def get_max_case_id(conn):
    row = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()
    return row[0] if row[0] else 0


def insert_case_730(conn, base_id):
    """Case 730: INGENIERIA MANT SERVICIOS INTEGRA - IMSS/ISSSTE Construction Capture 564M"""
    case_id = base_id + 1
    case_name = 'INGENIERIA MANT SERVICIOS INTEGRA - IMSS/ISSSTE Construction Capture 564M'

    conn.execute("""INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn,
         source_news, year_start, year_end, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""", (
        case_id, f'CASE-{case_id}', case_name, 'direct_award_abuse', 'medium',
        564000000,
        'COMPRANET direct query vendor_id=35922',
        2021, 2025,
        'INGENIERIA, MANTENIMIENTO Y SERVICIOS INTEGRALES EN LA CONSTRUCCION SA DE CV. 80 contracts 564M MXN. 70% value at ISSSTE (175M, 30% DA, 57% SB) and IMSS (275M, 80% DA). Key: 239M single DA at IMSS 2024 for proyecto integral construccion (risk=0.852). Dual institution capture. avg_risk=0.180 IPS=0.538.'
    ))

    conn.execute("""INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method, notes)
        VALUES (?,?,?,?,?,?)""", (
        case_id, 35922,
        'INGENIERIA MANTENIMIENTO Y SERVICIOS INTEGRALES EN LA CONSTRUCCION SA DE CV',
        'medium', "vendor_id_direct",
        '239M IMSS DA 2024 risk=0.852. 80% DA at IMSS, 57% SB at ISSSTE. IPS=0.538.'
    ))

    contracts = conn.execute("""
        SELECT id FROM contracts WHERE vendor_id=35922
        AND contract_year BETWEEN 2021 AND 2025 AND (is_direct_award=1 OR is_single_bid=1 OR amount_mxn > 10000000)
    """).fetchall()
    for (cid,) in contracts:
        conn.execute("""INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id)
            VALUES (?,?)""", (case_id, cid))

    n = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_id,)).fetchone()[0]
    print(f"Inserted case {case_id}: {case_name} ({n} contracts)")
    return case_id


def insert_case_731(conn, base_id):
    """Case 731: INFRAESTRUCTURA MARITIMA PORTUARIA SURESTE - Yucatan Port SB Monopoly 482M"""
    case_id = base_id + 1
    case_name = 'INFRAESTRUCTURA MARITIMA PORTUARIA SURESTE - Yucatan Port SB Monopoly 482M'

    conn.execute("""INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn,
         source_news, year_start, year_end, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""", (
        case_id, f'CASE-{case_id}', case_name, 'bid_rigging', 'medium',
        482000000,
        'COMPRANET direct query vendor_id=11221',
        2003, 2015,
        'INFRAESTRUCTURA MARITIMA Y PORTUARIA DEL SURESTE SA DE CV. 47 contracts 482M MXN with 96% single-bid rate across all institutions. SCT (224M, 100% SB) + API Progreso (191M, 100% SB) + CONAPESCA (20M, 100% SB). All port/maritime infrastructure in Yucatan region. avg_risk=0.276 IPS=0.538.'
    ))

    conn.execute("""INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method, notes)
        VALUES (?,?,?,?,?,?)""", (
        case_id, 11221,
        'INFRAESTRUCTURA MARITIMA Y PORTUARIA DEL SURESTE SA DE CV',
        'medium', "vendor_id_direct",
        '96% SB across 47 contracts. 100% SB at SCT, API Progreso, CONAPESCA. 2003-2015.'
    ))

    contracts = conn.execute("SELECT id FROM contracts WHERE vendor_id=11221").fetchall()
    for (cid,) in contracts:
        conn.execute("""INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id)
            VALUES (?,?)""", (case_id, cid))

    n = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_id,)).fetchone()[0]
    print(f"Inserted case {case_id}: {case_name} ({n} contracts)")
    return case_id


def insert_case_732(conn, base_id):
    """Case 732: INAGRO DEL SUR - Diconsa/Segalmex DA Saturation 916M"""
    case_id = base_id + 1
    case_name = 'INAGRO DEL SUR - Diconsa/Segalmex DA Saturation 916M'

    conn.execute("""INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn,
         source_news, year_start, year_end, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""", (
        case_id, f'CASE-{case_id}', case_name, 'direct_award_abuse', 'high',
        916000000,
        'COMPRANET direct query vendor_id=53122; Segalmex/Diconsa ecosystem',
        2010, 2021,
        'INAGRO DEL SUR SA DE CV. 32 contracts 916M MXN, 97% direct award. Diconsa (722M, 97% DA, 2010-2017) + Segalmex (194M, 100% DA, 2020-2021). P6 Capture. Key: 463M single DA Diconsa 2012 (risk=0.49), 159M Segalmex 2020 (risk=1.0). Part of broader Diconsa/Segalmex ecosystem. avg_risk=0.355 IPS=0.538.'
    ))

    conn.execute("""INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method, notes)
        VALUES (?,?,?,?,?,?)""", (
        case_id, 53122,
        'INAGRO DEL SUR SA DE CV',
        'high', "vendor_id_direct",
        '97% DA at Diconsa + Segalmex. 463M single DA 2012. 159M Segalmex 2020 risk=1.0.'
    ))

    contracts = conn.execute("SELECT id FROM contracts WHERE vendor_id=53122").fetchall()
    for (cid,) in contracts:
        conn.execute("""INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id)
            VALUES (?,?)""", (case_id, cid))

    n = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_id,)).fetchone()[0]
    print(f"Inserted case {case_id}: {case_name} ({n} contracts)")
    return case_id


def insert_case_733(conn, base_id):
    """Case 733: CONSULEZA PROFESIONALE - Puebla State 100% SB Infrastructure 583M"""
    case_id = base_id + 1
    case_name = 'CONSULEZA PROFESIONALE - Puebla State 100% SB Infrastructure 583M'

    conn.execute("""INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn,
         source_news, year_start, year_end, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""", (
        case_id, f'CASE-{case_id}', case_name, 'bid_rigging', 'medium',
        583000000,
        'COMPRANET direct query vendor_id=61061',
        2010, 2018,
        'CONSULEZA PROFESIONALE SA DE CV (misspelled name - Profesionale instead of Profesionales). 12 contracts 583M MXN, 100% single-bid rate. ALL Puebla state (Sec Finanzas + Sec Administracion + municipios). Key: 216M road reconstruction 2018, 147M 2013, 93M 2010. Large infrastructure won as sole bidder every time. avg_risk=0.244 IPS=0.538.'
    ))

    conn.execute("""INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method, notes)
        VALUES (?,?,?,?,?,?)""", (
        case_id, 61061,
        'CONSULEZA PROFESIONALE SA DE CV',
        'medium', "vendor_id_direct",
        '100% SB across 12 contracts. All Puebla state. Misspelled company name. 583M total.'
    ))

    contracts = conn.execute("SELECT id FROM contracts WHERE vendor_id=61061").fetchall()
    for (cid,) in contracts:
        conn.execute("""INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id)
            VALUES (?,?)""", (case_id, cid))

    n = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_id,)).fetchone()[0]
    print(f"Inserted case {case_id}: {case_name} ({n} contracts)")
    return case_id


def insert_case_734(conn, base_id):
    """Case 734: ALVARGA CONSTRUCCIONES - Infrastructure SB Capture 2.2B"""
    case_id = base_id + 1
    case_name = 'ALVARGA CONSTRUCCIONES - Infrastructure SB Capture 2.2B'

    conn.execute("""INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn,
         source_news, year_start, year_end, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""", (
        case_id, f'CASE-{case_id}', case_name, 'bid_rigging', 'medium',
        2200000000,
        'COMPRANET direct query vendor_id=48696',
        2010, 2018,
        'ALVARGA CONSTRUCCIONES. 22 contracts 2.2B MXN, 82% single-bid rate. SCT (984M, 86% SB), IMSS (775M, 75% SB), API ports (393M, 89% SB). Key: 460M IMSS SB 2015, 355M SCT DA 2014. Systematic SB capture across multiple federal institutions. No RFC on file. avg_risk=0.262 IPS=0.535.'
    ))

    conn.execute("""INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method, notes)
        VALUES (?,?,?,?,?,?)""", (
        case_id, 48696,
        'ALVARGA CONSTRUCCIONES',
        'medium', "vendor_id_direct",
        '82% SB across 22 contracts. 460M IMSS SB, 355M SCT DA. No RFC. 2.2B total.'
    ))

    contracts = conn.execute("SELECT id FROM contracts WHERE vendor_id=48696").fetchall()
    for (cid,) in contracts:
        conn.execute("""INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id)
            VALUES (?,?)""", (case_id, cid))

    n = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_id,)).fetchone()[0]
    print(f"Inserted case {case_id}: {case_name} ({n} contracts)")
    return case_id


def main():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")

    max_id = get_max_case_id(conn)
    print(f"Current max GT case ID: {max_id}")

    if max_id < 726:
        print(f"ERROR: Expected max_id >= 726. Got {max_id}")
        conn.close()
        sys.exit(1)

    try:
        conn.execute("BEGIN")

        c730 = insert_case_730(conn, max_id)
        c731 = insert_case_731(conn, c730)
        c732 = insert_case_732(conn, c731)
        c733 = insert_case_733(conn, c732)
        c734 = insert_case_734(conn, c733)

        # Update aria_queue flags
        for vid in [35922, 11221, 53122, 61061, 48696]:
            conn.execute("""UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed'
                WHERE vendor_id=?""", (vid,))

        conn.execute("COMMIT")

        total_cases = conn.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
        total_vendors = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
        total_contracts = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
        print()
        print(f"GT totals: {total_cases} cases | {total_vendors} vendors | {total_contracts} contracts")

    except Exception as e:
        conn.execute("ROLLBACK")
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
