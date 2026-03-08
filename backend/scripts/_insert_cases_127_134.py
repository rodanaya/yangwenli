"""Insert ground truth cases 127-134: DICONSA food ring, IMSS medical services, tech monopolies."""
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

# Case 127: MOLINOS AZTECA - DICONSA Food Program DA Ring Leader
cid = insert_case(
    'MOLINOS_AZTECA_DICONSA_DA_RING',
    'Molinos Azteca DICONSA Food Program 100%DA Ring Leader',
    'procurement_fraud',
    2014, 2025,
    8070000000,
    'medium',
    'Largest DICONSA/Alimentacion para el Bienestar food supplier: 8.07B MXN in 11,372 contracts '
    'at 100%DA, no RFC. Confirmed part of multi-vendor DA ring alongside Industrial Patrona, '
    'Granos Omega, Inagro Comercial, Brand and Push. Model blind spot: rs=0.001 due to high-frequency '
    'micro-contract DA pattern.'
)
insert_vendor(cid, 132864, 'primary', 'medium')
insert_contracts(cid, 132864)

# Case 128: INDUSTRIAL PATRONA - DICONSA Food Program DA Ring Member
cid = insert_case(
    'INDUSTRIAL_PATRONA_DICONSA_DA',
    'Industrial Patrona DICONSA 100%DA Food Distribution',
    'procurement_fraud',
    2010, 2024,
    3940000000,
    'medium',
    'DICONSA/Alimentacion para el Bienestar food supplier: 3.94B in 4,463 contracts at 100%DA, '
    'no RFC. Part of multi-vendor DA ring at DICONSA. Model extreme blind spot: rs=0.000.'
)
insert_vendor(cid, 45184, 'primary', 'medium')
insert_contracts(cid, 45184)

# Case 129: MARCAS NESTLE - DICONSA Food Ring
cid = insert_case(
    'MARCAS_NESTLE_DICONSA_DA_RING',
    'Marcas Nestle DICONSA 99%DA Food Supply Capture',
    'procurement_fraud',
    2005, 2022,
    5180000000,
    'low',
    'DICONSA food supplier operating under Nestle brand: 5.18B in 10,572 contracts at 99%DA, '
    'no RFC. Transition from competitive LP (2007-2009) to 100%DA (2012+) coincides with DICONSA '
    'DA ring formation. Model blind spot: rs=0.001.'
)
insert_vendor(cid, 19493, 'primary', 'low')
insert_contracts(cid, 19493)

# Case 130: CREATIVIDAD E INTEGRACION EN SERVICIOS MEDICOS - IMSS hemodialysis monopoly
cid = insert_case(
    'CREATIVIDAD_INTEGRACION_IMSS_HEMODIALISIS_DA',
    'Creatividad e Integracion en Servicios Medicos IMSS Hemodialysis Capture',
    'monopoly',
    2020, 2025,
    6700000000,
    'medium',
    'IMSS hemodialysis and hospital expansion service provider: 6.70B in 36 contracts at 69%DA. '
    'RFC: MTE9909144K1. IMSS: 5.4B@68%DA, Servicios Salud IMSS: 1.3B@100%DA. '
    'Average contract value: 186M. Individual large DA contracts: 777M (2025), 757M (2023). '
    'Similar pattern to Adaca Medical (Case 113). Provides SIUH (Servicio Integral Unidad de '
    'Hemodialisis) — specialized but replicable service that should have competition.'
)
insert_vendor(cid, 259061, 'primary', 'high')
insert_contracts(cid, 259061)

# Case 131: IMPROMED - IMSS+ISSSTE laboratory services capture
cid = insert_case(
    'IMPROMED_IMSS_ISSSTE_LAB_DA',
    'Impromed IMSS-ISSSTE Laboratory Services 78%DA Capture',
    'procurement_fraud',
    2002, 2025,
    15270000000,
    'medium',
    'Medical laboratory services monopoly at IMSS and ISSSTE: 15.27B in 242 contracts at 78%DA, '
    'no RFC. IMSS: 12.5B@76%DA, ISSSTE: 2.6B@87%DA. '
    'Largest contracts by LP (5B, 3B, 2B) but 78%DA on the full contract portfolio. '
    'Provides Servicio Medico Integral Estudios de Laboratorio — lab testing services. '
    'Two-decade capture of government medical testing without tax identity.'
)
insert_vendor(cid, 44125, 'primary', 'medium')
insert_contracts(cid, 44125)

# Case 132: CENTRO DIAGNOSTICO ANGELES - IMSS private diagnostic monopoly
cid = insert_case(
    'CENTRO_DIAGNOSTICO_ANGELES_IMSS_DA',
    'Centro de Diagnostico Angeles IMSS Private Diagnostics 63%DA',
    'monopoly',
    2009, 2025,
    10800000000,
    'medium',
    'Private hospital diagnostics to IMSS: 10.80B in 141 contracts at 63%DA, no RFC. '
    'IMSS: 10.79B@64%DA — virtually single-institution capture. '
    'Angeles is a private hospital chain. Government should competitively bid diagnostic imaging '
    'and lab services. Large years (2015: 4.3B in 25c) had mostly LP but overall 63%DA. '
    'Pattern: high-value private hospital receiving government medical service contracts without '
    'adequate competition.'
)
insert_vendor(cid, 40862, 'primary', 'medium')
insert_contracts(cid, 40862)

# Case 133: AEROVIAS DE MEXICO (AEROMEXICO) - Government travel 96%DA
cid = insert_case(
    'AEROMEXICO_GOVT_TRAVEL_96PCT_DA',
    'Aerovias de Mexico (Aeromexico) Government Travel 96%DA Monopoly',
    'monopoly',
    2010, 2025,
    5790000000,
    'low',
    'Aeromexico receiving government travel contracts at 96%DA: 5.79B in 299 contracts, no RFC. '
    'FGR: 1.3B@71%, PEMEX: 0.9B@100%, PGR: 0.8B@100%. '
    'Airline tickets should be purchased competitively — multiple carriers serve Mexican routes. '
    'DA may be partially justified by security/priority booking for security institutions '
    'but 96%DA across all government is excessive. '
    'Largest contracts: 541M DA 2025, 460M DA 2020, 453M DA 2017.'
)
insert_vendor(cid, 45460, 'primary', 'low')
insert_contracts(cid, 45460)

# Case 134: JET VAN CAR RENTAL - Government fleet rental 71%DA
cid = insert_case(
    'JET_VAN_CAR_RENTAL_GOVT_DA',
    'Jet Van Car Rental Government Vehicle Fleet 71%DA Capture',
    'procurement_fraud',
    2005, 2025,
    16970000000,
    'medium',
    'Vehicle rental service provider to multiple government agencies: 16.97B in 874 contracts at 71%DA, '
    'no RFC. SAT: 3.7B@17%DA (mostly competitive), Segalmex: 1.7B@0%DA, CAPUFE: 1.4B@33%DA. '
    'Overall 71%DA despite top clients using LP. Many agency contracts at 80-100%DA. '
    'Vehicle fleet rental is a competitive market with multiple providers. '
    'One of the largest vehicle leasing contracts: 1.25B DA 2021. Second largest was LP (1.7B 2019).'
)
insert_vendor(cid, 17455, 'primary', 'medium')
insert_contracts(cid, 17455)

# Summary
total_cases = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
print(f'\nGT Summary: {total_cases} cases | {total_vendors} vendors | {total_contracts} contracts')
conn.close()
