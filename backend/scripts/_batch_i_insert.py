"""Ground Truth Batch I inserts (2026-05-15). Run once from backend/ directory."""
import sqlite3, sys
from pathlib import Path

DB = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"
conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")
cur = conn.cursor()

cur.execute("SELECT MAX(id), COUNT(*) FROM ground_truth_cases")
max_id, total = cur.fetchone()
print(f"Before: max_id={max_id}, total={total}")

CASES = [
    dict(id=1425, case_id='CASE-1425', case_name='PROMOTORA Y COMERCIALIZADORA LOTCAMP INPI Ghost DA',
         case_type='ghost_company', year_start=2016, year_end=2016,
         fraud_year_start=2016, fraud_year_end=2016, estimated_fraud_mxn=8900000,
         source_news='SAT EFOS Definitivo list', confidence_level='high',
         case_origin='aria_t2_mining',
         notes='EFOS definitivo. 1 DA contract @ INPI 2016, $8.9M MXN, sector mismatch. Batch I.'),
    dict(id=1426, case_id='CASE-1426', case_name='EMPRESA DEFIT SEGOB Ghost DA',
         case_type='ghost_company', year_start=2013, year_end=2013,
         fraud_year_start=2013, fraud_year_end=2013, estimated_fraud_mxn=3100000,
         source_news='SAT EFOS Definitivo list', confidence_level='high',
         case_origin='aria_t2_mining',
         notes='EFOS definitivo. 1 DA contract @ SEGOB 2013, $3.1M MXN. Debut-disappear ghost. Batch I.'),
    dict(id=1427, case_id='CASE-1427', case_name='PUBLICIDAD Y EVENTOS YELLO INEA Ghost DA',
         case_type='ghost_company', year_start=2014, year_end=2014,
         fraud_year_start=2014, fraud_year_end=2014, estimated_fraud_mxn=3000000,
         source_news='SAT EFOS Definitivo list', confidence_level='high',
         case_origin='aria_t2_mining',
         notes='EFOS definitivo. 1 DA contract @ INEA 2014, $3.0M MXN. Publicidad at adult-literacy agency. Batch I.'),
    dict(id=1428, case_id='CASE-1428', case_name='ADVERTISING AND DIGITAL EFFECTS BANJERCITO Ghost DA',
         case_type='ghost_company', year_start=2014, year_end=2015,
         fraud_year_start=2014, fraud_year_end=2015, estimated_fraud_mxn=2900000,
         source_news='SAT EFOS Definitivo list', confidence_level='high',
         case_origin='aria_t2_mining',
         notes='EFOS definitivo. 2 DA contracts @ BANJERCITO 2014-2015, $2.9M MXN. Batch I.'),
    dict(id=1429, case_id='CASE-1429', case_name='ALFREDO JAIME CALDERON SAE SFP-Sanctioned Individual',
         case_type='sfp_sanction', year_start=2016, year_end=2016,
         fraud_year_start=2016, fraud_year_end=2016, estimated_fraud_mxn=1300000,
         source_legal='SFP sanctions registry', confidence_level='high',
         case_origin='aria_t2_mining',
         notes='SFP-sanctioned individual. 1 DA contract @ SAE 2016, $1.3M MXN. Batch I.'),
    dict(id=1430, case_id='CASE-1430', case_name='QUADRUM LIMPIEZA Y CONSTRUCCION Multi-Federal Rotation Ghost',
         case_type='ghost_company_rotation', year_start=2009, year_end=2012,
         fraud_year_start=2009, fraud_year_end=2012, estimated_fraud_mxn=108800000,
         source_news='CENTINELA WEB CORRUPTION_MENTION verdict',
         source_legal='SAT EFOS Definitivo list', confidence_level='high',
         case_origin='aria_t2_mining',
         notes='EFOS definitivo + CENTINELA CORRUPTION_MENTION. 20 contracts at 8+ federal agencies 2009-2012. Estafa-Maestra-precursor. Batch I.'),
    dict(id=1431, case_id='CASE-1431', case_name='CONSORCIO DE INGENIERIA PETROLERA Veracruz-Duarte Ghost',
         case_type='ghost_company', year_start=2007, year_end=2012,
         fraud_year_start=2009, fraud_year_end=2012, estimated_fraud_mxn=109500000,
         source_news='SAT EFOS Definitivo; Veracruz-Duarte ASF cluster', confidence_level='high',
         case_origin='aria_t2_mining',
         notes='EFOS definitivo. 11 contracts $109M VER state agencies during Duarte administration. Sector mismatch. Batch I.'),
    dict(id=1432, case_id='CASE-1432', case_name='INFRAESTRUCTURA EN CONSTRUCCION Veracruz SIOP Capture DA',
         case_type='institutional_capture', year_start=2013, year_end=2016,
         fraud_year_start=2013, fraud_year_end=2016, estimated_fraud_mxn=103000000,
         source_news='SAT EFOS Definitivo; Veracruz-Duarte ASF cluster', confidence_level='high',
         case_origin='aria_t2_mining',
         notes='EFOS definitivo. 24 contracts at VER-SIOP (86% concentration, 91.7% DA, $103M) Duarte peak. Batch I.'),
    dict(id=1433, case_id='CASE-1433', case_name='HERA CONSORCIO CONSTRUCTIVO Nuevo Leon-Medina Ghost',
         case_type='ghost_company', year_start=2005, year_end=2012,
         fraud_year_start=2010, fraud_year_end=2012, estimated_fraud_mxn=67100000,
         source_news='SAT EFOS Definitivo list', confidence_level='medium',
         case_origin='aria_t2_mining',
         notes='EFOS definitivo. 8 contracts $67M NL state agencies 2010-2012 Medina administration. Batch I.'),
]

