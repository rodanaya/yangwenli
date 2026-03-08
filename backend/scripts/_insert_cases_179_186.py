"""Insert GT cases 179-186: Aeroenlaces, Maiz Mayab, Graficas Corona, Aseo Privado, Epsilon.Net, Televisa, HP Mexico, Medi Access."""
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

# Case 179: AEROENLACES NACIONALES - INAMI deportation air charter monopoly
cid = insert_case(
    'AEROENLACES_INAMI_DEPORTACION_CHARTER_100DA',
    'Aeroenlaces Nacionales INAMI Deportation Air Charter Monopoly 100%DA - 635M',
    'monopoly',
    2023, 2025,
    635000000,
    'medium',
    'Aeroenlaces Nacionales SA de CV (VID=291538, RFC=ANA050518RL1) received 635M MXN in 3 contracts at 100%DA '
    'from Instituto Nacional de Migración (INAMI) for migrant deportation air transport. '
    'Contracts: 321M DA 2025, 185M DA 2023, 129M DA 2024 — all "SERVICIO DE TRANSPORTACIÓN AÉREA PARA PERSONAS '
    'MIGRANTES EXTRANJEROS EN SITUACIÓN IRREGULAR". '
    'Context: Aeroenlaces is a Mexican charter airline. INAMI administers the deportation of undocumented migrants '
    'from Mexico — an operation requiring dedicated air transport. The 100%DA rate for all 3 contracts is suspicious: '
    'air charter is a competitive market with multiple operators (Aeromar, VivaAerobus cargo, smaller charters). '
    'Compare: ETN Turistar Lujo (VID=148090) provides ground transport for migrants at 13 contracts, '
    '2.85B, and uses ~46%DA — a much more competitive procurement pattern. '
    'The fact that INAMI deploys 100%DA exclusively for air deportation while using competitive procurement for '
    'ground transport suggests deliberate avoidance of competition for the air route. '
    'Financial context: 321M for a single year of deportation flights implies very high per-flight pricing. '
    'Mexico deports approximately 200,000-300,000 migrants annually by air — pricing warrants scrutiny.'
)
insert_vendor(cid, 291538, 'primary', 'medium')
insert_contracts(cid, 291538)

# Case 180: SUMINISTROS DE MAIZ DEL MAYAB - DICONSA corn supply captive DA
cid = insert_case(
    'MAIZ_MAYAB_DICONSA_MAIZ_MONOPOLIO_100DA',
    'Suministros de Maiz del Mayab DICONSA Corn Supply 100%DA - 2.15B',
    'monopoly',
    2010, 2025,
    2150000000,
    'medium',
    'Suministros de Maiz del Mayab SA de CV (VID=52803, sin RFC) received 2.15B MXN in 63 contracts '
    'at 100%DA exclusively from DICONSA (now Alimentación para el Bienestar). '
    'DICONSA operates the rural food distribution network (thousands of community stores in marginalized areas). '
    'Corn is its primary commodity — Suministros de Maiz del Mayab appears to be its exclusive Yucatán/Southeast '
    'corn supplier for ~15 years via direct award. '
    'Pattern matches the Segalmex food procurement ecosystem: a regional commodity supplier '
    'locks in a captive government buyer (LICONSA, DICONSA, SEGALMEX) through DA mechanisms. '
    'Compare: ILAS Mexico (Case 157, 3.82B, 100%DA to LICONSA for powdered milk) and '
    'Productos Loneg (Case 99, 3.08B, 91.7%DA to LICONSA). '
    'Corn is a fungible commodity traded on international markets (CBOT). A company with no RFC '
    'providing 2.15B in 100%DA corn to DICONSA over 15 years raises serious questions: '
    'Is the price at or above market? Is this company related to LICONSA/DICONSA officials? '
    'The absence of RFC makes beneficial ownership verification impossible.'
)
insert_vendor(cid, 52803, 'primary', 'medium')
insert_contracts(cid, 52803)

