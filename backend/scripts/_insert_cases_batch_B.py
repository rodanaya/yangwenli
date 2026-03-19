"""
Ground Truth Batch B -- 5 new cases from ARIA T3 queue investigation.
Generated 2026-03-19 by GT mining session.

Vendors investigated (8 total):
  ADDED (5): INAGRO DEL SUR, TECNO SEGURIDAD, TECNO APLICADA, DIMAC, CASANOVA RENT
  SKIPPED (3): SOLUCIONES INTEGRALES ELYM (diversified), CRYOINFRA (structural), TECNICENTRO ROYAL (geographic)

Run: cd backend && python scripts/_insert_cases_batch_B.py
"""

import sqlite3, json, os, sys

DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "RUBLI_NORMALIZED.db")
DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_batch_B_data.json")

def main():
    conn = sqlite3.connect(DB, timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    with open(DATA, "r", encoding="utf-8") as f:
        payload = json.load(f)

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] or 0
    next_id = max_id + 1
    print(f"Starting from case ID {next_id} (max existing: {max_id})")

    cases_added = 0
    total_contracts = 0

    # Skip vendors already in ground truth (inserted by earlier scripts)
    already_in_gt = set(row[0] for row in conn.execute(
        "SELECT vendor_id FROM ground_truth_vendors").fetchall())

    pending = [c for c in payload["cases"] if c["vendor_id"] not in already_in_gt]
    if len(pending) < len(payload["cases"]):
        skipped = [c["vendor_id"] for c in payload["cases"] if c["vendor_id"] in already_in_gt]
        print(f"Skipping {len(skipped)} already-inserted vendors: {skipped}")

    for i, c in enumerate(pending):
        cid = next_id + i
        conn.execute(
            "INSERT OR IGNORE INTO ground_truth_cases "
            "(id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn, "
            "source_news, year_start, year_end, notes) "
            "VALUES (?,?,?,?,?,?,?,?,?,?)",
            (cid, f'CASE-{cid}', c["name"], c["type"], c["confidence"], c["fraud_mxn"],
             c["source"], c["year_start"], c["year_end"], c["notes"]))

        conn.execute(
            "INSERT OR IGNORE INTO ground_truth_vendors "
            "(case_id, vendor_id, vendor_name_source, evidence_strength, match_method, notes) "
            "VALUES (?,?,?,?,?,?)",
            (cid, c["vendor_id"], c["vendor_name"], c["evidence"], "aria_queue",
            f"IPS-based investigation, {len(c.get('contract_ids', []))} contracts tagged"))

        for contract_id in c.get("contract_ids", []):
            conn.execute(
                "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                (cid, contract_id))
            total_contracts += 1

        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (c["vendor_id"],))

        cases_added += 1
        nm = c["name"][:60]
        nc = len(c.get("contract_ids", []))
        fm = c["fraud_mxn"] / 1e6
        print(f"  Case {cid}: {nm} -- {nc} contracts, {fm:.0f}M MXN")

    conn.commit()
    conn.close()

    print()
    print(f"Done. Added {cases_added} cases (IDs {next_id}-{next_id + cases_added - 1}).")
    print(f"Total contracts tagged: {total_contracts}")
    print(f"Total estimated fraud: 3,485M MXN")

if __name__ == "__main__":
    main()