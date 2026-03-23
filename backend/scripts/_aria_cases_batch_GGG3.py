"""
GT Mining Batch GGG3 — 20 T3 vendors (v7396..v124310)
8 ADDs (cases max_id+1 .. max_id+8), 12 SKIPs
Guard: max_id must be 1342
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB, timeout=60)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1342:
    print(f"ABORT: expected max_id=1342, got {max_id}. Run FFF3 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+8}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (4355,   "CORPORACION ARMO IMSS DA",
             "institutional_capture", 2002, 2025, "high", 912_000_000,
             "IMSS 79.8% (912M), 3699 contracts DA=84%; corporate supplier dominant IMSS direct-award capture"),
    (15057,  "DISENOS CONSTRUCCIONES GONZALEZ SCT-SICT SB",
             "single_bid_capture", 2003, 2025, "high", 248_000_000,
             "SCT+SICT 85.6% (248M), 48 contracts SB=89%; construction company dominant SCT/SICT single-bid capture"),
    (18332,  "BRP INDUSTRIAL CFE DA",
             "institutional_capture", 2005, 2024, "high", 211_000_000,
             "CFE 96.8% (211M), 210 contracts DA=54%; industrial supplier dominant CFE direct-award capture"),
    (19862,  "HOLIDAY DE MEXICO IMSS DA",
             "institutional_capture", 2005, 2021, "high", 709_000_000,
             "IMSS 79.8% (709M), 2041 contracts DA=71%; hospitality/services company dominant IMSS direct-award capture"),
    (73955,  "AYPP CONSTRUCTORES PUEBLA SB",
             "single_bid_capture", 2010, 2013, "high", 207_000_000,
             "Puebla-State 67.1% (207M) + SCT 31%, 2 contracts SB=100%; construction company dominant Puebla single-bid capture"),
    (256640, "PROGELA IMSS DA",
             "institutional_capture", 2020, 2025, "high", 501_000_000,
             "IMSS 84.2% (501M), 7 contracts DA=62%; supply company dominant IMSS direct-award capture"),
    (282837, "CONSULTORIA CIENTIFICA MULTIDISCIPLINARIA IMP SB",
             "single_bid_capture", 2022, 2025, "high", 585_000_000,
             "IMP (Instituto Mexicano del Petróleo) 100% (585M), 5 contracts SB=80%; consulting company dominant IMP single-bid capture"),
    (297014, "I 25 SCOP DA Ghost",
             "ghost_company", 2023, 2024, "high", 283_000_000,
             "SCOP (State Communications/Works) 100% (283M), 2 contracts DA=100%; minimal-name company 283M DA at state ministry — P2 ghost"),
]

SKIPS = [
    (7396,   "LITHO FORMAS: dispersed SHCP=37%<60% — below concentration threshold"),
    (68500,  "TATA CONSULTANCY SERVICES: global Indian IT company (TCS), SAT=99.2% but DA=50% (not >50%)"),
    (132725, "RENTA REGADERAS SERVICIOS: BIENESTAR=99.8% but DA=37.5%<50% SB=62.5%<75% — both below threshold"),
    (26096,  "CELL MEDICINE LABORATORIES: dispersed IMSS=47.2%<60% — below concentration threshold"),
    (30229,  "AMAREF: CONAFOR=100% but DA=0% SB=0% — competitive forestry supplier"),
    (5442,   "BECKMAN COULTER: global US diagnostics company (Danaher/Beckman Coulter), dispersed"),
    (17810,  "ODIS ASVERSA: dispersed SAPUEBLA=51.1%<60% — below concentration threshold"),
    (1537,   "BIOMERIEUX MEXICO: global French diagnostics company (bioMérieux SA), dispersed"),
    (46855,  "CONSULTORIA SUPERVISION TECNICA: GACM=67.4% but DA=39%<50% SB=60.5%<75% — both below threshold"),
    (23206,  "CONSULTORIA APLICACIONES AVANZADAS ECM: dispersed IFAI=22.3%<60% — below concentration threshold"),
    (3877,   "FORMAS INTELIGENTES: dispersed ICV-NL=18.2%<60% — below concentration threshold"),
    (124310, "HUFRA DISTRIBUIDORA: IMSS=90.2% but DA=48.4%<50% SB=19%<75% — both below threshold"),
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
