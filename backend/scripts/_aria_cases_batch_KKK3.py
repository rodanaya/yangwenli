"""
GT Mining Batch KKK3 — 8 T3 vendors (v1669..v99414) — FINAL ≥200M BATCH
3 ADDs (cases max_id+1 .. max_id+3), 5 SKIPs
Guard: max_id must be 1367
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB, timeout=60)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1367:
    print(f"ABORT: expected max_id=1367, got {max_id}. Run JJJ3 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+3}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (8394,   "GREAT WALL DRILLING COMPANY PEMEX SB Ghost",
             "ghost_company", 2002, 2002, "high", 388_000_000,
             "PEMEX 100% (388M), 2 contracts SB=100%; 2002 only; drilling company 388M single-bid at PEMEX — P2 ghost"),
    (117923, "CORREO DEL MAESTRO CONALITEG DA",
             "institutional_capture", 2015, 2023, "high", 377_000_000,
             "CONALITEG 99.9% (377M), 247 contracts DA=100%; educational publisher dominant CONALITEG direct-award capture"),
    (99414,  "GRUPO CONSTRUCTOR ARRENDADOR CENTRO CAPUFE SB",
             "single_bid_capture", 2014, 2019, "high", 444_000_000,
             "CAPUFE 65.5% (444M), 2 contracts SB=85.7%; construction/leasing company dominant CAPUFE single-bid capture"),
]

SKIPS = [
    (1669,   "LLANTERA GARROM: DA=17%<50% SB=8.5%<75% — both below threshold"),
    (246477, "FARMADEXTRUM: DA=24.5%<50% SB=13%<75% — both below threshold"),
    (2189,   "ELECTRONICA INGENIERIA Y COMUNICACIONES: DA=38.4%<50% SB=42.8%<75% — both below threshold"),
    (262707, "JOSE ANTONIO RODRIGUEZ CHAVEZ: DA=37.5%<50% SB=0% — both below threshold"),
    (45031,  "PROCTER & GAMBLE MEXICO: global US consumer goods company (P&G), dispersed DA=100% but global brand"),
]

conn.execute("BEGIN TRANSACTION")
try:
    total_contracts = 0
    for i, case in enumerate(CASES):
        vid, cname, ctype, yr_s, yr_e, conf, fraud_est, notes = case
        case_id_num = max_id + 1 + i
        case_id = f"CASE-{case_id_num}"

        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_cases
              (id, case_id, case_name, case_type, year_start, year_end,
               confidence_level, estimated_fraud_mxn, notes)
            VALUES (?,?,?,?,?,?,?,?,?)
        """, (case_id_num, case_id, cname, ctype, yr_s, yr_e, conf, fraud_est, notes))

        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_vendors (case_id, vendor_id, evidence_strength, match_method)
            VALUES (?, ?, ?, 'aria_t3_mining')
        """, (case_id, vid, conf))

        rows = conn.execute("""
            SELECT id FROM contracts WHERE vendor_id=? AND amount_mxn > 0
        """, (vid,)).fetchall()
        for (ctr_id,) in rows:
            conn.execute("""
                INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id)
                VALUES (?, ?)
            """, (case_id, ctr_id))
        total_contracts += len(rows)
        print(f"  Case {case_id_num} (v{vid}): linked {len(rows)} contracts ({yr_s}-{yr_e})")

    for i, case in enumerate(CASES):
        conn.execute("UPDATE aria_queue SET review_status='reviewed', reviewer_notes=? WHERE vendor_id=?",
                     (f"GT:{max_id+1+i}", case[0]))
    for vid, reason in SKIPS:
        conn.execute("UPDATE aria_queue SET review_status='reviewed', reviewer_notes=? WHERE vendor_id=?",
                     (f"SKIP: {reason[:100]}", vid))
        print(f"  v{vid}: SKIP")

    conn.execute("COMMIT")
    print(f"\nDone. Inserted {len(CASES)} cases ({max_id+1}-{max_id+len(CASES)}), linked {total_contracts} contracts, skipped {len(SKIPS)}.")
    print(f"\n*** T3 ≥200M QUEUE EXHAUSTED — all pending vendors above threshold reviewed ***")

except Exception as e:
    conn.execute("ROLLBACK")
    print(f"ERROR: {e}")
    raise
finally:
    conn.close()
