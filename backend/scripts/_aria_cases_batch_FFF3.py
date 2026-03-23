"""
GT Mining Batch FFF3 — 20 T3 vendors (v42988..v43085)
7 ADDs (cases max_id+1 .. max_id+7), 13 SKIPs
Guard: max_id must be 1335
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB, timeout=60)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1335:
    print(f"ABORT: expected max_id=1335, got {max_id}. Run EEE3 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+7}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (8264,   "CONSTRUCCIONES ARRENDAMIENTOS INDUSTRIALES PEMEX SB",
             "single_bid_capture", 2002, 2023, "high", 499_000_000,
             "PEMEX 63% (499M) + ASIPONA-Altamira 31.9%; 11 contracts SB=100%; industrial construction dominant PEMEX single-bid capture"),
    (31241,  "FARMACIAS ESPECIALIDADES DERMATOLOGICAS IMSS DA",
             "institutional_capture", 2007, 2025, "high", 246_000_000,
             "IMSS 99.3% (246M), 132 contracts DA=58%; specialty pharmacy dominant IMSS direct-award capture"),
    (36477,  "GIMSA CONSTRUCCIONES INTEGRALES GOLFO CAPUFE DA",
             "institutional_capture", 2008, 2020, "high", 343_000_000,
             "CAPUFE 66.4% (343M), 1 contract DA=62%; construction company dominant CAPUFE direct-award capture"),
    (43085,  "FARMACOS RECURSOS MATERIALES ESPECIALIZADOS IMSS DA",
             "institutional_capture", 2010, 2024, "high", 615_000_000,
             "IMSS 82.7% (615M), 671 contracts DA=87%; pharma distributor dominant IMSS direct-award capture"),
    (96795,  "MED JETS IMSS DA",
             "institutional_capture", 2010, 2024, "high", 583_000_000,
             "IMSS 98.8% (583M), 17 contracts DA=78%; medical supply company dominant IMSS direct-award capture"),
    (102407, "VITESSE FINANCING TRUST CDMX SB Ghost",
             "ghost_company", 2013, 2013, "high", 329_000_000,
             "CDMX 100% (329M), 2 contracts SB=100%; 2013 only; finance/trust company 329M single-bid at Mexico City govt — P2 ghost"),
    (143957, "ACAPRO DE HIDALGO PUEBLA SB",
             "single_bid_capture", 2014, 2015, "high", 488_000_000,
             "Puebla-State 98.6% (488M), 1 contract SB=100%; construction company dominant Puebla state single-bid capture"),
]

SKIPS = [
    (42988,  "AS SYSTEMS: CFE=93% but DA=37%<50% SB=41%<75% — both below threshold"),
    (38351,  "PROFESSIONAL PHARMACY OCCIDENTE: dispersed ISSSTE=44.9%<60% — below concentration threshold"),
    (147349, "BUTABY: CENAGAS=98.7% but SB=75%=75% (not >75%) DA=25% — at but not above SB threshold"),
    (10565,  "AGENCIAS MERCANTILES: dispersed CAMP=16.5%<60% — below concentration threshold"),
    (28676,  "ATYDE MEXICO: dispersed IMSS=45.9%<60% — below concentration threshold"),
    (14540,  "ELSA GUADALUPE CASTELAZO: dispersed IMSS=55.6%<60% — below concentration threshold"),
    (6902,   "GAMA SISTEMAS: dispersed CNBBBJ=22.7%<60% — below concentration threshold"),
    (16215,  "CONSTRUCTORA MILOS: dispersed SOPDUE-TAMPS=28.2%<60% — below concentration threshold"),
    (18165,  "GRUPO PELAYO: CFE=100% but DA=8% SB=18% — competitive CFE supplier"),
    (4445,   "B BRAUN AESCULAP: global German medical company (B.Braun Melsungen AG), IMSS=61% but global brand"),
    (1728,   "GH MAQUINARIA Y EQUIPO: dispersed CONAGUA=19.5%<60% — below concentration threshold"),
    (145410, "GABAME: dispersed IMSS=45%<60% IMSSBIENESTAR=37% — below concentration threshold"),
    (46015,  "CONSULTORIA INTEGRAL INGENIERIA: dispersed CONAGUA=26.9%<60% — below concentration threshold"),
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
