"""Insert GT cases 159-166: ILAS LICONSA milk, CENEVAL, PIGUDI IMSS, AXTEL, TecnoHumana, DICONSA ring, AXA, Quality Laboral."""
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

# Case 159: ILAS MEXICO - powdered milk to LICONSA at 100%DA
cid = insert_case(
    'ILAS_MEXICO_LICONSA_LECHE_POLVO_100DA',
    'ILAS Mexico LICONSA Powdered Milk Monopoly 100%DA - 3.82B (2021)',
    'procurement_fraud',
    2021, 2022,
    3820000000,
    'high',
    'ILAS Mexico SA de CV (sin RFC) received 3.82B MXN in 23 contracts at 100%DA exclusively '
    'from LICONSA SA de CV (government milk distribution program) during 2021. '
    'Products: "SERVICIO DE MAQUILA PARA LA RECOLECCION, SECADO, ENSOBRADO..." (powdered milk maquila), '
    '"Leche en polvo instantanea fortificada con vitaminas" (534M DA), '
    '"Leche en polvo instantanea" (520M DA), "Leche descremada en polvo" (446M DA), '
    '"Leche en polvo instantanea" (426M DA). '
    'LICONSA provides subsidized milk to 6 million low-income families in Mexico. '
    'CRITICAL: ALL 23 contracts are direct awards (100%DA) in a single year (2021). '
    'Powdered milk is a globally traded commodity with multiple suppliers (NZ, US, EU, domestic). '
    'LICONSA historically sources milk through competitive international tenders. '
    'A single company (no RFC) receiving 3.82B in powdered milk contracts at 100%DA in 2021 '
    '— the same year LICONSA was restructured under SEGALMEX (which itself had a 9.4B fraud scandal) — '
    'raises serious procurement integrity concerns. '
    'Average contract value: 166M MXN per contract, all DA. '
    'ILAS Mexico appears to have no public profile or RFC registration.'
)
insert_vendor(cid, 124466, 'primary', 'high')
insert_contracts(cid, 124466)

# Case 160: CENEVAL - education evaluation monopoly at 100%DA from SEP
cid = insert_case(
    'CENEVAL_SEP_EVALUACION_MONOPOLIO_100DA',
    'CENEVAL Education Evaluation Monopoly 100%DA SEP/USICAMM - 3.98B',
    'monopoly',
    2010, 2025,
    3980000000,
    'medium',
    'Centro Nacional de Evaluacion para la Educacion Superior (CENEVAL) (sin RFC) '
    'received 3.98B MXN in 148 contracts at 100%DA exclusively from SEP (Secretaria de Educacion Publica) '
    'and USICAMM (Unidad del Sistema para la Carrera de las Maestras y los Maestros). '
    'Top contracts: 716M DA 2018 (SEP), 562M DA 2017 (SEP), 455M DA 2022 (USICAMM), 300M DA 2023 (USICAMM). '
    'Contract descriptions: "CONTRATACION ABIERTA DE LOS SERVICIOS INTEGRALES, CONSISTENTES EN..." '
    '— comprehensive testing services including EXANI (university admission), '
    'EGEL (graduate exit exams), and teacher career evaluations. '
    'CENEVAL is a civil association (non-profit) established by SEP in 1994 as the sole '
    'provider of standardized educational testing in Mexico. '
    'SEP awards 100%DA because CENEVAL is legally designated as the exclusive evaluation body. '
    'While the monopoly is government-designed (not market-captured), '
    'the 3.98B at 100%DA without any market testing of cost-effectiveness is worth documenting. '
    'The absence of competitive alternatives creates dependence and limits innovation in assessment. '
    'Medium confidence: legal basis for monopoly exists but scale warrants cost-effectiveness review.'
)
insert_vendor(cid, 46571, 'primary', 'medium')
insert_contracts(cid, 46571)

