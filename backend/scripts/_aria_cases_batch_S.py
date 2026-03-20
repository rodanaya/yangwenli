"""
Batch S (T3 investigation): 2 new GT cases from ARIA T3 queue scan.

Investigated 4 vendors, 2 added, 2 skipped.

ADDED:
  Case max+1 (medium) - CONSTRUCTORA EUNICE SA DE CV (10319)
      721M road construction, 100% SB at SCT across 17 years. 46 contracts.
  Case max+2 (medium) - NC REMODELACIONES Y COMERCIALIZADORA SA DE CV (135804)
      407M at IMSS. Desert manipulation: 400M hospital contract in 2024.

SKIPPED:
  - SERVICIO INDUSTRIAL ESPECIALIZADO (8098): Only 2 contracts (min 3).
  - EDVAG CONCEPTOS COMERCIALES (44168): Legitimate furniture supplier.

Guard: max_id must be >= 780.
"""
import sys
sys.stdout.reconfigure(encoding="utf-8")
import json
import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "RUBLI_NORMALIZED.db"
DATA = Path(__file__).resolve().parent / "_batch_S_data.json"


def main():
    conn = sqlite3.connect(str(DB))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] or 0
    print(f"Current max GT case ID: {max_id}")
    if max_id < 780:
        print(f"ERROR: Expected max_id >= 780, got {max_id}. Aborting.")
        conn.close()
        sys.exit(1)

    with open(DATA, "r", encoding="utf-8") as f:
        data = json.load(f)

    next_id = max_id + 1
    n_cases = len(data["cases"])
    print(f"Will insert cases {next_id} to {next_id + n_cases - 1}")

    # --- Insert cases ---
    inserted_cases = 0
    for i, c in enumerate(data["cases"]):
        cid = next_id + i
        case_id_str = f"CASE-{cid}"
        source = f"ARIA T3 investigation -- sector: {c['sector']}"
        cur = conn.execute(
            """INSERT OR IGNORE INTO ground_truth_cases
               (id, case_id, case_name, case_type, confidence_level,
                source_news, notes, estimated_fraud_mxn, year_start, year_end)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (cid, case_id_str, c["case_name"], c["case_type"],
             c["confidence_level"], source,
             c["notes"], c["estimated_fraud_mxn"], c["year_start"], c["year_end"])
        )
        if cur.rowcount > 0:
            inserted_cases += 1
            print(f"  Inserted case {cid}: {c['case_name']}")
        else:
            print(f"  Skipped case {cid} (already exists)")

    # --- Insert vendors ---
    inserted_vendors = 0
    for i, c in enumerate(data["cases"]):
        cid = next_id + i
        vid = c["vendor_id"]
        vendor_name = conn.execute(
            "SELECT name FROM vendors WHERE id=?", (vid,)
        ).fetchone()[0]
        cur = conn.execute(
            """INSERT OR IGNORE INTO ground_truth_vendors
               (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
               VALUES (?, ?, ?, ?, ?)""",
            (cid, vid, vendor_name, c["evidence_strength"], "aria_queue_t3")
        )
        if cur.rowcount > 0:
            inserted_vendors += 1
            print(f"    Vendor {vid} linked to case {cid}")

    # --- Tag ground_truth_contracts ---
    tagged = 0
    for i, c in enumerate(data["cases"]):
        cid = next_id + i
        vid = c["vendor_id"]
        rows = conn.execute(
            """SELECT id FROM contracts WHERE vendor_id = ?
               AND contract_year >= ? AND contract_year <= ?""",
            (vid, c["year_start"], c["year_end"])
        ).fetchall()
        for (contract_id,) in rows:
            conn.execute(
                "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                (cid, contract_id)
            )
        tagged += len(rows)
        yr_range = f"{c['year_start']}-{c['year_end']}"
        print(f"    Tagged {len(rows)} contracts for vendor {vid} ({yr_range})")

    # --- Update aria_queue ---
    added_vids = {c["vendor_id"] for c in data["cases"]}
    for vid in added_vids:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth = 1, "
            "review_status = 'confirmed' WHERE vendor_id = ?",
            (vid,)
        )
        print(f"  aria_queue: vendor {vid} -> in_ground_truth=1, confirmed")

    for s in data["skips"]:
        reason_trunc = s["reason"][:500]
        note = f"Batch S skip: {reason_trunc}"
        conn.execute(
            """UPDATE aria_queue
               SET review_status = 'reviewed',
                   reviewer_notes = ?
               WHERE vendor_id = ?""",
            (note, s["vendor_id"]),
        )
        print(f"  aria_queue: vendor {s['vendor_id']} -> reviewed (skipped)")

    conn.commit()
    n_skip = len(data["skips"])
    n_added = len(added_vids)
    print()
    print(f"Done: {inserted_cases} cases, {inserted_vendors} vendors, {tagged} contracts tagged")
    print(f"aria_queue: {n_added + n_skip} vendors ({n_added} confirmed, {n_skip} dismissed)")
    conn.close()


if __name__ == "__main__":
    main()
