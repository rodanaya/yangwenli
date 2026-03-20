"""
Batch W (T3 investigation): 3 new GT cases from ARIA T3 queue scan.

Investigated 4 vendors, 3 added, 1 skipped:

ADDED:
  Case max+1 (medium) - MAQUINARIA INTERCONTINENTAL SA DE CV (1008)
  Case max+2 (medium) - PUNTO PEN (61828)
  Case max+3 (medium) - SERVICIOS TRONCALIZADOS SA DE CV (14489)

SKIPPED:
  - CONSTRUCCIONES E INSTALACIONES MODERNAS (4253): no concentration.

Guard: max_id >= 787. Run: python scripts/_aria_cases_batch_W.py
"""

import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "RUBLI_NORMALIZED.db"


SKIP_VENDORS = [{'vendor_id': 1008, 'reason': 'SKIP: Legitimate heavy machinery supplier. 145 contracts across PEMEX/CONAGUA/CFE/CAPUFE. 10% DA, 48% SB = specialized equipment niche.'}]


CASES = [{'case_name': 'SEGOB construccion DA saturation + multi-institution single-bid', 'case_type': 'single_bid_capture', 'year_start': 2002, 'year_end': 2018, 'confidence_level': 'medium', 'estimated_fraud_mxn': 847000000, 'source_news': 'ARIA T3 -- 53% DA, 47% SB, 6 DA contracts at SEGOB 2011 (324M)', 'notes': 'Construction company: DA at SEGOB in 2011, SB wins at 7 other institutions. 15 contracts avg 56M.', 'vendors': [{'vendor_id': 4253, 'name': 'CONSTRUCCIONES E INSTALACIONES MODERNAS, S.A. DE C.V.', 'strength': 'medium'}]}, {'case_name': 'PUNTO PEN single-bid capture at financial/military institutions', 'case_type': 'single_bid_capture', 'year_start': 2011, 'year_end': 2024, 'confidence_level': 'medium', 'estimated_fraud_mxn': 734000000, 'source_news': 'ARIA T3 -- 55% DA, 45% SB, 448M at BANJERCITO via SB, 180M at CNBV, 101M at FONATUR', 'notes': 'PUNTO PEN: massive SB contracts at BANJERCITO (448M), CNBV, FONATUR. 11 contracts, 734M total. Sector mismatch.', 'vendors': [{'vendor_id': 61828, 'name': 'PUNTO PEN', 'strength': 'medium'}]}, {'case_name': 'CFE trunked radio institutional capture', 'case_type': 'institutional_capture', 'year_start': 2003, 'year_end': 2025, 'confidence_level': 'medium', 'estimated_fraud_mxn': 420000000, 'source_news': 'ARIA T3 -- 93% of 453M at CFE, SB=57.7%, peak 220M in 2014', 'notes': 'Trunked radio 93% at CFE over 22 years. SB=57.7%. Peaks 2010 (144M) and 2014 (220M). Also IMSS 22M 80% SB.', 'vendors': [{'vendor_id': 14489, 'name': 'SERVICIOS TRONCALIZADOS, S.A. DE C.V.', 'strength': 'medium'}]}]


def main():
    conn = sqlite3.connect(str(DB))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] or 0
    print(f"Current max GT case ID: {max_id}")
    if max_id < 787:
        print(f"ERROR: Expected max_id >= 780, got {max_id}. Aborting.")
        conn.close()
        sys.exit(1)

    next_id = max_id + 1
    n_cases = len(CASES)
    print(f"Will insert cases {next_id} to {next_id + n_cases - 1}")

    # --- Insert cases ---
    inserted_cases = 0
    for c in CASES:
        cid = next_id + c["offset"]
        case_id_str = f"CASE-{cid}"
        cur = conn.execute(
            """INSERT OR IGNORE INTO ground_truth_cases
               (id, case_id, case_name, case_type, confidence_level,
                source_news, notes, estimated_fraud_mxn, year_start, year_end)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
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
    for c in CASES:
        cid = next_id + c["offset"]
        for v in c["vendors"]:
            vendor_name = conn.execute(
                "SELECT name FROM vendors WHERE id=?", (v["vendor_id"],)
            ).fetchone()[0]
            cur = conn.execute(
                """INSERT OR IGNORE INTO ground_truth_vendors
                   (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
                   VALUES (?, ?, ?, ?, ?)""",
                (cid, v["vendor_id"], vendor_name,
                 v["evidence_strength"], v["match_method"])
            )
            if cur.rowcount > 0:
                inserted_vendors += 1
                print(f"    Vendor {v['vendor_id']} linked to case {cid}")

    # --- Tag ground_truth_contracts ---
    tagged = 0
    for c in CASES:
        cid = next_id + c["offset"]
        for v in c["vendors"]:
            rows = conn.execute(
                """SELECT id FROM contracts WHERE vendor_id = ?
                   AND contract_year >= ? AND contract_year <= ?""",
                (v["vendor_id"], c["year_start"], c["year_end"])
            ).fetchall()
            for (contract_id,) in rows:
                conn.execute(
                    "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                    (cid, contract_id)
                )
            tagged += len(rows)
            print(f"    Tagged {len(rows)} contracts for vendor {v['vendor_id']} ({c['year_start']}-{c['year_end']})")

    # --- Update aria_queue for all investigated vendors ---
    added_vendor_ids = {1008, 61828, 14489}
    all_vendor_ids = [4253, 1008, 61828, 14489]

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
                (s["reason"] for s in SKIP_VENDORS if s["vendor_id"] == vid),
                "Insufficient evidence"
            )
            conn.execute(
                "UPDATE aria_queue SET review_status = 'dismissed', "
                "reviewer_notes = ? WHERE vendor_id = ?",
                (f"Batch U skip: {reason[:500]}", vid)
            )
            print(f"  aria_queue: vendor {vid} -> dismissed")

    conn.commit()
    n_added = len(added_vendor_ids)
    n_skip = len(all_vendor_ids) - n_added
    print()
    print(f"Done: {inserted_cases} cases, {inserted_vendors} vendors, {tagged} contracts tagged")
    print(f"aria_queue: {len(all_vendor_ids)} vendors ({n_added} confirmed, {n_skip} dismissed)")
    conn.close()


if __name__ == "__main__":
    main()
