#!/usr/bin/env python3
# Batch V (T3 investigation): 3 new GT cases from ARIA T3 queue scan.
# Investigated 4 vendors, 3 added (197399, 2680, 20254), 1 skipped (88413).
# Guard: max_id must be >= 787.
# Run: python scripts/_aria_cases_batch_V.py

import sys
sys.stdout.reconfigure(encoding="utf-8")
import json
import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "RUBLI_NORMALIZED.db"
DATA = Path(__file__).resolve().parent / "_batch_V_data.json"


def main():
    with open(DATA, "r", encoding="utf-8") as f:
        data = json.load(f)

    cases = data["cases"]
    skip_vendors = data["skip_vendors"]

    conn = sqlite3.connect(str(DB))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] or 0
    print(f"Current max GT case ID: {max_id}")
    if max_id < 787:
        print(f"ERROR: Expected max_id >= 787, got {max_id}. Aborting.")
        conn.close()
        sys.exit(1)

    next_id = max_id + 1
    n_cases = len(cases)
    print(f"Will insert cases {next_id} to {next_id + n_cases - 1}")

    # --- Insert cases ---
    inserted_cases = 0
    for c in cases:
        cid = next_id + c["offset"]
        case_id_str = f"CASE-{cid}"
        cur = conn.execute(
            "INSERT OR IGNORE INTO ground_truth_cases"
            " (id, case_id, case_name, case_type, confidence_level,"
            "  source_news, notes, estimated_fraud_mxn, year_start, year_end)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (cid, case_id_str, c["case_name"], c["case_type"],
             c["confidence_level"], "ARIA T3 investigation",
             c["notes"], c["estimated_fraud_mxn"], c["year_start"], c["year_end"])
        )
        if cur.rowcount > 0:
            inserted_cases += 1
            print(f"  Inserted case {cid}: {c['case_name']}")
        else:
            print(f"  Skipped case {cid} (already exists)")

    # --- Insert vendors ---
    inserted_vendors = 0
    for c in cases:
        cid = next_id + c["offset"]
        for v in c["vendors"]:
            vendor_name = conn.execute(
                "SELECT name FROM vendors WHERE id=?", (v["vendor_id"],)
            ).fetchone()[0]
            cur = conn.execute(
                "INSERT OR IGNORE INTO ground_truth_vendors"
                " (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)"
                " VALUES (?, ?, ?, ?, ?)",
                (cid, v["vendor_id"], vendor_name,
                 v["evidence_strength"], v["match_method"])
            )
            if cur.rowcount > 0:
                inserted_vendors += 1
                print(f"    Vendor {v['vendor_id']} linked to case {cid}")

    # --- Tag ground_truth_contracts (windowed by year_start/year_end) ---
    tagged = 0
    for c in cases:
        cid = next_id + c["offset"]
        for v in c["vendors"]:
            rows = conn.execute(
                "SELECT id FROM contracts WHERE vendor_id = ?"
                " AND contract_year >= ? AND contract_year <= ?",
                (v["vendor_id"], c["year_start"], c["year_end"])
            ).fetchall()
            for (contract_id,) in rows:
                conn.execute(
                    "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                    (cid, contract_id)
                )
            tagged += len(rows)
            print(f"    Tagged {len(rows)} contracts for vendor {v['vendor_id']} ({c['year_start']}-{c['year_end']})")

    # --- Update aria_queue for ALL investigated vendors ---
    added_vendor_ids = set()
    for c in cases:
        for v in c["vendors"]:
            added_vendor_ids.add(v["vendor_id"])

    skip_vendor_ids = {s["vendor_id"] for s in skip_vendors}
    all_vendor_ids = list(added_vendor_ids | skip_vendor_ids)

    for vid in all_vendor_ids:
        if vid in added_vendor_ids:
            conn.execute(
                "UPDATE aria_queue SET in_ground_truth = 1, "
                "review_status = 'confirmed' WHERE vendor_id = ?",
                (vid,)
            )
            print(f"  aria_queue: vendor {vid} -> in_ground_truth=1, confirmed")
        else:
            reason = next(
                (s["reason"] for s in skip_vendors if s["vendor_id"] == vid),
                "Insufficient evidence"
            )
            conn.execute(
                "UPDATE aria_queue SET review_status = 'dismissed', "
                "reviewer_notes = ? WHERE vendor_id = ?",
                (f"Batch V skip: {reason[:500]}", vid)
            )
            print(f"  aria_queue: vendor {vid} -> dismissed")

    conn.commit()
    n_added = len(added_vendor_ids)
    n_skip = len(skip_vendor_ids)
    print()
    print(f"Done: {inserted_cases} cases, {inserted_vendors} vendors, {tagged} contracts tagged")
    print(f"aria_queue: {len(all_vendor_ids)} vendors ({n_added} confirmed, {n_skip} dismissed)")
    conn.close()


if __name__ == "__main__":
    main()
