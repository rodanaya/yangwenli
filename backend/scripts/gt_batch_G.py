"""
GT Batch G: 11 new ground truth cases from ARIA T3 queue mining.
Patterns: PEMEX intermediary, SCT/CAPUFE infrastructure capture,
school construction capture, disappeared intermediaries, sector mismatch.

Investigation date: 2026-03-27
Source: ARIA queue T3, IPS > 0.51, total_value > 200M MXN

DO NOT EXECUTE until DB is free (no scoring/Optuna in progress).
Run _session_startup.py after execution to sync flags.
"""
import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3
import json
from pathlib import Path

DB = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
DATA = Path(__file__).parent / "_batch_G_data.json"

conn = sqlite3.connect(str(DB))
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA busy_timeout=60000")

with open(DATA, "r", encoding="utf-8") as f:
    cases = json.load(f)

inserted_cases = 0
inserted_vendors = 0
tagged_contracts = 0

for c in cases:
    # Insert case
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, confidence_level,
         year_start, year_end, estimated_fraud_mxn, notes,
         fraud_institution_ids)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (c["id"], c["case_id"], c["case_name"], c["case_type"],
         c["confidence_level"], c["year_start"], c["year_end"],
         c["estimated_fraud_mxn"], c["notes"], c["fraud_institution_ids"])
    )
    if conn.execute("SELECT changes()").fetchone()[0] > 0:
        inserted_cases += 1

    # Insert vendor (case_id references integer id, NOT string case_id)
    ev = "medium" if c["confidence_level"] == "medium" else "strong"
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method, notes)
        VALUES (?,?,?,?,?,?)""",
        (c["id"], c["vendor_id"], c["vendor_name"], ev, "aria_queue_t3", c["notes"][:200])
    )
    if conn.execute("SELECT changes()").fetchone()[0] > 0:
        inserted_vendors += 1

    # Tag contracts within fraud year window
    rows = conn.execute(
        "SELECT id FROM contracts WHERE vendor_id = ? AND CAST(strftime('%Y', contract_date) AS INTEGER) BETWEEN ? AND ?",
        (c["vendor_id"], c["year_start"], c["year_end"])
    ).fetchall()
    for row in rows:
        conn.execute(
            "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?, ?)",
            (c["id"], row[0])
        )
        tagged_contracts += 1

    # Update aria_queue
    conn.execute(
        "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed_corrupt' WHERE vendor_id=?",
        (c["vendor_id"],)
    )

conn.commit()
conn.close()

print(f"GT Batch G complete:")
print(f"  Cases inserted: {inserted_cases}")
print(f"  Vendors inserted: {inserted_vendors}")
print(f"  Contracts tagged: {tagged_contracts}")
print(f"  Cases: 1371-1381 (11 cases)")
print(f"  Run _session_startup.py to sync in_ground_truth flags.")
