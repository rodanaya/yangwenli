"""
ARIA Cases 727-729: March 19 2026 investigation session.

Cases:
  727: DISTRIBUIDOR MEDICO TECNOMED - IMSS Pharma DA Saturation 1.2B (new company 2019, 80% DA)
  728: HOLDING INFRAESTRUCTURA ESPECIALIZADA - CONAGUA SB Monopoly + ISSSTE Industry Mismatch 646M
  729: TECNOLOGIAS EFICIENTES VILLA - SEP Computer Equipment Capture 298M (risk=1.0)

Run from backend/ directory.
"""

import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

def get_max_case_id(conn):
    row = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()
    return row[0] if row[0] else 0

def insert_case_727(conn, base_id):
    """DISTRIBUIDOR MEDICO TECNOMED - IMSS Pharma Direct Awards 1.2B"""
    case_id = base_id + 1
    case_name = "DISTRIBUIDOR MEDICO TECNOMED - IMSS Pharma DA Saturation 1.2B"

    conn.execute("""INSERT OR IGNORE INTO ground_truth_cases
        (id, case_name, case_type, confidence_level, estimated_fraud_mxn,
         source_news, year_start, year_end, notes)
        VALUES (?,?,?,?,?,?,?,?,?)""", (
        case_id, case_name, "direct_award_abuse", "medium",
        1_200_000_000,
        "COMPRANET direct query vendor_id=281686; RFC DMT190918N50",
        2023, 2025,
        "DISTRIBUIDOR MEDICO TECNOMED (RFC DMT190918N50, registered Sep 2019). New pharma "
        "distributor first appearing in COMPRANET Feb 2023. 365 contracts 1.2B MXN, 80% DA. "
        "Largest: 511M DA 2024 for medicamentos genericos IMSS (risk=1.0). "
        "New company + concentrated IMSS dependency (72% share) + 80% DA = IMSS pharma capture ring. "
        "Similar to cases 179-207. avg_risk=0.399 IPS=0.542."
    ))

    # Match vendor
    vendor_row = conn.execute("SELECT id, name FROM vendors WHERE id=281686").fetchone()
    if vendor_row:
        conn.execute("""INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method, notes)
            VALUES (?,?,?,?,?,?)""", (
            case_id, 281686,
            "DISTRIBUIDOR MEDICO TECNOMED SA DE CV",
            "medium",
            "vendor_id_direct",
            "RFC DMT190918N50. New company Sep 2019, first COMPRANET contract Feb 2023. "
            "511M single DA 2024 for medicamentos genericos IMSS. 80% DA rate. risk=0.399."
        ))

    # Tag high-value DA contracts
    contracts = conn.execute("""
        SELECT id FROM contracts WHERE vendor_id=281686
        AND (is_direct_award=1 OR amount_mxn > 50000000)
        ORDER BY amount_mxn DESC
    """).fetchall()
    for (cid,) in contracts:
        conn.execute("""INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id)
            VALUES (?,?)""", (case_id, cid))

    total_tagged = conn.execute(
        "SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_id,)
    ).fetchone()[0]
    print(f"Inserted case {case_id}: {case_name}")
    print(f"  Vendor 281686 tagged, {total_tagged} contracts")
    return case_id


def insert_case_728(conn, base_id):
    """HOLDING INFRAESTRUCTURA ESPECIALIZADA - CONAGUA SB Monopoly + ISSSTE Mismatch"""
    case_id = base_id + 1
    case_name = "HOLDING INFRAESTRUCTURA ESPECIALIZADA - CONAGUA SB Monopoly 646M"

    conn.execute("""INSERT OR IGNORE INTO ground_truth_cases
        (id, case_name, case_type, confidence_level, estimated_fraud_mxn,
         source_news, year_start, year_end, notes)
        VALUES (?,?,?,?,?,?,?,?,?)""", (
        case_id, case_name, "bid_rigging", "medium",
        646_000_000,
        "COMPRANET direct query vendor_id=264212; RFC HIE130930TUA",
        2020, 2024,
        "HOLDING INFRAESTRUCTURA ESPECIALIZADA SAPI de CV (RFC HIE130930TUA, registered Sep 2013). "
        "8 contracts 646M MXN, 75% single bid at CONAGUA water canal projects (Sinaloa/Nayarit). "
        "Small company (clasificada: Pequeña) winning large competitive tenders unopposed. "
        "Anomaly: 66.8M ISSSTE contract for hospital pharmacy design (industry mismatch vs water infra). "
        "avg_risk=0.454 IPS=0.542. Possible CONAGUA bid-rigging + sector capture."
    ))

    vendor_row = conn.execute("SELECT id FROM vendors WHERE id=264212").fetchone()
    if vendor_row:
        conn.execute("""INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method, notes)
            VALUES (?,?,?,?,?,?)""", (
            case_id, 264212,
            "HOLDING INFRAESTRUCTURA ESPECIALIZADA S A P I DE CV",
            "medium",
            "vendor_id_direct",
            "RFC HIE130930TUA. 75% SB at CONAGUA. 66M ISSSTE pharmacy design = industry mismatch. "
            "avg_risk=0.454 IPS=0.542."
        ))

    contracts = conn.execute("""
        SELECT id FROM contracts WHERE vendor_id=264212
    """).fetchall()
    for (cid,) in contracts:
        conn.execute("""INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id)
            VALUES (?,?)""", (case_id, cid))

    total_tagged = conn.execute(
        "SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_id,)
    ).fetchone()[0]
    print(f"Inserted case {case_id}: {case_name}")
    print(f"  Vendor 264212 tagged, {total_tagged} contracts")
    return case_id


