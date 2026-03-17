"""
ARIA Investigation Batch A: 3 high-priority vendors.
Cases 393-395. DO NOT EXECUTE until DB is free.
"""
import sys, json, sqlite3
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
DB = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
DATA = Path(__file__).parent / "_batch_A_data.json"

with open(DATA, "r", encoding="utf-8") as f:
    data = json.load(f)

conn = sqlite3.connect(str(DB))
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA busy_timeout=60000")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
print(f"Current max GT case ID: {max_id}")
next_id = max_id + 1

# Insert cases and primary vendors
for c in data["cases"]:
    cid = next_id + c["id_offset"]
    conn.execute(
        "INSERT OR REPLACE INTO ground_truth_cases "
        "(id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end) "
        "VALUES (?,?,?,?,?,?,?,?,?)",
        (cid, c["case_id"], c["case_name"], c["case_type"], c["confidence_level"],
         c["notes"], c["estimated_fraud_mxn"], c["year_start"], c["year_end"])
    )
    print(f"  Case {cid}: {c['case_id']}")
    conn.execute(
        "INSERT OR IGNORE INTO ground_truth_vendors "
        "(case_id, vendor_id, vendor_name_source, evidence_strength, match_method) "
        "VALUES (?,?,?,?,?)",
        (cid, c["vendor_id"], c["vendor_name"], c["evidence_strength"], "aria_investigation")
    )

# Add ICA Fluor Daniel as secondary vendor
ica_case_id = next_id + 1
conn.execute(
    "INSERT OR IGNORE INTO ground_truth_vendors "
    "(case_id, vendor_id, vendor_name_source, evidence_strength, match_method, notes) "
    "VALUES (?,?,?,?,?,?)",
    (ica_case_id, 9045, "ICA FLUOR DANIEL S. DE R.L. DE C.V.", "medium",
     "aria_investigation", "ICA group partner at NAICM. 2 contracts, 7.9B MXN, both single-bid.")
)
print("    + Related: ICA Fluor Daniel (vid=9045)")

# Tag contracts
tagged = 0
for c in data["cases"]:
    cid = next_id + c["id_offset"]
    rows = conn.execute("SELECT id FROM contracts WHERE vendor_id = ?", (c["vendor_id"],)).fetchall()
    for row in rows:
        conn.execute(
            "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?, ?)",
            (cid, row[0])
        )
        tagged += 1

# Tag ICA Fluor GACM contracts
for row in conn.execute("SELECT id FROM contracts WHERE vendor_id = 9045 AND institution_id = 2682").fetchall():
    conn.execute(
        "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?, ?)",
        (ica_case_id, row[0])
    )
    tagged += 1
print(f"Tagged {tagged} contracts total")

# Update ARIA queue memos
for vid_str, memo in data["memos"].items():
    vid = int(vid_str)
    conn.execute("UPDATE aria_queue SET memo_text=?, review_status='needs_review' WHERE vendor_id=?", (memo, vid))

# Mark in_ground_truth
for c in data["cases"]:
    conn.execute("UPDATE aria_queue SET in_ground_truth=1 WHERE vendor_id=?", (c["vendor_id"],))

conn.commit()
print("Done. All cases inserted and memos updated.")
conn.close()
