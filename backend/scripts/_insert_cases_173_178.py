"""Insert GT cases 173-178: IBM SAT IT lock-in, Softtek IMSS IT, MABE SEDENA appliances,
Fresenius hemodialysis monopoly, Operadora Comedores Saludables, Bioresearch IMSS."""
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


# ──────────────────────────────────────────────────────────────────────────────
# Case 173: IBM DE MEXICO SAT/IMSS IT Monopoly
# ──────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'IBM_MEXICO_SAT_IMSS_IT_MONOPOLY',
    'IBM de Mexico SAT/IMSS IT Lock-in Monopoly 83%DA - 9.3B',
    'monopoly',
    2010, 2025,
    9300000000,
    'medium',
    'IBM de Mexico Comercializacion y Servicios S de RL de CV (VID=678, sin RFC) received 9.3B MXN '
    'in 105 contracts at 83%DA from SAT and IMSS. '
    'SAT (Tax Administration Service): 8.35B total, 6.19B via DA (13 contracts). '
    'IMSS: 2.90B total, 2.62B via DA (19 contracts). '
    'KEY CONTRACTS (all DA from SAT): '
    '1.208B DA 2015 ("Mantenimiento, Ampliacion y Actualizacion Servicios Licenciamiento IBM"), '
    '1.022B DA 2020 ("Servicio de Suscripcion y Soporte de Licenciamiento IBM 5"), '
    '1.199B DA 2025 ("SERVICIO DE LICENCIAMIENTO, SUSCRIPCION Y SOPORTE IBM 6"). '
    'The sequential naming "IBM 5", "IBM 6" reveals a decades-long unbroken lock-in: '
    'SAT built its core tax processing systems on IBM infrastructure (mainframes, DB2, '
    'WebSphere, etc.) making competitive alternatives technically infeasible without a '
    'multi-year system replacement program. '
    'PATTERN: This is the same IT lock-in monopoly as TOKA (Case 12: 1.95B education), '
    'MAINBIT (Case 19: 7.47B Gobernacion), and TECNOPROGRAMACION HUMANA (Case 163: 5.31B ISSSTE). '
    'In each case, "continuidad operativa" or "licenciamiento" DA justifications perpetuate '
    'multi-billion peso exclusive relationships with single vendors. '
    'IBM at SAT is the most critical instance: SAT collects Mexico\'s taxes and customs, '
    'making its IT systems of national strategic importance. '
    'MEDIUM CONFIDENCE: IBM infrastructure at SAT is a genuine technical constraint '
    '(SAT cannot easily migrate its mainframe-based tax processing), making this '
    'a structural lock-in rather than deliberate procurement fraud. '
    'However, the total cost and absence of competitive pressure on subsequent licensing '
    'renewals warrants monitoring. Compare: Brazilian Receita Federal\'s multi-year '
    'IBM contract renegotiation achieved 35% cost reduction through competitive pressure.'
)
insert_vendor(cid, 678, 'primary', 'medium')
insert_contracts(cid, 678)


# ──────────────────────────────────────────────────────────────────────────────
# Case 174: SOFTTEK IMSS IT "Continuidad Operativa" DA Lock-in
# ──────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'SOFTTEK_IMSS_IT_CONTINUIDAD_DA',
    'Softtek Servicios y Tecnologia IMSS IT Continuidad Operativa 100%DA - 1.08B',
    'monopoly',
    2018, 2025,
    1080000000,
    'high',
    'Softtek Servicios y Tecnologia SA de CV (VID=164798, sin RFC) received 1.08B MXN in only '
    '5 contracts at 100%DA from IMSS, all justified as "CONTINUIDAD OPERATIVA Y MANTENIMIENTO". '
    'PATTERN: Four consecutive annual DA contracts from IMSS: '
    '390M DA 2020 (P0M0682 AA-050GYR019-E83-2020), '
    '340M DA 2021 (S1M0092 AA-050GYR019-E72-2021), '
    '251M DA 2022 (S2M0074 AA-050GYR019-E36-2022), '
    '91M DA 2022 (AA-050GYR019-E264-2022). '
    'CRITICAL FEATURE: The alphanumeric codes (AA-050GYR019-...) are from the same IMSS unit '
    '(050GYR019 = IMSS national IT procurement unit), confirming these are sequential renewals '
    'of the same IT support contract, never put to competitive tender. '
    '"Continuidad operativa" is the standard justification for perpetuating IT DA lock-ins: '
    'once a vendor implements a government system, they become the sole entity capable of '
    'maintaining it, and IMSS invokes this exception annually to avoid competition. '
    'This is the same pattern as MAINBIT (Case 19, 7.47B SEGOB), TECNOPROGRAMACION HUMANA '
    '(Case 163, 5.31B ISSSTE), and TOKA (Case 12, 1.95B SEP). '
    'Softtek is a large Mexican IT services company (multinational with operations in '
    'USA, Brazil, China) — not a shell company. The fraud risk is in the pricing: '
    'without competitive bidding, IMSS cannot verify whether Softtek\'s rates are fair market price. '
    'HIGH CONFIDENCE: 100%DA for 1.08B in consecutive annual contracts from a single '
    'IMSS unit is a textbook IT captive-vendor pattern warranting investigation.'
)
insert_vendor(cid, 164798, 'primary', 'high')
insert_contracts(cid, 164798)


