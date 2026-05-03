"""
GT Batch H: 2 new ground truth cases from ARIA T2/T3 queue mining.
Patterns: post-2021 outsourcing-reform sector mismatch (S.C. environmental
firm doing personnel leasing), institutional capture at IMP for vehicle
leasing with 7.5x price escalation.

Investigation date: 2026-05-03
Source: ARIA queue T2/T3, vendors NOT yet in ground_truth_cases

Investigated 5 vendors (2402, 22384, 90457, 150209, 43245) — confirmed 2.
Skipped:
  - 2402 QUIMAE: legitimate industrial chemicals supplier to CFE (0pct DA, all LP).
  - 22384 CORPORATIVO SALTILLENSE: 1.95B SCT contract for "4 guards 24h" almost
    certainly decimal-shift data error (source structure A 2007). Skipping to
    avoid teaching the model that data errors are corruption.
  - 43245 FORMAS EFICIENTES: market-incumbent office supplier; AEFCM 100pct DA
    is framework-contract micro-orders (~$8k each), not capture.

DO NOT EXECUTE until DB is free (no scoring/Optuna in progress).
Run _session_startup.py after execution to sync flags.
"""
import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3
import json
from pathlib import Path

DB = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
DATA = Path(__file__).parent / "_batch_H_data.json"

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
        (c["id"], c["vendor_id"], c["vendor_name"], ev, "aria_queue_t2_t3", c["notes"][:200])
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

print(f"GT Batch H complete:")
print(f"  Cases inserted: {inserted_cases}")
print(f"  Vendors inserted: {inserted_vendors}")
print(f"  Contracts tagged: {tagged_contracts}")
print(f"  Cases: 1409-1410 (2 cases)")
print(f"  Run _session_startup.py to sync in_ground_truth flags.")
