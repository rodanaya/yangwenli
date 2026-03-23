"""
GT Mining Batch HHH2 — 20 T3 vendors (v31027..v297064)
15 ADDs (cases max_id+1 .. max_id+15), 5 SKIPs
Guard: max_id must be 1087
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1087:
    print(f"ABORT: expected max_id=1087, got {max_id}. Run GGG2 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+15}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (136362, "COS CAMPESTRE ISSSTE Ghost",
             "ghost_company", 2014, 2016, "high", 594_000_000,
             "ISSSTE 100% (594M), 2 contracts SB=100% 2014-2016; ghost company capturing social security institute via single bids"),
    (61844,  "JOSE ESTAVILLO MUÑOZ Chihuahua Ghost",
             "ghost_company", 2015, 2020, "high", 394_000_000,
             "Individual person; Chihuahua Municipal 99.9% (394M), 2 contracts SB=100%; natural person capturing municipal government via single bids"),
    (193913, "COLEGIO ANN SULLIVAN IMSS Estancia",
             "ghost_company", 2024, 2024, "high", 1_029_000_000,
             "IMSS 100% (1029M), 1 contract 2024; special-ed school / 'Estancia Infantil El Sueno de Cri Cri' winning 1.03B IMSS daycare contract — massive mismatch ghost"),
    (9985,   "CONSTRUCCIONES TERRACERIAS SCT Capture",
             "single_bid_capture", 2003, 2024, "high", 1_155_000_000,
             "SCT 85%+SICT 7.1%+others=92.1%; 82 contracts SB=98%; 1.155B infrastructure construction dominant SCT single-bid pattern"),
    (124771, "PHARMA OSHA IMSS DA Pattern",
             "institutional_capture", 2010, 2024, "high", 418_000_000,
             "IMSS 99.8% (417M), 1431 contracts DA=86%; pharma company dominant IMSS direct-award capture"),
    (247045, "OMNI PRINTER BANOBRAS Mismatch",
             "ghost_company", 2015, 2020, "high", 395_000_000,
             "BANOBRAS 94% (372M) SB=100%; printer company winning 372M at development bank via SB — industry mismatch ghost"),
    (9049,   "GAMMA INGENIERIA CFE Capture",
             "institutional_capture", 2005, 2024, "high", 450_000_000,
             "CFE 98.5% (443M), 30 contracts DA=63% SB=37%; engineering construction company dominant CFE direct-award pattern"),
    (4431,   "TRANSPORTES BLINDADOS TAMEME Luz y Fuerza",
             "institutional_capture", 2002, 2011, "high", 1_022_000_000,
             "LUZ Y FUERZA DEL CENTRO 83.5% (853M) SB=100% + BANSEFI 12.6%; 31 contracts 2002-2011; armored transport monopoly at electricity company (LFC dissolved 2009)"),
    (53364,  "CONSTRUCTORA ESCALANTE SCT Capture",
             "single_bid_capture", 2005, 2024, "high", 1_383_000_000,
             "SCT 86.1% (1190M) SB=95% + CAPUFE 8.5% SB=100% = 94.6%; 29 contracts SB=93%; 1.383B infrastructure construction SCT monopoly"),
    (233629, "OPERADORA SERVICIOS MEDICOS ML IMSS-SEDENA",
             "institutional_capture", 2005, 2024, "high", 216_000_000,
             "IMSS 61.9% DA=98% + SEDENA 33% = 94.9%; 488 contracts DA=95%; medical services operator mass DA at IMSS+SEDENA"),
    (298422, "METALMECANICA GOLFO IMP Capture",
             "institutional_capture", 2015, 2020, "high", 357_000_000,
             "IMP (Instituto Mexicano del Petroleo) 94% (336M) SB=100%; metalworking company capturing petroleum research institute via SB"),
    (266106, "CONSTRUCCIONES PEÑASCOS SONORA Capture",
             "institutional_capture", 2018, 2024, "high", 666_000_000,
             "Sonora INFRAESTRUCTURA 99.5% (993M) SB=80%; 5 contracts; 666M Sonora state infrastructure capture"),
    (93142,  "ELIA GUADALUPE CARRILLO CRUZ CFE Ghost",
             "ghost_company", 2011, 2017, "high", 713_000_000,
             "Individual person; CFE 100% (713M), 8 contracts ALL SB=100%; single 709M SB contract at CFE 2017; natural person ghost"),
    (266814, "BERNA MEDICAMENTOS IMSS-ISSSTE DA",
             "institutional_capture", 2010, 2024, "high", 817_000_000,
             "IMSS 76.9% (628M) DA=82% + ISSSTE 13.5% DA=75% = 90.4%; 152 contracts DA=53%; medicine DA capture at IMSS+ISSSTE"),
    (197029, "DISTRIBUIDORA HOSPITALARIA MB IMSS",
             "institutional_capture", 2005, 2024, "high", 842_000_000,
             "IMSS 85.5% (720M) DA=89% + ISSSTE 9.1% = 94.6%; 1487 contracts DA=89%; hospital distributor dominant IMSS direct-award pattern"),
]

SKIPS = [
    (31027,  "KOOLFER: dispersed health institutions top=44.8% DA=17% SB=7% — below threshold"),
    (2363,   "ROHDE & SCHWARZ: global German brand, dispersed telecom top=35.8%"),
    (18801,  "ITESM: legitimate private university, dispersed DA=89% to research/consulting"),
    (647,    "MEDICAMENTOS POPULARES BAZAR: NAFIN 75% but DA=43% SB=11% — below threshold"),
    (297064, "JAGEN COMERCIALIZADORA: GN 97.9% but SB=50% <75% — below threshold"),
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

    # Update review_status
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
