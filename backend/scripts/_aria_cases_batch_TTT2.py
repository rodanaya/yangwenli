"""
GT Mining Batch TTT2 — 20 T3 vendors (v102924..v7695)
9 ADDs (cases max_id+1 .. max_id+9), 11 SKIPs
Guard: max_id must be 1239
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB, timeout=60)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1239:
    print(f"ABORT: expected max_id=1239, got {max_id}. Run SSS2 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+9}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (178202, "PRODUCTOS LACTEOS DON PANFILO INPI DA Ghost",
             "ghost_company", 2016, 2017, "high", 303_000_000,
             "INPI 100% (303M), 3 contracts DA=100%; 2016-2017; dairy company 303M DA at Indigenous Peoples Institute — industry mismatch P2 ghost"),
    (154328, "GRANOS Y SEMILLAS OJO DE AGUA DICONSA DA",
             "institutional_capture", 2015, 2018, "high", 236_000_000,
             "DICONSA 100% (236M), 23 contracts DA=100%; grain/seed company dominant DICONSA direct-award capture"),
    (279225, "FARMAHOME IMSS DA Capture",
             "institutional_capture", 2022, 2025, "high", 296_000_000,
             "IMSS 94.2% (296M) DA=96.3% + IMSS-Bienestar 2.5% = 96.7%; 269 contracts; pharma company dominant IMSS direct-award capture"),
    (120016, "BESTLABOR SCT SB Ghost",
             "ghost_company", 2013, 2013, "high", 217_000_000,
             "SCT 100% (217M), 1 contract SB=100%; 2013 only; testing company 217M single-bid at transport ministry — P2 ghost"),
    (28232,  "CONSTRUCTORA REMA CONAGUA SB",
             "single_bid_capture", 2006, 2025, "high", 542_000_000,
             "CONAGUA 84.0% (542M) SB=100% + CAPASEG SB=100% = 94.8%; 12 contracts SB=92%; construction company dominant CONAGUA single-bid capture"),
    (45873,  "SEMILLAS CONCENTRADAS OJO DE AGUA DICONSA DA",
             "institutional_capture", 2010, 2024, "high", 190_000_000,
             "DICONSA 89.7% (190M) DA=99.5% + SEGALMEX DA=100% = 100%; 202 contracts DA=100%; seed cooperative dominant DICONSA direct-award capture"),
    (10050,  "CONSTRUCTORES EN CORPORACION SCT SB",
             "single_bid_capture", 2002, 2018, "high", 853_000_000,
             "SCT 96.8% (853M), 43 contracts SB=88%; construction company dominant SCT single-bid monopoly"),
    (49286,  "YOLANDA MORA PERALTA CFE DA",
             "institutional_capture", 2010, 2017, "high", 213_000_000,
             "Individual person; CFE 100% (213M), 34 contracts DA=88%; natural person dominant CFE direct-award capture"),
    (7695,   "COMPANIA MEXICANA DE GEOFISICA PEMEX SB",
             "single_bid_capture", 2002, 2003, "high", 946_000_000,
             "PEMEX 100% (946M), 5 contracts SB=100%; geophysics company dominant PEMEX single-bid capture"),
]

SKIPS = [
    (102924, "MAYRE SAUBERKEIT: CFE 100% but DA=67%<75% SB=33%<75% — both below threshold"),
    (101865, "TECNICA AGRICOLA CHIAPAS: SENASICA 100% but DA=62%<75% — below threshold"),
    (6085,   "LABORATORIOS IMPERIALES: dispersed health IMSS=48.7%<60% SSA=35.4% — below concentration threshold"),
    (17811,  "ARMHI CONSTRUCCIONES: SB=94% but dispersed top GRO=42%<60% CONAGUA=37% — below concentration threshold"),
    (92943,  "WORLD COUNCIL OF CREDIT UNIONS: BANSEFI 100% but DA=0% SB=0% — single competitive contract"),
    (15113,  "TRANSPORTES EHL DEL CENTRO: LICONSA 100% but DA=0% SB=0% — competitive logistics"),
    (1462,   "MICROFORMAS: dispersed top=22.5% DA=36% SB=28% — below all thresholds"),
    (22460,  "GRUPO EDIFICADOR BAESGO: SB=97% but dispersed top SCT=45.7%<60% — institution concentration below threshold"),
    (54,     "OBRAS PORTUARIAS COATZACOALCOS: SB=80% but dispersed top PPQ=52.9%<60% — below threshold"),
    (132619, "COMARKET: SCT 606M contract is competitive (DA=0 SB=0), not capture; IMSS DA=123M insufficient"),
    (253326, "KAPSCH TRAFFICCOM: global Austrian tolling technology company (Kapsch Technologies), legitimate CAPUFE supplier"),
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
