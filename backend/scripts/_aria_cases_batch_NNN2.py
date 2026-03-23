"""
GT Mining Batch NNN2 — 20 T3 vendors (v36748..v47705)
13 ADDs (cases max_id+1 .. max_id+13), 7 SKIPs
Guard: max_id must be 1163
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1163:
    print(f"ABORT: expected max_id=1163, got {max_id}. Run MMM2 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+13}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (82616,  "PERCOMSA CFE DA Capture",
             "institutional_capture", 2012, 2014, "high", 434_000_000,
             "CFE 100% (434M), 4 contracts DA=75%; electrical company dominant CFE direct-award capture"),
    (51057,  "CONDUCCION FLUIDOS CFE DA Ghost",
             "ghost_company", 2010, 2012, "high", 383_000_000,
             "CFE 100% (383M), 2 contracts DA=100%; 2010-2012 only; dual massive DA contracts at electricity utility — ghost pattern"),
    (190335, "CONSTRUCTORA LESA Cross-State SB",
             "single_bid_capture", 2016, 2019, "high", 284_000_000,
             "Tlaxcala 57.3% (162M) SB=100% + SCT 41.9% (119M) SB=100% = 99.2%; 4 contracts ALL SB; cross-state+federal infrastructure single-bid pattern"),
    (82699,  "SOLAR INGENIERIA API-Port SB",
             "single_bid_capture", 2010, 2020, "high", 224_000_000,
             "API-Progreso 81.2% (182M) SB=100% + API-Veracruz 14.4% SB=100% = 95.6%; 6 contracts SB=100%; port authority engineering single-bid monopoly"),
    (49619,  "PROINCO PROCESS CFE DA",
             "institutional_capture", 2010, 2017, "high", 422_000_000,
             "CFE 100% (422M), 30 contracts DA=80%; process engineering company dominant CFE direct-award capture"),
    (46874,  "COMERCIAL ESSEX CFE DA",
             "institutional_capture", 2010, 2024, "high", 1_333_000_000,
             "CFE 100% (1333M), 167 contracts DA=72%; commercial supply company dominant CFE direct-award monopoly"),
    (12991,  "ENTER COMPUTADORAS INEGI SB",
             "single_bid_capture", 2003, 2025, "high", 232_000_000,
             "INEGI 67% (155M) SB=100% + BANSEFJETO 20.3% = 87.3%; 28 contracts; IT company INEGI single-bid capture"),
    (172656, "LAS ARACELIS DICONSA DA Capture",
             "institutional_capture", 2016, 2025, "high", 284_000_000,
             "DICONSA 69.5% (197M) DA=100% + Alimentacion Bienestar 25.4% DA=100% = 94.9%; 29 contracts DA=100%; food distributor dominant DICONSA capture"),
    (283655, "LAVANDERIAS IMSS Ghost",
             "ghost_company", 2022, 2022, "high", 1_098_000_000,
             "IMSS 100% (1098M), 2 contracts DA=50% SB=50%; 2022 only; laundry services company 1.1B at IMSS in single year — P2 ghost"),
    (76269,  "ADRIAN CADENA RODRIGUEZ SAE DA Ghost",
             "ghost_company", 2012, 2020, "high", 343_000_000,
             "Individual person; SAE 93.8% (322M) DA=100% + API 6.2% DA=100% = 100%; 3 contracts ALL DA; natural person capturing asset-disposal agency"),
    (126184, "GRUPO ORME DICONSA DA Capture",
             "institutional_capture", 2014, 2021, "high", 239_000_000,
             "DICONSA 99.8% (239M) DA=100%; 149 contracts; supply group dominant DICONSA direct-award monopoly"),
    (20591,  "TRANSPORTES ESPECIALIZADOS IMSS SB",
             "single_bid_capture", 2005, 2025, "high", 1_142_000_000,
             "IMSS 99.8% (1140M), 234 contracts SB=76%; transport company dominant IMSS single-bid monopoly"),
    (47705,  "INGENIERIA VIAL TRANSPORTE SCT SB",
             "single_bid_capture", 2010, 2025, "high", 418_000_000,
             "SCT 90.1% (376M) SB=88% + Sonora-SICT SB=100% = 96.6%; 18 contracts SB=89%; road engineering SCT single-bid monopoly"),
]

SKIPS = [
    (36748,  "ALKAN QUIMICA: LICONSA 100% but DA=30% SB=20% — both well below threshold"),
    (68,     "GUTIERREZ DE VELASCO: dispersed CONAGUA+ports top=26.7% — below threshold"),
    (21089,  "DOS MIL INGENIERIA: dispersed Sonora+SAGARPA top=41.9% SB=67% — below threshold"),
    (45058,  "ELECTROCONSTRUCTORA RIOS: CFE 100% but SB=69%<75% DA=24% — just below threshold"),
    (6978,   "MAC IMPRESOS: dispersed INEA+IEP top=51.8% SB=0% — below threshold"),
    (31400,  "CALIDAD XXI: SEDENA 96.6% but SB=0% DA=0% — competitive procurement dominant"),
    (54051,  "EVYA: PEMEX Corp 100% but SB=71%<75% DA=29% — below threshold"),
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