# Case 161: PIGUDI GASTRONOMICO - IMSS hospitality/food/transport at high DA
cid = insert_case(
    'PIGUDI_GASTRONOMICO_IMSS_HOSPEDAJE_DA',
    'Pigudi Gastronomico IMSS Hospitality Transport 58%DA - 4.00B',
    'procurement_fraud',
    2018, 2025,
    4000000000,
    'high',
    'Pigudi Gastronomico SA de CV (sin RFC) received 4.00B MXN in 132 contracts at 58%DA '
    'exclusively from IMSS (Servicios de Salud del Instituto Mexicano del Seguro Social) '
    'for "SERVICIO DE HOSPEDAJE, ALIMENTACION Y TRANSPORTE TERRESTRE" (lodging, food, and ground transport). '
    'Top contracts: 1,025M DA 2025, 938M LP 2024, 915M LP 2025, 350M DA 2025. '
    'The combination of lodging, food service, and ground transport to IMSS is unusual: '
    'IMSS would need this for medical brigades in remote areas, training programs, '
    'or mobile medical teams. However: '
    '1. A "gastronomico" (food service) company providing integrated hospitality+transport is atypical '
    '2. 4B MXN for all-inclusive services to a healthcare institution at 58%DA suggests a '
    '   bundled contract that may inflate scope to avoid competitive bidding '
    '3. Two DA contracts totaling 1,375M in 2025 alone (April and February) are very large '
    '4. No RFC for a company receiving 4B in complex service contracts '
    '5. The LP contracts (938M and 915M in 2024-2025) suggest awareness that larger amounts '
    '   require competition, while smaller contracts are done via DA '
    'Pigudi Gastronomico appears specialized exclusively in IMSS contracts with no public profile.'
)
insert_vendor(cid, 73795, 'primary', 'high')
insert_contracts(cid, 73795)

# Case 162: AXTEL - telecom PEMEX/SAT/SEP at 71%DA
cid = insert_case(
    'AXTEL_TELECOM_PEMEX_SAT_SEP_71DA',
    'Axtel SAB de CV PEMEX-SAT-SEP Telecom Capture 71%DA - 14.04B',
    'monopoly',
    2005, 2025,
    14040000000,
    'medium',
    'Axtel SAB de CV (Alfa Group, sin RFC) received 14.04B MXN in 748 contracts at 71%DA. '
    'Top contracts: 2,100M DA 2015 (PEMEX), 795M LP 2016 (SAT), 721M DA 2017 (SEP), 636M LP 2024 (SAT). '
    'Axtel (now Axtel Enterprise, formerly Alestra/Axtel under Alfa Group) provides '
    'fixed-line, enterprise IT, and managed services. '
    'The 2.1B DA to PEMEX in 2015 is the largest single contract — awarded directly to Axtel '
    'without competition for critical PEMEX communications infrastructure. '
    'Combined with TELMEX (Case 155, 20.55B, 77%DA) + AXTEL (14.04B, 71%DA) = '
    '34.59B in government enterprise telecom at >70%DA. '
    'While Axtel and TELMEX are different corporate groups (Alfa vs America Movil), '
    'they collectively dominate government enterprise telecom: '
    'SAT contracts both (795M LP and 636M LP to Axtel, 672M LP to TELMEX), '
    'PEMEX contracts both via DA. '
    'Government enterprise telecom has multiple viable providers (Axtel, TELMEX, Megacable, Totalplay, Izzi) '
    'but DA rates of 70-77% suggest market allocation by institution rather than open competition.'
)
insert_vendor(cid, 43785, 'primary', 'medium')
insert_contracts(cid, 43785)