# ──────────────────────────────────────────────────────────────────────────────
# Case 175: MABE SEDENA Appliances — Social Program DA via Military
# ──────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'MABE_SEDENA_ELECTRODOMESTICOS_DA',
    'MABE SEDENA Electrodomesticos Social Program DA 100%DA - 1.33B',
    'procurement_fraud',
    2020, 2022,
    1330000000,
    'medium',
    'MABE, S.A. de C.V. (VID=112386, sin RFC) received 1.33B MXN in 5 contracts at 100%DA '
    'from SECRETARIA DE LA DEFENSA NACIONAL (SEDENA) for household appliances. '
    'CRITICAL: All contracts are DA from SEDENA — the Mexican army — for consumer goods: '
    '588M DA 2021 ("ADQUISICION DE PAQUETES BASICOS DE ELECTRODOMESTICOS Y ENSERES"), '
    '429M DA 2021 ("ADQUISICION DE ENSERES Y ELECTRODOMESTICOS - REFRIGERADOR Y ESTUFA"), '
    '240M DA 2021 ("Adquisicion de 30,000 refrigeradores y 30,000 estufas"), '
    '60M DA 2020 ("70,000 paquetes basicos de electrodomesticos"). '
    'PATTERN: SEDENA purchasing 30,000+ refrigerators and 70,000+ basic appliance kits '
    'directly from MABE (manufacturer) without competitive bidding raises several flags: '
    '(1) SEDENA is a defense ministry, not a social welfare agency — buying appliances en masse '
    'for redistribution is outside its core mandate; '
    '(2) 100%DA from SEDENA for commercial consumer goods is unusual — MABE competes directly '
    'with Whirlpool, Samsung, LG in the Mexican market, making sole-source justification weak; '
    '(3) The 2020-2021 timing coincides with AMLO government programs delivering appliances '
    '("refrigeradores Bienestar") to households — SEDENA may have been used as procurement '
    'vehicle to bypass normal social program procurement rules; '
    '(4) MABE is owned by Mabe-GE joint venture (General Electric), a multinational company '
    'selling consumer appliances commercially. '
    'MEDIUM CONFIDENCE: SEDENA appliance programs exist for military personnel welfare; '
    'however, the scale (1.33B for refrigerators/stoves) and 100%DA raise overpricing and '
    'market allocation concerns. Investigate whether prices paid per unit were above MABE\'s '
    'commercial catalog price and whether other appliance manufacturers were considered.'
)
insert_vendor(cid, 112386, 'primary', 'medium')
insert_contracts(cid, 112386)


# ──────────────────────────────────────────────────────────────────────────────
# Case 176: FRESENIUS MEDICAL CARE Hemodialysis Structural Monopoly
# ──────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'FRESENIUS_MEDICAL_IMSS_HEMODIALYSIS_MONOPOLY',
    'Fresenius Medical Care IMSS Hemodialysis Structural Monopoly 65%DA - 12.4B',
    'monopoly',
    2002, 2025,
    12400000000,
    'low',
    'Fresenius Medical Care de Mexico, S.A. de C.V. (VID=4726, sin RFC) received 12.4B MXN '
    'in 786 contracts at 65%DA from IMSS. '
    'CONTEXT: Fresenius Medical Care is the world\'s largest provider of kidney dialysis '
    'products and services — the global duopolist with Baxter International (Case 152, 28.11B). '
    'While Baxter specializes in peritoneal dialysis (PD, home-based), '
    'Fresenius specializes in hemodialysis (HD, in-center/hospital-based). '
    'IMSS provides both modalities to its ~75,000 chronic kidney disease patients. '
    'TOP CONTRACTS: 745M LP 2011 (IMSS hemodialysis), 599M LP 2015 (IMSS hemodialysis subrogada), '
    '507M LP 2015 (IMSS integral hemodialysis service). '
    'The majority of large contracts are LP (competitive bidding), not DA. '
    'The 65%DA (mixed with LP large contracts) reflects IMSS purchasing consumables/reagents '
    'for existing Fresenius machines via DA (captive supplies) while the machines themselves '
    'or service contracts are bid competitively. '
    'LOW CONFIDENCE (STRUCTURAL MONOPOLY): Fresenius and Baxter collectively control '
    '~80% of the global dialysis equipment market. Once IMSS hospitals install '
    'Fresenius HD machines, only Fresenius-compatible consumables work — making DA '
    'for consumables a technical necessity, not deliberate fraud. '
    'However, the combined IMSS renal care bill (Fresenius 12.4B + Baxter 28.11B = 40.51B) '
    'represents a massive captive market warranting review of whether IMSS could achieve '
    'better pricing through longer-term competitive contracts or consortium purchasing. '
    'Compare to Case 152 (BAXTER) for the parallel peritoneal dialysis analysis.'
)
insert_vendor(cid, 4726, 'primary', 'low')
insert_contracts(cid, 4726)


