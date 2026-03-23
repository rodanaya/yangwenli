"""
GT Mining Batch III2 — 20 T3 vendors (v143627..v239452)
14 ADDs (cases max_id+1 .. max_id+14), 6 SKIPs
Guard: max_id must be 1102
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1102:
    print(f"ABORT: expected max_id=1102, got {max_id}. Run HHH2 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+14}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (143627, "CONALITEG Name Ghost at INEE",
             "ghost_company", 2010, 2020, "high", 302_000_000,
             "INEE 100% (302M), 1 contract DA=100%; vendor named after CONALITEG (free textbooks commission) at INEE; P2 ghost company flag"),
    (30689,  "MAC FORMAS DICONSA DA Capture",
             "institutional_capture", 2005, 2024, "high", 300_000_000,
             "DICONSA 98.5% (295M), 29 contracts ALL DA=100%; forms/products company DA monopoly at food distribution state company"),
    (36163,  "EXORTA IMSS DA Capture",
             "institutional_capture", 2010, 2024, "high", 286_000_000,
             "IMSS 96.5% (276M), 204 contracts DA=74%; DA=87% overall; dominant IMSS direct-award pattern"),
    (42759,  "REPRESENTACIONES OPV PEMEX DA",
             "institutional_capture", 2005, 2024, "high", 252_000_000,
             "PEMEX Corp 89.6% (225M), 25 contracts DA=64%; DA=82% overall; PEMEX direct-award capture"),
    (3985,   "CONSTRUCTORA GALLO MEDA SCT SB Multi",
             "single_bid_capture", 2005, 2024, "high", 869_000_000,
             "SCT 41.4% SB=100% + FIT 19.3% SB=100% + PUE 15% = 75.7%; 28 contracts SB=96%; multi-agency infrastructure single-bid pattern"),
    (3315,   "CONSEER Port-CONAGUA SB Capture",
             "single_bid_capture", 2005, 2024, "high", 612_000_000,
             "API-Topolo 47.1%+CONAGUA 23.3%+Oaxaca 22.5%=92.9%; 16 contracts ALL SB=100%; port+water agency single-bid monopoly"),
    (96175,  "AXMILAB IMSS DA Capture",
             "institutional_capture", 2010, 2024, "high", 636_000_000,
             "IMSS 93.7% (596M), 41 contracts DA=66%; DA=53% overall; clinical lab dominant IMSS direct-award pattern"),
    (105386, "LAVA TAP Multi-Security DA",
             "institutional_capture", 2010, 2020, "medium", 421_000_000,
             "Policia Federal 44.7%+SRE 20.8%+Presidencia 16.4%+others=81.9%; DA=100% all contracts; services company DA capture across security agencies"),
    (5243,   "ENDOMEDICA IMSS-IMSS Bienestar DA",
             "institutional_capture", 2005, 2024, "high", 1_247_000_000,
             "IMSS-Bienestar 37.6%+IMSS 36.9%=74.5% combined; 2191 contracts DA=67%; endoscopy/medical services dominant IMSS capture"),
    (25408,  "OLABUENAGA CHEMISTRI Turismo Mismatch",
             "ghost_company", 2010, 2024, "medium", 1_014_000_000,
             "CPTM 56.4%+23.3%=79.7%+FONATUR 17.6%=97.3%; DA=50% SB=36%; chemistry company capturing tourism promotion agencies — industry mismatch"),
    (111514, "GABRIEL BALAN SONDA CFE DA",
             "institutional_capture", 2010, 2024, "high", 569_000_000,
             "Individual person; CFE 100% (569M), 22 contracts DA=55% SB=41%; natural person dominant CFE capture"),
    (146040, "DESARROLLOS MUSEOGRAFICOS Cultura DA",
             "institutional_capture", 2010, 2024, "medium", 229_000_000,
             "Secretaria de Cultura 70.1%+INAH 16.6%=86.7%; 28 contracts DA=57% SB=29%; museum design company DA capture at culture agencies"),
    (56791,  "REMACALGA CFE DA Capture",
             "institutional_capture", 2005, 2024, "high", 559_000_000,
             "CFE 99.9% (559M), 74 contracts DA=54% SB=45%; dominant CFE direct-award capture"),
    (239452, "AZTEC MEDIC IMSS DA Capture",
             "institutional_capture", 2010, 2024, "high", 893_000_000,
             "IMSS-Bienestar 77.6%+IMSS 18.7%=96.3%; 927 contracts DA=62%; medical supply dominant IMSS capture"),
]

SKIPS = [
    (268015, "CORPORATIVO MEDICO COMMUNITY DOCTORS: NAFIN+INDEP 100% but DA=33% SB=0% — below threshold"),
    (22177,  "ORGANIZACION 15: PEMEX 86.1% but SB=69%<75% DA=9% — below threshold"),
    (59187,  "CONSTRUCCIONES CAIBER: CONAPESCA+SICT+FONATUR dispersed top=33.9%, DA=73%"),
    (33505,  "ELECTRO FERRETERA FESA: MEX-Finanzas 99.9% but overall DA=40% <50%"),
    (312130, "3TI SA DE CV: INDEP 97.3% (733M) but DA=20% SB=0% — below threshold"),
    (34498,  "SERV INTERNACIONAL: CFE 100% (1182M) but SB=43% DA=0% — below threshold"),
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