# Case 163: TECNOPROGRAMACION HUMANA - IT managed services ISSSTE/FGR
cid = insert_case(
    'TECNOPROGRAMACION_HUMANA_ISSSTE_FGR_IT_DA',
    'Tecnoprogramacion Humana ISSSTE-FGR IT Managed Services 57%DA - 5.31B',
    'procurement_fraud',
    2010, 2025,
    5310000000,
    'high',
    'Tecnoprogramacion Humana Especializada en Sistemas Operativos SA de CV (sin RFC) '
    'received 5.31B MXN in 82 contracts at 57%DA for IT equipment leasing and managed services. '
    'Top contracts: 1,910M DA 2015 (ISSSTE), 841M LP 2022 (FGR), 549M IC3P 2021 (STPS), '
    '306M DA 2022 (ISSSTE continuity). '
    'ISSSTE: 1.91B@100%DA (2015), plus 306M DA (2022), 280M DA (2020). '
    'FGR (Attorney General): 841M LP for "Servicio Administrado de Infraestructura de Escritorio" '
    '(managed desktop infrastructure service). '
    'STPS (Labor Ministry): 549M IC3P for laptop/peripheral leasing. '
    'The 1.91B DA from ISSSTE in 2015 is the central red flag: '
    '1. IT equipment leasing/managed services is a fully competitive market '
    '2. Adjudicacion directa for 1.91B in IT services without patented technology justification '
    '   violates LAASSP Art. 41 unless ISSSTE declared emergency '
    '3. Subsequent ISSSTE contracts at 306M DA (2022) continue the DA pattern '
    '4. "Continuidad operativa" (operational continuity) is commonly used to justify DA lock-in: '
    '   once a vendor installs equipment, "continuity" clauses block future competition '
    'No RFC for a company receiving 5.31B in IT contracts to government institutions.'
)
insert_vendor(cid, 44923, 'primary', 'high')
insert_contracts(cid, 44923)

# Case 164: DICONSA Ring Completion - Molinera, La Corona, Maseca
cid = insert_case(
    'DICONSA_RING_COMPLETION_MOLINERA_CORONA_MASECA',
    'DICONSA Ring Completion: Molinera 3.04B + La Corona 2.70B + Maseca 2.66B (8.40B total)',
    'procurement_fraud',
    2005, 2025,
    8400000000,
    'medium',
    'Three additional members of the DICONSA/Alimentacion para el Bienestar food distribution ring '
    'totaling 8.40B MXN at 100%DA with extreme micro-contract fraccionamiento: '
    '1. MOLINERA DE MEXICO SA DE CV (VID=45219, sin RFC): 3.04B in 10,243 micro-DA contracts to DICONSA. '
    '   Corn flour distributor (competitor to Maseca/GRUMA). '
    '   Avg contract: 297K MXN. 10,243 contracts represents extreme systematic fraccionamiento. '
    '2. FABRICA DE JABON LA CORONA SA DE CV (VID=44985, sin RFC): 2.70B in 10,917 micro-DA contracts. '
    '   Mexicanas oldest soap brand. Cleaning/hygiene products for DICONSA community stores. '
    '   Avg contract: 247K MXN. 10,917 contracts — the most in the DICONSA ring. '
    '3. GRUPO INDUSTRIAL MASECA SAB de CV (VID=45086, sin RFC): 2.66B in 5,556 DA contracts. '
    '   MASECA brand masa harina (corn tortilla flour, Gruma subsidiary). '
    '   Despite being Mexicos dominant brand, receives DA rather than LP. '
    '   Avg contract: 479K MXN. '
    'All three distribute to DICONSA/Alimentacion para el Bienestar community stores nationwide. '
    'The DICONSA food distribution ring now documented (Cases 127-131, 138-142, 164): '
    '14+ vendors totaling >40B MXN at 90-100%DA, all operating via thousands of micro-DA contracts '
    'to avoid competitive bidding thresholds. Model blind spot: risk scores near 0.000 for all.'
)
insert_vendor(cid, 45219, 'primary', 'medium')
insert_vendor(cid, 44985, 'secondary', 'medium')
insert_vendor(cid, 45086, 'secondary', 'medium')
insert_contracts(cid, 45219)
insert_contracts(cid, 44985)
insert_contracts(cid, 45086)

