"""
GT Mining Batch WWW2 — 20 T3 vendors (v301950..v2339)
7 ADDs (cases max_id+1 .. max_id+7), 13 SKIPs
Guard: max_id must be 1261
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB, timeout=60)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1261:
    print(f"ABORT: expected max_id=1261, got {max_id}. Run VVV2 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+7}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (301950, "SERVICIOS INTEGRALES IRRIGACION CONAGUA SB",
             "single_bid_capture", 2023, 2025, "high", 600_000_000,
             "CONAGUA 100% (600M), 5 contracts SB=80%; irrigation services company dominant CONAGUA single-bid capture"),
    (46431,  "PROYECTOS CIMENTACIONES CME DA",
             "institutional_capture", 2010, 2015, "high", 724_000_000,
             "CME (PEMEX exploration) 100% (724M), 23 contracts DA=87%; industrial construction dominant CME direct-award capture"),
    (14995,  "SECO CONSTRUCCIONES ISIPE SB",
             "single_bid_capture", 2003, 2011, "high", 256_000_000,
             "ISIPE-Sonora 81.8% (256M), 22 contracts SB=100%; Sonora construction company dominant ISIPE single-bid capture"),
    (256433, "CONSTRUCCIONES MARCKSA SICT SB",
             "single_bid_capture", 2019, 2025, "high", 343_000_000,
             "SICT 93.0% (343M), 13 contracts SB=77%; construction company dominant SICT single-bid capture"),
    (63648,  "FIMPE FIDEICOMISO BANSEFI DA",
             "institutional_capture", 2011, 2018, "high", 964_000_000,
             "BANSEFI 100% (964M), 5 contracts DA=100%; investment trust 964M DA at savings bank — financial entity capture"),
    (25827,  "RESTAURANTES GROGI HGM SB",
             "single_bid_capture", 2006, 2025, "high", 383_000_000,
             "HGM 69.9% (383M) SB=100% + INR 20.9% SB=100% = 90.8%; 15 contracts SB=93%; restaurant company dominant hospital single-bid capture"),
    (114578, "TOTAL CREDIT ISSSTE SB Ghost",
             "ghost_company", 2013, 2013, "high", 273_000_000,
             "ISSSTE 100% (273M), 1 contract SB=100%; 2013 only; financial company 273M single-bid at social security — P2 ghost"),
]

SKIPS = [
    (5735,   "INSTITUTO NACIONAL INVESTIGACIONES NUCLEARES: IMSS=49.6%<60% DA=51% — concentration below threshold"),
    (87399,  "ACCORD FARMA: dispersed IMSS=34.7% top<60% — below concentration threshold"),
    (27161,  "GRUPO CORRADO: SSA=49.1%<60% DA=89% — concentration just below threshold"),
    (3749,   "SUMINISTROS MATERIAL DIDACTICO: dispersed CONAFE=47.5% DA=17% — below thresholds"),
    (3997,   "CONSORCIO GASOLINERO PLUS: dispersed top=20.1% SB=64%<75% — below all thresholds"),
    (83477,  "GRUPO HOSPITALES SAN JOSE: IMSS=92.3% but DA=50% SB=33% — DA at threshold, not above"),
    (4944,   "GRUPO BERTELL: ISSSTE=44.9%<60% DA=79% — concentration below threshold"),
    (52487,  "ECISA CONSTRUCCIONES: CFE 100% but DA=14% SB=29% — below both thresholds"),
    (57804,  "KANSAS CITY SOUTHERN: global US railroad company (CPKC), dispersed LICONSA=55.8% — global brand"),
    (289017, "QUIRORT: IMSS=91.3% but DA=25% SB=5% — competitive medical device supplier"),
    (129620, "AUTOTRANSPORTES HERRADURA: IMSS=94.4% but DA=38% SB=60%<75% — below both thresholds"),
    (49524,  "COLECCIONES FINAS: dispersed SAT=30.5% DA=30% SB=22% — below all thresholds"),
    (2339,   "EQUIPOS ELECTRICOS ALTA TENSION: CFE=96.2% but DA=72%<75% SB=8% — below threshold"),
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