# Case 181: GRAFICAS CORONA - Government printing supply captive ring
cid = insert_case(
    'GRAFICAS_CORONA_IMPRENTA_GOBIERNO_DA_RING',
    'Graficas Corona JE Government Printing Supply Ring 81%DA - 2.14B',
    'monopoly',
    2005, 2025,
    2140000000,
    'medium',
    'Graficas Corona JE SA de CV (VID=71174, sin RFC) received 2.14B MXN in 185 contracts at 81%DA. '
    'Distribution: Talleres Gráficos de México (837M, 100%DA, 69c), Impresora y Encuadernadora Progreso '
    '(751M, 89%DA, 47c), CONALITEG (226M, 58%DA, 38c), SEP (100M), INEA (90M), CFE (72M). '
    'Graficas Corona is a captive paper/printing materials supplier to the government printing ecosystem: '
    '— TGM (Talleres Gráficos de México) is the federal government printing house (official gazette, official publications) '
    '— IEP (Impresora y Encuadernadora Progreso) prints CONALITEG textbooks (200M+ books/year) '
    '— Both are captive buyers with no alternative materials suppliers due to the DA mechanism. '
    'This case mirrors Grupo Papelero Gabor (Case 158, 4.94B, 92%DA to CONALITEG/IEP) — '
    'together these two companies form the dominant supplier cartel for government printing materials. '
    'The 89%DA to IEP for paper supply parallels the Gabor pattern (849 micro-contracts to IEP). '
    'A printing materials supplier with no RFC receiving 2.14B at 81%DA from government printers '
    'for over 20 years represents a structural captive market with zero competitive pressure.'
)
insert_vendor(cid, 71174, 'primary', 'medium')
insert_contracts(cid, 71174)

# Case 182: ASEO PRIVADO INSTITUCIONAL - ISSSTE/SSPC cleaning DA
cid = insert_case(
    'ASEO_PRIVADO_INSTITUCIONAL_ISSSTE_LIMPIEZA_DA',
    'Aseo Privado Institucional ISSSTE/SSPC Cleaning Services 62%DA - 1.91B',
    'overpricing',
    2018, 2025,
    1910000000,
    'medium',
    'Aseo Privado Institucional SA de CV (VID=258829, RFC=API160902RI3) received 1.91B MXN in 26 contracts '
    'at 62%DA. Breakdown: ISSSTE (781M, 4c, 100%DA), SS/Secretaría de Salud (357M, 1c, LP), '
    'SSPC (319M, 2c, 50%DA), Instituto Nacional de Pediatría (104M, 100%DA), INCAN/oncología (101M, 100%DA). '
    'RFC shows incorporation in September 2016 — a relatively new company that immediately secured '
    'hundreds of millions in government cleaning contracts. '
    'Pattern: 4 contracts to ISSSTE at 100%DA for 781M — institutional cleaning at ISSSTE hospitals/offices '
    'without competitive bidding. Cleaning services are a textbook competitive market with numerous providers. '
    'Similarities to Decoaro (Case 17, 1.46B ghost cleaning company) — though API appears to be a real '
    'company (not a ghost), the 100%DA cleaning contract pattern to ISSSTE health facilities '
    'suggests the same procurement capture. '
    'A company incorporated in 2016 receiving 781M in 100%DA cleaning contracts from ISSSTE within its '
    'first few years of operation, with 100%DA also to IMSS specialist hospitals, warrants investigation '
    'of beneficial ownership and connections to ISSSTE/IMSS contracting officials.'
)
insert_vendor(cid, 258829, 'primary', 'medium')
insert_contracts(cid, 258829)

