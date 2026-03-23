"""
GT Mining Batch LLL2 — 20 T3 vendors (v44290..v45494)
11 ADDs (cases max_id+1 .. max_id+11), 9 SKIPs
Guard: max_id must be 1140
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1140:
    print(f"ABORT: expected max_id=1140, got {max_id}. Run KKK2 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+11}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (44290,  "DISFAB IMSS DA Capture",
             "institutional_capture", 2012, 2024, "high", 304_000_000,
             "IMSS 78.3% (238M) DA=92% + ISSSTE 7.2% = 85.5%; 342 contracts DA=92%; medical supplies dominant IMSS direct-award capture"),
    (140841, "INNOVAMEDIK MEX-Salud Ghost",
             "ghost_company", 2014, 2015, "high", 375_000_000,
             "MEX-Salud 50.7% (190M) SB=100% + MEX-ISEM 49.3% (185M) SB=100% = 100%; 2 contracts ALL SB; ghost capturing federal health + state health of Mexico"),
    (288101, "CISA CAPACITACION ISSSTE Ghost",
             "ghost_company", 2022, 2023, "medium", 353_000_000,
             "ISSSTE 100% (353M), 2 contracts DA=50% SB=50%; 2022-2023 training company winning 353M at social security — recent ghost pattern"),
    (109461, "SERVICIOS SALUD SINALOA ISSSTE DA",
             "institutional_capture", 2013, 2025, "high", 206_000_000,
             "ISSSTE 100% (206M), 88 contracts DA=74%; company uses state health services name; dominant ISSSTE direct-award capture"),
    (118516, "CENTRO TECNOLOGIAS SURESTE IMSS-ISSSTE",
             "institutional_capture", 2013, 2025, "high", 780_000_000,
             "IMSS 62.3% (486M) SB=75% + ISSSTE 14% DA=100% = 76.3%; 8 contracts; tech company dominant IMSS+ISSSTE single-bid capture"),
    (198258, "ZITUM DESARROLLADORES Sonora-CAPUFE SB",
             "single_bid_capture", 2017, 2025, "medium", 532_000_000,
             "Sonora-ICT 22.2%+CAPUFE 19.2%+Sonora-SICT 17.3%+SCT 7.5%=66.2% SB=100%; 23 contracts; infrastructure developer multi-agency single-bid pattern"),
    (33269,  "VIGUETAS BOVEDILLAS Sinaloa SB",
             "single_bid_capture", 2007, 2013, "high", 285_000_000,
             "SIN-Obras 88.4% (252M) SB=100% + SOPT 11.6% (33M) SB=100% = 100%; 2 contracts ALL SB; Sinaloa construction state monopoly via single bids"),
    (29297,  "LEVBETH MEDICAL IMSS-ISSSTE DA",
             "institutional_capture", 2007, 2025, "medium", 412_000_000,
             "IMSS 42.7% DA=73% + ISSSTE 26.5% DA=74% + INNN 9% DA=57% = 78.2%; 529 contracts DA≈70%; medical devices multi-health-institute direct-award capture"),
    (56196,  "RR MEDICA IMSS DA Capture",
             "institutional_capture", 2010, 2025, "high", 248_000_000,
             "IMSS 100% (248M), 182 contracts DA=70%; dominant IMSS direct-award medical supply capture"),
    (103180, "NACER INFRAESTRUCTURA SCT Ghost",
             "ghost_company", 2013, 2013, "high", 424_000_000,
             "SCT 100% (424M), 2 contracts ALL SB=100%; 2013 only; dual massive single-bid contracts at transport ministry — ghost company pattern"),
    (45494,  "CONSTRUCCIONES URB Queretaro DA",
             "institutional_capture", 2010, 2022, "high", 293_000_000,
             "QRO-SDU 68.4% (200M) DA=75% + SCT 14% + QRO-CEI 12.3% = 94.7%; 13 contracts; Queretaro state construction dominant DA capture"),
]

SKIPS = [
    (13999,  "COMBUSTIBLES SURESTE: IMSS 75.3% but SB=60%<75% DA=26%<50% — below threshold"),
    (12288,  "TRANSPORTES CALIDAD: CFE 95.5% but DA=38% SB=49% — both below threshold"),
    (294586, "EUREKA SALUD: IMSS 100% but SB=0% DA=50% insufficient — only 2 new contracts"),
    (11396,  "FRIDMAY: dispersed BANSEFJETO+SEDENA top=33.1% DA=4% SB=8% — below threshold"),
    (82536,  "CIRUGIA LAPAROSCOPICA: IMSS 100% but DA=27% SB=0% — below threshold"),
    (8138,   "NOBLE DRILLING: global offshore brand, PEMEX 2 competitive contracts 2002"),
    (18830,  "SISTEMAS DIGITALES JASY: dispersed education+health top=50.8% SB=22% DA=0%"),
    (4370,   "PROGRAMACION COMERCIAL: dispersed national hospitals top=26.9%, 1229 ctrs"),
    (5660,   "UNIFORMES INDUSTRIALES COMANDO: PEMEX dispersed top=38.7% DA=0% competitive"),
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
