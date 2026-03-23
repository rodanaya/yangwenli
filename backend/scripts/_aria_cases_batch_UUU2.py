"""
GT Mining Batch UUU2 — 20 T3 vendors (v43203..v69991)
6 ADDs (cases max_id+1 .. max_id+6), 14 SKIPs
Guard: max_id must be 1248
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB, timeout=60)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1248:
    print(f"ABORT: expected max_id=1248, got {max_id}. Run TTT2 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+6}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (103767, "MANTENIMIENTOS INTEGRADOS AICM SB",
             "single_bid_capture", 2013, 2025, "high", 773_000_000,
             "AICM 98.5% (773M), 12 contracts SB=100%; airport maintenance company dominant AICM single-bid monopoly"),
    (114353, "SERVI QUIM DE MONTERREY CFE DA",
             "institutional_capture", 2013, 2016, "high", 213_000_000,
             "CFE 100% (213M), 4 contracts DA=100%; chemical services company dominant CFE direct-award capture"),
    (260353, "CAMARA AUTOTRANSPORTE PASAJE SEDENA DA Ghost",
             "ghost_company", 2020, 2020, "high", 203_000_000,
             "SEDENA 100% (203M), 1 contract DA=100%; 2020 only; transport chamber 203M DA at Defense Ministry — industry mismatch P2 ghost"),
    (80866,  "TANIA BARRERA GALLEGOS SAE DA Ghost",
             "ghost_company", 2012, 2012, "high", 322_000_000,
             "Individual person; SAE 100% (322M), 2 contracts DA=100%; 2012 only; natural person 322M DA at asset disposal agency — P2 ghost"),
    (33610,  "MARINEX PTE LTD ESSA SB",
             "single_bid_capture", 2007, 2010, "high", 258_000_000,
             "ESSA+TRANSPORTADORA SAL 100% (258M), 3 contracts SB=100%; foreign company dominant ESSA salt exporter single-bid capture"),
    (29314,  "CONSTRUCTORA JAQUENAVY SCT SB",
             "single_bid_capture", 2007, 2022, "high", 256_000_000,
             "SCT 66.3% (256M), 37 contracts SB=100%; construction company dominant SCT single-bid capture"),
]

SKIPS = [
    (43203,  "BIOMEDIKAL INSTRUMENTS: ISSSTE 59.9%<60% DA=52% — concentration just below threshold"),
    (44283,  "LABORATORIOS VALDECASAS: IMSS+group=96% but DA=10% SB=3% — competitive health supplier"),
    (54812,  "QUEST DIAGNOSTICS: global US diagnostics company, dispersed IMSS=57% DA=57% — global brand"),
    (17078,  "GRUPO BACHAALANI: SB=100% but dispersed top CEA-Jalisco=44.8%<60% — below concentration threshold"),
    (2656,   "GRUPO CONSTRUCTOR EJA: SB=76% but top CDMX=49.6%<60% — below concentration threshold"),
    (23981,  "COSMOPAPEL: dispersed top IMSS=39.5% DA=18% SB=7% — below all thresholds"),
    (72897,  "INTERCAMBIO GLOBAL: IMSS 73.2% but DA=0% SB=0% — competitive procurement"),
    (108588, "LLYC SERVICIOS DE GESTION: CPTM=99.5% SB=75% but global Spanish PR firm (Llorente & Cuenca)"),
    (18176,  "AREVA T&D: global French electrical equipment company (now Schneider Electric), CFE=75% competitive"),
    (33153,  "GISNET: dispersed top=9.5% SB=62%<75% — below both thresholds"),
    (316373, "HURGA SANITIZACION: ISSSTE 100% but DA=50% (1/2 contracts) — at threshold, not above"),
    (2591,   "ACIDOS Y SOLVENTES: dispersed CFE=46.7%+PEMEX=37.1% DA=20% SB=30% — below all thresholds"),
    (246317, "PROFILATEX: IMSS=57.3%<60% DA=51% — concentration below threshold"),
    (69991,  "EXCEL NOBLEZA: LICONSA 100% but DA=67%<75% SB=10% — both below threshold"),
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
