"""
GT Mining Batch XXX2 — 20 T3 vendors (v57688..v61847)
7 ADDs (cases max_id+1 .. max_id+7), 13 SKIPs
Guard: max_id must be 1268
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB, timeout=60)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1268:
    print(f"ABORT: expected max_id=1268, got {max_id}. Run WWW2 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+7}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (57165,  "R R EMPRESARIAL SCT-SICT SB",
             "single_bid_capture", 2011, 2019, "high", 555_000_000,
             "SCT+SICT 74.7% (450M) SB=100% + CAPUFE 16.9% SB=100% = 91.6%; 22 contracts ALL SB; transport company dominant SCT/SICT single-bid monopoly (SCT renamed SICT in 2020)"),
    (10986,  "PRO-MEDICA GARCIA IMSS DA Monopoly",
             "institutional_capture", 2002, 2025, "high", 456_000_000,
             "IMSS 95.1% (456M), 3829 contracts DA=91%; medical supply company dominant IMSS direct-award monopoly"),
    (55737,  "INGENIERIA NEGOCIOS SOSTENIBLES SIN SB",
             "single_bid_capture", 2010, 2025, "high", 392_000_000,
             "SINALOA-State 81.3% (392M) SB=100%; 29 contracts SB=83%; Sinaloa construction company dominant state government single-bid capture"),
    (24904,  "SEPISA CFE SB",
             "single_bid_capture", 2006, 2020, "high", 373_000_000,
             "CFE 65.0% (373M) SB=93%; 57 contracts SB=93%; construction company dominant CFE single-bid capture"),
    (232780, "COMERCIALIZADORA MEDICAMENTOS IMSS DA",
             "institutional_capture", 2018, 2025, "high", 578_000_000,
             "IMSS 97.8% (578M), 1052 contracts DA=91%; pharma distributor dominant IMSS direct-award monopoly"),
    (252053, "COMERCIALIZADORA OPERADORA SERVICIOS IMSS DA",
             "institutional_capture", 2019, 2025, "high", 480_000_000,
             "IMSS 98.4% (480M), 283 contracts DA=98%; services company dominant IMSS direct-award capture"),
    (103071, "AGO OPERADORES MOR SB",
             "single_bid_capture", 2013, 2024, "high", 391_000_000,
             "Morelos-State 69.3% (391M) SB=100% + SCT 21.4% SB=100% = 90.7%; 14 contracts SB=93%; operator company dominant Morelos single-bid capture"),
]

SKIPS = [
    (57688,  "PEGO MEDICAL: dispersed INR=28.8% INER=22.3% IMSS=15% DA=84% — top institution below threshold"),
    (270,    "INGENIERIA OPERATIVA: dispersed ANAM=36.6% DA=37% SB=40% — below all thresholds"),
    (2154,   "EQUIPOS REDES ELECTRICAS: CFE 100% but DA=37% SB=21% — below both thresholds"),
    (38847,  "QIAGEN MEXICO: global German diagnostics company, top=58.3%<60% — global brand below threshold"),
    (177910, "INMOBILIARIA ZENI: SEDATU=92.5% but DA=47%<50% SB=53%<75% — both below threshold"),
    (54436,  "EXPEKTA CONSTRUCCIONES: SB=95% but dispersed JAL=45.9%<60% — below concentration threshold"),
    (26283,  "COMPANIA INTERNACIONAL DISTRIBUCIONES: dispersed IMSS=47.8%<60% DA=33% — below thresholds"),
    (55451,  "COMSA: global Spanish construction company (COMSA Group), 1 competitive SB contract at SCT"),
    (288330, "FARMALIC: IMSS+group=93.8% but DA=65%<75% — below threshold"),
    (43548,  "ASPELAB DE MEXICO: dispersed IMSS=27.5%<60% DA=66% — below concentration threshold"),
    (41707,  "SECOLIMPSA: dispersed SAT=41.9% ISSSTE=33.8% DA=43% SB=42% — below all thresholds"),
    (12320,  "SYSMOVIL: CFE 100% but DA=35% SB=55%<75% — below both thresholds"),
    (61847,  "IMEDIC: dispersed ISSSTE=23.9%<60% DA=38% SB=20% — below all thresholds"),
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
