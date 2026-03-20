"""
ARIA Cases Batch M: 4 T3 vendors from ARIA queue investigation (Mar 20 2026).

Vendors investigated:
  1. ARRENTRAC (16446) — 100% single-bid infrastructure, SCT/Jalisco. medium.
  2. DRAGAMEX (81700) — dredging, 67% SB across port authorities. medium.
  3. SERVISAN (4679) — health services, 79.5% SB at ISSSTE, 52.2% SB at INCan. medium.
  4. MESALUD (31018) — medical supply, IMSS DA concentration (49.2% DA vs 2.7% at ISSSTE). low.

Dynamic IDs from max_id+1. Run from backend/ directory.
DO NOT EXECUTE until DB is free (check ACTIVE_WORK.md).
"""
import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3
import json
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "RUBLI_NORMALIZED.db"
DATA = Path(__file__).resolve().parent / "_batch_M_data.json"


def run():
    conn = sqlite3.connect(str(DB))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    with open(DATA, "r", encoding="utf-8") as f:
        CASES = json.load(f)

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"Current max GT case ID: {max_id}")
    if max_id < 764:
        print(f"ERROR: Expected max_id >= 764, got {max_id}. Aborting.")
        conn.close()
        sys.exit(1)

    next_id = max_id + 1
    tagged_total = 0

    for i, c in enumerate(CASES):
        case_id = next_id + i
        case_id_str = f"CASE-{case_id}"

        # Insert case
        conn.execute(
            """INSERT OR IGNORE INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level, notes,
             estimated_fraud_mxn, year_start, year_end)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (case_id, case_id_str, c["case_name"], c["case_type"],
             c["confidence_level"], c["notes"], c["estimated_fraud_mxn"],
             c["year_start"], c["year_end"])
        )

        # Insert vendor (case_id in ground_truth_vendors is INTEGER)
        conn.execute(
            """INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?, ?, ?, ?, ?)""",
            (case_id, c["vendor_id"], c["vendor_name"],
             c["evidence_strength"], "aria_queue")
        )

        # Tag contracts within fraud year window only
        contract_ids = conn.execute(
            """SELECT id FROM contracts
            WHERE vendor_id = ? AND contract_year BETWEEN ? AND ?""",
            (c["vendor_id"], c["year_start"], c["year_end"])
        ).fetchall()

        if contract_ids:
            ids = [r[0] for r in contract_ids]
            for cid in ids:
                conn.execute(
                    "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                    (case_id, cid)
                )
            tagged_total += len(ids)
            print(f"  Case {case_id}: {c['case_name'][:60]}  — tagged {len(ids)} contracts")
        else:
            print(f"  Case {case_id}: {c['case_name'][:60]}  — WARNING: 0 contracts tagged")

        # Update aria_queue
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth = 1, review_status = 'gt_added' WHERE vendor_id = ?",
            (c["vendor_id"],)
        )

    conn.commit()
    print(f"\nDone. Inserted {len(CASES)} cases (IDs {next_id}-{next_id + len(CASES) - 1}), tagged {tagged_total} contracts.")

    # Verify
    new_max = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    total_gt = conn.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
    total_vendors = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    total_tagged = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
    print(f"Verification: max_id={new_max}, total_cases={total_gt}, total_vendors={total_vendors}, tagged_contracts={total_tagged}")

    conn.close()


if __name__ == "__main__":
    run()
