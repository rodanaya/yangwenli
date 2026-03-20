#!/usr/bin/env python3
"""
GT Mining Batch VVV -- SCT Infrastructure Single-Bid Capture Ring (4 vendors)

Investigated 2026-03-20:
  v10051   TERRACERIAS, PAVIMENTOS Y CAMINOS S.A. DE C.V.   -> ADD  (SCT 83.5%, SB 91.7%, 2.36B, 2002-2022)
  v3214    INGENIEROS Y EQUIPOS MECANICOS S.A. DE C.V.      -> ADD  (SCT 61.2%, SB 92.9%, 2.26B, 2002-2025)
  v9655    CONSTRUCTORA MOOL S.A. DE C.V.                   -> ADD  (SCT 77.3%, SB 92.0%, 1.98B, 2002-2020)
  v8175    RAGER DE TABASCO, S.A DE C.V.                    -> ADD  (SCT 68.5%, SB 100%, 2.05B, 2002-2015)

Cases added: 4  |  Vendors skipped: 0
Total estimated fraud: 8.65B MXN | 336 contracts
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


GT_CASES_SQL = (
    "INSERT OR IGNORE INTO ground_truth_cases"
    " (id, case_id, case_name, case_type, year_start, year_end,"
    " confidence_level, estimated_fraud_mxn, notes)"
    " VALUES (?,?,?,?,?,?,?,?,?)"
)

GT_VENDORS_SQL = (
    "INSERT OR IGNORE INTO ground_truth_vendors"
    " (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)"
    " VALUES (?,?,?,?,?)"
)

GT_CONTRACTS_SQL = (
    "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id)"
    " SELECT ?, id FROM contracts WHERE vendor_id = ?"
)

ARIA_SQL = (
    "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed'"
    " WHERE vendor_id = ?"
)


CASES = [
    # (vendor_id, case_name, year_start, year_end, estimated_fraud, vendor_name_source, notes)
    (10051,
     "SCT Pavimentos y Caminos Capture",
     2002, 2022, 2360000000,
     "TERRACERIAS, PAVIMENTOS Y CAMINOS S.A. DE C.V.",
     "Single-bidder at SCT over 20-year window; 91.7 pct single-bid rate"
     " on 109 highway contracts; 83.5 pct concentration at SCT (1.94B MXN)"),
    (3214,
     "SCT Ingenieros y Equipos Capture",
     2002, 2025, 2260000000,
     "INGENIEROS Y EQUIPOS MECANICOS S.A. DE C.V.",
     "Single-bidder at SCT over 23-year window; 92.9 pct single-bid rate"
     " on 98 contracts; 61.2 pct concentration at SCT (1.18B MXN); still active 2025"),
    (9655,
     "SCT Mool Yucatan Capture",
     2002, 2020, 1978000000,
     "CONSTRUCTORA MOOL S.A. DE C.V.",
     "Single-bidder at SCT Yucatan over 18-year window; 92.0 pct single-bid rate"
     " on 75 contracts; 77.3 pct concentration at SCT (1.82B MXN); 0 pct direct awards"),
    (8175,
     "SCT Rager Tabasco Capture",
     2002, 2015, 2050000000,
     "RAGER DE TABASCO, S.A DE C.V.",
     "100 pct single-bidder at SCT Tabasco over 13-year window; all 54 contracts"
     " single-bid; 68.5 pct concentration at SCT (1.88B MXN); zero competitive contracts"),
]


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 893:
        print("ERROR: max_id=" + str(max_id) + ", expected >= 893. Aborting.")
        conn.close()
        return

    c0 = max_id + 1
    print("Max GT case id: " + str(max_id))
    print("Inserting cases " + str(c0) + " through " + str(c0 + 3))
    print()

    for i, (vid, cname, y1, y2, fraud, vname, notes) in enumerate(CASES):
        cid = c0 + i
        case_id_str = "CASE-" + str(cid)

        conn.execute(GT_CASES_SQL, (
            cid, case_id_str, cname, "single_bid_capture",
            y1, y2, "high", fraud, notes
        ))

        conn.execute(GT_VENDORS_SQL, (
            cid, vid, vname, "strong", "vendor_id"
        ))

        conn.execute(GT_CONTRACTS_SQL, (cid, vid))
        conn.execute(ARIA_SQL, (vid,))

        n = conn.execute(
            "SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id = ?", (cid,)
        ).fetchone()[0]
        print("Case " + str(cid) + " (v" + str(vid) + "): " + cname + " - CONFIRMED (" + str(n) + " contracts)")

    conn.commit()
    print()
    print("=" * 70)
    print("COMMIT SUCCESSFUL")
    print("=" * 70)
    print("Cases inserted: " + str(c0) + " through " + str(c0 + 3) + " (4 total)")
    print("Vendors confirmed: 10051, 3214, 9655, 8175")
    print("Total contracts added: 336 (109 + 98 + 75 + 54)")
    print("Total estimated fraud: 8.65B MXN")
    print("Pattern: SCT infrastructure single-bid capture ring")
    conn.close()


if __name__ == "__main__":
    main()