# Case 183: EPSILON.NET - Gas infrastructure surveillance suspicious DA
cid = insert_case(
    'EPSILON_NET_CENAGAS_VIGILANCIA_INSTALACIONES_DA',
    'Epsilon.Net CENAGAS Gas Infrastructure Surveillance Single DA 2024 - 709M',
    'overpricing',
    2022, 2025,
    1010000000,
    'medium',
    'Epsilon.Net SA de CV (VID=286306, RFC=EPS1508116A6) received 1.01B MXN in 9 contracts total, '
    'including a single 709M MXN direct award in 2024 from Centro Nacional de Control del Gas Natural '
    '(CENAGAS) for "SERVICIO DE VIGILANCIA DE LAS INSTALACIONES ADMINISTRATIVAS, [GAS NETWORK]". '
    'Previous contracts: 89.7M LP 2023 and 84.8M LP 2022 from CENAGAS for gas modeling/simulation systems; '
    '62.6M DA 2022 from Colima state government for computer equipment; 1.3M LP from airport authority. '
    'The 709M 2024 DA represents an 8x jump from prior contracts — from 85-90M range '
    '(gas simulation systems, LP competitive) to a 709M DA for "surveillance" of gas installations. '
    'CENAGAS is the state agency managing Mexico\'s natural gas pipeline network — critical infrastructure. '
    'Surveillance/security for gas infrastructure would normally require strict security clearance '
    'and competitive procurement. A 709M single DA for this service — with no prior contract history '
    'at this scale — is a significant red flag. '
    'The description suggests physical and electronic security monitoring of CENAGAS facilities. '
    'Epsilon.Net (RFC: EPS1508116A6) needs background investigation: Who owns this company? '
    'Were there prior relationships between Epsilon.Net principals and CENAGAS officials?'
)
insert_vendor(cid, 286306, 'primary', 'medium')
insert_contracts(cid, 286306)

# Case 184: GRUPO TELEVISA - Government advertising direct award monopoly
cid = insert_case(
    'TELEVISA_PUBLICIDAD_GOBIERNO_100DA_MONOPOLY',
    'Grupo Televisa Government Advertising 100%DA Monopoly - 2.33B',
    'monopoly',
    2010, 2025,
    2330000000,
    'medium',
    'Grupo Televisa SAB (VID=131147, sin RFC) received 2.33B MXN in 149 contracts at 100%DA '
    'for government advertising and media services. '
    'Institutional distribution: Consejo de Promoción Turística (427M, 2c, 100%DA), '
    'IMSS (229M, 8c, 100%DA), SEGOB (185M, 20c, 100%DA), SEP (172M, 1c, 100%DA), '
    'Bienestar (155M, 2c, 100%DA), multiple other agencies. '
    'Top contracts: 310M DA 2018 "Contratación de espacios publicitarios en televisión"; '
    '138M DA 2018 "SERVICIO EN TELEVISIÓN DE LA CAMPAÑA DE DIFUSIÓN PARA L...". '
    'The 100%DA rate for ALL 149 contracts to Mexico\'s dominant broadcast television network '
    'represents a systematic market allocation: the Mexican government never competitively bid '
    'advertising on national TV. This is a structural governance failure. '
    'Context: Televisa controls ~70% of Mexican broadcast television audience. '
    'The LAASSP Art. 41 exemption used is typically "a single provider exists" — but in practice, '
    'alternative channels exist (TV Azteca, pay TV, digital). '
    'Government-media financial relationships are a well-documented corruption vector '
    '(cash-for-positive-coverage hypothesis). The consistent 100%DA across administrations '
    'and agencies suggests institutionalized avoidance of competitive media procurement. '
    'Note: does not include Havas Media (VID=45345, 1.66B, media buying agency) which places '
    'additional government advertising through agencies rather than directly.'
)
insert_vendor(cid, 131147, 'primary', 'medium')
insert_contracts(cid, 131147)

