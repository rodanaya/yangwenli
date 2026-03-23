"""
GT Mining Batch CCC3 — 20 T3 vendors (v171138..v239697)
8 ADDs (cases max_id+1 .. max_id+8), 12 SKIPs
Guard: max_id must be 1314
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB, timeout=60)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1314:
    print(f"ABORT: expected max_id=1314, got {max_id}. Run BBB3 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+8}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (20551,  "EDS DE MEXICO IMSS SB Ghost",
             "ghost_company", 2005, 2005, "high", 218_000_000,
             "IMSS 100% (218M), 1 contract SB=100%; 2005 only; company 218M single-bid at social security — P2 ghost"),
    (36833,  "AVIONES HELICOPTEROS NORTE SGM DA",
             "institutional_capture", 2008, 2025, "high", 277_000_000,
             "SGM (Servicio Geológico Mexicano) 90.4% (277M), 37 contracts DA=78%; aviation company dominant mining survey DA capture"),
    (99683,  "GRAN MARCA PROYECTOS VER SB",
             "single_bid_capture", 2010, 2010, "high", 234_000_000,
             "Veracruz state entities 100% (234M), 2 contracts SB=100%; construction company dominant Veracruz state single-bid capture"),
    (125805, "CONSTRUCTORA SYEP SICT SB",
             "single_bid_capture", 2014, 2025, "high", 1_094_000_000,
             "SICT 97.5% (1094M), 19 contracts SB=83%; construction company dominant SICT single-bid capture"),
    (129180, "URIEL AVILA CHUPIN CFE DA Ghost",
             "ghost_company", 2014, 2017, "high", 263_000_000,
             "Individual person; CFE 100% (263M), 11 contracts DA=100%; natural person dominant CFE direct-award ghost"),
    (132004, "MEDIACCESS SHF SB Ghost",
             "ghost_company", 2014, 2014, "high", 217_000_000,
             "SHF 100% (217M), 1 contract SB=100%; 2014 only; media company 217M single-bid at housing finance agency — P2 ghost"),
    (167517, "CONTROLADORA OPERACIONES INFRAESTRUCTURA CONAGUA SB Ghost",
             "ghost_company", 2015, 2015, "high", 382_000_000,
             "CONAGUA 100% (382M), 1 contract SB=100%; 2015 only; infrastructure company 382M single-bid at water authority — P2 ghost"),
    (171138, "IMPULSO CONSTRUCTOR LATINOAMERICANO ASIPONA SB",
             "single_bid_capture", 2015, 2025, "high", 204_000_000,
             "ASIPONA-Lázaro Cárdenas 84.6% (204M), 7 contracts SB=91%; construction company dominant Lázaro Cárdenas port single-bid capture"),
]

SKIPS = [
    (71260,  "DESPACHO ASESORIA EMPRESARIAL: SAE=60.8% but DA=37.5%<50% SB=56%<75% — both below threshold"),
    (45672,  "CORPORACION EVENTOS INTEGRALES: dispersed SCT=36.9%<60% — below concentration threshold"),
    (266948, "SEMALYN: dispersed SEP=19.9%<60% — below concentration threshold"),
    (2955,   "GRUPO BCG: dispersed PF=36.9%<60% — below concentration threshold"),
    (68628,  "MOTOROLA SOLUTIONS DE MEXICO: global US company (Motorola Solutions Inc), SEDENA=77% but global brand"),
    (16976,  "SEGUROS BANORTE GENERALI: IMSS=59.1%<60% — marginally below concentration threshold"),
    (23782,  "ALBATROS CONSTRUCCIONES: dispersed SCT=40.1%<60% — below concentration threshold"),
    (87911,  "GRUPO INGENIERIA CIVIL AVANZADA: MICH=61% but DA=44%<50% SB=56%<75% — both below threshold"),
    (913,    "GRUPO COMERCIAL DAMAG: IMSS=95.4% but DA=35%<50% SB=4%<75% — competitive medical supplier"),
    (13740,  "SEGURIDAD PRIVADA HOSPITALARIA: dispersed AICM=48.9%<60% — below concentration threshold"),
    (256452, "BIN121221TG0: IMSS=47.9%<60% DA=100% — below concentration threshold"),
    (239697, "SYSMEDBI: ISSSTE=78% but DA=41%<50% SB=2%<75% — both below threshold"),
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
