"""
GT Mining Batch III3 — 20 T3 vendors (v18080..v308561)
4 ADDs (cases max_id+1 .. max_id+4), 16 SKIPs
Guard: max_id must be 1356
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB, timeout=60)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1356:
    print(f"ABORT: expected max_id=1356, got {max_id}. Run HHH3 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+4}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (44281,  "PROVEEDORA INSUMOS HOSPITALARIOS MEDICAMENTOS MAYOREO IMSS DA",
             "institutional_capture", 2013, 2019, "high", 232_000_000,
             "IMSS 96.2% (232M), 88 contracts DA=92%; medical supply distributor dominant IMSS direct-award capture"),
    (57685,  "ALFEJ MEDICAL ITEMS IMSS DA",
             "institutional_capture", 2010, 2025, "high", 198_000_000,
             "IMSS 88.3% (198M), 1260 contracts DA=91%; medical items company dominant IMSS direct-award capture"),
    (50578,  "ASFALTOS GUADALAJARA SCT SB",
             "single_bid_capture", 2010, 2021, "high", 961_000_000,
             "SCT+SICT combined 93.9% (961M), 28 contracts SB=94%; paving company dominant SCT/SICT single-bid capture"),
    (308561, "LOCOMOTORAS SAN LUIS FIT DA Ghost",
             "ghost_company", 2024, 2025, "high", 1_189_000_000,
             "FIT (Ferrocarril del Istmo de Tehuantepec) 100% (1189M), 2 contracts DA=100%; 2024-2025 only; locomotive company 1189M DA at Istmo railway megaproject — P2 ghost"),
]

SKIPS = [
    (18080,  "CONSORCIO EMPRESAS INGENIERIA: dispersed NL=33.2%<60% — below concentration threshold"),
    (49063,  "GRUPO ACIR NACIONAL: dispersed IMSS=12.5%<60% DA=100% — below concentration threshold"),
    (197413, "SERVICIENTIFICA-MEDICA: dispersed INNSZ=36.2%<60% — below concentration threshold"),
    (34380,  "PRODUCTORA SHN: DA=20.6%<50% SB=3.2%<75% — both below threshold"),
    (1610,   "DEDUTEL EXPORTACIONES: DA=5.9%<50% SB=21.8%<75% — both below threshold"),
    (35629,  "CONSTRUCTORES DE JALTOCAN: dispersed SCT=23%<60% — below concentration threshold"),
    (12583,  "CONSTRUCCIONES NIRVANA: ISSSTE=56.5%<60% — marginally below concentration threshold"),
    (10773,  "AUDIPHARMA: DA=0% SB=1.7% — competitive pharmaceutical supplier"),
    (119679, "ADMINISTRACION LOGISTICA LINEA 7: DA=38.5%<50% SB=0% — both below threshold"),
    (258671, "GRUPO ABUNDANZAA: dispersed top=7.1%<60% DA=7.1% — below concentration threshold"),
    (97165,  "RT4 MEXICO: CAPUFE=47.9%<60% SB=78.1% — concentration below threshold"),
    (19486,  "PROVEEDORA MEXICANA ARTICULOS CURACION: ISSSTE=55.3%<60% — below concentration threshold"),
    (46178,  "MULTIMEDIOS: dispersed SEGOB=22.9%<60% DA=100% — below concentration threshold"),
    (43773,  "ARTECHE NORTH AMERICA: DA=20%<50% SB=45.5%<75% — both below threshold"),
    (125203, "ABASTECEDORA INSUMOS SALUD: dispersed CRAECH=35.5%<60% — below concentration threshold"),
    (227121, "SILENT4BUSINESS: SB=60%<75% DA=13.3% — SB at but not above threshold"),
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
