"""
GT Mining Batch SSS2 — 20 T3 vendors (v57745..v5710)
11 ADDs (cases max_id+1 .. max_id+11), 9 SKIPs
Guard: max_id must be 1228
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB, timeout=60)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1228:
    print(f"ABORT: expected max_id=1228, got {max_id}. Run RRR2 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+11}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (57745,  "CONSTRUCTORA ZIHUASOL CFE DA-SB",
             "institutional_capture", 2010, 2015, "high", 776_000_000,
             "CFE 100% (776M), 28 contracts DA=53.6%+SB=42.9%=96.5%; construction company dominant CFE mixed direct-award+single-bid capture"),
    (110316, "RED EMPRESAS CAMPESINAS MICHOACAN DICONSA DA",
             "institutional_capture", 2013, 2017, "high", 275_000_000,
             "DICONSA 96.5% (275M), 22 contracts DA=100%; Michoacan peasant co-op dominant DICONSA direct-award capture"),
    (136365, "REPRESENTACIONES NYJISA DICONSA-Bienestar DA",
             "institutional_capture", 2014, 2025, "high", 353_000_000,
             "DICONSA 84.2% (297M) DA=100% + Bienestar 15.7% (55M) DA=100% = 100%; 576 contracts; company dominant DICONSA+Bienestar capture"),
    (121510, "ENSOBRETADOS Y DERIVADOS LICONSA DA",
             "institutional_capture", 2013, 2018, "high", 316_000_000,
             "LICONSA 100% (316M), 7 contracts DA=85.7%; packaging company dominant LICONSA direct-award capture"),
    (173424, "ARMANDO GUIDO LOPEZ DICONSA DA",
             "institutional_capture", 2016, 2017, "high", 302_000_000,
             "Individual person; DICONSA 100% (302M), 27 contracts DA=100%; natural person dominant DICONSA direct-award capture"),
    (109485, "APOSITOS Y GASAS DE MEXICO IMSS DA",
             "institutional_capture", 2013, 2025, "high", 241_000_000,
             "IMSS 85.6% (231M) DA=96.8%; 280 contracts; medical supply company dominant IMSS direct-award capture"),
    (24878,  "CONSORCIO TITANES CFE SB",
             "single_bid_capture", 2006, 2017, "high", 570_000_000,
             "CFE 100% (570M), 5 contracts SB=100%; construction consortium dominant CFE single-bid capture"),
    (148619, "OLEOSUR SAPI LICONSA DA",
             "institutional_capture", 2015, 2019, "high", 263_000_000,
             "LICONSA 100% (263M), 7 contracts DA=100%; oil-seed company dominant LICONSA direct-award capture"),
    (126361, "LORENZA FEBRONIO TEODORO CFE DA Ghost",
             "ghost_company", 2014, 2014, "medium", 215_000_000,
             "Individual person; CFE 100% (215M), 1 contract DA=100%; 2014 only; natural person 215M direct-award at electricity utility — P2 ghost"),
    (245531, "AGROINDUSTRIAS DEL BALSAS SADER DA Ghost",
             "ghost_company", 2019, 2019, "medium", 347_000_000,
             "SADER (Agriculture) 100% (347M), 1 contract DA=100%; 2019 only; agroindustrial company 347M single direct-award at Agriculture ministry — P2 ghost"),
    (5710,   "DURFA IMSS DA Capture",
             "institutional_capture", 2002, 2025, "high", 1_137_000_000,
             "IMSS 89.3% (1014M) DA=80.3% + IMSS-Bienestar DA=90.9% = 94.6%; 1381 contracts; medical supply company dominant IMSS direct-award monopoly"),
]

SKIPS = [
    (45289,  "TELETEC DE MEXICO: dispersed IFT+SCT top=37% DA=42% SB=31% — below threshold"),
    (8561,   "EMERSON PROCESS MANAGEMENT: global US industrial automation brand (Emerson Electric), legitimate energy supplier"),
    (35037,  "CONSTRUCTORA BREMA: SB=81.8% but dispersed top_ratio=18.2% — below concentration threshold"),
    (28574,  "GUILLERMO GONZALEZ OLALDE: salud 100% but DA=0% SB=0% — single competitive contract"),
    (35695,  "MANTENIMIENTO PREVENTIVO Y CORRECTIVO: dispersed salud top=46.9% DA=36.2% — below threshold"),
    (42633,  "DSM NUTRITIONAL PRODUCTS MEXICO: global Dutch science company (Royal DSM), legitimate food supplement supplier"),
    (133664, "MEI GASOLINERAS: CFE 100% but DA=44.4%<50% SB=55.6%<75% — both below threshold"),
    (306863, "GRA CONSULTORES: Bienestar+LICONSA=100% DA=100% but top=52.6%<60% — single institution below threshold"),
    (25888,  "REX FARMA: IMSS top by value=44%<60% DA=74% — value concentration below threshold, dispersed health"),
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