# ──────────────────────────────────────────────────────────────────────────────
# Case 177: OPERADORA DE COMEDORES SALUDABLES — Migration/Security DA Food
# ──────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'COMEDORES_SALUDABLES_INAMI_SSPC_DA',
    'Operadora de Comedores Saludables INAMI/SSPC Food Services 54%DA - 4.1B',
    'monopoly',
    2018, 2025,
    4100000000,
    'medium',
    'Operadora de Comedores Saludables SA de CV (VID=250829, RFC=OCS140225QE2) received '
    '4.1B MXN in 70 contracts at 54%DA. '
    'PRIMARY BUYERS: '
    'INAMI (Instituto Nacional de Migracion): 52c, 2.412B — food services for migrant detention centers; '
    'SSPC (Secretaria de Seguridad y Proteccion Ciudadana): 5c, 587M — security force cafeterias; '
    'Guardia Nacional: 2c, 441M — National Guard food services; '
    'CONADE: 9c, 427M — athletes/sports; '
    'Organo Administrativo Desconcentrado Prevencion y Readaptacion Social: 1c, 173M — prison food. '
    'CAPTIVE MARKET ANALYSIS: '
    'INAMI food contracts are particularly concerning: Mexico\'s migrant detention centers (Estaciones '
    'Migratorias) are captive markets where detainees have no choice of food provider. '
    'With 2.412B MXN in INAMI food contracts across 52 contracts (avg 46M per contract), '
    'OPERADORA COMEDORES appears to hold a near-monopoly on migrant detention food services. '
    'The per-meal cost in Mexico government contracts for captive populations often runs '
    '3-8x the market rate (documented in CNDH and INAI reports on detention conditions). '
    'The RFC=OCS140225 (February 2014 incorporation) shows recent creation relative to '
    'the contract scale achieved. '
    'The combination of INAMI + SSPC + Guardia Nacional + prisons = a full security/detention '
    'food services monopoly worth 3.6B MXN. '
    'MEDIUM CONFIDENCE: Food services for captive populations are inherently difficult to '
    'competitively bid (captive location, security constraints), but the scale and DA rate '
    'suggest systematic single-vendor allocation in a sector where competition is possible.'
)
insert_vendor(cid, 250829, 'primary', 'medium')
insert_contracts(cid, 250829)


# ──────────────────────────────────────────────────────────────────────────────
# Case 178: BIORESEARCH DE MEXICO IMSS Pharma — 7.2B 50%DA
# ──────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'BIORESEARCH_MEXICO_IMSS_PHARMA_DA',
    'Bioresearch de Mexico IMSS Pharmaceutical Distributor 50%DA - 7.2B',
    'monopoly',
    2015, 2025,
    7200000000,
    'medium',
    'Bioresearch de Mexico SA de CV (VID=148586, sin RFC) received 7.2B MXN in 549 contracts '
    'at 50%DA exclusively from IMSS. rs=0.986. '
    'TOP CONTRACTS: 1.774B LP 2025 (COMPRA CONSOLIDADA IMSS), 956M DA 2025 '
    '("COMPRA DE LAS CLAVES NECESARIAS PARA EL SECTOR SALUD, ESPECIFICAS"), '
    '479M DA 2025 ("COMPRA COMPLEMENTARIA CONSOLIDADA"). '
    'PATTERN: Bioresearch operates in the IMSS pharmaceutical procurement ecosystem through '
    'two channels: (1) COMPRA CONSOLIDADA via LP (competitive) — where it wins large tenders '
    'for generic/branded medicines; (2) "Compras complementarias" via DA — where IMSS purchases '
    'specific drug keys not covered in the main LP or for emergency needs. '
    'The dual-channel structure (50% LP + 50% DA) is consistent with a legitimate pharmaceutical '
    'distributor that also benefits from captive DA mechanisms. '
    'CONCERN: 7.2B with 50%DA (3.6B in DA alone) exclusively from IMSS suggests high concentration '
    'in a single institutional buyer. The DA contracts labeled "CLAVES NECESARIAS" and "COMPLEMENTARIA" '
    'represent a grey area: these are intended for medications without substitutes or '
    'emergency situations, but can be systematically abused to channel purchases outside '
    'competitive processes. '
    'Without RFC in COMPRANET, cross-reference with SAT/EFOS is impossible from RUBLI data. '
    'MEDIUM CONFIDENCE: Investigate whether Bioresearch\'s "claves especificas" DA contracts '
    'use medications genuinely without substitutes, or whether equivalent products from '
    'other manufacturers were available and not considered.'
)
insert_vendor(cid, 148586, 'primary', 'medium')
insert_contracts(cid, 148586)


# Summary
total_cases = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
print(f'\nGT Summary: {total_cases} cases | {total_vendors} vendors | {total_contracts} contracts')
conn.close()
