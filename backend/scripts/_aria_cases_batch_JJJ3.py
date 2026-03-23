"""
GT Mining Batch JJJ3 — 20 T3 vendors (v122980..v234)
7 ADDs (cases max_id+1 .. max_id+7), 13 SKIPs
Guard: max_id must be 1360
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB, timeout=60)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1360:
    print(f"ABORT: expected max_id=1360, got {max_id}. Run III3 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+7}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (122980, "SERVICIOS PERSONAL ESTADO DE MEXICO IMSS DA",
             "institutional_capture", 2013, 2020, "high", 180_000_000,
             "IMSS 86.1% (180M), 4 contracts DA=75%; personnel services company dominant IMSS direct-award capture"),
    (84720,  "PROVEEDORA QUIMICO FARMACEUTICA COFEPRIS DA",
             "institutional_capture", 2010, 2024, "high", 229_000_000,
             "COFEPRIS 99.4% (229M), 31 contracts DA=68%; pharma supplier dominant health regulator direct-award capture"),
    (45100,  "GALLETERA ITALIANA DICONSA DA",
             "institutional_capture", 2010, 2025, "high", 309_000_000,
             "DICONSA 100% (309M), 2885 contracts DA=100%; biscuit/food supplier dominant DICONSA direct-award capture"),
    (33774,  "TECNOLOGIA INTERCONTINENTAL SIMAPA SB",
             "single_bid_capture", 2008, 2020, "high", 568_000_000,
             "SIMAPA-Tuxtla 81.4% (568M) + Durango 18.1%, 5 contracts SB=100%; tech company dominant Tuxtla municipal water utility single-bid capture"),
    (15655,  "CONSTRUCTORA HOSTOTIPAQUILLO PEMEX SB",
             "single_bid_capture", 2003, 2023, "high", 206_000_000,
             "PEMEX 66.1% (206M) + CFE 30.3%, 17 contracts SB=100%; construction company dominant PEMEX single-bid capture"),
    (228313, "REGINA COMERCIAL SPB IMSS DA",
             "institutional_capture", 2018, 2024, "high", 319_000_000,
             "IMSS 100% (319M), 485 contracts DA=97%; commercial supply company dominant IMSS direct-award capture"),
    (47680,  "BIOMA FARMACEUTICA IMSS DA",
             "institutional_capture", 2010, 2024, "high", 232_000_000,
             "IMSS 100% (232M), 2732 contracts DA=89%; pharmaceutical company dominant IMSS direct-award capture"),
]

SKIPS = [
    (34438,  "OPCION PRODUCTIVA: DA=4.8%<50% SB=24.7%<75% — both below threshold"),
    (119608, "CONSTRUCTORA JERI: SB=66.7%<75% DA=33.3% — SB below threshold"),
    (2254,   "ELECTRONICA INDUSTRIAL MONCLOVA: DA=28.2%<50% SB=13.3%<75% — both below threshold"),
    (25518,  "COAHUILA MOTORS: DA=0% SB=40.2%<75% — both below threshold"),
    (320417, "ZYDUS PHARMACEUTICALS MEXICO: global Indian pharma (Zydus Lifesciences/Cadila), DA=37.3%<50%"),
    (41204,  "SAVI CONSTRUCCIONES: SB=64.3%<75% DA=35.7% — SB below threshold"),
    (1376,   "ASESORIA PROVEEDORA EQUIPOS LABORATORIO: DA=42.9%<50% SB=2.1% — both below threshold"),
    (44531,  "VASA HOLDING COMPANY: SB=66.7%<75% DA=0% — SB below threshold"),
    (4942,   "ORTOPEDIA HISA: DA=32.8%<50% SB=4.1% — both below threshold"),
    (102238, "ANAEL DEL NOROESTE: DA=39.1%<50% SB=52.6%<75% — both below threshold"),
    (234,    "ESPECIALIDADES COMERCIALES REYES: DA=18.3%<50% SB=33.8%<75% — both below threshold"),
    (10854,  "SUPERVISORES TECNICOS: dispersed IMSS=22.6%<60% — below concentration threshold"),
    (30358,  "INMOBILIARIA CONSTRUCCIONES GENERA: dispersed SCT=17.3%<60% — below concentration threshold"),
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
