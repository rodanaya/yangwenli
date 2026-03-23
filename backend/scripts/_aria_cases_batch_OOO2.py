"""
GT Mining Batch OOO2 — 20 T3 vendors (v292538..v144311)
13 ADDs (cases max_id+1 .. max_id+13), 7 SKIPs
Guard: max_id must be 1176
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1176:
    print(f"ABORT: expected max_id=1176, got {max_id}. Run NNN2 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+13}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (292538, "COOPSA AMBIENTAL CENAGAS Ghost",
             "ghost_company", 2023, 2023, "high", 698_000_000,
             "CENAGAS 100% (698M), 1 contract SB=100%; 2023 only; environmental company 698M single-bid at gas control center — P2 ghost"),
    (308282, "LIMPIEZA ESPECIALIZADA IMSS-SSA Capture",
             "institutional_capture", 2024, 2025, "high", 1_219_000_000,
             "IMSS-Bienestar 66.4% (809M) + SSA 33.6% (410M) DA=67% overall; 6 contracts; cleaning company 1.2B at health agencies 2024-2025"),
    (293500, "RECAL ESTRUCTURAS SEDATU SB",
             "single_bid_capture", 2023, 2025, "high", 726_000_000,
             "SEDATU 93.7% (680M) SB=100% + SEMAR 6.3% DA=100% = 100%; 3 contracts; construction company SEDATU single-bid capture"),
    (192057, "RUBAU MEXICO SCT Ghost",
             "ghost_company", 2016, 2016, "medium", 942_000_000,
             "SCT 100% (942M), 1 contract SB=100%; 2016 only; single massive single-bid contract at transport ministry — 942M ghost"),
    (144673, "SABELEC CFE DA Capture",
             "institutional_capture", 2014, 2017, "high", 576_000_000,
             "CFE 100% (576M), 8 contracts DA=88%; electrical company dominant CFE direct-award capture"),
    (51326,  "SIECP BANOBRAS SB Ghost",
             "ghost_company", 2010, 2017, "high", 242_000_000,
             "BANOBRAS 97% (234M) SB=100%; 1 massive single-bid at development bank — ghost pattern"),
    (160719, "INNO DIGITAL STREAM SCT DA Ghost",
             "ghost_company", 2015, 2015, "high", 578_000_000,
             "SCT 100% (578M), 1 contract DA=100%; 2015 only; digital company 578M direct-award at transport ministry — P2 ghost"),
    (297372, "LENIMENTUS CENAGAS SB Ghost",
             "ghost_company", 2023, 2024, "high", 743_000_000,
             "CENAGAS 100% (743M), 2 contracts SB=100%; consulting company 743M single-bid at gas control center 2023-2024"),
    (141033, "EPIC ESTUDIOS HGM Ghost",
             "ghost_company", 2014, 2014, "high", 317_000_000,
             "HGM (Hospital General de Mexico) 100% (317M), 2 contracts SB=100%; 2014 only; engineering company 317M dual single-bid at hospital"),
    (45618,  "PINSA COMERCIAL DICONSA DA Monopoly",
             "institutional_capture", 2010, 2025, "high", 1_098_000_000,
             "DICONSA 86% (945M) DA=100% + Bienestar 14% DA=100% = 99.9%; 3166 contracts DA=100%; commercial company dominant DICONSA supply monopoly"),
    (42793,  "CONSTRUCCIONES PROYECTOS PEMEX DA Ghost",
             "ghost_company", 2012, 2012, "medium", 300_000_000,
             "PEMEX Corp 100% (300M), 2 contracts DA=100%; 2012 only; construction company 300M dual DA at PEMEX corporate"),
    (45277,  "MOLINO HARINERO SAN BLAS DICONSA Monopoly",
             "institutional_capture", 2010, 2025, "high", 1_095_000_000,
             "DICONSA 75.5% (827M) DA=100% + Bienestar 24.5% DA=100% = 100%; 5703 contracts DA=100%; flour mill dominant DICONSA+Bienestar monopoly"),
    (294370, "ELECTROMECANICA DOMEX CENAGAS Ghost",
             "ghost_company", 2023, 2023, "high", 550_000_000,
             "CENAGAS 100% (550M), 1 contract SB=100%; 2023 only; electromechanical company 550M single-bid at gas control center — P2 ghost"),
]

SKIPS = [
    (194891, "UNICEDER: SADER 74.9% but SB=0% DA=0% — competitive procurement dominant"),
    (42797,  "ONCOMEDIC: dispersed SEDENA+IMSS top=33.4% DA=18% — below threshold"),
    (259012, "TECH ENERGY CONTROL: CENAGAS 100% but DA=33% SB=33% — below threshold"),
    (208799, "INGENIERIA INSTALACIONES: CENAGAS 99.1% but SB=50%<75% DA=0% — below threshold"),
    (126249, "KOM CO CAPITAL: FND 61.4% DA=50%/SB=50% mixed signal — neither threshold met"),
    (2544,   "TWENTYMILE COAL: global US coal company, CFE 1 competitive SB contract 2002"),
    (144311, "ARTURO JUAREZ SANTOYO: CFE 100% but DA=33% SB=0% — competitive procurement dominant"),
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
