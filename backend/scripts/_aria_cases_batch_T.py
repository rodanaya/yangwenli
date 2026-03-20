# -*- coding: utf-8 -*-
"""Batch T: ARIA T3 investigation - cases 781-783. Guard: max_id < 780."""
import sys, sqlite3, json
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
DB = Path(__file__).resolve().parent.parent / "RUBLI_NORMALIZED.db"
DATA = Path(__file__).resolve().parent / "_batch_T_data.json"

def main():
    conn = sqlite3.connect(str(DB))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")
    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 780:
        print(f"ERROR: max GT case id = {max_id}, expected >= 780. Aborting.")
        conn.close(); return

    cases = json.loads(DATA.read_text(encoding="utf-8"))
    for c in cases:
        conn.execute(
            """INSERT OR IGNORE INTO ground_truth_cases
            (id, case_id, case_name, case_type, year_start, year_end,
             confidence_level, estimated_fraud_mxn, source_news, notes)
            VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (c["id"], c["case_id"], c["case_name"], c["case_type"],
             c["year_start"], c["year_end"], c["confidence_level"],
             c["estimated_fraud_mxn"], c["source_news"], c["notes"]))
    for c in cases:
        conn.execute(
            """INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?,?,?,?,?)""",
            (c["id"], c["vendor_id"], c["vendor_name"],
             c["evidence_strength"], c["match_method"]))
    tagged = 0
    for c in cases:
        yr_col = "CAST(strftime('%Y', contract_date) AS INTEGER)"
        rows = conn.execute(
            f"SELECT id FROM contracts WHERE vendor_id=? AND {yr_col} BETWEEN ? AND ?",
            (c["vendor_id"], c["year_start"], c["year_end"])).fetchall()
        for row in rows:
            conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                         (c["id"], row[0]))
            tagged += 1
    for c in cases:
        conn.execute("UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed_corrupt' WHERE vendor_id=?",
                     (c["vendor_id"],))
    # BECESA (54074): competitive IMSS supplier - cleared
    conn.execute("UPDATE aria_queue SET review_status='cleared' WHERE vendor_id=54074 AND review_status='pending'")
    # ROCHE DC (252030): structural FP - patented pharma
    conn.execute("UPDATE aria_queue SET fp_structural_monopoly=1, review_status='structural_fp' WHERE vendor_id=252030 AND review_status='pending'")
    conn.commit()
    nm = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    tc = conn.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
    tv = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    print(f"Batch T complete:")
    print(f"  Cases: 781-783 inserted (max_id now {nm}, total {tc})")
    print(f"  Vendors: 3 added (total {tv})")
    print(f"  Contracts tagged: {tagged} (windowed)")
    print(f"  Skipped: BECESA (54074) -> cleared, ROCHE DC (252030) -> structural_fp")
    conn.close()

if __name__ == "__main__":
    main()