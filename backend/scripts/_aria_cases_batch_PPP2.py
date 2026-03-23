"""
GT Mining Batch PPP2 — 20 T3 vendors (v88201..v103088)
13 ADDs (cases max_id+1 .. max_id+13), 7 SKIPs
Guard: max_id must be 1189
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1189:
    print(f"ABORT: expected max_id=1189, got {max_id}. Run OOO2 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+13}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (88201,  "GRUPO BREVET CFE DA Capture",
             "institutional_capture", 2010, 2017, "high", 523_000_000,
             "CFE 100% (523M), 9 contracts DA=56%; services company dominant CFE direct-award capture"),
    (117353, "RUBEN RODRIGUEZ HERNANDEZ CFE DA",
             "institutional_capture", 2013, 2015, "high", 306_000_000,
             "Individual person; CFE 100% (306M), 5 contracts DA=80%; natural person dominant CFE direct-award capture"),
    (123960, "MC INTERNATIONAL DICONSA DA Monopoly",
             "institutional_capture", 2013, 2022, "high", 453_000_000,
             "DICONSA 100% (453M), 32 contracts DA=100%; commercial company dominant DICONSA direct-award monopoly"),
    (7684,   "RB TEC MEXICO PEMEX SB",
             "single_bid_capture", 2002, 2013, "medium", 470_000_000,
             "PEMEX-PQ 55% (259M) SB=100% + PEMEX-E&P 38.5% (181M) SB=93% = 93.5%; 16 contracts SB=94%; tech company PEMEX group single-bid capture"),
    (45118,  "PRODUCTOS ALIMENTICIOS LA MODERNA DICONSA",
             "institutional_capture", 2010, 2025, "high", 984_000_000,
             "DICONSA 75% (738M) DA=100% + Bienestar 25.1% DA=100% = 100%; 5533 contracts DA=100%; food company dominant DICONSA+Bienestar monopoly"),
    (5226,   "INTERCONTINENTAL MEDICAMENTOS OAX SB",
             "single_bid_capture", 2002, 2019, "high", 712_000_000,
             "OAX-Salud 70.8% (504M) SB=100%; 1 massive single-bid at Oaxaca health services + 188 IMSS competitive; pharma OAX single-bid ghost"),
    (30485,  "MENDEZ CASTILLO DICONSA-Norte Ghost",
             "ghost_company", 2007, 2007, "high", 1_119_000_000,
             "DICONSA-Norte 100% (1119M), 1 contract SB=100%; 2007 only; single 1.1B single-bid contract at DICONSA regional — P2 ghost"),
    (8056,   "PROMOTORA AMBIENTAL PEMEX SB",
             "single_bid_capture", 2002, 2006, "high", 1_253_000_000,
             "PEMEX-E&P 95.8% (1199M) SB=100% + PEMEX-Ref SB=100% = 100%; 13 contracts ALL SB; environmental company massive PEMEX single-bid capture"),
    (270770, "GRG HONG KONG SEDENA SB Ghost",
             "ghost_company", 2021, 2025, "high", 781_000_000,
             "SEDENA 94.4% (737M) SB=100% + BANSEFJETO 5.6% SB=100% = 100%; 2 contracts ALL SB; Chinese-named company 737M SB at Defense Ministry"),
    (275966, "SERVICIO OROZCO Bienestar DA",
             "institutional_capture", 2021, 2024, "high", 218_000_000,
             "Secretaria de Bienestar 100% (218M), 14 contracts DA=100%; service company dominant Bienestar direct-award capture"),
    (153218, "APLICACION SISTEMAS SEP-CONAGUA SB",
             "single_bid_capture", 2015, 2017, "high", 223_000_000,
             "SEP 64.1% (143M) SB=100% + CONAGUA 35.9% SB=50% = 100%; 4 contracts; IT company SEP single-bid capture"),
    (241393, "OPERACIONES INTERNACIONALES CENAGAS Ghost",
             "ghost_company", 2019, 2019, "high", 691_000_000,
             "CENAGAS 100% (691M), 1 contract SB=100%; 2019 only; services company 691M single-bid at gas control center — P2 ghost"),
    (45815,  "MARINDUSTRIAS DICONSA DA Monopoly",
             "institutional_capture", 2010, 2025, "high", 1_050_000_000,
             "DICONSA 94.6% (994M) DA=100% + Bienestar 5.4% DA=100% = 100%; 2425 contracts DA=100%; industry company dominant DICONSA monopoly"),
]

SKIPS = [
    (48608,  "PAK BIOMEDLAND: ISSSTE 73.6%<75% DA=17% SB=5% — both well below threshold"),
    (160611, "CLINICAS PERIFERICAS: IMSS 100% but SB=0% DA=0% — single competitive contract"),
    (38193,  "AETNA LIFE & CASUALTY BERMUDA: global insurance company, SRE 1 SB contract 2008"),
    (24691,  "MAAT ELECTROMECANICA: CFE 100% but DA=48%<50% SB=16% — below threshold"),
    (49038,  "GRC COMUNICACIONES: dispersed top=16.1% DA=100% but not concentrated"),
    (34504,  "CENTRO AUTOMOTRIZ GALO: dispersed CFE+PGR top=43% DA=62% — below threshold"),
    (103088, "GONET MEXICO: BANSEAC 98.3% but DA=50% SB=50% — neither threshold met"),
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
