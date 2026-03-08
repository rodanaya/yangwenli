"""GT cases 219-225: Savare Medika overpricing, CONALITEG printing ecosystem, GAP blood bank, Litografia."""
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

# ─────────────────────────────────────────────────────────────────────────────
# Case 219: SAVARE MEDIKA — extreme medical equipment overpricing at ISSSTE
# ─────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'SAVARE_MEDIKA_ISSSTE_EQUIPO_MEDICO_SOBREPRECIO_EXTREMO',
    'Savare Medika ISSSTE: 930M CT scanner + 598M MRI unit via 100%DA (10-20x market price overpricing) - 1.95B',
    'overpricing',
    2018, 2024,
    1950000000,
    'high',
    'Savare Medika SA de CV (VID=205212, sin RFC) sold medical imaging equipment to ISSSTE '
    '(Instituto de Seguridad y Servicios Sociales de los Trabajadores del Estado) at prices '
    'between 6x and 20x the market benchmark: '
    '930M (2022, DA=1): "ADQUISICION DE UNIDAD PARA TOMOGRAFIA AXIAL COMPUTARIZADA DE ALTA ESPECIALIDAD" '
    '— A CT (computed tomography) scanner. Market benchmark for a high-spec 64/128-slice CT scanner: '
    'USD 1.5-3M = 25-50M MXN (2022 exchange rates). Price paid: 930M MXN = 18-37x market price. '
    '598M (2022, DA=1): "ADQUISICION DE UNIDAD DE IMAGEN POR RESONANCIA MAGNETICA" (MRI unit) '
    '— Market benchmark for high-field (1.5-3T) hospital MRI: USD 2-5M = 35-90M MXN. '
    'Price paid: 598M MXN = 7-17x market price. '
    '65.5M (2022, DA=1): Another MRI unit — this price is within plausible range (USD 4M). '
    'Contrast: the same company selling equipment competitively charged 59.7M for an MRI 3T '
    'at IMSS in 2018 (DA=0). This confirms the legitimate market price is 50-70M MXN — '
    'yet ISSSTE paid 598M (8-10x) via direct award for a similar unit. '
    'ISSSTE direct award vs IMSS competitive bid for the same product: '
    'ISSSTE 2022 DA: 598M for MRI vs IMSS 2018 competitive: 59.7M for MRI 3T. '
    'Overcharge: ~538M MXN on this contract alone. '
    'Total ISSSTE DA overcharges (2022): 930M + 598M = 1.528B. '
    'Less estimated fair value (~2 units at ~60M): 120M. '
    'Estimated overcharge: ~1.4B MXN on 2022 contracts alone. '
    'HIGH CONFIDENCE: Direct comparison of DA vs competitive prices for same product type '
    'reveals 8-20x overpricing. No RFC makes accountability impossible.'
)
insert_vendor(cid, 205212, 'primary', 'high')
insert_contracts(cid, 205212)

