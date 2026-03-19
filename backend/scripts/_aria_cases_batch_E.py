"""ARIA Cases batch_E: March 19 2026. Cases 735-738. Run from backend/."""
import sqlite3, sys
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

def get_max_case_id(conn):
    row = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()
    return row[0] if row[0] else 0


def _insert_gt(conn, case_id, case_name, case_type, confidence, fraud_mxn, source, yr_s, yr_e, notes,
               vendor_id, vendor_name, ev_strength, vendor_notes, contract_sql):
    """Helper to insert a GT case + vendor + contracts."""
    conn.execute("""INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn,
         source_news, year_start, year_end, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""", (
        case_id, f"CASE-{case_id}", case_name, case_type, confidence, fraud_mxn,
        source, yr_s, yr_e, notes))
    conn.execute("""INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method, notes)
        VALUES (?,?,?,?,?,?)""", (
        case_id, vendor_id, vendor_name, ev_strength, "vendor_id_direct", vendor_notes))
    contracts = conn.execute(contract_sql).fetchall()
    for (cid,) in contracts:
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)", (case_id, cid))
    n = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_id,)).fetchone()[0]
    print(f"  Inserted case {case_id}: {case_name} ({n} contracts)")
    return case_id


def main():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    max_id = get_max_case_id(conn)
    print(f"Current max GT case ID: {max_id}")
    if max_id < 734:
        print(f"ERROR: Expected max_id >= 734. Got {max_id}")
        conn.close(); sys.exit(1)
    try:
        conn.execute("BEGIN")
        c1 = _insert_gt(conn, max_id + 1,
            "ETMN DA capture at Telecomunicaciones de Mexico",
            "direct_award_abuse", "medium", 202000000,
            "COMPRANET direct query vendor_id=36771", 2014, 2021,
            "100% DA rate (8/9 contracts). $202M at Telecomm via DA (2014-2017, risk=1.0). $42M at Financiera via DA (2019-2021). Acronym company (ETMN) no RFC.",
            36771, "ETMN, S.A. DE C.V.", "medium",
            "100% DA, $258M total at Telecomm and Financiera",
            "SELECT id FROM contracts WHERE vendor_id=36771")

        c2 = _insert_gt(conn, c1 + 1,
            "FINUTIL systematic single-bid across federal agencies",
            "bid_rigging", "medium", 496000000,
            "COMPRANET direct query vendor_id=177118", 2017, 2019,
            "63% SB rate across 84 contracts at 15+ agencies. Won uncontested tenders at BANJERCITO, ASA, CONALEP, CICESE, INSUS, AEFCM, FONATUR. Peak 2017-2019, collapsed after.",
            177118, "FINUTIL SA DE CV", "medium",
            "63% SB, $496M across 15+ institutions, collapsed after 2019",
            "SELECT id FROM contracts WHERE vendor_id=177118 AND contract_year BETWEEN 2017 AND 2019")

        c3 = _insert_gt(conn, c2 + 1,
            "NORTH AMERICAN SOFTWARE single-bid IT monopoly",
            "bid_rigging", "medium", 236000000,
            "COMPRANET direct query vendor_id=17515", 2005, 2013,
            "73% SB (8/11 contracts). Won uncontested IT tenders at CONAVI $78M, SFP $39M, FONATUR $50M, ProMexico $20M, FIRA $24M. SAPI structure unusual for IT.",
            17515, "NORTH AMERICAN SOFTWARE, S.A.P.I., DE C.V.", "medium",
            "73% SB, $236M. SAPI structure unusual for IT. Active 2005-2014.",
            "SELECT id FROM contracts WHERE vendor_id=17515 AND contract_year BETWEEN 2005 AND 2013")

        c4 = _insert_gt(conn, c3 + 1,
            "CUAR CONSTRUCTORES systematic bid-rigging infrastructure",
            "bid_rigging", "high", 2351000000,
            "COMPRANET direct query vendor_id=32905", 2007, 2024,
            "98% SB (40/41 contracts). 100% SB every year 2007-2021. $1.1B at SCT, $634M Tlaxcala, $314M SICT. 17 years uncontested. $2.35B total.",
            32905, "CUAR CONSTRUCTORES ASOCIADOS SA DE CV", "high",
            "98% SB, $2.35B. 100% SB at SCT/Tlaxcala for 17 years.",
            "SELECT id FROM contracts WHERE vendor_id=32905")

        # Update aria_queue
        for vid in [36771, 177118, 17515, 32905]:
            conn.execute("UPDATE aria_queue SET in_ground_truth=1, review_status=? WHERE vendor_id=?", ("confirmed", vid))
        for vid in [33179, 19304, 45616, 60693]:
            conn.execute("UPDATE aria_queue SET review_status=? WHERE vendor_id=?", ("reviewed_skip", vid))
        conn.execute("COMMIT")
        total = conn.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
        vendors = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
        gt_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
        print(f"\nGT totals: {total} cases | {vendors} vendors | {gt_c} GT contracts")
        print(f"Cases added: {max_id+1}-{c4}")
    except Exception as e:
        conn.execute("ROLLBACK")
        print(f"ERROR: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
