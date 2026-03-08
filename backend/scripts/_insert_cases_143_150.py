"""Insert GT cases 143-150: SOFOM vehicle, security, vouchers, oxygen, blood bank, medical."""
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

# Case 143: INTEGRA ARRENDA SOFOM - 3.6B single DA for vehicle transport to Bienestar
cid = insert_case(
    'INTEGRA_ARRENDA_BIENESTAR_AMBULANCIAS_DA',
    'Integra Arrenda SOFOM ENR - 3.6B DA Bienestar 2024 Vehicle Transport',
    'procurement_fraud',
    2014, 2025,
    12170000000,
    'high',
    'Integra Arrenda SA de CV SOFOM ENR (sin RFC) received 12.17B MXN in vehicle leasing contracts. '
    'CRITICAL: 3,642M MXN single DA contract 2024 from Secretaria de Bienestar for '
    '"SERVICIO DE ARRENDAMIENTO TRANSPORTE VEHICULAR TERRESTRE DENTRO DEL TERRITORIO NACIONAL." '
    'Also: 2,805M LP ambulance leasing to IMSS (2025), 1,068M LP ambulance leasing (2021). '
    'Secretaria de Bienestar: 3.6B@100%DA. IMSS: 4.2B@20%DA (mostly LP). '
    'The 3.6B single DA to Bienestar for vehicle transport is one of the largest single DA '
    'contracts in the 3.1M dataset. Vehicle transportation is a competitive market. '
    'A SOFOM (non-bank financial entity) receiving social welfare vehicle contracts at 100%DA '
    'raises serious procurement integrity questions.'
)
insert_vendor(cid, 136141, 'primary', 'high')
insert_contracts(cid, 136141)

# Case 144: PRYSE SEGURIDAD PRIVADA - IMSS hospital security at 55%DA
cid = insert_case(
    'PRYSE_SEGURIDAD_IMSS_HOSPITAL_DA',
    'Grupo de Seguridad Privada Pryse IMSS Hospital Security 55%DA',
    'procurement_fraud',
    2010, 2025,
    12900000000,
    'medium',
    'Grupo de Seguridad Privada Pryse de Mexico SA de CV (sin RFC) received 12.90B MXN in '
    'hospital security contracts at 55%DA. '
    'IMSS: 4.6B@52%DA, IMSS Salud: 3.1B@33%DA, CAPUFE: 2.1B@63%DA. '
    'Contract description: "SERVICIO DE SEGURIDAD SUBROGADA PARA LOS HOSPITALES" — '
    'outsourced security services for IMSS hospitals. '
    'Largest contracts: 1,634M LP (2025), 1,523M LP (2022), 1,136M DA (2025). '
    'Security services for hospitals should be competitively bid. While the largest contracts '
    'use LP, many medium-value contracts are DA. Private security is a competitive industry '
    'with multiple national providers (Securitas, G4S, Grupo Monitor, etc.). '
    'No RFC for a company providing security to 4.6B in IMSS hospital contracts is anomalous.'
)
insert_vendor(cid, 200343, 'primary', 'medium')
insert_contracts(cid, 200343)

# Case 145: SI VALE MEXICO - meal vouchers at 62%DA
cid = insert_case(
    'SI_VALE_MEXICO_VOUCHER_MONOPOLY_DA',
    'Si Vale Mexico Meal Voucher Monopoly 62%DA - 15.92B',
    'monopoly',
    2010, 2025,
    15920000000,
    'medium',
    'Si Vale Mexico SA de CV (sin RFC) received 15.92B MXN in food/meal voucher contracts at 62%DA. '
    'ISSSTE: 3.0B@66%DA, Secretaria de Salud: 2.8B@50%DA, LICONSA: 1.2B@63%DA. '
    'Si Vale is a meal voucher/food card company (Sodexo brand in Mexico). '
    'Similar to Edenred (Case 15, Government Voucher Monopoly in GT). '
    'Meal voucher market in Mexico has multiple providers (Edenred, Sodexo/Si Vale, Sodimac). '
    'Three largest contracts: 1,082M DA 2015, 1,045M DA 2015, 1,038M LP 2016. '
    'Government voucher market is effectively a duopoly/oligopoly (Edenred + Si Vale) '
    'with each entity capturing different institutions through DA arrangements. '
    'No RFC for a company managing billions in government payroll benefits is problematic.'
)
insert_vendor(cid, 44362, 'primary', 'medium')
insert_contracts(cid, 44362)

# Case 146: ABALAT SA DE CV - blood bank services national health institutes
cid = insert_case(
    'ABALAT_BLOOD_BANK_NATIONAL_INSTITUTES_DA',
    'Abalat SA de CV Blood Bank Services National Health Institutes 68%DA',
    'monopoly',
    2005, 2025,
    8400000000,
    'high',
    'Abalat SA de CV (sin RFC) received 8.40B MXN in blood bank and medical services '
    'at 68%DA, concentrated in national health institutes. '
    'INCMNSZ: 1.20B, INER: 1.12B, Instituto Nacional de Pediatria: 1.10B — three premier '
    'national health institutes. Also: INMEGEN, INCAN, others. '
    'Contract types: "SERVICIO MEDICO INTEGRAL DE BANCO DE SANGRE" (blood bank), '
    '"Adquisicion de Insumos COVID-19" (COVID supplies), '
    '"BIENES Y SERVICIOS PARA BANCOS DE SANGRE" (blood bank supplies). '
    'Blood banking is a critical, life-saving medical service. DA at 68% for this service '
    'at elite national institutes raises serious concerns about competitive fairness. '
    'A single vendor providing blood bank services to 3+ national health institutes with '
    'no RFC is extremely unusual and potentially dangerous from a service continuity standpoint.'
)
insert_vendor(cid, 17700, 'primary', 'high')
insert_contracts(cid, 17700)