# ─────────────────────────────────────────────────────────────────────────────
# Case 220: CONALITEG PRINTING ECOSYSTEM (large batch)
# Compañia Editorial Ultra (2.12B) + CSIAC (1.52B) + Reproducciones Fotomec. (1.34B)
# + IMPRECORME (1.25B) + SM de Ediciones (1.23B) + Litografia Magno Graf (1.18B)
# + Impresora y Encuadernadora Progreso (1.15B) + INFAGON WEB (1.04B)
# + Transportes ESDO (900M) + Editorial Trillas (880M) + Lyon AG (846M)
# + Morgan Express (785M) + Servicios Prof Impresion (660M) + Pearson (565M)
# + Impresora Editora Xalco (522M) + Print LSC Communications (516M)
# ─────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'CONALITEG_ECOSISTEMA_IMPRESION_EDITORIAL_DA',
    'CONALITEG printing ecosystem: 16 publishers/printers with no RFC in 12B+ ecosystem — monopoly ring for national textbook procurement',
    'monopoly',
    2002, 2025,
    12000000000,
    'medium',
    'The Comision Nacional de Libros de Texto Gratuito (CONALITEG) manages national textbook '
    'procurement for Mexico. The total ecosystem of CONALITEG vendors exceeds 25B MXN, with the '
    'majority via direct award and most vendors without RFC. '
    'Already in ground truth: Grupo Papelero Gabor (3.875B), Delman Internacional (3.125B), '
    'Editorial Santillana (1.557B), Ediciones Castillo (1.147B). '
    'NEW in this case (16 vendors, combined ~13.4B MXN): '
    '1. COMPANIA EDITORIAL ULTRA SA de CV (VID=2932): 2.118B, 117c, no RFC '
    '2. CORPORACION EN SERVICIOS INTEGRALES DE ASESORAMIENTO (CSIAC, VID=51438): 1.520B, 45c, no RFC '
    '3. REPRODUCCIONES FOTOMECANICAS SA de CV (VID=18533): 1.344B, 91c, no RFC '
    '4. IMPRECORME SA de CV (VID=253650): 1.247B, 41c, RFC=IMP190709CE8 '
    '5. SM DE EDICIONES SA de CV (VID=85006): 1.231B, 263c, no RFC '
    '6. LITOGRAFIA MAGNO GRAF SA de CV (VID=30001): 1.177B, 90c, no RFC '
    '   NOTE: Has contracts with "ADQUISICION SIN ENTREGA DE INSUMOS CON DEVOLUCION DE MERMA" '
    '   = paper-based printing modality (supplier returns waste). '
    '7. IMPRESORA Y ENCUADERNADORA PROGRESO SA de CV (VID=31832): 1.146B, 39c, no RFC '
    '8. INFAGON WEB SA de CV (VID=47458): 1.036B, 71c, no RFC '
    '9. TRANSPORTES ESDO SA de CV (VID=2940): 900M, 25c, no RFC '
    '10. EDITORIAL TRILLAS SA de CV (VID=4312): 880M, 273c, no RFC '
    '11. LYON AG SA de CV (VID=150457): 846M, 76c, no RFC '
    '12. MORGAN EXPRESS SA de CV (VID=30000): 785M, 18c, no RFC '
    '13. SERVICIOS PROFESIONALES DE IMPRESION SA de CV (VID=2928): 660M, 35c, no RFC '
    '14. PEARSON EDUCACION DE MEXICO SA de CV (VID=63922): 565M, 272c, no RFC '
    '15. IMPRESORA Y EDITORA XALCO SA de CV (VID=2945): 522M, 74c, no RFC '
    '16. PRINT LSC COMMUNICATIONS S de RL de CV (VID=48092): 516M, 32c, no RFC '
    'CRITICAL PATTERN: Most CONALITEG vendors have no RFC, suggesting they operated as '
    'de facto concessions without formal fiscal registration. '
    'The lack of RFC for publishers/printers receiving billions from the national textbook '
    'program is a systemic compliance failure that enables price manipulation. '
    'MEDIUM CONFIDENCE: CONALITEG printing market has legitimate contractors but the '
    'scale of no-RFC vendors and DA procurement warrants structural audit.'
)
# Primary: Compania Editorial Ultra (largest not-in-GT CONALITEG vendor)
insert_vendor(cid, 2932, 'primary', 'medium')
insert_contracts(cid, 2932)

# Secondary vendors
for vid, conf in [
    (51438, 'medium'),   # CSIAC
    (18533, 'medium'),   # Reproducciones Fotomecanicas
    (253650, 'medium'),  # IMPRECORME
    (85006, 'medium'),   # SM de Ediciones
    (30001, 'medium'),   # Litografia Magno Graf
    (31832, 'medium'),   # Impresora Encuadernadora Progreso
    (47458, 'medium'),   # INFAGON WEB
    (2940, 'medium'),    # Transportes ESDO
    (4312, 'low'),       # Editorial Trillas
    (150457, 'medium'),  # Lyon AG
    (30000, 'medium'),   # Morgan Express
    (2928, 'medium'),    # Servicios Prof Impresion
    (63922, 'low'),      # Pearson (international publisher, may be legitimate)
    (2945, 'medium'),    # Impresora Xalco
    (48092, 'medium'),   # Print LSC Communications
]:
    insert_vendor(cid, vid, 'secondary', conf)
    insert_contracts(cid, vid)