# Case 165: AXA ASSISTANCE NAFIN - health insurance DA
cid = insert_case(
    'AXA_ASSISTANCE_NAFIN_BANJERCITO_DA',
    'AXA Assistance Mexico NAFIN-BANJERCITO Health Insurance 70%DA - 4.15B',
    'procurement_fraud',
    2010, 2025,
    4150000000,
    'medium',
    'AXA Assistance Mexico SA de CV (sin RFC) received 4.15B MXN in 33 contracts at 70%DA, '
    'concentrated in Nacional Financiera (NAFIN) and BANJERCITO (military bank). '
    'Top contracts: 1,198M DA 2015 (NAFIN), 744M DA 2011 (NAFIN), 326M DA 2014 (NAFIN), '
    '276M DA 2019 (BANJERCITO, "Servicio integral de salud para derechohabientes"). '
    'AXA is a major French multinational insurance group with legitimate health insurance products. '
    'NAFIN (Nacional Financiera) is a development bank providing health benefits to its employees. '
    'BANJERCITO is the military bank providing health services to military families. '
    'Red flags: '
    '1. Health insurance for government institutions should be subject to competitive bidding '
    '   (multiple insurers: Metlife, AXA, GNP, Inbursa, Mapfre, Seguros Banorte) '
    '2. 1.198B DA in 2015 to a development bank (NAFIN) for employee health insurance '
    '   without competition is unusual '
    '3. Repeated DA renewals (2011, 2014, 2015) suggest lock-in without retendering '
    '4. BANJERCITO serving military families at 276M DA raises national security procurement questions '
    'Medium confidence: health insurance renewal DA is common but the sustained '
    'multi-year pattern without competitive retendering suggests capture.'
)
insert_vendor(cid, 92401, 'primary', 'medium')
insert_contracts(cid, 92401)

# Case 166: QUALITY LABORAL SERVICES - staffing COMEX (PEMEX subsidiary)
cid = insert_case(
    'QUALITY_LABORAL_COMEX_PEMEX_STAFFING_DA',
    'Quality Laboral Services COMEX PEMEX Staffing 67%DA - 2.59B',
    'procurement_fraud',
    2008, 2015,
    2590000000,
    'medium',
    'Quality Laboral Services SA de CV (sin RFC) received 2.59B MXN in only 6 contracts '
    'at 67%DA exclusively from Compañia Mexicana de Exploraciones SA de CV (COMEX), '
    'a PEMEX subsidiary for geological exploration. '
    'Contracts: 947M DA 2013-12-01, 822M LP 2010-03-12, 550M DA 2013-04-01, 160M LP 2008-02-07. '
    'Quality Laboral is a staffing/labor services company providing personnel to COMEX. '
    'COMEX is the same institution that contracted Manejo Integral en Consulta Empresarial '
    '(2 contracts, 6.31B, Cases researched earlier). '
    'Red flags: '
    '1. Two DA contracts in 2013 (947M + 550M = 1.497B) to a labor company without competition '
    '   — December DA combined with an April DA suggests systematic circumvention '
    '2. COMEX appears to be a hub for irregular contracting: Quality Laboral + Manejo Integral '
    '   = 8.9B combined in contracts to this single PEMEX subsidiary '
    '3. Staffing services are among the most competitive markets; DA has no technical justification '
    '4. No RFC for a staffing company providing 2.59B in services to a state oil company '
    '5. COMEX (PEMEX exploration) is a high-revenue environment with historical corruption risk '
    'The 2013 DA pattern (April + December) suggests budget dumping and procurement circumvention.'
)
insert_vendor(cid, 35071, 'primary', 'medium')
insert_contracts(cid, 35071)

# Summary
total_cases = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
print(f'\nGT Summary: {total_cases} cases | {total_vendors} vendors | {total_contracts} contracts')
conn.close()