# Case 147: INFRA SA DE CV - medical oxygen trending to 75%DA from 0%DA
cid = insert_case(
    'INFRA_OXIGENO_MEDICINAL_DA_TREND',
    'Infra SA de CV Medical Oxygen Monopoly Trending 75%DA - 41.82B',
    'monopoly',
    2003, 2025,
    41820000000,
    'low',
    'Infra SA de CV (sin RFC) received 41.82B MXN from IMSS and ISSSTE for medical oxygen '
    'and related services. The largest vendor in the dataset outside of energy companies. '
    'IMSS: 31.7B@43%DA, ISSSTE: 3.5B@64%DA. '
    'Products: home oxygen therapy (OXIGENO MEDICINAL DOMICILIARIO), sleep apnea treatment, '
    'industrial/medical gas supply. '
    'CRITICAL TREND: In 2003, ALL contracts were LP (0%DA). '
    'By 2024-2025, 71-75% of contracts are DA. '
    'This temporal shift from fully competitive (0%DA) to mostly DA (75%DA) suggests '
    'progressive capture of the procurement process. '
    'Infra is the dominant industrial gas company in Mexico (near-monopoly), '
    'but medical oxygen for home patients has multiple providers. '
    'At 41.82B total, even a partial DA irregularity represents massive public resources.'
)
insert_vendor(cid, 1378, 'primary', 'low')
insert_contracts(cid, 1378)

# Case 148: ELECTRONICA Y MEDICINA - IMSS medical equipment maintenance at 55%DA
cid = insert_case(
    'ELECTRONICA_MEDICINA_IMSS_MANTENIMIENTO_DA',
    'Electronica y Medicina SA IMSS Medical Equipment Maintenance 55%DA',
    'procurement_fraud',
    2002, 2025,
    10790000000,
    'medium',
    'Electronica y Medicina SA de CV (sin RFC) received 10.79B MXN in medical equipment '
    'maintenance contracts at 55%DA. '
    'IMSS: 6.5B@48%DA, ISSSTE: 1.9B@49%DA, INCAN: 0.4B@100%DA. '
    'Contract type: "SERVICIOS DE MANTENIMIENTO PREVENTIVO Y CORRECTIVO" for medical equipment. '
    'Top DA contracts: 862M DA 2020, 858M DA 2025, 671M DA 2017. '
    'Medical equipment maintenance has some lock-in for proprietary brands (GE, Siemens, Philips) '
    'but 55%DA across all equipment types for two decades without RFC is excessive. '
    'Multiple authorized service providers exist for most medical equipment brands in Mexico.'
)
insert_vendor(cid, 5259, 'primary', 'medium')
insert_contracts(cid, 5259)

# Case 149: GALIA TEXTIL - medical materials at 60%DA to IMSS
cid = insert_case(
    'GALIA_TEXTIL_IMSS_MATERIAL_CURACION_DA',
    'Galia Textil SA de CV IMSS Medical Materials (Curacion) 60%DA',
    'procurement_fraud',
    2002, 2025,
    7580000000,
    'medium',
    'Galia Textil SA de CV (sin RFC) received 7.58B MXN in medical materials contracts at 60%DA. '
    'IMSS: 5.6B@67%DA (main client), INSABI: 0.6B@63%DA, ISSSTE: 0.5B@28%DA. '
    'Product: "MATERIAL DE CURACION" — wound care materials (bandages, dressings, medical textiles). '
    'Medical textile and wound care materials are commodity products with multiple suppliers. '
    '60%DA for 7.58B in wound care materials over 20+ years without RFC is a long-term capture. '
    'Pattern: single textile company supplying IMSS wound care predominantly via DA since 2002.'
)
insert_vendor(cid, 5299, 'primary', 'medium')
insert_contracts(cid, 5299)

# Case 150: UNINET SA DE CV - telecom services IMSS/CONAGUA at 56%DA
cid = insert_case(
    'UNINET_IMSS_CONAGUA_TELECOM_DA',
    'Uninet SA de CV IMSS-CONAGUA Telecom Services 56%DA',
    'monopoly',
    2002, 2025,
    15130000000,
    'medium',
    'Uninet SA de CV (sin RFC) received 15.13B MXN in telecommunications and network services '
    'at 56%DA. IMSS: 3.7B@63%DA, CONAGUA: 1.6B@77%DA, SS: 1.2B@100%DA. '
    'Contract types: "Servicio Integral de Telecomunicaciones (SINTEL)" and administrative services. '
    'Top contracts: 1,329M LP 2007, 826M DA 2018 (SS), 809M LP 2023 (ISSSTE). '
    'Telecom services for government institutions should be competitive. '
    'While some contracts are LP, the 56%DA overall (especially SS at 100%DA) and '
    'CONAGUA at 77%DA suggests selective bypassing of competition for some institutions. '
    'No RFC for 15.13B in government telecom contracts is anomalous.'
)
insert_vendor(cid, 4041, 'primary', 'medium')
insert_contracts(cid, 4041)

# Summary
total_cases = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
print(f'\nGT Summary: {total_cases} cases | {total_vendors} vendors | {total_contracts} contracts')
conn.close()
