"""Insert GT cases 184-185: CASA PLARRE (anesthesia gas DA ring) and LOS CHANEQUES (hospital food DA)."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from datetime import datetime

DB = 'RUBLI_NORMALIZED.db'
conn = sqlite3.connect(DB)
now = datetime.now().isoformat()

def insert_case(case_id, case_name, case_type, year_start, year_end, estimated_fraud, confidence, notes):
    conn.execute('''INSERT OR IGNORE INTO ground_truth_cases
        (case_id, case_name, case_type, year_start, year_end, estimated_fraud_mxn, confidence_level, notes, created_at)
        VALUES (?,?,?,?,?,?,?,?,?)''',
        (case_id, case_name, case_type, year_start, year_end, estimated_fraud, confidence, notes, now))
    row = conn.execute('SELECT id FROM ground_truth_cases WHERE case_id=?', (case_id,)).fetchone()
    conn.commit()
    print(f'Case {case_id}: id={row[0]}')
    return row[0]

def insert_vendor(case_db_id, vendor_id, role='primary', confidence='high'):
    v = conn.execute('SELECT name, rfc FROM vendors WHERE id=?', (vendor_id,)).fetchone()
    vname = v[0] if v else str(vendor_id)
    vrfc = v[1] if v else None
    conn.execute('''INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, rfc_source, role, evidence_strength, match_method, match_confidence, created_at)
        VALUES (?,?,?,?,?,?,?,?,?)''',
        (case_db_id, vendor_id, vname, vrfc, role, confidence, 'vendor_id_direct', 1.0, now))
    conn.commit()

def insert_contracts(case_db_id, vendor_id):
    n = conn.execute('''INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id)
        SELECT ?, id FROM contracts WHERE vendor_id=?''', (case_db_id, vendor_id)).rowcount
    conn.commit()
    print(f'  -> {n} contracts linked for vendor {vendor_id}')
    return n

# ── Case 184: CASA PLARRE — IMSS/ISSSTE anesthesia gas DA monopoly ─────────────
cid = insert_case(
    'CASA_PLARRE_IMSS_ISSSTE_ANESTESIA_GAS_DA_MONOPOLY',
    'Casa Plarre IMSS+ISSSTE Anesthesia Gas Service DA Monopoly 46.5%DA - 6.18B',
    'procurement_fraud',
    2011, 2025,
    6180000000,
    'high',
    'Casa Plarre SA de CV (VID=6842, sin RFC) received 6.18B MXN in 570 contracts at 46.5%DA, '
    'providing integrated anesthesia gas dosification services to major federal health institutions: '
    'IMSS (266c, 2.501B, 42.1%DA), ISSSTE (40c, 2.055B, 82.5%DA), SEDENA (11c, 0.561B, 27.3%DA). '
    'Contract description pattern: "SERVICIO INTEGRAL DE ANESTESIA O DOSIFICACION DE GAS" — '
    'integrated anesthesia gas service for hospital operating theaters. '
    'Largest contracts: ISSSTE 565.6M DA (2022-04-01), IMSS 380.7M DA (2020-05-15), '
    'IMSS 361.4M DA (2017-03-31), ISSSTE 343.6M DA (2023-07-01), ISSSTE 303.2M DA (2020-05-01). '
    'KEY PATTERN: 2002-2010 = exclusively LP (0%DA, clean history). '
    '2011 onset of DA: 60%DA. Subsequent years show systematic escalation: '
    '2019=91.3%, 2020=87.5%, 2021=72.7%, 2023=72.5%, 2024=86.5%. '
    'The inflection point in 2011 coincides with the IMSS/ISSSTE transition to '
    '"subrogation" (outsourcing) models for specialized hospital services. '
    'Anesthesia gas dosification is NOT an exclusive technology or patented service — '
    'multiple companies can provide integrated gas management systems. '
    'The 82.5% DA at ISSSTE for 2.055B in gas services (with no RFC) contradicts '
    'LAASSP competitive bidding requirements. No RFC for a company with 6.18B over 23 years '
    'in critical hospital services. The pre-2011 clean LP history confirms this is not a '
    'structural market monopoly but a pattern of captured institutional relationships '
    'built after the subrogation model was introduced. High confidence: clear timeline '
    'of LP→DA transition, extreme ISSSTE rate (82.5%), no RFC, and repeated top-value DA '
    'contracts across multiple years are strong indicators of procurement fraud.'
)
insert_vendor(cid, 6842, 'primary', 'high')
insert_contracts(cid, 6842)

# ── Case 185: PROCESADORA LOS CHANEQUES — ISSSTE/IMSS food supply DA ──────────
cid = insert_case(
    'LOS_CHANEQUES_ISSSTE_IMSS_BIENESTAR_FOOD_DA_MONOPOLY',
    'Procesadora Los Chaneques ISSSTE+IMSS-Bienestar Hospital Food DA - 5.4B',
    'procurement_fraud',
    2012, 2025,
    5400000000,
    'medium',
    'Procesadora y Distribuidora Los Chaneques SA de CV (VID=61263, sin RFC) received 5.40B MXN '
    'in 499 contracts at 43.1%DA, providing food supply and distribution to federal health '
    'institution hospitals: ISSSTE (29c, 2.565B, 58.6%DA), '
    'IMSS-Bienestar/SSISSSTE (5c, 1.244B, 80%DA). '
    'Contract descriptions: "CONTRATACIÓN ABIERTA DEL SERVICIO DE SUMINISTRO Y DISTRIBUCIÓN '
    'DE PRODUCTOS ALIMENTICIOS" (open contracting food supply to ISSSTE hospitals), '
    '"SUMINISTRO Y DISTRIBUCIÓN DE PRODUCTOS ALIMENTICIOS" (food for hospital patients). '
    'Key contracts: ISSSTE 1.075B LP (2025-05-09, open tender), '
    'IMSS-Bienestar 486.8M DA (2025-01-15, hospital food), '
    'ISSSTE 482.9M LP (2018-08-01, consolidated food acquisition), '
    'ISSSTE 451.6M DA (2023-12-22, food distribution). '
    '2025 volume explosion: 2.537B in 2025 alone (48.5%DA), representing 47% of all-time total. '
    '58.6%DA at ISSSTE and 80%DA at IMSS-Bienestar for food supply distribution — '
    'commodities that should be competitively bid under LAASSP — is anomalous. '
    'IMSS-Bienestar is the AMLO-era transformation of the IMSS rural health network; '
    'it has been documented for procurement irregularities. '
    'No RFC for a company with 5.4B in hospital food supply contracts over 13 years. '
    'Medium confidence: some LP contracts exist in parallel, but the DA concentration at '
    'ISSSTE and IMSS-Bienestar warrants investigation. Food supply for hospitals is a '
    'commodity sector that must use LP by LAASSP — DA justifications for recurring food '
    'supply contracts are difficult to sustain legally. '
    'Related to documented pattern of IMSS-Bienestar procurement concerns (2021-2025).'
)
insert_vendor(cid, 61263, 'primary', 'medium')
insert_contracts(cid, 61263)

# ── Additional structural FPs (batch) ─────────────────────────────────────────
print('\nFlagging additional structural FPs...')
more_fp = [
    2155,    # SIEMENS SA - industrial OEM
    4389,    # FRESENIUS KABI - IV solutions/clinical nutrition OEM
    246753,  # KEDRION MEXICANA - blood plasma products
    1506,    # BECTON DICKINSON - medical devices OEM
    45048,   # CFE - state electricity entity as vendor
    4489,    # GRIFOLS MEXICO - blood plasma OEM
    17192,   # SEGUROS ATLAS - insurance
    5212,    # PROBIOMED - biosimilar/biologic manufacturer (patented)
]
for vid in more_fp:
    r = conn.execute('UPDATE aria_queue SET fp_structural_monopoly=1 WHERE vendor_id=? AND fp_structural_monopoly=0 AND in_ground_truth=0', (vid,))
    if r.rowcount > 0:
        name_row = conn.execute('SELECT name FROM vendors WHERE id=?', (vid,)).fetchone()
        nm = name_row[0][:50] if name_row else '?'
        print(f'  VID={vid} {nm}: fp_structural_monopoly=1')
conn.commit()

total_cases = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
print(f'\nGT Summary: {total_cases} cases | {total_vendors} vendors | {total_contracts} contracts')
conn.close()
