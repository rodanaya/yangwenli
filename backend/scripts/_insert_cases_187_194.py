"""Insert GT cases 187-194: Kol-Tov, Plaza Insurgentes, Santillana, CICM, Sertres Norte, Turismo y Conv, ILS Salud, Ralmo."""
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

# Case 187: KOL-TOV - Federal police hotel + food monopoly
cid = insert_case(
    'KOLTOV_POLICIA_FEDERAL_HOSPEDAJE_ALIMENTACION_DA',
    'Kol-Tov SA de CV Federal Police Hotel/Food Services 100%DA - 1.64B',
    'monopoly',
    2017, 2025,
    1640000000,
    'high',
    'Kol-Tov SA de CV (VID=178862, sin RFC) received 1.64B MXN in 7 contracts providing hospitality '
    'services to federal security forces. Breakdown: '
    'Policía Federal (1.108B, 2c, 100%DA), Servicio de Protección Federal (418M, 4c, 50%DA), '
    'Guardia Nacional (119M, 100%DA). '
    'Top contracts: 905M DA 2017 (Policía Federal, NULL description), '
    '352M DA 2023 (SPF, "SERVICIO INTEGRAL DE HOSPEDAJE Y ALIMENTACIÓN PARA INTEGRANTES"), '
    '202M DA 2017 (Policía Federal, NULL description). '
    'Context: Kol-Tov means "all good" in Hebrew — an unusual name for a Mexican company. '
    'The company provides integral hotel+food services to thousands of federal police officers. '
    'This likely covers barracks-style lodging and catering for police operations or training facilities. '
    'The 905M DA 2017 to Policía Federal is especially suspicious — nearly 1B in a single '
    'direct award with NULL description for hotel/food services has no legitimate justification. '
    'Hotel and catering services are among the most competitive markets available. '
    'The company has no RFC — impossible to verify ownership or whether it has actual '
    'hotel/catering infrastructure to serve thousands of officers. '
    'Compare: Turismo y Convenciones SA (VID=40514, 1.58B, 79%DA) does similar work for SRE/SHCP. '
    'Together these two represent 3.2B+ in government hospitality at high DA rates. '
    'HIGH CONFIDENCE: NULL descriptions + 100%DA + no RFC + 1B single contract = maximum red flag.'
)
insert_vendor(cid, 178862, 'primary', 'high')
insert_contracts(cid, 178862)

# Case 188: PLAZA INSURGENTES SUR - NAFIN office building rental monopoly
cid = insert_case(
    'PLAZA_INSURGENTES_NAFIN_RENTA_OFICINAS_100DA',
    'Plaza Insurgentes Sur NAFIN Office Rental 100%DA - 2.33B',
    'overpricing',
    2008, 2025,
    2330000000,
    'medium',
    'Plaza Insurgentes Sur SA de CV (VID=65004, sin RFC) received 2.33B MXN in 34 contracts at 100%DA '
    'from NAFIN (Nacional Financiera, 2.311B in 29 contracts) and SAE (24M, 5c). '
    'Contract descriptions contain individual employee names: '
    '"CRISTINA POLA HERNANDEZ - EII - SUBDIRECCIÓN DE SERVICIOS" (520M, 2019), '
    '"ARMANDO VELÁZQUEZ ZENTENO – EID – SUBDIRECCIÓN DE SERVICIOS" (500M, 2022). '
    'The description pattern suggests these are office space lease contracts, with the responsible '
    'NAFIN subdirectorate official named in each contract. '
    'Plaza Insurgentes Sur is a commercial/office complex on Insurgentes Avenue in Mexico City — '
    'a prime location where NAFIN may lease floor space for its operations. '
    'The 100%DA for ALL 29 NAFIN contracts over 15+ years for a commercial real estate lease '
    'raises questions about overpricing: were alternative comparable office buildings considered? '
    'A 2.3B total rental payment to a single real estate entity at 100%DA for a state development bank '
    'warrants an independent fair market value appraisal. '
    'The inclusion of individual civil servant names in contract descriptions is unusual — '
    'this may facilitate tracing responsibility but also personalizes what should be institutional procurement. '
    'Medium confidence: office leasing can legitimately be DA if the location is specifically required '
    'and alternatives are insufficient, but the scale (2.3B) without competitive tender is notable.'
)
insert_vendor(cid, 65004, 'primary', 'medium')
insert_contracts(cid, 65004)

