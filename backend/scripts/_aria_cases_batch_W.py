"""
Batch W (T3 investigation): 3 new GT cases from ARIA T3 queue scan.

Investigated 4 vendors, 3 added, 1 skipped:

ADDED:
  Case max+1 (medium) - MAQUINARIA INTERCONTINENTAL SA DE CV (1008)
      922M MXN at PEMEX, 52-71% single-bid rate at PEMEX EP/Gas/Refinacion.
  Case max+2 (medium) - PUNTO PEN (61828)
      734M MXN in 11 contracts. 448M SB at BANJERCITO (2021).
  Case max+3 (medium) - SERVICIOS TRONCALIZADOS SA DE CV (14489)
      420M MXN at CFE (93% of value), 57.7% SB, 2010-2017.

SKIPPED:
  - CONSTRUCCIONES E INSTALACIONES MODERNAS (4253): 15 contracts,
    no institutional concentration.

Guard: max_id >= 787. Run: python scripts/_aria_cases_batch_W.py
"""

import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "RUBLI_NORMALIZED.db"


SKIP_VENDORS = [{'vendor_id': 4253, 'name': 'CONSTRUCCIONES E INSTALACIONES MODERNAS, S.A. DE C.V.', 'reason': '15 contracts across 9 institutions, 847M MXN, 2002-2018. 47pct SB is 7 single-bid wins at 7 DIFFERENT institutions (INMEGEN, Cancer Guerrero, ASA, GDF, SSP, AGS Infra, Archivo General) with 1 contract each -- no institutional concentration. SEGOB has 7 DA contracts (329M) in 2010-2011 but no SB capture pattern. Too few contracts, too scattered.'}]


CASES = [{'offset': 0, 'case_name': 'PEMEX Machinery Single-Bid Capture - Maquinaria Intercontinental', 'case_type': 'institutional_capture', 'confidence_level': 'medium', 'notes': 'MAQUINARIA INTERCONTINENTAL SA DE CV (vendor 1008) - 1.13B MXN in 145 contracts (2002-2017), concentrated at PEMEX subsidiaries totaling 922M MXN. PEMEX EP: 844M (38 contracts, 52.6pct SB, 0pct DA), PEMEX Gas: 44M (13 contracts, 69.2pct SB), PEMEX Refinacion: 16M (7 contracts, 71.4pct SB). 86pct of all contracts are Licitacion Publica -- the vendor participates exclusively in competitive tenders, yet wins 48pct of them as the only bidder. Activity peaks 2002-2012, drops sharply after energy reform 2013+.', 'estimated_fraud_mxn': 500000000, 'year_start': 2002, 'year_end': 2012, 'vendors': [{'vendor_id': 1008, 'evidence_strength': 'medium', 'match_method': 'aria_queue_t3'}]}, {'offset': 1, 'case_name': 'Anomalous High-Value Single-Bid Contracts - Punto Pen', 'case_type': 'overpricing', 'confidence_level': 'medium', 'notes': 'PUNTO PEN (vendor 61828) - 734M MXN in only 11 contracts (2011-2024), avg 67M per contract. BANJERCITO: 448M (1 contract, 100pct SB, 2021), CNBV: 180M (2 contracts, 50pct SB/50pct DA, 2024), FONATUR: 101M (3 contracts, 33pct SB/67pct DA, 2020-2023). Pattern shows a company that started with small health contracts (2011-2016, 5.6M) then suddenly wins massive contracts at FONATUR, BANJERCITO, and CNBV (2020-2024). 448M SB at a military bank from a company called Punto Pen is highly anomalous.', 'estimated_fraud_mxn': 600000000, 'year_start': 2020, 'year_end': 2024, 'vendors': [{'vendor_id': 61828, 'evidence_strength': 'medium', 'match_method': 'aria_queue_t3'}]}, {'offset': 2, 'case_name': 'CFE Trunked Radio Single-Bid Capture - Servicios Troncalizados', 'case_type': 'institutional_capture', 'confidence_level': 'medium', 'notes': 'SERVICIOS TRONCALIZADOS SA DE CV (vendor 14489) - 453M MXN in 61 contracts (2003-2025). 93pct of value concentrated at CFE: 420M MXN in 26 contracts (2010-2017), 57.7pct SB, 34.6pct DA. Trunked radio/telecommunications systems provider. 15 of 26 CFE contracts won via single bid. Outside CFE, only 35 contracts worth 32M. Classic institutional capture.', 'estimated_fraud_mxn': 250000000, 'year_start': 2010, 'year_end': 2017, 'vendors': [{'vendor_id': 14489, 'evidence_strength': 'medium', 'match_method': 'aria_queue_t3'}]}]


def main():
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
                (f"Batch W skip: {reason[:500]}", vid)
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
