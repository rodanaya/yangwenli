"""
Batch N: 18 new GT cases from Tier 1-2 ARIA queue scan.
Patterns: IMSS/ISSSTE pharma capture, PEMEX industry mismatch, SEMAR monopoly,
new medical shells, CONAGUA infrastructure, Guardia Nacional capture.
DO NOT EXECUTE until DB is free (no Optuna/scoring in progress).
"""
import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3
import json
from pathlib import Path

DB = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
DATA = Path(__file__).parent / "_batch_N_data.json"

conn = sqlite3.connect(str(DB))
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA busy_timeout=60000")

with open(DATA, "r", encoding="utf-8") as f:
    cases_data = json.load(f)

# Insert cases
for c in cases_data:
    conn.execute(
        """INSERT OR REPLACE INTO ground_truth_cases
        (case_id, case_name, case_type, confidence_level, sector, notes, estimated_fraud_mxn, year_start, year_end)
        VALUES (?,?,?,?,?,?,?,?,?)""",
        (c["cid"], c["name"], c["type"], c["conf"], c["sector"], c["notes"],
         c["fraud"], c["ys"], c["ye"])
    )

# Insert vendors
for c in cases_data:
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)""",
        (c["cid"], c["vid"], c["vname"], c["ev"], "aria_queue")
    )

# Tag contracts
tagged = 0
for c in cases_data:
    rows = conn.execute("SELECT id FROM contracts WHERE vendor_id = ?", (c["vid"],)).fetchall()
    for row in rows:
        conn.execute(
            "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?, ?)",
            (c["cid"], row[0])
        )
        tagged += 1

# Sync aria_queue
for c in cases_data:
    conn.execute(
        "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed_corrupt' WHERE vendor_id=?",
        (c["vid"],)
    )

conn.commit()
conn.close()

print(f"Batch N: Inserted {len(cases_data)} cases, {len(cases_data)} vendors, tagged {tagged} contracts")