# Case 189: EDITORIAL SANTILLANA - CONALITEG textbooks 99%DA
cid = insert_case(
    'EDITORIAL_SANTILLANA_CONALITEG_LIBROS_99DA',
    'Editorial Santillana CONALITEG Free Textbook Program 99%DA - 1.56B',
    'monopoly',
    2015, 2025,
    1560000000,
    'medium',
    'Editorial Santillana SA de CV (VID=49612, sin RFC) received 1.56B MXN in 276 contracts at 99%DA, '
    'overwhelmingly from CONALITEG (Comisión Nacional de Libros de Texto Gratuitos, 1.557B in 257c, 100%DA). '
    'Contract descriptions: "ADQUISICIÓN DE LIBROS PROGRAMA LIBROS DE TEXTO GRATUITOS SECUNDARIA" '
    '— Santillana provides supplementary/secondary-level free textbooks for the national public school system. '
    'Top contracts: 198M DA 2022, 182M DA 2021, 132M DA 2018. '
    'Context: CONALITEG distributes 200M+ books/year to Mexican public school children. '
    'Primary school textbooks are designed and printed by CONALITEG itself (via IEP). '
    'Secondary school books include materials from private publishers — but at 99%DA, Santillana '
    'appears to be the exclusive or near-exclusive supplier for supplementary reading. '
    'Santillana is part of the Prisa Group (Spain) — a major commercial publisher. '
    'Commercial textbook publishing is a competitive market: McGraw-Hill, Pearson, Santillana, '
    'Trillas, Ediciones SM all publish secondary-school compatible materials. '
    'The consistent 100%DA for all CONALITEG purchases from Santillana — rather than competitive '
    'procurement that could reduce costs and diversify publishers — represents a structural '
    'market allocation to a single foreign-owned publisher for Mexico\'s national education program. '
    'Medium confidence: some sole-source justification may exist for specific copyrighted titles, '
    'but the pattern (99%DA, 257 contracts, 1.56B) is consistent with a captive supplier relationship.'
)
insert_vendor(cid, 49612, 'primary', 'medium')
insert_contracts(cid, 49612)

# Case 190: COMERCIALIZADORA INTERNACIONAL DE COMPRESORES - IMSS medical equipment maintenance
cid = insert_case(
    'CICM_IMSS_MANTENIMIENTO_COMPRESORES_MEDICOS_DA',
    'Comercializadora Internacional de Compresores IMSS Medical Equipment Maintenance 73%DA - 2.31B',
    'monopoly',
    2010, 2025,
    2310000000,
    'medium',
    'Comercializadora Internacional de Compresores SA de CV (VID=46920, sin RFC) received 2.31B MXN '
    'in 109 contracts at 74%DA, almost entirely from IMSS (2.215B, 78c, 73%DA) and ISSSTE (62M). '
    'Top contracts: 811M DA 2025, 298M DA 2017, 231M DA 2024 — '
    '"SERVICIO DE MANTENIMIENTO PREVENTIVO Y CORRECTIVO CON SUMINISTRO" of medical equipment. '
    '"Compresores" suggests specialization in compressed air/pneumatic medical equipment — '
    'specifically the medical air supply systems used in hospitals for ventilators, anesthesia, '
    'and other pneumatic medical devices. '
    'Lock-in mechanism: once IMSS installs medical air compressor systems from a specific brand, '
    'the supplier claims sole-source status for maintenance and replacement parts. '
    'This is the same structural lock-in as Baxter (dialysis, Case 152) and Fresenius (Case 176) '
    'but applied to the pneumatic/compressed air infrastructure of IMSS hospitals. '
    'The total of 2.31B across 109 contracts over 15 years — at consistently high DA rates — '
    'represents a systemic pattern. Medical air compressors are technically specialized but '
    'there are multiple qualified maintenance providers (Atlas Copco, Ingersoll Rand, etc.). '
    'Medium confidence: technical lock-in is plausible but competitive maintenance tendering '
    'for established installed equipment is standard practice in comparable healthcare systems.'
)
insert_vendor(cid, 46920, 'primary', 'medium')
insert_contracts(cid, 46920)