def insert_case_729(conn, base_id):
    """TECNOLOGIAS EFICIENTES VILLA - SEP Computer Equipment Capture 298M"""
    case_id = base_id + 1
    case_name = "TECNOLOGIAS EFICIENTES VILLA - SEP Computer Equipment Capture 298M"

    conn.execute("""INSERT OR IGNORE INTO ground_truth_cases
        (id, case_name, case_type, confidence_level, estimated_fraud_mxn,
         source_news, year_start, year_end, notes)
        VALUES (?,?,?,?,?,?,?,?,?)""", (
        case_id, case_name, "overpricing", "medium",
        298_000_000,
        "COMPRANET direct query vendor_id=258100; RFC TEV150303HR6",
        2025, 2025,
        "TECNOLOGIAS EFICIENTES VILLA SAPI de CV (RFC TEV150303HR6, registered Mar 2015). "
        "30 contracts 324M total. Key: 297.7M SEP computer equipment for public schools 2025 (risk=1.0). "
        "This dominates 92% of company value. SEP tech procurement = known corruption vector (cf. TOKA GT-8, ALTUM GT-216). "
        "avg_risk model low (0.27 overall) but dominant contract risk=1.0. "
        "Also: printing/imaging at IMPI, SEDENA, SPF. IPS=0.548."
    ))

    vendor_row = conn.execute("SELECT id FROM vendors WHERE id=258100").fetchone()
    if vendor_row:
        conn.execute("""INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method, notes)
            VALUES (?,?,?,?,?,?)""", (
            case_id, 258100,
            "TECNOLOGIAS EFICIENTES VILLA S A P I DE CV",
            "medium",
            "vendor_id_direct",
            "RFC TEV150303HR6. 297M SEP computer contract 2025 risk=1.0. "
            "avg_risk=0.27 IPS=0.548. Tech+printing services spread across IMPI/SEDENA/SPF."
        ))

    contracts = conn.execute("""
        SELECT id FROM contracts WHERE vendor_id=258100
        AND (risk_score >= 0.3 OR amount_mxn > 1000000)
    """).fetchall()
    for (cid,) in contracts:
        conn.execute("""INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id)
            VALUES (?,?)""", (case_id, cid))

    total_tagged = conn.execute(
        "SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_id,)
    ).fetchone()[0]
    print(f"Inserted case {case_id}: {case_name}")
    print(f"  Vendor 258100 tagged, {total_tagged} contracts")
    return case_id


def main():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")

    max_id = get_max_case_id(conn)
    print(f"Current max GT case ID: {max_id}")

    if max_id < 726:
        print(f"ERROR: Expected max_id >= 726 (cases 724-726 should be inserted). Got {max_id}")
        conn.close()
        sys.exit(1)

    try:
        conn.execute("BEGIN")

        c727 = insert_case_727(conn, max_id)
        c728 = insert_case_728(conn, c727)
        c729 = insert_case_729(conn, c728)

        # Update aria_queue flags
        for vid in [281686, 264212, 258100]:
            conn.execute("""UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed'
                WHERE vendor_id=?""", (vid,))

        conn.execute("COMMIT")

        # Verify
        total_cases = conn.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
        total_vendors = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
        total_contracts = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
        print(f"\nGT totals: {total_cases} cases | {total_vendors} vendors | {total_contracts} contracts")

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
