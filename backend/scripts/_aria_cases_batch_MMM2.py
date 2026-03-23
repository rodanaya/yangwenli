"""
GT Mining Batch MMM2 — 20 T3 vendors (v8475..v100059)
12 ADDs (cases max_id+1 .. max_id+12), 8 SKIPs
Guard: max_id must be 1151
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1151:
    print(f"ABORT: expected max_id=1151, got {max_id}. Run LLL2 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+12}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (29797,  "MEGAMANTENIMIENTOS CFE SB",
             "single_bid_capture", 2007, 2016, "high", 925_000_000,
             "CFE 100% (925M), 10 contracts SB=90%; massive maintenance company CFE single-bid monopoly"),
    (43385,  "COMERCIALIZADORA INTEGRAL MEDICO IMSS DA",
             "institutional_capture", 2010, 2024, "high", 369_000_000,
             "IMSS 100% (369M), 116 contracts DA=60%; medical supply dominant IMSS direct-award capture"),
    (57511,  "EDUARDO MANCERA SAE DA Ghost",
             "ghost_company", 2012, 2025, "high", 324_000_000,
             "Individual person; SAE 99.2% (322M), 2 contracts DA=100%; natural person winning 322M at asset-disposal agency through direct awards"),
    (44903,  "MEDIA CONTACTS CPTM Ghost",
             "ghost_company", 2011, 2011, "high", 429_000_000,
             "CPTM (tourism promotion) 100% (429M), 1 contract SB=100%; media company 429M single-bid at tourism promotion council — P2 ghost"),
    (18245,  "INTERCABLE CFE SB",
             "single_bid_capture", 2005, 2016, "high", 365_000_000,
             "CFE 98.8% (360M), 4 contracts SB=75%; cable infrastructure company CFE single-bid capture"),
    (35183,  "BARMEX ESSA DA Capture",
             "institutional_capture", 2008, 2025, "medium", 295_000_000,
             "EXPORTADORA DE SAL (ESSA) 90.8% (268M) DA=59%; 198 contracts; supply company dominant state salt exporter direct-award capture"),
    (24877,  "TRANSPORTES RIO GRANDE CFE SB",
             "single_bid_capture", 2006, 2017, "high", 1_045_000_000,
             "CFE 100% (1045M), 17 contracts SB=94%; transport+machinery company massive CFE single-bid monopoly"),
    (281909, "EXCALIBUR TECHNOLOGIES Multi-SB Ghost",
             "ghost_company", 2022, 2024, "high", 423_000_000,
             "CENACE 84.6% (358M) SB=100% + Sonora SICT 11.8% SB=100% + Tabasco Municipal SB=100% = 100%; 7 contracts ALL SB; 2022-2024 tech ghost multi-agency single-bid"),
    (150808, "SISTEMAS ALTERNATIVOS CONSTRUCCION CFE SB",
             "single_bid_capture", 2015, 2017, "high", 932_000_000,
             "CFE 100% (932M), 17 contracts ALL SB=100%; construction company massive CFE single-bid monopoly 2015-2017"),
    (197373, "DONCACAHUATO DICONSA DA Capture",
             "institutional_capture", 2017, 2023, "high", 369_000_000,
             "DICONSA 70% (258M) DA=97% + Yucatan 27.7% = 97.7%; 75 contracts DA=97%; distributor dominant DICONSA direct-award capture"),
    (126502, "COKABA CFE SB",
             "single_bid_capture", 2014, 2017, "high", 893_000_000,
             "CFE 100% (893M), 19 contracts SB=89%; construction company massive CFE single-bid monopoly 2014-2017"),
    (100059, "POLYRAFIA LICONSA DA Capture",
             "institutional_capture", 2010, 2021, "high", 319_000_000,
             "LICONSA 90.6% (289M) DA=89%; 9 contracts; printing/forms company dominant LICONSA direct-award capture"),
]

SKIPS = [
    (8475,   "H ROSEN DE MEXICO: dispersed CENAGAS+PEMEX top=34.6% SB mixed — below threshold"),
    (4885,   "EQUIPOS QUIRURGICOS POTOSINOS: HRAE 49.9%<60% DA=57% SB=0% — below threshold"),
    (46659,  "HERMER AMBIENTAL: CFE 100% but SB=71%<75% DA=29% — just below threshold"),
    (35072,  "CAPITIS EXPLORATION: CME 100% but DA=42% SB=33% — both below threshold"),
    (101353, "PASTEUR MERIEUX: global vaccine brand (Sanofi Pasteur), SSA single competitive contract"),
    (145663, "METLIFE MEXICO: global insurance brand, TFJA 1 DA contract — legitimate group insurance"),
    (8139,   "INTERNATIONAL DIRECTIONAL SERVICES: global drilling brand, PEMEX 1 competitive contract 2002"),
    (23423,  "SACKBE: dispersed SEDATU+INAH top=30.2% DA=33% SB=67% — below threshold"),
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