# ─────────────────────────────────────────────────────────────────────────────
# Case 221: DISTRIBUIDORA QUIMICA Y HOSPITALARIA GAP — IMSS blood bank + medical
# ─────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'DISTRIBUIDORA_QUIMICA_GAP_IMSS_BANCO_SANGRE_DA',
    'Distribuidora Quimica y Hospitalaria GAP: IMSS 1.13B blood bank service contract + DA medical supplies - 1.33B',
    'overpricing',
    2019, 2022,
    1330000000,
    'medium',
    'Distribuidora Quimica y Hospitalaria GAP SA de CV (VID=101951, sin RFC) received a '
    '1.134B MXN contract from IMSS in 2020 for "SERVICIO MEDICO INTEGRAL DE BANCO DE SANGRE" '
    '(Integrated Blood Bank Medical Service), plus additional contracts: '
    'IMSS 2020: 1,134.9M (DA=0) "SERVICIO MEDICO INTEGRAL DE BANCO DE SANGRE DC20S" — '
    'This is an integrated blood banking service including collection, testing, processing, '
    'and distribution. 1.134B for blood bank services. '
    'SEDENA 2019: 25.6M "ADQUISICION DE REACTIVOS, INSUMOS Y MATERIAL PARA LABORATORIO" '
    'CRAEMZ 2019-2020: 22M + 20M for laboratory services. '
    'Key concerns: '
    '1. No RFC for a company managing blood bank services for IMSS — critical healthcare infrastructure. '
    '2. 80% direct award rate overall. '
    '3. Blood bank integrity is a public health concern — opaque procurement creates '
    'opportunities for quality shortcuts and overpricing. '
    '4. The 1.13B single DA for blood services (DA=0 but note DAG is 80% overall) '
    'is one of the largest single healthcare service contracts in RUBLI. '
    'MEDIUM CONFIDENCE: Blood bank services can be complex and specialized; '
    'but RFC absence + 1.13B scale requires audit.'
)
insert_vendor(cid, 101951, 'primary', 'medium')
insert_contracts(cid, 101951)

# ─────────────────────────────────────────────────────────────────────────────
# Case 222: BIONOVA LABORATORIOS — null description IMSS/ISSSTE bulk
# ─────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'BIONOVA_LABORATORIOS_IMSS_ISSSTE_NULL_INSUMOS_2015',
    'Bionova Laboratorios: 1.98B in null-description IMSS/ISSSTE contracts 2015 - competitive but opaque',
    'procurement_fraud',
    2015, 2015,
    1980000000,
    'medium',
    'Bionova Laboratorios SA de CV (VID=125381, sin RFC) received 1.978B MXN from IMSS and '
    'ISSSTE in 2015 across 83 contracts — ALL with NULL descriptions. '
    'Although these contracts are formally competitive (DA=0), the complete absence of descriptions '
    'for 1.978B in medical supply contracts is a critical transparency failure: '
    'IMSS 2015: 536M (null) + 285M (null) + 244M (null) + 155M (null) + [others] '
    'ISSSTE 2015: 220M (null) + [others] '
    'Total: 1.978B in null-description contracts to a company without RFC. '
    'Context: 2015 was a period of significant IMSS procurement reform. '
    'Large null-description competitive bids suggest the contracts may have been structured '
    'to obscure the exact goods being procured. '
    'Possible interpretations: '
    '1. Legitimate bulk medical supply with confidential specifications. '
    '2. Cover contracts where money is transferred without corresponding goods. '
    '3. Reformatted data from Structure B (2015) where descriptions were intentionally omitted. '
    'MEDIUM CONFIDENCE: Competitive but not transparent; '
    'verify against IMSS delivery records for 2015 laboratory supplies.'
)
insert_vendor(cid, 125381, 'primary', 'medium')
insert_contracts(cid, 125381)

# ─────────────────────────────────────────────────────────────────────────────
# Case 223: COBRO ELECTRONICO DE PEAJE — electronic toll monopoly
# ─────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'COBRO_ELECTRONICO_PEAJE_CAPUFE_MONOPOLIO_DA',
    'Cobro Electronico de Peaje SA de CV: CAPUFE electronic toll system monopoly 50%DA - 1.87B',
    'monopoly',
    2015, 2022,
    1870000000,
    'medium',
    'Cobro Electronico de Peaje SA de CV (VID=226820) is the exclusive provider of electronic '
    'toll collection systems (IAVE, TAG) for CAPUFE (Caminos y Puentes Federales de Ingresos '
    'y Servicios Conexos), Mexico\'s federal highway authority, for 1.87B MXN in 4 contracts. '
    'This company essentially operates Mexico\'s electronic toll payment infrastructure — '
    'a captive market with no technical substitutes once the highway infrastructure is committed. '
    'Key characteristics: '
    '1. MONOPOLY BY INFRASTRUCTURE: CAPUFE is locked into one vendor because the tag readers, '
    'backend systems, and vehicle tags are all proprietary to this company. '
    '2. 1.87B MXN in only 4 contracts — average contract size 467M. '
    '3. 50% direct award suggests some competitive bids but significant DA component. '
    'Risk: Electronic toll systems involve significant data (vehicle tracking) and financial flows. '
    'Monopoly control creates risks of data misuse and revenue manipulation. '
    'MEDIUM CONFIDENCE: Technically justified lock-in (like Tetra Pak for milk), '
    'but financial scale and data sensitivity merit transparency audit.'
)
insert_vendor(cid, 226820, 'primary', 'medium')
insert_contracts(cid, 226820)