VENDORS = [
    (1425, 173001, 'Promotora y Comercializadora Lotcamp, S.A. de C.V.', 'shell_vendor', 'high', 'aria_queue_efos_match', 1.0),
    (1426, 110647, 'EMPRESA DEFIT, S.C.', 'shell_vendor', 'high', 'aria_queue_efos_match', 1.0),
    (1427, 133270, 'PUBLICIDAD Y EVENTOS YELLO, S.A. DE C.V.', 'shell_vendor', 'high', 'aria_queue_efos_match', 1.0),
    (1428, 136557, 'Advertising and Digital Effects, S.A. de C.V.', 'shell_vendor', 'high', 'aria_queue_efos_match', 1.0),
    (1429, 181421, 'ALFREDO JAIME CALDERON', 'sanctioned_individual', 'high', 'aria_queue_sfp_match', 1.0),
    (1430, 35776, 'QUADRUM LIMPIEZA Y CONSTRUCCION, S.A. DE C.V.', 'shell_vendor', 'high', 'aria_queue_efos_centinela_match', 1.0),
    (1431, 32118, 'CONSORCIO DE INGENIERIA PETROLERA, S.A. DE C.V.', 'shell_vendor', 'high', 'aria_queue_efos_match', 1.0),
    (1432, 22416, 'INFRAESTRUCTURA EN CONSTRUCCION, S.A. DE C.V.', 'captured_vendor', 'high', 'aria_queue_efos_match', 1.0),
    (1433, 23590, 'HERA CONSORCIO CONSTRUCTIVO, S.A. DE C.V.', 'shell_vendor', 'medium', 'aria_queue_efos_match', 1.0),
]

FP_VENDOR_IDS = [
    139711,  # ALSTOM — rail oligopoly
    8143, 7434, 15430, 29819, 18284, 32143, 21437, 15378,  # oilfield-services / energy
    44204, 477, 11196, 656, 67172,  # insurance oligopoly
]

try:
    # Insert cases
    for c in CASES:
        cols = list(c.keys())
        placeholders = ','.join('?' * len(cols))
        sql = f"INSERT OR IGNORE INTO ground_truth_cases ({','.join(cols)}) VALUES ({placeholders})"
        cur.execute(sql, [c[k] for k in cols])

    # Insert vendors
    for v in VENDORS:
        case_id, vendor_id, vendor_name, role, evidence, method, confidence = v
        cur.execute("""
            INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, role, evidence_strength, match_method, match_confidence)
            VALUES (?,?,?,?,?,?,?)
        """, v)

    # Mark in_ground_truth
    vendor_ids = [v[1] for v in VENDORS]
    placeholders = ','.join('?' * len(vendor_ids))
    cur.execute(f"UPDATE aria_queue SET in_ground_truth = 1 WHERE vendor_id IN ({placeholders})", vendor_ids)

    # Set structural FP flags for oligopoly sectors
    fp_placeholders = ','.join('?' * len(FP_VENDOR_IDS))
    cur.execute(f"UPDATE aria_queue SET fp_structural_monopoly = 1 WHERE vendor_id IN ({fp_placeholders})", FP_VENDOR_IDS)

    conn.commit()

    cur.execute("SELECT MAX(id), COUNT(*) FROM ground_truth_cases")
    max_id2, total2 = cur.fetchone()
    cur.execute("SELECT COUNT(DISTINCT vendor_id) FROM ground_truth_vendors")
    vendor_count = cur.fetchone()[0]
    print(f"After: max_id={max_id2}, total={total2}, vendors={vendor_count}")
    print(f"Added: {total2 - total} cases")

    cur.execute("SELECT id, case_id, confidence_level, case_name FROM ground_truth_cases WHERE id >= 1425 ORDER BY id")
    for r in cur.fetchall():
        print(f"  {r[0]}: {r[1]} | {r[2]} | {r[3][:55]}")

except Exception as e:
    conn.rollback()
    print(f"ERROR: {e}")
    import traceback; traceback.print_exc()
    sys.exit(1)

conn.close()
print("Batch I complete.")
