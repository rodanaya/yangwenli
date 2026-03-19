"""
ARIA Cases Batch C: March 19 2026 GT mining session.
3 cases added, 5 vendors skipped. Reads _batch_C_data.json.
Run: cd backend && python scripts/_aria_cases_batch_C.py
"""
import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3, json
from pathlib import Path

DB = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
DATA = Path(__file__).parent / "_batch_C_data.json"

conn = sqlite3.connect(str(DB), timeout=60)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA busy_timeout=60000")

with open(DATA, "r", encoding="utf-8") as f:
    payload = json.load(f)

row = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()
next_id = (row[0] or 0) + 1
print(f"Starting at case ID {next_id}")

cases_added = 0
for i, case in enumerate(payload["cases"]):
    cid = next_id + i
    conn.execute("""INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level, estimated_fraud_mxn,
         source_news, year_start, year_end, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""", (
        cid, f'CASE-{cid}', case["case_name"], case["case_type"], case["confidence_level"],
        case["estimated_fraud_mxn"], case["source_news"],
        case["year_start"], case["year_end"], case["notes"]
    ))
    for v in case["vendors"]:
        conn.execute("""INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method, notes)
            VALUES (?,?,?,?,?,?)""", (
            cid, v["vendor_id"], v["vendor_name_source"],
            v["evidence_strength"], v["match_method"], v["notes"]
        ))
        conn.execute("UPDATE aria_queue SET in_ground_truth=1, review_status=? WHERE vendor_id=?",
                     ("confirmed", v["vendor_id"]))
    for contract_id in case.get("contract_ids", []):
        conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                     (cid, contract_id))
    cases_added += 1
    cn = case["case_name"]
    nc = len(case.get("contract_ids", []))
    print(f"  Case {cid}: {cn} - {nc} contracts")

for s in payload.get("skipped", []):
    conn.execute("UPDATE aria_queue SET review_status=?, reviewer_notes=? WHERE vendor_id=?",
                 ("needs_review", s["note"], s["vendor_id"]))

conn.commit()
conn.close()
print(f"Done. {cases_added} cases added (IDs {next_id}-{next_id + cases_added - 1}). 5 skipped.")
