"""
GT Mining Batch DDD3 — 20 T3 vendors (v1127..v77222)
8 ADDs (cases max_id+1 .. max_id+8), 12 SKIPs
Guard: max_id must be 1322
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB, timeout=60)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1322:
    print(f"ABORT: expected max_id=1322, got {max_id}. Run CCC3 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+8}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (54826,  "CONSTRUCCION INSTALACION INFRAESTRUCTURA URBANA SCT SB",
             "single_bid_capture", 2010, 2017, "high", 405_000_000,
             "SCT 80.9% (405M), 22 contracts SB=96%; construction company dominant SCT single-bid capture"),
    (70310,  "PRECISA CONSTRUCCIONES IMSS SB",
             "single_bid_capture", 2011, 2025, "high", 244_000_000,
             "IMSS 100% (244M), 9 contracts SB=90%; construction company dominant IMSS single-bid capture"),
    (96098,  "FARMACIA BENAVIDES NAFINSA DA",
             "institutional_capture", 2012, 2019, "high", 513_000_000,
             "NAFINSA 100% (513M), 14 contracts DA=71%; national pharmacy chain dominant NAFINSA direct-award capture"),
    (170052, "ORTOPEDIA ANA IMSS DA",
             "institutional_capture", 2015, 2025, "high", 720_000_000,
             "IMSS 64% (720M) + ISSSTE 30.2%, 222 contracts DA=84%; orthopedics company dominant IMSS direct-award capture"),
    (172535, "GRUPO TEC TEXTURIZADOS CONSTRUCCION IMSS DA",
             "institutional_capture", 2016, 2025, "high", 235_000_000,
             "IMSS 100% (235M), 47 contracts DA=51%; construction company dominant IMSS direct-award capture"),
    (207811, "BASERHIT ASOCIADOS TLAXCALA SB",
             "single_bid_capture", 2017, 2020, "high", 1_477_000_000,
             "Tlaxcala-State 100% (1477M), 15 contracts SB=82%; company dominant Tlaxcala state single-bid capture"),
    (249395, "DR HYDRO SOLUCIONES AGRICOLAS CONAGUA SB",
             "single_bid_capture", 2019, 2025, "high", 814_000_000,
             "CONAGUA 99.8% (814M), 61 contracts SB=92%; agricultural solutions company dominant CONAGUA single-bid capture"),
    (280088, "TFS TURBINE FIELD SOLUTIONS CENAGAS SB Ghost",
             "ghost_company", 2022, 2022, "high", 453_000_000,
             "CENAGAS 100% (453M), 1 contract SB=100%; 2022 only; turbine company 453M single-bid at gas control center — P2 ghost"),
]

SKIPS = [
    (1127,   "ESCUDERO CONSTRUCCIONES: SCT=45.9%<60% SB=96% — concentration below threshold"),
    (3087,   "KARISMA INGENIERIA: SEDATU=67% but DA=37%<50% SB=56%<75% — both below threshold"),
    (30438,  "RESTAURADORA OLIVERA LEDESMA: dispersed SOBSE=51.8%<60% — below concentration threshold"),
    (317,    "PROVETECNIA: AICM=93.3% but DA=7% SB=33% — competitive airport supplier"),
    (21041,  "CONSTRUCTORA INMOBILIARIA LM: dispersed SIN=29.7%<60% — below concentration threshold"),
    (47988,  "CAPITAL NEWS: dispersed top=13.3%<60% DA=100% — below concentration threshold"),
    (125531, "GRUPO FIRME DE MEXICO: dispersed CAPUFE=49.4%<60% — below concentration threshold"),
    (32128,  "DU PONT MEXICO: global US company (DuPont de Nemours), PEMEX=97.8% but global brand"),
    (44612,  "INDUSTRIAS MEDIASIST: IMSS=97.4% but DA=19% SB=4% — competitive medical devices"),
    (38855,  "EQUIPOS INSTRUMENTOS TUBERIA: IMSS=99.8% but DA=30% SB=2.5% — competitive supplier"),
    (44015,  "SYNTHES: global medical company (J&J subsidiary), IMSS=98.1% but global brand"),
    (77222,  "PROFESIONALES ADMINISTRACION PUBLICA: dispersed GACM=32%<60% — below concentration threshold"),
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
