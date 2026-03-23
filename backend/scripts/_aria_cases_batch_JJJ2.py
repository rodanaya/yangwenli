"""
GT Mining Batch JJJ2 — 20 T3 vendors (v2904..v188639)
12 ADDs (cases max_id+1 .. max_id+12), 8 SKIPs
Guard: max_id must be 1116
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1116:
    print(f"ABORT: expected max_id=1116, got {max_id}. Run III2 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+12}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (2904,   "OBRAS MARITIMAS HB CFE-SCT SB",
             "single_bid_capture", 2005, 2024, "high", 545_000_000,
             "CFE 58.2%+SCT 21.7%+CONAPESCA 18.6%=98.5%; 9 contracts ALL SB=100%; maritime works multi-agency single-bid pattern"),
    (104471, "MAG PRODUCCIONES CULTURA DA",
             "institutional_capture", 2010, 2024, "medium", 217_000_000,
             "Cultura 83.1%+INBA 16.4%=99.5%; 19 contracts DA=58%; production company DA capture at culture/arts agencies"),
    (59456,  "PHOENIX FARMACEUTICA INNN-Oaxaca SB",
             "single_bid_capture", 2015, 2020, "high", 1_143_000_000,
             "INNN 57.9% (662M) SB=100% + OAX-Salud 42.1% (481M) SB=100% = 100%; 2 contracts 1.143B ALL SB; pharma ghost winning neurology+state health"),
    (146531, "GRUPO W COM SCT-SEP SB",
             "single_bid_capture", 2015, 2020, "medium", 629_000_000,
             "SCT 61.9% (390M) SB=100% + SEP 37.4% (236M) SB=100% = 99.3%; 3 contracts; 99.3% of value SB=100% across comms+education ministries"),
    (43212,  "OPERADORA OCACSA-SICE BANOBRAS Ghost",
             "ghost_company", 2015, 2020, "high", 376_000_000,
             "BANOBRAS 100% (376M), 1 contract SB=100%; single massive SB contract at development bank"),
    (78118,  "MATERIALES OCONIT CFE DA Ghost",
             "ghost_company", 2015, 2020, "high", 390_000_000,
             "CFE 100% (390M), 1 contract DA=100%; P2 ghost company; single DA at electricity utility"),
    (113850, "DESARROLLO PROYECTOS ENERGIA SCT SB",
             "single_bid_capture", 2010, 2024, "high", 454_000_000,
             "SCT 98.9% (449M), 8 contracts ALL SB=100%; energy/infrastructure projects company SCT single-bid monopoly"),
    (266963, "SEYOBIC BANOBRAS-CAPUFE SB",
             "single_bid_capture", 2015, 2024, "high", 1_095_000_000,
             "BANOBRAS 78.9% (864M) SB=100% + CAPUFE 21.1% (231M) SB=100% = 100%; 16 contracts ALL SB; 1.095B development bank+roads capture"),
    (173712, "MARIA VICTORIA ZAPATA RAMOS CAPUFE",
             "institutional_capture", 2010, 2024, "high", 616_000_000,
             "Individual person; CAPUFE 100% (616M), 5 contracts DA=60% SB=40%; natural person dominant CAPUFE capture"),
    (176276, "TECHNO SERVICIOS SURESTE IMSS Ghost",
             "ghost_company", 2015, 2020, "high", 255_000_000,
             "IMSS 100% (255M), 1 contract SB=100%; single massive SB contract at IMSS"),
    (252744, "BC APLICACIONES MEDICAS HGM-IMSS",
             "institutional_capture", 2010, 2024, "high", 247_000_000,
             "HGM 61.7% (153M) SB=100% + IMSS 33.8% DA=84% = 95.5%; 74 contracts DA=81%; medical devices HGM+IMSS capture"),
    (36802,  "LABORATORIO MEDICO POLANCO HRAE",
             "institutional_capture", 2010, 2024, "medium", 317_000_000,
             "HRAE 80.7% (256M) DA=57%+IMSS 5.6%=86.3%; 93 contracts DA=69%; medical lab dominant regional hospital DA pattern"),
]

SKIPS = [
    (46843,  "PRONAM: dispersed national institutes top=27.8%, 548 ctrs — legitimate medicine distributor"),
    (261823, "ELEVAIT: IMSS 95.6% but SB=71%<75% — below threshold"),
    (7067,   "COMERCIAL JID: dispersed state agencies top=24.8% DA=8% SB=19%"),
    (1267,   "SEGUROS EL POTOSI: dispersed top=35.4%, 109 ctrs, insurance company"),
    (53498,  "5M2 ANDENES: DA=100% but top=10.1% extremely dispersed, 239 ctrs"),
    (27505,  "SONGA DRILLING: global Norwegian offshore driller, PEMEX 100% single competitive contract"),
    (52508,  "AP&H COMMUNICATION GROUP: DA=100% but top=28.8% dispersed, 212 ctrs"),
    (188639, "AMBIT DESARROLLOS INMOBILIARIOS: SEDATU 97.7% but overall DA=50% not >50%"),
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
