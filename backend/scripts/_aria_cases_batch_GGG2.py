"""
GT Mining Batch GGG2 — 20 T3 vendors (v27442..v19736)
10 ADDs (cases max_id+1 .. max_id+10), 10 SKIPs
Guard: max_id must be 1077
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1077:
    print(f"ABORT: expected max_id=1077, got {max_id}. Run FFF2 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+10}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (27442,  "COMPANIA MULTISERVICIOS PEMEX Capture",
             "institutional_capture", 2002, 2024, "medium", 369_000_000,
             "PEMEX Corp 53.7%+PEMEX E&P 38%+CME 8.4%=100%; 5 contracts SB=80% DA=20%; maintenance services PEMEX full capture"),
    (67240,  "DRAGADOS ECOLOGICOS CONAPESCA-Tamaulipas SB",
             "single_bid_capture", 2005, 2020, "high", 212_000_000,
             "CONAPESCA 48.9%+TAMPS-SOT 44.4%+CHIH-SOT 6.6%=99.9%; 8 contracts ALL 100% SB; ecological dredging multi-agency single-bid pattern"),
    (46361,  "CONSULTORIA INGENIERIA SOLUCIONES CONAGUA Capture",
             "institutional_capture", 2008, 2024, "high", 728_000_000,
             "CONAGUA 96% (698M), 17 contracts SB=94%; engineering consultancy dominant CONAGUA single-bid capture"),
    (166422, "L Y D TECHNOLOGIES CNH Capture",
             "institutional_capture", 2015, 2020, "high", 249_000_000,
             "CNH (Comision Nacional de Hidrocarburos) 99.9% (248M), 2 contracts SB=100%; tech company capturing hydrocarbons regulator"),
    (157965, "DORIAN RUBISSEL MAZARIEGOS SOLIS IMSS DA",
             "institutional_capture", 2005, 2024, "high", 565_000_000,
             "Individual person; IMSS 99.3% (561M), 515 contracts DA=98%; natural person winning 561M at IMSS through mass direct awards"),
    (162317, "MAW ASOCIADOS Guerrero Capture",
             "single_bid_capture", 2010, 2024, "high", 239_000_000,
             "Guerrero State 73%+Guerrero Finanzas 13.2%=86.2% SB=100%; IMSS 13.8% DA=100%; 37 contracts; state government capture"),
    (58577,  "LIMPIO CFE Cleaning Capture",
             "institutional_capture", 2008, 2020, "medium", 250_000_000,
             "CFE 99.8% (250M), 8 contracts SB=75% DA=25%; cleaning services monopoly at electricity utility"),
    (152109, "DESARROLLO ESTRATEGICO TULA CFE SB",
             "single_bid_capture", 2010, 2020, "high", 646_000_000,
             "CFE 100% (646M), 4 contracts ALL SB=100%; 'strategic development' company capturing CFE via single bids"),
    (10421,  "PROYECTOS Y CONSTRUCCIONES SUR Oaxaca Capture",
             "single_bid_capture", 2005, 2024, "high", 1_119_000_000,
             "Oaxaca Infraestructura 66%+Oaxaca SOC 30%+others=99.4%; 6 contracts ALL 100% SB; 1.1B Oaxaca state construction monopoly"),
    (128201, "PD RIGS CFE Ghost",
             "ghost_company", 2015, 2020, "high", 598_000_000,
             "CFE 100% (598M), 1 contract SB=100%; single massive single-bid contract at electricity utility; ghost company pattern"),
]

SKIPS = [
    (11365,  "INSYS: STPS 53.2%+SRE 27.4%+SAT 16.8%=97.4% but SB=50% DA=27% — below threshold"),
    (1827,   "DE LORENZO OF AMERICA: dispersed education sector top=12.6%, 181 ctrs, legitimate lab equipment"),
    (2915,   "TOLLOCAN MOTORS: dispersed vehicle dealer top=23.9% DA=4% SB=29%"),
    (41316,  "CAR ONE MONTERREY: dispersed vehicle dealer top=22.8% DA=8% SB=27%"),
    (17567,  "TGC GEOTECNIA: CAPUFE+SCT dispersed, SB=61% overall <75%, legitimate geotechnical firm"),
    (43387,  "PRODUCTOS METALICOS STEELE: dispersed top=17.2%, 342 ctrs, legitimate metal products"),
    (3856,   "CORPORACION ANALITICA: INNN 78.1% but overall DA=47% <50% — below threshold"),
    (39770,  "TRANSPORTES THE BIMBS: IEPSA 71.5% SB=100% but mixed signal, overall DA=66% at other institutions"),
    (130752, "MEDIDORES DELAUNET: water utilities top=38.8%+18%=57%, SB=62% — below threshold"),
    (19736,  "QUARKSOFT: ISSSTE 99.3% but DA=0% SB=33% — competitive procurement dominant"),
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

    # Update review_status for ADDs
    for i, case in enumerate(CASES):
        conn.execute("UPDATE aria_queue SET review_status='reviewed', reviewer_notes=? WHERE vendor_id=?",
                     (f"GT:{max_id+1+i}", case[0]))
    # Update review_status for SKIPs
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
