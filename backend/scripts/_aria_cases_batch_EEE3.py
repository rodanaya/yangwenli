"""
GT Mining Batch EEE3 — 20 T3 vendors (v4154..v35956)
5 ADDs (cases max_id+1 .. max_id+5), 15 SKIPs
Guard: max_id must be 1330
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB, timeout=60)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1330:
    print(f"ABORT: expected max_id=1330, got {max_id}. Run DDD3 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+5}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (4154,   "GAS URIBE SEDENA DA",
             "institutional_capture", 2002, 2025, "high", 184_000_000,
             "SEDENA 70.2% (184M), 2 contracts DA=69%; gas supply company dominant SEDENA direct-award capture"),
    (7498,   "JAVIER CANTU BARRAGAN PEMEX SB Ghost",
             "ghost_company", 2002, 2003, "high", 1_040_000_000,
             "PEMEX 100% (1040M), 2 contracts SB=100%; complex multi-entity name (4 combined entities) 1040M SB at PEMEX — P2 ghost network"),
    (17998,  "URBANIZACION CONSTRUCCION AVANZADA JALISCO SB",
             "single_bid_capture", 2005, 2019, "high", 351_000_000,
             "Jalisco-State 93.8% (351M), 4 contracts SB=100%; construction company dominant Jalisco single-bid capture"),
    (72200,  "CONSTRUCCIONES SERVICIOS DR ONCE NL SB",
             "single_bid_capture", 2010, 2015, "high", 220_000_000,
             "Nuevo León-State 82.2% (181M), 10 contracts SB=80%; construction company dominant Nuevo León single-bid capture"),
    (148318, "NO TEJIDOS GABA IMSS DA",
             "institutional_capture", 2015, 2024, "high", 405_000_000,
             "IMSS 66.8% (405M), 215 contracts DA=79%; nonwoven fabric company dominant IMSS direct-award capture"),
]

SKIPS = [
    (71299,  "EDIFICACIONES PROYECTOS OAXACA: dispersed SICT=36%<60% — below concentration threshold"),
    (104447, "GRUPO CONSTRUCTOR CARRETERO IOTA-LAMBDA: dispersed SICT=47%<60% — below concentration threshold"),
    (515,    "HOSPITAL MEXICO AMERICANO: dispersed PEMEX=33%<60% — below concentration threshold"),
    (6770,   "IMPERMEABILIZANTES MANTENIMIENTO INMUEBLES: dispersed IPN=47.8%<60% — below concentration threshold"),
    (92944,  "SPARKASSENSTIFTUNG: German savings foundation BANSEFI=100% but DA=0% SB=0% — international technical cooperation"),
    (272074, "GREEN MOVI: GN=96% but DA=17%<50% SB=50%<75% — both below threshold"),
    (156271, "DDCAM MEXICO: SCT=100% but DA=0% SB=0% — competitive multi-bid contracts"),
    (33724,  "NUEVO GRUPO FORD DE MEXICO: global US company (Ford Motor), dispersed CFE=40.1%<60%"),
    (5330,   "GRUPO GIPSON: IMSS=83.3% but DA=31% SB=1% — competitive medical supplier"),
    (249476, "GRUNENTHAL DE MEXICO: global European pharma (Grünenthal GmbH), dispersed IMSS=39%<60%"),
    (53040,  "MAYAR DE MEXICO: dispersed SEGOB=39.5%<60% — below concentration threshold"),
    (37946,  "KASPER LIMPIEZA MANTENIMIENTO: dispersed SEP=53.8%<60% — below concentration threshold"),
    (256566, "COMERCIALIZADORA UCIN: IMSS=51.6%<60% DA=81% — below concentration threshold"),
    (13285,  "DIR CONSTRUCCIONES SERVICIOS: dispersed IMSS=22.7%<60% — below concentration threshold"),
    (35956,  "ECO BUSINESS CENTER: MEX=61% but DA=39%<50% SB=47%<75% — both below threshold"),
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
