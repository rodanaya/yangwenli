"""
GT Mining Batch BBB3 — 20 T3 vendors (v286..v1107)
7 ADDs (cases max_id+1 .. max_id+7), 13 SKIPs
Guard: max_id must be 1307
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB, timeout=60)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1307:
    print(f"ABORT: expected max_id=1307, got {max_id}. Run AAA3 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+7}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (47106, "INTEGRACION Y TRANSFORMACION DICONSA DA Monopoly",
            "institutional_capture", 2010, 2020, "high", 635_000_000,
            "DICONSA 100% (635M), 784 contracts DA=100%; distributor dominant DICONSA direct-award monopoly"),
    (49588, "SIMEX INTEGRACION SISTEMAS CAPUFE DA",
            "institutional_capture", 2010, 2017, "high", 593_000_000,
            "CAPUFE 100% (593M), 20 contracts DA=85%; IT/systems company dominant CAPUFE direct-award capture"),
    (49962, "PROCESAMIENTO ESPECIALIZADO ALIMENTOS DICONSA DA",
            "institutional_capture", 2011, 2017, "high", 251_000_000,
            "DICONSA 100% (251M), 56 contracts DA=100%; food processing company dominant DICONSA direct-award monopoly"),
    (33889, "OBRAS VIALES SENALIZACIONES CAPUFE SB",
            "single_bid_capture", 2008, 2024, "high", 644_000_000,
            "CAPUFE 95.6% (644M), 36 contracts SB=86%; road marking company dominant CAPUFE single-bid capture"),
    (7505,  "PERFORACIONES INDUSTRIALES TERMICAS PEMEX SB",
            "single_bid_capture", 2002, 2005, "high", 460_000_000,
            "PEMEX 100% (460M), 4 contracts SB=100%; drilling company dominant PEMEX single-bid capture"),
    (51001, "RAM INGENIERIA SERVICIOS CAPUFE SB",
            "single_bid_capture", 2010, 2025, "high", 190_000_000,
            "CAPUFE 78.1% (190M) + AICM 9%; 152 contracts SB=95%; engineering company dominant CAPUFE single-bid capture"),
    (39029, "NETAFIM MEXICO CONAGUA DA",
            "institutional_capture", 2009, 2024, "high", 287_000_000,
            "CONAGUA 98.4% (287M), 7 contracts DA=57%; irrigation company dominant CONAGUA direct-award capture"),
]

SKIPS = [
    (286,    "PUEBLA AUTOMOTRIZ: CFE=47.8%<60% DA=6% SB=18% — dispersed, below all thresholds"),
    (115010, "CONSTRUCCION INFRAESTRUCTURA COMERCIALIZACION: SEDATU=95.8% but DA=46%<50% SB=54%<75% — both below threshold"),
    (226245, "CERVICA TEX: dispersed BANJERCITO=36.2%<60% — below concentration threshold"),
    (72126,  "EL FINANCIERO MARKETING: dispersed top=9.8%<60% DA=100% — below concentration threshold"),
    (44581,  "MICROSAFE: CFE=100% but SB=75%=75% (not >75%) DA=0% — at but not above SB threshold"),
    (23979,  "CONSTRUCCIONES GUADIANA: dispersed JAL=40.9%<60% — below concentration threshold"),
    (7268,   "TECNICA COMERCIAL VILSA: dispersed SON=39.7%<60% — below concentration threshold"),
    (63086,  "INGENIERIA DESARROLLO OBRAS SUMA: SEDENA=99.1% but DA=25% SB=68%<75% — both below threshold"),
    (148323, "PROMEDENTAL: IMSS=82.6% but DA=24% SB=3% — competitive dental supplier"),
    (2248,   "INDUSTRIA REAL: CFE=99.7% but DA=13% SB=6% — competitive CFE supplier"),
    (4468,   "CENTRAL MATERIAL HOSPITALES: SSA=68.6% but DA=5% SB=16% — competitive medical supply"),
    (259332, "INSUMOS DESECHABLES SALUD: IMSS=62% but DA=11% SB=13% — competitive disposables supplier"),
    (1107,   "GRUPO CONSTRUCCIONES PLANIFICADAS: SCT=51.4%<60% SB=96% — concentration below threshold"),
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