# Case 191: SERTRES DEL NORTE - SAT IT infrastructure 88%DA
cid = insert_case(
    'SERTRES_NORTE_SAT_INFRAESTRUCTURA_TI_88DA',
    'Sertres del Norte SAT IT Infrastructure Lock-In 88%DA - 2.30B',
    'monopoly',
    2009, 2025,
    2300000000,
    'low',
    'Sertres del Norte SA de CV (VID=22565, sin RFC) received 2.30B MXN in 122 contracts at 77%DA, '
    'dominated by SAT (2.230B, 33c, 88%DA). '
    'Key LP contract: 1.498B LP 2020 "Integración y Soporte a Infraestructura de TI (ISI-TI)" — '
    'a large competitive contract for SAT IT infrastructure integration and support. '
    'Prior LP: 638M LP 2009 (SAT). '
    'After winning the ISI-TI LP contract, Sertres receives maintenance DA contracts (27M DA, etc.). '
    'This is the classic IT lock-in sequence: win initial integration contract through competitive '
    'bidding, then secure ongoing support/maintenance through DA "continuidad operativa". '
    'SAT now has 3 documented IT lock-ins: IBM (Case 173, 8.35B DA), HP (Case 185, 7.46B DA), '
    'and Sertres (2.23B, 88%DA) — suggesting the SAT IT infrastructure is divided among '
    'multiple vendors, each claiming sole-source maintenance after winning initial LP contracts. '
    'Low confidence: the 1.5B LP is competitive; DA follow-on for IT maintenance has technical '
    'justification. SAT IT ecosystem analysis should be done holistically across all 3 providers.'
)
insert_vendor(cid, 22565, 'primary', 'low')
insert_contracts(cid, 22565)

# Case 192: TURISMO Y CONVENCIONES - SRE/SHCP hospitality monopoly
cid = insert_case(
    'TURISMO_CONVENCIONES_SRE_HACIENDA_HOSPEDAJE_DA',
    'Turismo y Convenciones SA de CV SRE/SHCP Hospitality Services 79%DA - 1.58B',
    'monopoly',
    2010, 2025,
    1580000000,
    'medium',
    'Turismo y Convenciones SA de CV (VID=40514, sin RFC) received 1.58B MXN in 227 contracts at 79%DA. '
    'Main clients: SRE/Secretaría de Relaciones Exteriores (407M, 38c, 97%DA), '
    'Servicio de Protección Federal (288M, 25%DA), SHCP/Hacienda (227M, 19c, 95%DA), '
    'IPN (152M), plus dozens of other agencies. '
    'Service: "Servicio Integral de Hospedaje y Alimentación" — hotel and catering for government events. '
    'SRE at 97%DA: diplomatic receptions, foreign delegations, international meetings '
    'organized by Mexico\'s foreign ministry require hospitality services. '
    'The argument for DA in SRE is that diplomatic events have unpredictable timing and specific '
    'venue/protocol requirements. However, 407M at 97%DA suggests a long-term exclusive arrangement. '
    'SHCP at 95%DA (227M): government budgetary conferences and technical meetings don\'t have '
    'the same diplomatic urgency but show the same DA pattern. '
    'Collectively, Turismo y Convenciones (1.58B) + Kol-Tov (1.64B, Case 187) = 3.22B '
    'in government hospitality from just 2 vendors at high DA rates. Hotel and catering services '
    'are fundamentally competitive — there is no technical lock-in justification. '
    'Medium confidence: diplomatic hospitality has some DA justification, but pattern extends '
    'beyond genuinely urgent situations to routine government meetings and training.'
)
insert_vendor(cid, 40514, 'primary', 'medium')
insert_contracts(cid, 40514)

