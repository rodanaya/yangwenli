"""
GT Mining Batch VVV2 — 20 T3 vendors (v81572..v57293)
7 ADDs (cases max_id+1 .. max_id+7), 13 SKIPs
Guard: max_id must be 1254
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB, timeout=60)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1254:
    print(f"ABORT: expected max_id=1254, got {max_id}. Run UUU2 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+7}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (81572,  "FOA INGENIERIA STC Metro SB",
             "single_bid_capture", 2010, 2023, "high", 220_000_000,
             "STC-Metro 68.5% (220M), 8 contracts SB=88%; engineering company dominant Metro single-bid capture"),
    (267919, "SUMINISTROS ESPECIALIZADOS MEDICAMENTOS IMSS DA",
             "institutional_capture", 2021, 2025, "high", 205_000_000,
             "IMSS 96.8% (205M), 123 contracts DA=90%; pharma distributor dominant IMSS direct-award capture"),
    (53086,  "PROMOTORA EDIFICACIONES SCT SB",
             "single_bid_capture", 2010, 2012, "high", 526_000_000,
             "SCT 100% (526M), 5 contracts SB=100%; construction company dominant SCT single-bid capture"),
    (14753,  "SHEMY MEXICANA IMSS DA Monopoly",
             "institutional_capture", 2003, 2025, "high", 387_000_000,
             "IMSS 99.8% (387M), 982 contracts DA=82%; disposable supply company dominant IMSS direct-award monopoly"),
    (91049,  "GABRIEL CALVILLO DIAZ SAE DA Ghost",
             "ghost_company", 2012, 2015, "high", 322_000_000,
             "Individual person; SAE 99.8% (322M), 2 contracts DA=100%; natural person 322M DA at asset disposal agency — ghost"),
    (12017,  "ELECTRICA COBRA CFE DA",
             "institutional_capture", 2003, 2016, "high", 749_000_000,
             "CFE 100% (749M), 33 contracts DA=55%; electrical company dominant CFE direct-award capture"),
    (10290,  "EQUIPLAN SCT SB",
             "single_bid_capture", 2002, 2016, "high", 393_000_000,
             "SCT 92.4% (393M), 9 contracts SB=100%; planning company dominant SCT single-bid capture"),
]

SKIPS = [
    (8091,   "ACEROS CAMESA: dispersed PEMEX=56%+CFE=38% DA=5% SB=9% — competitive industrial supplier"),
    (2501,   "MEDIDORES INDUSTRIALES: IMSS=56.8%<60% DA=52% — concentration just below threshold"),
    (763,    "MANUFACTURAS CARMEN: CAPUFE=78% but SB=63%<75% — SB below threshold"),
    (7274,   "TRANSPORTES LACE: LICONSA 100% but DA=13% SB=0% — competitive logistics"),
    (42910,  "MAPPEC MATERIALES: CFE 100% but DA=16% SB=43%<75% — below both thresholds"),
    (229187, "AMX CONTENIDO: dispersed top=17.8%<60% — below concentration threshold"),
    (42717,  "GRUPO EMEQUR: IMSS=46.6%<60% — below concentration threshold despite high DA"),
    (272679, "MECCSA GRUPO EMPRESARIAL: PRS 100% but DA=67%<75% — below threshold"),
    (61065,  "ZAPATA: SEMAR=78.9% but DA=47%<50% SB=26%<75% — both below threshold"),
    (288359, "RELIABLE ON & OFFSHORE: IMP=96.9% but SB=67%<75% — below threshold"),
    (34112,  "TRAFFICLIGHT DE MEXICO: SB=96% but dispersed top SAPUEBLA=49.5%<60% — below concentration threshold"),
    (280038, "LA B GRANDE: dispersed IMSS=32.4% DA=100% but top<60% — below concentration threshold"),
    (57293,  "COMEDORES HOSPITALIDAD: dispersed SSA=31.4% DA=44% SB=44% — below all thresholds"),
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
