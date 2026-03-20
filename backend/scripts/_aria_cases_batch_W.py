#!/usr/bin/env python3
# GT Batch W: ARIA T3 investigation -- 4 vendors investigated, 3 added, 1 skipped
#
# v4253  CONSTRUCCIONES E INSTALACIONES MODERNAS -- ADD (single_bid_capture)
# v1008  MAQUINARIA INTERCONTINENTAL -- SKIP (legitimate heavy machinery)
# v61828 PUNTO PEN -- ADD (single_bid_capture, sector mismatch)
# v14489 SERVICIOS TRONCALIZADOS -- ADD (institutional_capture at CFE)

import sqlite3, sys, os, json

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")
DATA_PATH = os.path.join(os.path.dirname(__file__), "_batch_W_data.json")


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 787:
        print("ERROR: max_id unexpectedly low -- aborting")
        conn.close()
        return

    print(f"Current max GT case ID: {max_id}")

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    SQL_CASE = ("INSERT OR IGNORE INTO ground_truth_cases "
                "(id, case_id, case_name, case_type, year_start, year_end, "
                "confidence_level, estimated_fraud_mxn, source_news, notes) "
                "VALUES (?,?,?,?,?,?,?,?,?,?)")
    SQL_VENDOR = ("INSERT OR IGNORE INTO ground_truth_vendors "
                  "(case_id, vendor_id, vendor_name_source, evidence_strength, match_method) "
                  "VALUES (?,?,?,?,?)")
    SQL_CONTRACT = ("INSERT OR IGNORE INTO ground_truth_contracts "
                    "(case_id, contract_id, match_method, evidence_strength) "
                    "VALUES (?,?,?,?)")

    total_tagged = 0

    for i, case in enumerate(data["cases"]):
        cid = max_id + 1 + i
        cid_str = f"CASE-{cid}"
        conn.execute(SQL_CASE, (cid, cid_str, case["case_name"], case["case_type"],
                                case["year_start"], case["year_end"], case["confidence_level"],
                                case["estimated_fraud_mxn"], case["source_news"], case["notes"]))
        cn = case["case_name"]
        print(f"Inserted case {cid} ({cid_str}): {cn}")

        for v in case["vendors"]:
            conn.execute(SQL_VENDOR, (cid, v["vendor_id"], v["name"], v["strength"], "aria_queue_t3"))
            vid = v["vendor_id"]
            vn = v["name"]
            print(f"  Vendor {vid}: {vn}")

            rows = conn.execute(
                "SELECT id FROM contracts WHERE vendor_id=? AND contract_year BETWEEN ? AND ?",
                (v["vendor_id"], case["year_start"], case["year_end"])).fetchall()
            for (rid,) in rows:
                conn.execute(SQL_CONTRACT, (cid, rid, "aria_queue_t3", v["strength"]))
            ys = case["year_start"]
            ye = case["year_end"]
            print(f"  Tagged {len(rows)} contracts ({ys}-{ye})")
            total_tagged += len(rows)

            conn.execute(
                "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
                (v["vendor_id"],))

    for s in data["skipped"]:
        conn.execute(
            "UPDATE aria_queue SET review_status='reviewed', reviewer_notes=? WHERE vendor_id=?",
            (s["reason"], s["vendor_id"]))
        sv = s["vendor_id"]
        sr = s["reason"]
        print(f"Skipped v{sv}: {sr}")

    conn.commit()
    conn.close()

    n_cases = len(data["cases"])
    print()
    print("=" * 60)
    print("BATCH W SUMMARY")
    print("=" * 60)
    print(f"Cases inserted: {n_cases} (IDs {max_id+1} to {max_id+n_cases})")
    print(f"Contracts tagged: {total_tagged}")
    for i, c in enumerate(data["cases"]):
        est = c["estimated_fraud_mxn"] / 1e6
        ci = max_id + 1 + i
        cn = c["case_name"]
        ct = c["case_type"]
        cl = c["confidence_level"]
        print(f"  Case {ci}: {cn} | {ct} | {cl} | {est:.0f}M")
    for s in data["skipped"]:
        sv = s["vendor_id"]
        sr = s["reason"][:80]
        print(f"  SKIPPED v{sv}: {sr}...")


if __name__ == "__main__":
    main()
