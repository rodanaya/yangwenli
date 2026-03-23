"""
GT Mining Batch YYY2 — 20 T3 vendors (v244471..v74721)
17 ADDs (cases max_id+1 .. max_id+17), 3 SKIPs
Guard: max_id must be 1275
Note: SAE Ghost Network 2012 — 15 natural persons each received 322M DA from SAE
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB, timeout=60)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1275:
    print(f"ABORT: expected max_id=1275, got {max_id}. Run XXX2 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+17}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (75573,  "REPUBLICA FARMACEUTICA IMSS DA",
             "institutional_capture", 2010, 2024, "high", 292_000_000,
             "IMSS 93.3% (292M), 25 contracts DA=76%; pharma company dominant IMSS direct-award capture"),
    (228329, "TECSA COMERCIAL NTD IMSS DA",
             "institutional_capture", 2018, 2025, "high", 295_000_000,
             "IMSS 99.6% (295M), 444 contracts DA=97%; commercial company dominant IMSS direct-award monopoly"),
    # SAE Ghost Network 2012 — 15 natural persons, 322M each, DA=100% at asset-disposal agency
    (45771,  "DIEGO GONZALEZ LUNA SAE DA Ghost",
             "ghost_company", 2012, 2013, "high", 323_000_000,
             "Individual person; SAE 100% (323M), 3 contracts DA=100%; SAE ghost network 2012 — natural person mass DA at asset disposal agency"),
    (66609,  "JOSE ANTONIO CARBAJAL GALVAN SAE DA Ghost",
             "ghost_company", 2012, 2013, "high", 323_000_000,
             "Individual person; SAE 100% (323M), 3 contracts DA=100%; SAE ghost network 2012 — natural person mass DA at asset disposal agency"),
    (67847,  "MIGUEL IBARRA SANTIAGO SAE DA Ghost",
             "ghost_company", 2012, 2013, "high", 323_000_000,
             "Individual person; SAE 100% (323M), 3 contracts DA=100%; SAE ghost network 2012 — natural person mass DA at asset disposal agency"),
    (77173,  "ENRIQUE RIVERA HERNANDEZ SAE DA Ghost",
             "ghost_company", 2012, 2015, "high", 322_000_000,
             "Individual person; SAE 100% (322M), 3 contracts DA=100%; SAE ghost network 2012 — natural person mass DA at asset disposal agency"),
    (54349,  "MIGUEL ANGEL MARTINEZ CAMACHO SAE DA Ghost",
             "ghost_company", 2012, 2012, "high", 322_000_000,
             "Individual person; SAE 100% (322M), 2 contracts DA=100%; SAE ghost network 2012 — natural person mass DA at asset disposal agency"),
    (56180,  "EDUARDO VILLALPANDO FUSE SAE DA Ghost",
             "ghost_company", 2012, 2012, "high", 322_000_000,
             "Individual person; SAE 100% (322M), 2 contracts DA=100%; SAE ghost network 2012 — natural person mass DA at asset disposal agency"),
    (59336,  "SERGIO OROZCO OSEGUERA SAE DA Ghost",
             "ghost_company", 2012, 2012, "high", 322_000_000,
             "Individual person; SAE 100% (322M), 2 contracts DA=100%; SAE ghost network 2012 — natural person mass DA at asset disposal agency"),
    (63022,  "ARTURO FAUSTO OROZCO MARTINEZ SAE DA Ghost",
             "ghost_company", 2012, 2012, "high", 322_000_000,
             "Individual person; SAE 100% (322M), 2 contracts DA=100%; SAE ghost network 2012 — natural person mass DA at asset disposal agency"),
    (64756,  "MARTIN RAFAEL FERNANDEZ ZUART SAE DA Ghost",
             "ghost_company", 2012, 2012, "high", 322_000_000,
             "Individual person; SAE 100% (322M), 2 contracts DA=100%; SAE ghost network 2012 — natural person mass DA at asset disposal agency"),
    (65384,  "JOSE LUIS HERNANDEZ ARMENTA SAE DA Ghost",
             "ghost_company", 2012, 2012, "high", 322_000_000,
             "Individual person; SAE 100% (322M), 2 contracts DA=100%; SAE ghost network 2012 — natural person mass DA at asset disposal agency"),
    (66628,  "NICANDRO MARTINEZ LOPEZ SAE DA Ghost",
             "ghost_company", 2012, 2012, "high", 322_000_000,
             "Individual person; SAE 100% (322M), 2 contracts DA=100%; SAE ghost network 2012 — natural person mass DA at asset disposal agency"),
    (68808,  "GONZALO FERMIN MADRAZO BOLIVAR SAE DA Ghost",
             "ghost_company", 2012, 2012, "high", 322_000_000,
             "Individual person; SAE 100% (322M), 2 contracts DA=100%; SAE ghost network 2012 — natural person mass DA at asset disposal agency"),
    (70341,  "SELENE PEREZ OROZCO SAE DA Ghost",
             "ghost_company", 2012, 2012, "high", 322_000_000,
             "Individual person; SAE 100% (322M), 2 contracts DA=100%; SAE ghost network 2012 — natural person mass DA at asset disposal agency"),
    (74179,  "ERIC GUILLERMO CRUZ SOLANO RENDON SAE DA Ghost",
             "ghost_company", 2012, 2012, "high", 322_000_000,
             "Individual person; SAE 100% (322M), 2 contracts DA=100%; SAE ghost network 2012 — natural person mass DA at asset disposal agency"),
    (74721,  "ERIKA HELENA VARGAS SANCHEZ SAE DA Ghost",
             "ghost_company", 2012, 2012, "high", 322_000_000,
             "Individual person; SAE 100% (322M), 2 contracts DA=100%; SAE ghost network 2012 — natural person mass DA at asset disposal agency"),
]

SKIPS = [
    (244471, "DISTRIBUCIONES ORVAL: SEDENA 100% but DA=74%<75% — below threshold"),
    (35657,  "DISTRIBUIDORA LHAG: dispersed AGS=33.5% SEDENA=23.6% DA=8% SB=55%<75% — below all thresholds"),
    (165371, "SIMEC SERVICIOS: dispersed GN=19.7% top<60% — below concentration threshold"),
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
