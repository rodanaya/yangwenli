"""
ARIA Cases Batch P: 2 T3 vendors from ARIA queue investigation (Mar 20 2026).

Investigated 4 vendors, added 2, skipped 2:
  ADD: 108982 (GRUPO CORPORATIVO URBIS) — port infrastructure SB+DA capture at API Veracruz/SCT, 1.98B
  ADD: 50171 (GROBSON S DE RL) — CONAGUA water infrastructure capture, 1.3B from small regional firm
  SKIP: 37961 (PLACAS DE LAMINA Y CALCOMANIAS OFICIALES) — structural near-monopoly in license plate manufacturing
  SKIP: 241327 (CONSTRUCTORA URBANIQ) — only 2 contracts, below 3-contract minimum threshold

Dynamic IDs from max_id+1. Run from backend/ directory.
DO NOT EXECUTE until DB is free (check ACTIVE_WORK.md).
"""
import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3
import json
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "RUBLI_NORMALIZED.db"
DATA = Path(__file__).resolve().parent / "_batch_P_data.json"

# Vendors investigated but skipped (update aria_queue only)
SKIPPED_VENDORS = {
    37961: "SKIP: Structural near-monopoly — license plate/calcomanias manufacturer. 90% SB reflects specialized manufacturing certification barrier, not procurement capture. Similar to patent-protected pharma.",
    241327: "SKIP: Insufficient evidence — only 2 contracts total (Puebla 252M, CDMX 40M). Below 3-contract minimum threshold for GT case. RFC created 2016, 3 years before first contract.",
}


def run():
    conn = sqlite3.connect(str(DB))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    with open(DATA, "r", encoding="utf-8") as f:
        CASES = json.load(f)

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"Current max GT case ID: {max_id}")
    if max_id < 775:
        print(f"ERROR: Expected max_id >= 775, got {max_id}. Aborting.")
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
            WHERE vendor_id = ?
              AND contract_year >= ?
              AND contract_year <= ?""",
            (c["vendor_id"], c["year_start"], c["year_end"])
        ).fetchall()

        for (cid,) in contract_ids:
            conn.execute(
                "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?, ?)",
                (case_id, cid)
            )

        tagged_total += len(contract_ids)
        cn = c["case_name"][:60]
        vid = c["vendor_id"]
        nc = len(contract_ids)
        print(f"  Case {case_id}: {cn} -- vendor={vid}, {nc} contracts tagged")

    # Update aria_queue for added vendors
    added_vendor_ids = [c["vendor_id"] for c in CASES]
    for vid in added_vendor_ids:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed_corrupt' WHERE vendor_id=?",
            (vid,)
        )

    # Update aria_queue for skipped vendors (mark reviewed but not GT)
    for vid, reason in SKIPPED_VENDORS.items():
        conn.execute(
            "UPDATE aria_queue SET review_status='reviewed_clean', reviewer_notes=? WHERE vendor_id=?",
            (reason, vid)
        )

    conn.commit()

    # Verify
    new_max = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    total_cases = conn.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
    total_vendors = conn.execute(
        "SELECT COUNT(DISTINCT vendor_id) FROM ground_truth_vendors WHERE vendor_id IS NOT NULL"
    ).fetchone()[0]
    conn.close()

    n = len(CASES)
    last = next_id + n - 1
    print()
    print("Batch P complete:")
    print(f"  Cases added: {n} (IDs {next_id}-{last})")
    print(f"  Contracts tagged: {tagged_total}")
    print(f"  Skipped vendors (reviewed_clean): {list(SKIPPED_VENDORS.keys())}")
    print(f"  Total GT cases now: {total_cases}")
    print(f"  Total GT vendors now: {total_vendors}")
    print(f"  New max case ID: {new_max}")
    print(f"  aria_queue updated for added vendors: {added_vendor_ids}")


if __name__ == "__main__":
    run()
