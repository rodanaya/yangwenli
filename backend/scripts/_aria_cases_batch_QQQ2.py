"""
GT Mining Batch QQQ2 — 20 T3 vendors (v10340..v58772)
10 ADDs (cases max_id+1 .. max_id+10), 10 SKIPs
Guard: max_id must be 1202
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB, timeout=30)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1202:
    print(f"ABORT: expected max_id=1202, got {max_id}. Run PPP2 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+10}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (10340,  "URBANIZADORA GEMA SCT SB",
             "single_bid_capture", 2002, 2012, "high", 839_000_000,
             "SCT 81.1% (681M) SB=100% + Jalisco-SPUI 14.9% SB=100% = 96%; 102 contracts SB=100%; construction company dominant SCT single-bid monopoly"),
    (275894, "MINSA COMERCIAL Bienestar-DICONSA DA",
             "institutional_capture", 2021, 2025, "high", 664_000_000,
             "Bienestar 65.8% (436M) DA=100% + DICONSA 33.7% DA=100% = 99.5%; 1287 contracts DA=100%; commercial company dominant Bienestar+DICONSA monopoly"),
    (307743, "HTH TECHNOLOGY CENAGAS Ghost",
             "ghost_company", 2024, 2024, "high", 405_000_000,
             "CENAGAS 100% (405M), 1 contract SB=100%; 2024 only; technology company 405M single-bid at gas control center — P2 ghost"),
    (151199, "ANDREA FRUIT COMPANY IMSS DA",
             "institutional_capture", 2015, 2025, "high", 532_000_000,
             "IMSS 100% (532M), 233 contracts DA=63%; fruit company dominant IMSS direct-award capture"),
    (102728, "CONTROLES SISTEMAS AUTOMATICOS CFE SB",
             "single_bid_capture", 2013, 2017, "high", 648_000_000,
             "CFE 100% (648M), 85 contracts SB=80%; automation company dominant CFE single-bid capture"),
    (83929,  "JUAN GABINO HERNANDEZ CFE DA",
             "institutional_capture", 2011, 2015, "high", 300_000_000,
             "Individual person; CFE 100% (300M), 8 contracts DA=100%; natural person dominant CFE direct-award capture"),
    (136889, "GRUPO FIOLCA CONAGUA SB",
             "single_bid_capture", 2014, 2025, "high", 386_000_000,
             "CONAGUA 82.5% (319M) SB=100% + CONAPESCA SB=50% = 94.4%; 11 contracts SB=100% at CONAGUA; water infrastructure single-bid monopoly"),
    (62944,  "ALEJANDRO LEZAMA BRACHO SAE DA Ghost",
             "ghost_company", 2012, 2019, "high", 322_000_000,
             "Individual person; SAE 99.9% (322M), 2 contracts DA=100%; natural person 322M DA at asset-disposal agency — ghost pattern"),
    (52024,  "PROTEINAS Y OLEICOS DICONSA DA",
             "institutional_capture", 2010, 2023, "high", 605_000_000,
             "DICONSA 96.4% (583M) DA=100% + Bienestar 3.6% DA=100% = 100%; 1484 contracts DA=100%; protein supplier dominant DICONSA monopoly"),
    (58772,  "PROMARSA SCT SB",
             "single_bid_capture", 2010, 2011, "high", 289_000_000,
             "SCT 96.2% (278M) SB=100% + OAX-Caminos SB=100% = 100%; 3 contracts ALL SB; corporate company SCT single-bid capture"),
]

SKIPS = [
    (8135,   "PERFORACIONES MARITIMAS: PEMEX E&P 100% but SB=0% DA=0% — single competitive contract"),
    (251226, "LFB MEXICO: global French biopharmaceutical, dispersed health top=35%"),
    (194952, "BRIK SOLUTIONS: ISSSTE 90% but DA=33% SB=0% — both below threshold"),
    (44747,  "COMPUTADORAS ACCESORIOS: dispersed SEDENA+IPN top=49.8% SB=41% — below threshold"),
    (293262, "CONTROLADORA MABE: SEDENA 100% but SB=0% DA=0% — legitimate appliance company competitive"),
    (288631, "AMI ENERGY: CENAGAS 100% but DA=25% SB=50% — both below threshold"),
    (248371, "CITYCON: INIFED 97.7% but SB=0% DA=0% — competitive procurement"),
    (47206,  "SERVICIO INTEGRACION BIOMEDICA: IMSS 78% but DA=32%<50% SB=2% — below threshold"),
    (93800,  "PAPER LESS: FONACOT 99.8% but DA=50% SB=50% — neither threshold met"),
    (48368,  "AZUL INGENIERIA: CFE 100% but SB=58%<75% DA=31% — below threshold"),
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
