"""
GT Mining Batch RRR2 — 20 T3 vendors (v64721..v47586)
16 ADDs (cases max_id+1 .. max_id+16), 4 SKIPs
Guard: max_id must be 1212
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB, timeout=60)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1212:
    print(f"ABORT: expected max_id=1212, got {max_id}. Run QQQ2 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+16}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (64721,  "ANGEL CESAR CARO MONTES CFE DA",
             "institutional_capture", 2010, 2017, "high", 373_000_000,
             "Individual person; CFE 100% (373M), 17 contracts DA=94%; natural person dominant CFE direct-award capture"),
    (118975, "MEXICANA DE INDUSTRIAS Y MARCAS DICONSA DA",
             "institutional_capture", 2013, 2022, "high", 558_000_000,
             "DICONSA 100% (558M), 793 contracts DA=100%; commercial company dominant DICONSA direct-award monopoly"),
    (104258, "CLASE AGROINDUSTRIAL DICONSA DA",
             "institutional_capture", 2013, 2025, "high", 573_000_000,
             "DICONSA 87.6% (502M) DA=98.7% + SADER 12.4% = 100%; 783 contracts; agroindustrial company dominant DICONSA capture"),
    (45040,  "SABORMEX DICONSA DA Monopoly",
             "institutional_capture", 2010, 2022, "high", 550_000_000,
             "DICONSA 100% (550M), 4008 contracts DA=99.9%; food company dominant DICONSA direct-award monopoly"),
    (37985,  "GRUPO ALCAMERA DICONSA DA",
             "institutional_capture", 2008, 2013, "high", 465_000_000,
             "DICONSA 100% (465M), 105 contracts DA=100%; commercial group dominant DICONSA direct-award capture"),
    (48444,  "COMERCIAL DOS COSTAS DICONSA DA",
             "institutional_capture", 2010, 2025, "high", 490_000_000,
             "DICONSA 88.7% (453M) DA=99.8% + others = 100%; 1402 contracts; commercial company dominant DICONSA capture"),
    (47119,  "GANADEROS LECHE PURA SAPI DICONSA DA",
             "institutional_capture", 2010, 2022, "high", 480_000_000,
             "DICONSA 100% (480M), 1050 contracts DA=100%; dairy cooperative dominant DICONSA direct-award monopoly"),
    (314043, "COPAS CONSTRUCCIONES CENAGAS Ghost",
             "ghost_company", 2025, 2025, "high", 379_000_000,
             "CENAGAS 100% (379M), 1 contract SB=100%; 2025 only; construction-logistics company 379M single-bid at gas control center — P2 ghost"),
    (45127,  "INDUSTRIALIZADORA OLEOFINOS LICONSA DA",
             "institutional_capture", 2010, 2023, "high", 487_000_000,
             "LICONSA 95% (462M) DA=91% + others = 100%; 277 contracts; oil-processing company dominant LICONSA direct-award capture"),
    (45029,  "COMERCIALIZADORA ELORO DICONSA DA Monopoly",
             "institutional_capture", 2010, 2023, "high", 666_000_000,
             "DICONSA 99% (653M), 3649 contracts DA=99.9%; commercial company dominant DICONSA direct-award monopoly"),
    (49140,  "PROMOTORA VALE VIVIENDA CODESON Ghost",
             "ghost_company", 2011, 2011, "high", 378_000_000,
             "CODESON (Sonora sports commission) 100% (378M), 1 contract SB=100%; 2011 only; housing company 378M SB at Sonora sports commission — industry mismatch P2 ghost"),
    (151415, "PROCESADORA AGROINDUSTRIAL NORTE DICONSA DA",
             "institutional_capture", 2015, 2021, "high", 369_000_000,
             "DICONSA 100% (369M), 42 contracts DA=95%; agroindustrial co-op dominant DICONSA direct-award capture"),
    (112745, "INTEGRACION PROCESOS INGENIERIA CDMX DA Ghost",
             "ghost_company", 2013, 2013, "medium", 205_000_000,
             "CDMX-Obras 100% (205M), 1 contract DA=100%; 2013 only; engineering company 205M direct-award at Mexico City public works — P2 ghost"),
    (203829, "CAI DEL PONIENTE DICONSA DA",
             "institutional_capture", 2017, 2019, "high", 332_000_000,
             "DICONSA 100% (332M), 15 contracts DA=100%; food industry company dominant DICONSA direct-award capture"),
    (45039,  "INDUSTRIAL ACEITERA LICONSA-DICONSA DA",
             "institutional_capture", 2010, 2021, "high", 425_000_000,
             "LICONSA 79% (337M) DA=75% + DICONSA 21% DA=100% = 100%; 675 contracts; oil-seed company dominant LICONSA+DICONSA capture"),
    (47586,  "GANADEROS LECHE PURA DICONSA DA",
             "institutional_capture", 2010, 2024, "high", 307_000_000,
             "DICONSA 90% (277M) DA=100% + others 10%; 303 contracts DA=100%; dairy group dominant DICONSA direct-award capture"),
]

SKIPS = [
    (5223,   "PROTEIN: IMSS 76.5% DA=43% SB=0% + ISSSTE 8.7% — top=60%<75% DA below threshold, competitive health supplier"),
    (309165, "MARO HEALTH: IMSS 100% but DA=0% SB=0% — single competitive contract"),
    (47489,  "RICARDO RAMOS HERRERA: CFE 100% but DA=73%<75% SB=23% — both below threshold"),
    (87856,  "FCC CONSTRUCCION: global Spanish construction company (FCC Group), SCT 1 competitive SB contract"),
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
