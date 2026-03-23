"""
GT Mining Batch HHH3 — 20 T3 vendors (v28371..v27259)
6 ADDs (cases max_id+1 .. max_id+6), 14 SKIPs
Guard: max_id must be 1350
"""
import sqlite3, sys

DB = "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB, timeout=60)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
if max_id < 1350:
    print(f"ABORT: expected max_id=1350, got {max_id}. Run GGG3 first.")
    sys.exit(1)
print(f"Max GT case id: {max_id}")
print(f"Inserting cases {max_id+1}-{max_id+6}")

CASES = [
    # (vendor_id, case_name, case_type, year_start, year_end, confidence_level, estimated_fraud_mxn, notes)
    (13413,  "CARDIOPACE IMSS DA",
             "institutional_capture", 2007, 2025, "high", 245_000_000,
             "IMSS 96.6% (245M), 82 contracts DA=84%; cardiology/pacemaker company dominant IMSS direct-award capture"),
    (5797,   "PUBLIC HEALTH SUPPLY CENAPRECE DA",
             "institutional_capture", 2007, 2025, "high", 749_000_000,
             "CENAPRECE 87.5% (749M) + SEGOB 7.8%; DA=73%; public health supply company dominant CENAPRECE direct-award capture"),
    (174,    "INMOBILIARIA RIO MEDIO APIVER SB",
             "single_bid_capture", 2002, 2019, "high", 188_000_000,
             "APIVER 64.1% (188M) + SCT 20.7%, 3 contracts SB=100%; real estate company dominant Veracruz port authority single-bid capture"),
    (2057,   "CONCRETOS DE ACUNA COAHUILA SB",
             "single_bid_capture", 2006, 2021, "high", 453_000_000,
             "Coahuila-State combined 68.5% (453M), 38 contracts SB=92%; concrete/construction company dominant Coahuila single-bid capture"),
    (15049,  "AGATSO PAVIMENTOS SCT SB",
             "single_bid_capture", 2004, 2019, "high", 399_000_000,
             "SCT 76% (399M) + JEZA-Zacatecas 20.4%, 12 contracts SB=100%; paving company dominant SCT single-bid capture"),
    (42015,  "RYMSA INFRAESTRUCTURA SCT SB",
             "single_bid_capture", 2009, 2020, "high", 724_000_000,
             "SCT 92.8% (724M) + MICH 3.9%, 16 contracts SB=100%; infrastructure company dominant SCT single-bid capture"),
]

SKIPS = [
    (28371,  "RADIOLOGIA INTERVENCIONISTA: IMSS=82.4% but DA=50% (not >50%) SB=36% — both below threshold"),
    (99239,  "SERVICIO DE LIMPIEZA QUINTANA ROO: dispersed QROO=46.3%<60% — below concentration threshold"),
    (116314, "IMPLEMENTOS AGRICOLAS JALISCO: JAL=89% but SB=71.4%<75% DA=14% — SB below threshold"),
    (19822,  "COMERCIALIZADORA DELTA: dispersed IMSS=58.5%<60% — below concentration threshold"),
    (33633,  "HERRAMIENTAS INSTRUMENTOS QUIRURGICOS: dispersed IMSS=57.8%<60% — below concentration threshold"),
    (30228,  "SEMILLAS SELECTAS NORDGEN: CONAFOR=100% but DA=7% SB=0% — competitive forestry supplier"),
    (226753, "COMERCIALIZADORA MAQUI: dispersed IMSS=51.4%<60% — below concentration threshold"),
    (60810,  "GRUPO CONSTRUCTOR PACIFICO: dispersed SIN=41.1%<60% — below concentration threshold"),
    (6366,   "CORPORATIVO FERRETERO INDUSTRIAL: dispersed PEMEX=58.4%<60% — below concentration threshold"),
    (1685,   "EQUIPOS MEDICOS HOSPITALARIOS: dispersed IMSS=46%<60% — below concentration threshold"),
    (129478, "CONSTRUCTORA CASTILLO HERMANOS: dispersed MICH=47.5%<60% — below concentration threshold"),
    (1911,   "MAQUINARIA CONSTRUCCIONES FONSECA: dispersed CONAGUA=38.5%<60% — below concentration threshold"),
    (42161,  "CORPORACION ROSAS: SEDATU=61.8% but DA=40%<50% SB=60%<75% — both below threshold"),
    (27259,  "DISTRIBUIDORA BOCARANDO LICONSA: LICONSA=100% but DA=32%<50% SB=38%<75% — both below threshold"),
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