# ─────────────────────────────────────────────────────────────────────────────
# Case 224: LITOGRAFIA MAGNO GRAF standalone (part of CONALITEG eco, but worth highlighting)
# Already added as secondary to Case 220. Skip standalone.
# Instead: ACCIONA INFRAESTRUCTURA — infrastructure lock-in
# ─────────────────────────────────────────────────────────────────────────────
# ACCIONA is a Spanish infrastructure giant with competitive bids (0% DA).
# Score 0.728 but 0% DA — skip (likely FP).

# ─────────────────────────────────────────────────────────────────────────────
# Case 224: IMPROMED + MEDALFA — IMSS medical equipment/supplies
# ─────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'IMPROMED_MEDALFA_IMSS_EQUIPO_MEDICO_51DA',
    'Impromed + Medalfa: IMSS medical equipment distributors with 50%+ DA and 1.4B + 1.8B - 3.4B',
    'overpricing',
    2010, 2024,
    3400000000,
    'medium',
    'Two major IMSS medical equipment distributors with high risk scores and significant DA: '
    '1. IMPROMED SA de CV (VID=13632, sin RFC): 1.580B, 71 contracts, 51% DA, score=0.991. '
    'Impromed supplies medical equipment (imaging, laboratory, surgical) to IMSS. '
    'Score of 0.991 suggests extreme price concentration or vendor lock-in patterns. '
    '2. MEDALFA SA de CV (VID=231818, sin RFC): 1.819B, 18 contracts, 33% DA, score=0.907. '
    'Medalfa appears to be a large medical equipment distributor. 18 contracts = average 101M each. '
    'Key: Both without RFC. Combined 3.4B in medical procurement. '
    'Risk score 0.991 for Impromed is very high — the model detects strong concentration/anomaly. '
    'MEDIUM CONFIDENCE: Need to verify pricing vs medical equipment benchmarks (GS1, INA).'
)
insert_vendor(cid, 13632, 'primary', 'medium')   # Impromed
insert_contracts(cid, 13632)
insert_vendor(cid, 231818, 'secondary', 'medium') # Medalfa
insert_contracts(cid, 231818)

# ─────────────────────────────────────────────────────────────────────────────
# Case 225: CHIESI + ASOFARMA + BECKMAN — pharma consolidation (needs_review)
# ─────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'CHIESI_ASOFARMA_BECKMAN_PHARMA_DA_CONSOLIDADO',
    'Chiesi + Asofarma + Beckman: pharmaceutical/lab consolidated procurement with high DA - 5.6B',
    'monopoly',
    2010, 2025,
    5600000000,
    'low',
    'Three large pharmaceutical/laboratory companies with high risk scores: '
    '1. CHIESI MEXICO SA de CV (VID=249276): 1.821B, 113c, 60% DA, score=0.970. '
    'Italian pharma making pulmonary medications. Some products patented. '
    '2. ASOFARMA DE MEXICO SA de CV (VID=70647): 1.816B, 161c, 47% DA, score=0.903. '
    'Mexican pharmaceutical distributor with broad portfolio. '
    '3. BECKMAN LABORATORIES DE MEXICO SA de CV (VID=259128): 1.908B, 93c, 60% DA, score=0.828. '
    'Beckman Coulter (now Danaher) is a global laboratory instruments company. '
    'Lock-in for lab analyzers is technically justified (proprietary reagents). '
    'Combined: 5.545B in pharmaceutical/lab procurement. '
    'Chiesi and Beckman may have legitimate patent/lock-in justifications. '
    'Asofarma is a distributor without clear single-product justification. '
    'LOW CONFIDENCE: Likely partial FP (patented pharma). '
    'Asofarma is the most suspicious of the three — not a manufacturer, just a distributor. '
    'Including for ecosystem documentation.'
)
insert_vendor(cid, 249276, 'primary', 'low')    # Chiesi
insert_contracts(cid, 249276)
insert_vendor(cid, 70647, 'secondary', 'medium')  # Asofarma (more suspicious)
insert_contracts(cid, 70647)
insert_vendor(cid, 259128, 'secondary', 'low')   # Beckman Coulter (lab lock-in)
insert_contracts(cid, 259128)

# ─────────────────────────────────────────────────────────────────────────────
# Summary
n_cases = conn.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
n_vendors = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
n_contracts = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
print(f'\nGT Summary: {n_cases} cases | {n_vendors} vendors | {n_contracts} contracts')
conn.close()
