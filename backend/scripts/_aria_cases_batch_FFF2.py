"""
GT Mining Batch FFF2 — 20 T3 vendors (v63556..v138214)
13 ADDs (cases max_id+1 .. max_id+13), 7 SKIPs
Guard: max_id must be 1064
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1064:
    print(f"ABORT: expected max_id=1064, got {max_id}. Run EEE2 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+13}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (63556,  "VISION BIOMEDICA IMSS Capture",
             "institutional_capture", 2011, 2025, "high", 738_000_000,
             "IMSS 99.3% (733M), 141 contracts 2011-2025; SB=48% DA=34%; biomedical equipment monopoly at IMSS"),
    (104295, "EDICIONES Y EXPOSICIONES MEXICANAS CFE Ghost",
             "ghost_company", 2015, 2015, "high", 580_000_000,
             "CFE 100% (580M), 9 contracts all DA 2015; 'editions and exhibitions' company winning electricity utility contracts — industry mismatch ghost"),
    (109333, "IMG PROYECTOS HIDRAULICOS Multi-Institution SB",
             "single_bid_capture", 2010, 2024, "high", 250_000_000,
             "SAGARPA 66.9%+SICT 17.8%+port 12.6%=97.3%; 9 contracts ALL 100% SB; hydraulic projects single-bid pattern"),
    (42007,  "AUDINGMEX SCT Capture",
             "institutional_capture", 2009, 2024, "high", 489_000_000,
             "SCT 98.3% (481M), 6 contracts, SB=83%; auditing/engineering company with dominant single-institution SB concentration"),
    (41720,  "BUILDING AND SERVICES PRONOSTICOS Capture",
             "institutional_capture", 2009, 2018, "high", 904_000_000,
             "PRONOSTICOS 98.2% (887M); 3 massive year-end Dec-2009 contracts (395M+264M+225M) at lottery agency; SB=75% DA=25%"),
    (33688,  "INFRAESTRUCTURA DIAMANTE BANOBRAS Capture",
             "institutional_capture", 2008, 2016, "medium", 471_000_000,
             "BANOBRAS 83.9% (395M) SB=100% + ports 16%; 4 contracts; development bank + port authorities capture"),
    (91662,  "CORROSION Y PROTECCION PEMEX-CENAGAS Capture",
             "institutional_capture", 2011, 2024, "medium", 292_000_000,
             "PEMEX Corp 54.6% DA=100% + CENAGAS 34.3% DA=57% = 88.9%; 19 contracts DA=74%; energy infrastructure DA pattern"),
    (2042,   "COMPANIA CONSTRUCTORA CONAGUA SB Pattern",
             "single_bid_capture", 2002, 2024, "medium", 443_000_000,
             "CONAGUA 49.6% SB=100% + water agencies ~63%; 76 contracts SB=86%; construction company with dominant CONAGUA single-bid pattern"),
    (157102, "PHARMACOSMETIC MANUFACTURING CFE Mismatch Ghost",
             "ghost_company", 2015, 2016, "high", 1_065_000_000,
             "CFE 100% (1065M), 2 contracts; pharma/cosmetic manufacturing company winning 1.065B at electricity utility — extreme industry mismatch ghost"),
    (24567,  "PROCESOS INDUSTRIALES VAUX Oaxaca SB Capture",
             "single_bid_capture", 2006, 2015, "high", 799_000_000,
             "Oaxaca SOT 88.6% (708M) SB=100% + OAX-Caminos+OAX-CEA+SCT=99.3%; 21 contracts ALL 100% SB; Oaxaca state infrastructure monopoly"),
    (241559, "EL ROBLE LEASING Multi-State SB",
             "single_bid_capture", 2010, 2024, "high", 554_000_000,
             "SICT 38.9%+SAGARPA 33.8%+Sonora 12.1%+CONAGUA 11.2%=96%; 13 contracts ALL 100% SB; leasing company multi-state single-bid pattern"),
    (103189, "LA SEDENA Ghost Company CDMX SSP",
             "ghost_company", 2013, 2013, "high", 204_000_000,
             "Vendor name 'La Secretaria de la Defensa Nacional' (mimics SEDENA army); CDMX SSP 100% (204M); 38 DA contracts 2013; ghost using government agency name"),
    (138214, "CONSTRUCTORA COAHUILA-TLAXCALA Cross-State Capture",
             "institutional_capture", 2014, 2015, "high", 851_000_000,
             "Coahuila Finanzas 80.2% (683M) SB=100% + Tlaxcala Obras 19.6% (166M) DA=100% = 99.8%; 3 contracts 851M; cross-state capture pattern"),
]

SKIPS = [
    (275782, "ARIMECI: GN+ISSSTE 99.2% but DA=0% SB=0% — all competitive procurement"),
    (5481,   "DISTRIBUIDORA FARMACOS Y FRAGANCIAS: IMSS top=39.9% dispersed, 1164 ctrs, legitimate pharmacy distributor"),
    (2181,   "FONKEL MEXICANA: CFE 93.3% but SB=17% DA=48% — legitimate CFE electrical equipment supplier"),
    (42915,  "PRYSMIAN CABLES: global cable brand (Italy), CFE 100% competitive"),
    (2250,   "CENTRIFUGADOS MEXICANOS: CFE 99.8% but DA=20% SB=29% — legitimate pump equipment specialist"),
    (175173, "GRUPO RADIO CENTRO: dispersed media company, top=15.6%, DA=100% for advertising services"),
    (10979,  "ARKANUM: dispersed health institutions top=39.2%, 583 ctrs, legitimate medical supplies"),
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

    # Update review_status for ADDs and SKIPs
    for case in CASES:
        conn.execute("UPDATE aria_queue SET review_status='reviewed', reviewer_notes=? WHERE vendor_id=?",
                     (f"GT:{max_id+1+CASES.index(case)}", case[0]))
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