# Case 185: HEWLETT-PACKARD MEXICO - SAT IT lock-in
cid = insert_case(
    'HP_MEXICO_SAT_IT_LOCK_IN_DA',
    'Hewlett-Packard Mexico SAT IT Equipment/Services Lock-In 72%DA - 10.44B',
    'monopoly',
    2005, 2025,
    10440000000,
    'low',
    'Hewlett-Packard Mexico SRL de CV (VID=3723, sin RFC) received 10.44B MXN in 199 contracts at 72%DA. '
    'SAT (Servicio de Administración Tributaria) dominates: 7.46B@53%DA (19c). '
    'Top contracts: 1.17B LP 2015, 943M LP 2009, 906M LP 2008, 895M LP 2018 '
    '"Servicio de Impresión, Digitalización y Fotocopiado 2 (SIDyF)". '
    'HP is the dominant supplier for SAT\'s enterprise document management and printing infrastructure. '
    'The SIDyF contract (895M+) is for comprehensive document digitization across the Mexican tax authority — '
    'SAT handles ~63 million taxpayers and processes millions of tax filings annually. '
    'Most of the largest contracts are LP (competitive), suggesting legitimate procurement. '
    'However, the 72%DA rate overall — driven by maintenance, consumables, and support contracts — '
    'indicates the standard IT lock-in pattern: competitive initial purchase (hardware/platform), '
    'followed by perpetual sole-source maintenance and supplies. '
    'Similar to IBM SAT/IMSS case (Case 173) but less egregious (LP dominates for SAT). '
    'Low confidence: the bulk of value is competitively procured; DA is concentrated in '
    'consumables/maintenance which has plausible sole-source justification. '
    'Worth monitoring for competitive benchmarking vs HP pricing in comparable markets.'
)
insert_vendor(cid, 3723, 'primary', 'low')
insert_contracts(cid, 3723)

# Case 186: MEDI ACCESS - SAE opaque 100%DA contracts
cid = insert_case(
    'MEDI_ACCESS_SAE_CONTRATOS_OPACOS_100DA_2013',
    'Medi Access SAPI de CV SAE Opaque 100%DA Contracts 2013 - 1.88B',
    'procurement_fraud',
    2013, 2013,
    1880000000,
    'high',
    'Medi Access S.A.P.I. de C.V. (VID=103424, sin RFC) received 1.88B MXN in exactly 2 contracts at 100%DA '
    'from SAE (Servicio de Administración y Enajenación del Estado) in 2013. '
    'Both contracts have no description (NULL in COMPRANET), no RFC on record, '
    'and are the only two contracts this vendor ever received. '
    'Contract sizes: 1,552M DA 2013 and 323M DA 2013 — both from SAE. '
    'SAE manages seized assets from criminal organizations and insolvent entities, '
    'including properties, vehicles, financial assets, and equipment confiscated by government. '
    'The combination of indicators is extremely suspicious: '
    '1. NULL contract descriptions — no information about what was purchased/provided '
    '2. No RFC — impossible to verify beneficial ownership or tax compliance '
    '3. Only 2 contracts, ever, both in the same year from the same agency '
    '4. 1.88B total in completely opaque direct awards from the asset seizure agency '
    '5. "SAPI de CV" (special-purpose investment company) structure — often used for asset transactions '
    '6. 2013 was during the Peña Nieto administration\'s first year — a period of significant '
    'asset disposition and management activity. '
    'Possible scenarios: (a) Medi Access was contracted to manage/auction seized medical equipment '
    '(its name suggests medical sector), (b) it was used as a vehicle to extract value from SAE-managed assets, '
    '(c) it is connected to a specific SAE official. '
    'HIGH CONFIDENCE for investigation — this profile matches procurement fraud indicators '
    'across every measured dimension.'
)
insert_vendor(cid, 103424, 'primary', 'high')
insert_contracts(cid, 103424)

# Summary
total_cases = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
print(f'\nGT Summary: {total_cases} cases | {total_vendors} vendors | {total_contracts} contracts')
conn.close()
