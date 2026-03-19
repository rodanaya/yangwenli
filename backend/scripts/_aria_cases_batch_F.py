"""
ARIA Cases batch_F: March 19 2026 GT mining session (Batch F).

Cases:
  735: Pardo Infraestructura - Nayarit municipal infrastructure bid-rigging
  736: Proteccion Resguardo - Security services bid-rigging at ISSSTE/IMSS/INAH
  737: Laboratorios Alpharma - IMSS pharma DA capture (DA rate 0%->85%+ after 2010)

Skipped:
  204789 ND NEGOCIOS DIGITALES - diversified IT, no capture pattern
  258952 LABORATORIOS ALFASIGMA - Italian multinational pharma, legitimate
  4481 QUIRURGICA ORTOPEDICA - Established medical device distributor, diversified
  146599 AM CENIT - diversified institutions, no concentration
  800 TECNICENTRO ROYAL - regional equipment supplier, Exportadora de Sal

Run from backend/ directory: python scripts/_aria_cases_batch_F.py
"""
import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def get_max_case_id(conn):
    row = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()
    return row[0] if row[0] else 0


def insert_case_pardo_infraestructura(conn, base_id):
    case_id = base_id + 1
    case_name = "Pardo Infraestructura - Nayarit municipal SB infrastructure capture"
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn,
         source_news, year_start, year_end, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            case_id, f"CASE-{case_id}", case_name, "bid_rigging", "medium",
            1556000000,
            "COMPRANET vendor_id=40097; 1.536B SB to Jala municipality (pop 18K)",
            2009, 2015,
            "8 contracts in Nayarit state, 75% SB. 1.536B single-bid Invitacion a Cuando Menos 3 Personas at tiny Jala municipality is extremely anomalous.",
        ),
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method, notes)
        VALUES (?,?,?,?,?,?)""",
        (case_id, 40097, "PARDO INFRAESTRUCTURA Y TERRACERIAS S.A. DE C.V.",
         "medium", "vendor_id_direct", "75% SB rate, 1.5B concentrated in Nayarit 2009-2015"),
    )
    contracts = conn.execute(
        "SELECT id FROM contracts WHERE vendor_id=40097 AND contract_year BETWEEN 2009 AND 2015"
    ).fetchall()
    for (cid,) in contracts:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)", (case_id, cid))
    n = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_id,)).fetchone()[0]
    print(f"Inserted case {case_id}: {case_name} ({n} contracts)")
    return case_id


def insert_case_proteccion_resguardo(conn, base_id):
    case_id = base_id + 1
    case_name = "Proteccion Resguardo - multi-institution security services bid-rigging"
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn,
         source_news, year_start, year_end, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            case_id, f"CASE-{case_id}", case_name, "bid_rigging", "high",
            850000000,
            "COMPRANET vendor_id=31776; 81% SB at ISSSTE, 94% SB at INAH, 415M SB IMSS contract",
            2013, 2024,
            "Security services company winning licitaciones as sole bidder across ISSSTE (81.4% SB, 43 contracts, 297M), INAH (94.4% SB), FONATUR (100% SB), CONAGUA (84.6% SB). 19 contracts score critical. Classic bid-rigging across health and cultural institutions.",
        ),
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method, notes)
        VALUES (?,?,?,?,?,?)""",
        (case_id, 31776, "PROTECCION RESGUARDO Y SERVICIOS EMPRESARIALES, S.A. DE C.V.",
         "high", "vendor_id_direct", "81% SB at ISSSTE, 94% SB at INAH, 19 critical-scored contracts"),
    )
    contracts = conn.execute(
        "SELECT id FROM contracts WHERE vendor_id=31776 AND contract_year BETWEEN 2013 AND 2024"
    ).fetchall()
    for (cid,) in contracts:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)", (case_id, cid))
    n = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_id,)).fetchone()[0]
    print(f"Inserted case {case_id}: {case_name} ({n} contracts)")
    return case_id


def insert_case_alpharma(conn, base_id):
    case_id = base_id + 1
    case_name = "Laboratorios Alpharma - IMSS pharma DA capture (2010-2023 regime shift)"
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn,
         source_news, year_start, year_end, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            case_id, f"CASE-{case_id}", case_name, "direct_award_abuse", "medium",
            2000000000,
            "COMPRANET vendor_id=5220; IMSS DA rate 0% pre-2010 -> 85-100% post-2010",
            2010, 2023,
            "Pharma company with clear DA regime shift at IMSS. Pre-2010: 213 contracts, 0% DA (all competitive). Post-2010: 610+ contracts at IMSS, DA rate 84-100%. Also 82.4% DA at INSABI. Won competitive at ISSSTE (12.5% DA) proving ability to compete. Classic IMSS ring pattern.",
        ),
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method, notes)
        VALUES (?,?,?,?,?,?)""",
        (case_id, 5220, "LABORATORIOS ALPHARMA S.A. DE C.V.",
         "medium", "vendor_id_direct", "IMSS DA shift 0%->85%+ post-2010; competitive at ISSSTE proves non-monopoly"),
    )
    contracts = conn.execute(
        "SELECT id FROM contracts WHERE vendor_id=5220 AND contract_year BETWEEN 2010 AND 2023"
    ).fetchall()
    for (cid,) in contracts:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)", (case_id, cid))
    n = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_id,)).fetchone()[0]
    print(f"Inserted case {case_id}: {case_name} ({n} contracts)")
    return case_id


def main():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    max_id = get_max_case_id(conn)
    print(f"Current max GT case ID: {max_id}")

    if max_id < 734:
        print(f"ERROR: Expected max_id >= 734. Got {max_id}")
        conn.close()
        sys.exit(1)

    try:
        conn.execute("BEGIN")

        c1 = insert_case_pardo_infraestructura(conn, max_id)
        c2 = insert_case_proteccion_resguardo(conn, c1)
        c3 = insert_case_alpharma(conn, c2)

        # Update aria_queue for included vendors
        for vid in [40097, 31776, 5220]:
            conn.execute(
                "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
                (vid,),
            )

        conn.execute("COMMIT")

        total = conn.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
        vendors = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
        gtc = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
        print(f"GT totals: {total} cases | {vendors} vendors | {gtc} contracts")

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