# Case 193: ILS INTEGRADORA LOGISTICA EN SALUD - pharmaceutical logistics
cid = insert_case(
    'ILS_INTEGRADORA_LOGISTICA_SALUD_INSABI_IMSS_DA',
    'ILS Integradora Logistica en Salud INSABI/IMSS Pharma Logistics 77%DA - 1.66B',
    'monopoly',
    2018, 2025,
    1660000000,
    'medium',
    'ILS Integradora Logística en Salud SA de CV (VID=104776, sin RFC) received 1.66B MXN '
    'in 213 contracts at 77%DA. Principal clients: '
    'INSABI/Instituto de Salud para el Bienestar (564M, 10c, 90%DA), '
    'IMSS (485M, 82c, 87%DA), SS (223M, 33%DA), Prevención y Readaptación Social/prisons (200M). '
    'Service: "SERVICIO INTEGRAL DE LOGÍSTICA, RECEPCIÓN, ALMACENAMIENTO, DISTRIBUCIÓN" '
    'of medicines and medical supplies — pharmaceutical supply chain management. '
    'ILS provides third-party logistics (3PL) for medicines: warehousing in regional hubs, '
    'cold chain management, and last-mile distribution to IMSS clinics/INSABI pharmacies. '
    'The pharmaceutical logistics market has multiple providers (DHL Supply Chain, Ryder, '
    'FEMSA Logística, Cruz Verde — various specialized 3PL operators). '
    'The combination of INSABI (90%DA) + IMSS (87%DA) for logistics that should be competitive '
    'suggests a supply chain capture: ILS has embedded itself as the de facto '
    'pharmaceutical logistics provider for two of Mexico\'s largest health institutions. '
    'The absence of RFC makes beneficial ownership verification impossible. '
    'During COVID-2020, INSABI awarded 339M DA for pharmaceutical logistics — '
    'emergency justification is understandable but should not extend to the full post-COVID pattern. '
    'Medium confidence: pharmaceutical logistics has legitimate complexity, but persistent '
    '77%DA across 213 contracts over 7+ years without competitive tendering is unusual.'
)
insert_vendor(cid, 104776, 'primary', 'medium')
insert_contracts(cid, 104776)

# Case 194: DISTRIBUIDORA RALMO - IMSS cardiac catheterization subrogation
cid = insert_case(
    'RALMO_IMSS_HEMODINAMICA_SUBROGACION_88DA',
    'Distribuidora Internacional Ralmo IMSS Cardiac Catheterization Subrogation 88%DA - 1.54B',
    'monopoly',
    2015, 2025,
    1540000000,
    'medium',
    'Distribuidora Internacional Ralmo SA de CV (VID=224516, RFC=DIR070822774) received 1.54B MXN '
    'in 104 contracts at 84%DA, almost entirely IMSS (1.533B, 95c, 88%DA). '
    'Service: "SERVICIO MÉDICO INTEGRAL DE HEMODINÁMICA Y RADIOLOGÍA INTERVENCIONISTA" — '
    'cardiac catheterization laboratory services (stent placement, angioplasty, etc.). '
    'Top contracts: 196M DA 2025, 180M DA 2025, 125M DA 2021 — ongoing annual renewals. '
    'Context: IMSS has insufficient in-house cath lab capacity and subrogates to private providers. '
    'Hemodinámica is high-acuity cardiac care — a patient in cardiac arrest needs intervention now, '
    'not after a procurement process. This creates a structural DA justification for urgent services. '
    'However, the pattern shows annual contract renewals at 88%DA across 95 contracts — '
    'this is routine annual budget allocation to a single provider, not emergency procurement. '
    'For planned interventional cardiology (elective stenting, diagnostic catheterization), '
    'competitive tendering among private cath lab networks is feasible and standard in comparable systems. '
    'The "Distribuidora" name suggests a commercial entity, not a clinical provider directly — '
    'likely an intermediary between IMSS and the actual cath labs. '
    'RFC: DIR070822774 (incorporación 2007). '
    'Medium confidence: emergency cardiac care justifies some DA, but 88%DA across 95 contracts '
    'for routine subrogation at the same provider suggests IMSS has not evaluated alternatives.'
)
insert_vendor(cid, 224516, 'primary', 'medium')
insert_contracts(cid, 224516)

# Summary
total_cases = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
print(f'\nGT Summary: {total_cases} cases | {total_vendors} vendors | {total_contracts} contracts')
conn.close()
