"""
GT Mining Batch KKK2 — 20 T3 vendors (v142330..v3688)
12 ADDs (cases max_id+1 .. max_id+12), 8 SKIPs
Guard: max_id must be 1128
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1128:
    print(f"ABORT: expected max_id=1128, got {max_id}. Run JJJ2 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+12}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (142330, "TECNOLOGIA MEDICA DIART IMSS-HGM DA",
             "institutional_capture", 2005, 2024, "high", 586_000_000,
             "IMSS 79%+HGM 15.4%=94.4%; 515 contracts DA=70%; medical tech dominant IMSS direct-award pattern"),
    (42388,  "RUBEN LEAL MUBARQUI SENASICA DA",
             "institutional_capture", 2005, 2024, "high", 212_000_000,
             "Individual person; SENASICA 99.8% (212M), 20 contracts DA=70%; natural person dominant SENASICA DA capture"),
    (42014,  "TALWIWI CONSTRUCCIONES SB Multi",
             "single_bid_capture", 2010, 2024, "high", 439_000_000,
             "SICT 41.8%+SAGARPA 24.5%+SCT 22.7%=89%; 16 contracts ALL 100% SB; multi-agency infrastructure single-bid pattern"),
    (289849, "SERVICIOS INTEGRALES SARPY INM Ghost",
             "ghost_company", 2015, 2024, "high", 297_000_000,
             "INM (Migracion) 99.9% (297M), 3 contracts DA=100%; P2 ghost company; DA monopoly at immigration institute"),
    (189809, "RMG INTERNACIONAL DICONSA DA",
             "institutional_capture", 2010, 2024, "high", 471_000_000,
             "DICONSA 100% (471M), 47 contracts DA=98%; dominant DICONSA direct-award monopoly"),
    (39304,  "DESARROLLOS PERFORACIONES CFE SB",
             "single_bid_capture", 2015, 2024, "high", 574_000_000,
             "CFE 100% (574M), 4 contracts ALL SB=100%; drilling/construction company CFE single-bid capture"),
    (9006,   "GRUPO INDUSTRIAL RAZO CFE-PEMEX SB",
             "single_bid_capture", 2005, 2024, "high", 856_000_000,
             "CFE 83.3% (714M) SB=71% + PEMEX E&P 16.2% SB=100% = 99.5%; SB=84% overall; energy infrastructure SB pattern"),
    (58207,  "ZULU INFRAESTRUCTURA NL SB",
             "single_bid_capture", 2010, 2024, "high", 203_000_000,
             "NL-SADM 68%+NL-Caminos 15.6%+NL-Infra 10.3%=93.9%; 17 contracts SB=94%; Nuevo León infrastructure single-bid monopoly"),
    (25892,  "VERONICA RASCON ZARAGOZA Aguascalientes",
             "institutional_capture", 2015, 2024, "medium", 1_210_000_000,
             "Individual person; Aguascalientes Health 100% (1210M), 2 contracts SB=50%; 1.2B individual capturing state health ministry"),
    (228486, "RETO INDUSTRIAL INAH DA",
             "institutional_capture", 2015, 2020, "high", 318_000_000,
             "INAH 100% (318M), 2 contracts DA=100%; industrial+AXTEL joint capture at archaeological heritage institute"),
    (256270, "SEGURIDAD PRIVADA SAGAS API-Salina Cruz",
             "institutional_capture", 2015, 2024, "high", 347_000_000,
             "API-Salina Cruz 99.3% (344M), 4 contracts SB=80%; private security monopoly at Oaxaca port authority"),
    (3688,   "GLOBAL SERVICES CORP CME SB",
             "single_bid_capture", 2010, 2024, "high", 582_000_000,
             "CME (PEMEX exploracion subsidiary) 99.1% (577M), 5 contracts SB=78%; services company PEMEX subsidiary single-bid capture"),
]

SKIPS = [
    (32633,  "DIDAPLASTIC: CONAFE 94.1% but SB=30%<75% DA=20% — below threshold"),
    (89450,  "HARBISONWALKER: global US refractory brand, CFE 100% competitive DA=44% SB=56%"),
    (41762,  "VIADAMIA: IMSS+ISSSTE 85.6% but SB=64%<75% DA=27% — below threshold"),
    (148494, "EGISMEX: FONATUR+SCT 97.8% but overall DA=33% SB=67% by count — below threshold"),
    (8162,   "TABASCO CASA: SB=100% but top=20.6%<40% — dispersed across Tabasco/PEMEX"),
    (7668,   "POZA RICA REFRIGERACION: AICM 91.7% but SB=72%<75% — just below threshold"),
    (216690, "GERLIM: dispersed top=22.5% DA=43% SB=40% — below threshold"),
    (31579,  "TATA CONSULTANCY: global Tata Group company, IMSS 100% single competitive contract"),
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
