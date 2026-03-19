"""
ARIA Cases 735-737: March 19 2026 GT mining session (Batch D).

Cases added:
  735: COMERCIALIZADORA MEDICA OM - IMSS/IMSS-Bienestar DA pharma capture (2018-2025)
  736: IVG COMERCIALIZADORA - FGR/PGR direct award capture (2015-2025)
  737: SOLUCIONES INTEGRALES ELYM - New company SB agriculture capture (2021-2025)

Skipped vendors (with reason):
  38854 SOLUCIONES ABIERTAS EN TELECOMUNICACIONES - SKIP: DA=9.6pct, 118 institutions.
  4047  ESPACIOS EN RED Y SERVICIOS - SKIP: High SB but no institutional concentration.
  142221 SUSST DHALCO - SKIP: Only 8 contracts. Too few for reliable GT labeling.
  1541  GRUPO LAFI - SKIP: DA=26.7pct, 116 institutions. Diversified supplier.
  1430  DICIMEX - SKIP: Broadcast equipment specialist. Niche sector, few suppliers.

Run from backend/ directory: python scripts/_aria_cases_735_737.py
"""
import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def get_max_case_id(conn):
    row = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()
    return row[0] if row[0] else 0


def insert_case_735(conn, base_id):
    case_id = base_id + 1
    case_name = "COMERCIALIZADORA MEDICA OM - IMSS DA Pharma Capture"
    notes = (
        "Medical supplies distributor with 93pct DA rate at IMSS (99.1M) and 94pct DA at "
        "IMSS-Bienestar/Servicios de Salud del IMSS (85.8M). Contracts escalating rapidly: "
        "9.4M in 2018 to 96.3M in 2025. Large contracts via fuerza mayor and urgencia "
        "direct award justifications. Non-IMSS institutions show lower DA (Hospital Juarez "
        "50pct DA with LP wins), confirming institution-specific capture. Classic IMSS ring."
    )
    conn.execute(
        "INSERT OR IGNORE INTO ground_truth_cases "
        "(id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn, "
        "source_news, year_start, year_end, notes) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (case_id, f"CASE-{case_id}", case_name, "direct_award_abuse", "medium",
         258700000, "COMPRANET direct query vendor_id=154103", 2018, 2025, notes)
    )
    conn.execute(
        "INSERT OR IGNORE INTO ground_truth_vendors "
        "(case_id, vendor_id, vendor_name_source, evidence_strength, match_method, notes) "
        "VALUES (?,?,?,?,?,?)",
        (case_id, 154103, "COMERCIALIZADORA MEDICA OM, S.A. DE C.V.", "medium",
         "vendor_id_direct",
         "IPS=0.549, DA=80pct, 107 contracts, 266M MXN. IMSS+IMSS-Bienestar=184.9M at 93pct+ DA.")
    )
    contracts = conn.execute(
        "SELECT id FROM contracts WHERE vendor_id=154103 AND contract_year BETWEEN 2018 AND 2025"
    ).fetchall()
    for (cid,) in contracts:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)", (case_id, cid))
    n = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_id,)).fetchone()[0]
    print(f"  Inserted case {case_id}: {case_name} ({n} contracts)")
    return case_id


