"""
GT Mining Batch AAA3 — 20 T3 vendors (v259019..v155285)
6 ADDs (cases max_id+1 .. max_id+6), 14 SKIPs
Guard: max_id must be 1301
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB, timeout=60)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1301:
    print(f"ABORT: expected max_id=1301, got {max_id}. Run ZZZ2 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+6}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (92597,  "MARCOS JUAN LOPEZ PEREZ SAE DA Ghost",
             "ghost_company", 2012, 2019, "high", 324_000_000,
             "Individual person; SAE 99.8% (324M), DA=100%; SAE ghost network 2012 — natural person mass DA at asset disposal agency"),
    (68969,  "CONSTRUCTORA PURA CONAGUA SB",
             "single_bid_capture", 2010, 2018, "high", 244_000_000,
             "CONAGUA 88.2% (244M), SB=100%; construction company dominant CONAGUA single-bid capture"),
    (241077, "PROYECTOS INFRAESTRUCTURA LAGUNA SICT SB",
             "single_bid_capture", 2019, 2025, "high", 661_000_000,
             "SICT 75.5%+CAPUFE 9.7%=85.2% (661M), SB=100%; infrastructure company dominant SICT single-bid capture"),
    (147208, "EK EDITORES CONALITEG DA",
             "institutional_capture", 2013, 2023, "high", 238_000_000,
             "CONALITEG 99% (238M), DA=100%; editorial company dominant CONALITEG direct-award monopoly"),
    (16168,  "GAMEROS Y LUEVANO SCT-SICT SB",
             "single_bid_capture", 2009, 2023, "high", 747_000_000,
             "SCT+SICT 72.7% (747M), SB=94%; construction company dominant SCT/SICT single-bid capture (SCT renamed SICT 2020)"),
    (119483, "MEXMED IMSS DA",
             "institutional_capture", 2014, 2025, "high", 295_000_000,
             "IMSS 91.3% (295M), DA=52%; medical supply company dominant IMSS direct-award capture"),
]

SKIPS = [
    (259019, "ESEOTRES PHARMA: ISSSTE=49.9%+IMSS=31.3% top<60% — dispersed, both below threshold"),
    (124535, "PROMESURGICAL: IMSSBIENESTAR=50.3%<60% DA=66% — concentration below threshold"),
    (45336,  "EDICIONES DEL NORTE: dispersed top=13.9% DA=99% — below concentration threshold"),
    (46095,  "GRUPO PROMOTOR: SCT=58.9%<60% SB=100% — concentration just below threshold"),
    (2395,   "STANLEY ADAMS: dispersed PEMEX=31.3% DA=5% SB=34% — competitive industrial supplier"),
    (124654, "PAVIMENTOS ESCARREGA: SICT=58%<60% SB=92% — concentration just below threshold"),
    (81869,  "LERMA EDIFICACIONES: TAMPS-State=41.6%<60% SB=91% — below concentration threshold"),
    (93101,  "INMOBILIARIO TLAHTOANI: CONAGUA=99.9% but DA=45%<50% SB=55%<75% — both below threshold"),
    (86873,  "TOOLS & SERVICES: SEDENA=50.1%<60% SB=67%<75% — below both thresholds"),
    (110479, "TAMIZAJE PLUS: CNEGSR=79.1% but SB=65%<75% — SB below threshold"),
    (22063,  "BRAIN SISTEMAS: dispersed PEMEX=25% SB=44% — below all thresholds"),
    (22674,  "ACCUTECH: SAPUEBLA=95% but DA=18% SB=12% — competitive supplier"),
    (46566,  "COMERCIALIZADORA IMU: dispersed top=10.9% DA=100% — below concentration threshold"),
    (155285, "MGP COMERCIALIZADORA: SEDENA=84.3% but DA=71%<75% — below threshold"),
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

except Exception as e:
    conn.execute("ROLLBACK")
    print(f"ERROR: {e}")
    raise
finally:
    conn.close()
