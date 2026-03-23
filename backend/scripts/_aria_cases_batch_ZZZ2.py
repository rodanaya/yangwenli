"""
GT Mining Batch ZZZ2 — 20 T3 vendors (v75805..v124983)
9 ADDs (cases max_id+1 .. max_id+9), 11 SKIPs
Guard: max_id must be 1292
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB, timeout=60)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1292:
    print(f"ABORT: expected max_id=1292, got {max_id}. Run YYY2 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+9}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    # SAE Ghost Network 2012 (continued)
    (75805,  "HECTOR ARTURO TORRES GARCIA SAE DA Ghost",
             "ghost_company", 2012, 2012, "high", 322_000_000,
             "Individual person; SAE 100% (322M), 2 contracts DA=100%; SAE ghost network 2012 — natural person mass DA at asset disposal agency"),
    (80938,  "RICARDO ANTONIO SANCHEZ REYES SAE DA Ghost",
             "ghost_company", 2012, 2012, "high", 322_000_000,
             "Individual person; SAE 100% (322M), 2 contracts DA=100%; SAE ghost network 2012 — natural person mass DA at asset disposal agency"),
    (46033,  "LUCIA MELLO GONZALEZ SAE DA Ghost",
             "ghost_company", 2012, 2012, "high", 322_000_000,
             "Individual person; SAE 100% (322M), 2 contracts DA=100%; SAE ghost network 2012 — natural person mass DA at asset disposal agency"),
    (78136,  "SERGIO VIVEROS ROMERO SAE DA Ghost",
             "ghost_company", 2012, 2013, "high", 323_000_000,
             "Individual person; SAE 100% (323M), 4 contracts DA=100%; SAE ghost network 2012 — natural person mass DA at asset disposal agency"),
    (76675,  "RAFAEL ORTEGA OTEO SAE DA Ghost",
             "ghost_company", 2012, 2016, "high", 324_000_000,
             "Individual person; SAE 100% (324M), 4 contracts DA=100%; SAE ghost network 2012 — natural person mass DA at asset disposal agency"),
    (69798,  "GABRIEL MARTINEZ CAVAZOS SAE DA Ghost",
             "ghost_company", 2012, 2013, "high", 322_000_000,
             "Individual person; SAE 100% (322M), 2 contracts DA=100%; SAE ghost network 2012 — natural person mass DA at asset disposal agency"),
    (75142,  "GABRIEL AUDE VENZOR CHIH SB",
             "single_bid_capture", 2012, 2017, "high", 307_000_000,
             "Individual person; CHIH-State 84.8% (307M), 7 contracts SB=100%; natural person dominant Chihuahua single-bid capture"),
    (120791, "TUCAN INFRAESTRUCTURA SEDATU SB",
             "single_bid_capture", 2014, 2023, "high", 205_000_000,
             "SEDATU 75.0% (205M), 9 contracts SB=89%; infrastructure company dominant SEDATU single-bid capture"),
    (124983, "AVALOS FARMACEUTICA IMSS DA",
             "institutional_capture", 2014, 2024, "high", 285_000_000,
             "IMSS 100% (285M), 151 contracts DA=100%; pharma company dominant IMSS direct-award monopoly"),
]

SKIPS = [
    (105959, "PASTEUR HEALTH CARE: IMSS=52.9%<60% DA=34% — below thresholds"),
    (186,    "EL PALACIO DEL RESCATISTA: AICM=57.1%<60% DA=41% SB=23% — below all thresholds"),
    (149136, "GLANBIA INGREDIENTS IRELAND: global Irish dairy/nutrition company (Glanbia plc), 1 DA at LICONSA"),
    (103487, "PERIODICO DIGITAL SENDERO: dispersed IMSS=16.4% DA=100% — top institution below threshold"),
    (1640,   "OPTICAS DEVLYN: IMSS=63.3% but DA=29% SB=46%<75% — below both thresholds"),
    (4793,   "INNOVADORA EN MODA: dispersed top=24.5% — below concentration threshold"),
    (11498,  "GCP: CAPUFE=59.8%<60% SB=95% — concentration marginally below threshold"),
    (55841,  "ANALITEK: dispersed top=18.6% DA=94% — below concentration threshold"),
    (20284,  "FRANCISCO JAVIER CARRILLO: IMSS 100% but DA=33%<50% SB=51%<75% — individual below DA/SB thresholds"),
    (11388,  "COMERCIALIZADORA SANITARIA: Sonora=36.3%+26.6% DA=35% SB=28% — below all thresholds"),
    (53938,  "VAZQUEZ NAVA Y CONSULTORES: GACM=59.3%<60% SB=60%<75% — both below threshold"),
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