def insert_case_736(conn, base_id):
    case_id = base_id + 1
    case_name = "IVG COMERCIALIZADORA - FGR/PGR DA Capture"
    notes = (
        "Comercializadora with deep capture at FGR/PGR. FGR contracts total 113.3M MXN, "
        "nearly all DA including 84.8M oferente unico DA in 2024 for general acquisitions. "
        "DA rate escalated from 0pct (2005-2009) to 72-89pct (2017-2021). PGR/FGR contracts "
        "100pct DA since 2010. Legitimate LP wins at NL state (78.9M, 0pct DA, 2010-2017) "
        "confirm institution-specific capture. Risk score 0.558 on 84.8M FGR contract."
    )
    conn.execute(
        "INSERT OR IGNORE INTO ground_truth_cases "
        "(id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn, "
        "source_news, year_start, year_end, notes) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (case_id, f"CASE-{case_id}", case_name, "direct_award_abuse", "medium",
         240000000, "COMPRANET direct query vendor_id=20900", 2015, 2025, notes)
    )
    conn.execute(
        "INSERT OR IGNORE INTO ground_truth_vendors "
        "(case_id, vendor_id, vendor_name_source, evidence_strength, match_method, notes) "
        "VALUES (?,?,?,?,?,?)",
        (case_id, 20900, "IVG COMERCIALIZADORA, S. A. DE C. V.", "medium",
         "vendor_id_direct",
         "IPS=0.549, DA=60pct, 211 contracts, 360M MXN. FGR/PGR=113.3M at ~95pct DA.")
    )
    contracts = conn.execute(
        "SELECT id FROM contracts WHERE vendor_id=20900 AND contract_year BETWEEN 2015 AND 2025"
    ).fetchall()
    for (cid,) in contracts:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)", (case_id, cid))
    n = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_id,)).fetchone()[0]
    print(f"  Inserted case {case_id}: {case_name} ({n} contracts)")
    return case_id


def insert_case_737(conn, base_id):
    case_id = base_id + 1
    case_name = "SOLUCIONES INTEGRALES ELYM - New Company SB Agriculture Capture"
    notes = (
        "RFC SIE170222NV2 (created Feb 2017), first govt contract 2021, exploded to 319.7M "
        "in 4 years across 165 contracts. High single-bid rate: 70.8pct SB at SADER (79.2M, "
        "65 contracts), 100pct SB at Grupo Aeroportuario (66.9M), SENASICA (35.0M), SEMARNAT "
        "(16.7M). Wins invitacion a cuando menos 3 personas as sole bidder consistently. "
        "Company created 2017 with no contracts until 2021 = shell/intermediary activated "
        "for procurement capture. 0pct SB at ASA (18 contracts) = can face competition."
    )
    conn.execute(
        "INSERT OR IGNORE INTO ground_truth_cases "
        "(id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn, "
        "source_news, year_start, year_end, notes) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (case_id, f"CASE-{case_id}", case_name, "procurement_fraud", "medium",
         319700000, "COMPRANET direct query vendor_id=268284", 2021, 2025, notes)
    )
    conn.execute(
        "INSERT OR IGNORE INTO ground_truth_vendors "
        "(case_id, vendor_id, vendor_name_source, evidence_strength, match_method, notes) "
        "VALUES (?,?,?,?,?,?)",
        (case_id, 268284, "SOLUCIONES INTEGRALES ELYM S DE RL DE CV", "medium",
         "vendor_id_direct",
         "IPS=0.545, RFC=SIE170222NV2, SB=45pct, 165 contracts, 319.7M MXN. Created 2017.")
    )
    contracts = conn.execute(
        "SELECT id FROM contracts WHERE vendor_id=268284"
    ).fetchall()
    for (cid,) in contracts:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)", (case_id, cid))
    n = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_id,)).fetchone()[0]
    print(f"  Inserted case {case_id}: {case_name} ({n} contracts)")
    return case_id


def main():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = get_max_case_id(conn)
    print(f"Current max GT case ID: {max_id}")
    if max_id < 734:
        print(f"ERROR: Expected max_id >= 734. Got {max_id}")
        conn.close()
        sys.exit(1)

    try:
        conn.execute("BEGIN")

        c1 = insert_case_735(conn, max_id)
        c2 = insert_case_736(conn, c1)
        c3 = insert_case_737(conn, c2)

        # Update aria_queue for all added vendors
        for vid in [154103, 20900, 268284]:
            conn.execute(
                "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
                (vid,)
            )

        conn.execute("COMMIT")

        total = conn.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
        vendors = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
        contracts_n = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
        print(f"GT totals: {total} cases | {vendors} vendors | {contracts_n} contracts")

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
