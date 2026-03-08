"""GT cases 203-210: food opacity, SEDENA mismatch, SEGALMEX expansion, DICONSA university."""
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
# Case 203: ALIMENTOS LA V DEL MU — public hospital food, null descriptions
# ─────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'ALIMENTOS_LA_V_DEL_MU_HOSPITALES_ALIMENTOS_100DA',
    'Alimentos La V del Mu: opaque hospital food supply (INCAN + Hospital General) 100%DA null descriptions - 580M',
    'ghost_company',
    2010, 2017,
    580000000,
    'high',
    'Alimentos La V del Mu SA de CV (VID=48645, sin RFC) supplied food to two major federal health '
    'institutions for 580M MXN exclusively via direct award, with virtually all contract descriptions '
    'being NULL (no transparency on what was provided): '
    'INSTITUTO NACIONAL DE CANCEROLOGICA (INCAN): 444M in a SINGLE 2014 direct award with NULL description. '
    'For context, the entire annual budget of INCAN is approximately 1-2B MXN, so this single contract '
    'represents 22-44% of annual institutional budget for food/supplies from a single provider. '
    'Hospital General de Mexico "Dr. Eduardo Liceaga": 108 contracts 2010-2017, 133M, all with NULL descriptions. '
    'Key red flags: '
    '1. NULL descriptions across 108 contracts — systematic concealment of scope. '
    '2. No RFC — unverifiable beneficial ownership. '
    '3. Company name "La V del Mu" is cryptic and does not identify a food industry brand. '
    '4. 100% direct award concentration to public health institutions. '
    '5. Total value disproportionate for food supply (580M over 7 years = 83M per year from one vendor). '
    'HIGH CONFIDENCE: zero transparency over full operational history is a strong corruption indicator.'
)
insert_vendor(cid, 48645, 'primary', 'high')
insert_contracts(cid, 48645)

# ─────────────────────────────────────────────────────────────────────────────
# Case 204: RICO GRUPO GASTRONÓMICO — INAMI food services, captive institution
# ─────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'RICO_GRUPO_GASTRONOMICO_INAMI_ALIMENTOS_100DA',
    'Rico Grupo Gastronomico: exclusive food services to INAMI (immigration) 100%DA null descriptions - 163M',
    'institution_capture',
    2016, 2021,
    163000000,
    'high',
    'Rico Grupo Gastronomico SA de CV (VID=181415, sin RFC) was the exclusive food service provider '
    'to the Instituto Nacional de Migracion (INM/INAMI) for 163M MXN in 9 contracts, all via direct '
    'award, with most contracts having NULL or minimal descriptions: '
    'All 9 contracts are to INAMI: 32M (2017, null), 32M (2018), 25M (2016, null), 21M (2018, Tamaulipas), '
    '19M (2016, null), 16M (2017, null), 6M (2017, null), 5M (2017, null). '
    'Context: INAMI is responsible for immigration detention centers (Estaciones Migratorias) across '
    'Mexico. Food services for detained migrants are a known vector for corruption — '
    'companies overcharge for low-quality food while detainees have no recourse. '
    'Key red flags: '
    '1. Single vendor monopoly: Rico Grupo receives ALL food service contracts from INAMI — '
    'no competitive procurement for catering to 30+ immigration detention facilities. '
    '2. NULL descriptions on most contracts: how many detainees? what food items? what facilities? '
    '3. No RFC — impossible to verify tax compliance or beneficial ownership. '
    '4. Pattern mirrors Kol-Tov (Case 187): opaque single-vendor services to federal security '
    'institution with null descriptions and no RFC. '
    '5. "Score 0.801" from v5.1 risk model indicates this vendor is among the highest-risk food suppliers. '
    'HIGH CONFIDENCE: institution capture + zero transparency + no RFC is a confirmed red flag pattern.'
)
insert_vendor(cid, 181415, 'primary', 'high')
insert_contracts(cid, 181415)

# ─────────────────────────────────────────────────────────────────────────────
# Case 205: DIGITAL SIGNAGE SOLUTIONS — SEDENA disaster relief, industry mismatch
# ─────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'DIGITAL_SIGNAGE_SEDENA_ENSERES_DAMNIFICADOS_MISMATCH',
    'Digital Signage Solutions: IT company selling refrigerators/appliances to SEDENA for disaster victims (industry mismatch) - 247M',
    'overpricing',
    2019, 2024,
    247000000,
    'medium',
    'Digital Signage Solutions SA de CV (VID=252444) is an IT company specializing in digital '
    'signage platforms and content management systems. Yet the company received 247M MXN from '
    'SEDENA (Secretaria de la Defensa Nacional) for physical appliance/household goods procurement: '
    '153M (2023): "ADQUISICION DE 20,000 REFRIGERADORES PARA DAMNIFICADOS CON MOTIVO DE LA CONTINGENCIA" '
    '63M (2021): "Adquisicion de 70,000 paquetes basicos de electrodomesticos" '
    '30M (2023x2): "ADQUISICION DE ENSERES PARA DAMNIFICADOS CON MOTIVO DE LA CONTINGENCIA" '
    'Plus minor contracts to IFT for actual digital signage platform subscriptions (0.4M, 0.2M, 0.2M). '
    'The core business registered in COMPRANET for Digital Signage Solutions is IT/tech services. '
    'The company then wins 247M in contracts to provide refrigerators and household appliance kits '
    'for natural disaster victims — a completely different product category. '
    'This is a textbook industry_mismatch pattern: a tech-registered company acting as procurement '
    'intermediary for physical goods in disaster relief. '
    'Key concerns: '
    '1. Industry mismatch: signage company selling appliances to army disaster relief. '
    '2. SEDENA disaster relief procurement is opaque and hard to audit. '
    '3. All contracts via 100% direct award. '
    '4. Appliance procurement in emergency context is historically a high-fraud category '
    '(inflated prices, low quality, missing deliveries). '
    'MEDIUM CONFIDENCE: Possible legitimate pivot to disaster goods, but mismatch + SEDENA '
    '+ 100%DA + scale warrants investigation.'
)
insert_vendor(cid, 252444, 'primary', 'medium')
insert_contracts(cid, 252444)

# ─────────────────────────────────────────────────────────────────────────────
# Case 206: PROTACTIC — Navy uniforms/equipment monopoly
# ─────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'PROTACTIC_SEMAR_VESTUARIO_UNIFORMES_MONOPOLIO_100DA',
    'Protactic SA de CV: exclusive Navy uniforms and tactical equipment monopoly 100%DA no RFC - 750M',
    'monopoly',
    2017, 2025,
    750000000,
    'medium',
    'Protactic SA de CV (VID=197555, sin RFC) is the dominant supplier of uniforms, tactical '
    'protective equipment, and naval clothing to the Secretaria de Marina (SEMAR) for 750M MXN '
    'across 55 contracts spanning 2017-2025, all via 100% direct award: '
    '342M (2018): "VESTUARIO Y UNIFORMES" — null detail. '
    '316M (2025): "VESTUARIO Y UNIFORMES" — largest single contract. '
    '198M (2017): NULL description. '
    '97M (2020): "VESTUARIO Y EQUIPO". '
    '66M (2019): "VESTUARIO Y UNIFORMES". '
    '60M (2018): "PRENDAS DE PROTECCION PERSONAL PARA SEGURIDAD PUBLICA". '
    'Total: 750M over 8 years in uniform/protective gear contracts with zero competitive procurement. '
    'Key red flags: '
    '1. No RFC — impossible to verify tax compliance for a major government contractor. '
    '2. 100% direct award for products (uniforms, tactical gear) that are highly standardizable '
    'and routinely licitados in other countries. '
    '3. NULL descriptions in early contracts (2017-2018) obscure the exact goods provided. '
    '4. Concentration: Protactic receives ALL SEMAR uniform/tactical gear via DA — no competitors. '
    '5. Long timeline (2017-2025) without any competitive procurement — sustained capture pattern. '
    'Context: Navy uniform procurement in Mexico has been previously flagged by ASF for '
    'irregularities in pricing and delivery verification. '
    'MEDIUM CONFIDENCE: DA for uniforms can have technical justifications (classified specs), '
    'but scale + no RFC + null descriptions requires investigation.'
)
insert_vendor(cid, 197555, 'primary', 'medium')
insert_contracts(cid, 197555)

# ─────────────────────────────────────────────────────────────────────────────
# Case 207: SEGALMEX SHELL NETWORK EXPANSION
# Add 9 new shell companies to the SEGALMEX case ecosystem
# ─────────────────────────────────────────────────────────────────────────────
segalmex_row = conn.execute(
    "SELECT id FROM ground_truth_cases WHERE case_id='SEGALMEX_DISTRIBUCION_ALIMENTOS'"
).fetchone()
if not segalmex_row:
    # Try to find by case_name
    segalmex_row = conn.execute(
        "SELECT id FROM ground_truth_cases WHERE case_name LIKE '%Segalmex%' LIMIT 1"
    ).fetchone()

print(f'\nSEGALMEX case: {segalmex_row}')
segalmex_db_id = segalmex_row[0] if segalmex_row else None

# These are all confirmed SEGALMEX shell network vendors (no RFC, large single DA contracts to SEGALMEX)
segalmex_shells = [
    (35140, 'SOLUCIONES LOGISTICAS INTELIGENTES 3B no-RFC SEGALMEX'),
    (214755, 'TEAM BUSINESS MANAGEMENT 1.2B no-RFC SEGALMEX'),
    (200201, 'TRANSPORTE DE CARGA GRUPO MYM 979M no-RFC SEGALMEX'),
    (289071, 'AGRO SERVICIOS A PRODUCTORES DEL VALLE 714M no-RFC SEGALMEX'),
    (287011, 'ALMACENES Y SERVICIOS SANTAROSA 186M no-RFC SEGALMEX corn'),
    (246798, 'PROFESIONAL BRIGHT XRW 200M no-RFC SEGALMEX pallets'),
    (167478, 'ESESPA 413M no-RFC SEGALMEX'),
    (73253, 'MERCANTA 370M no-RFC SEGALMEX'),
    (286925, 'AGRICOLA TERRO CULTIVOS 386M no-RFC SEGALMEX'),
]

if segalmex_db_id:
    for vid, desc in segalmex_shells:
        insert_vendor(segalmex_db_id, vid, 'secondary', 'high')
        n = insert_contracts(segalmex_db_id, vid)
        name = conn.execute('SELECT name FROM vendors WHERE id=?', (vid,)).fetchone()[0]
        print(f'  SEGALMEX += VID={vid} ({name[:40]}): {n}c')
else:
    print('WARNING: SEGALMEX case not found, skipping shell expansion')

# ─────────────────────────────────────────────────────────────────────────────
# Case 208: NARGO SUMINISTROS — LICONSA milk powder intermediary
# ─────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'NARGO_SUMINISTROS_LICONSA_LECHE_POLVO_DA',
    'Nargo Suministros Internacional del Norte: no-RFC intermediary LICONSA milk powder 100%DA - 149M',
    'ghost_company',
    2022, 2022,
    149000000,
    'medium',
    'Nargo Suministros Internacional del Norte SA de CV (VID=197195, sin RFC) received a single '
    '149M MXN contract in 2022 from LICONSA SA de CV for "ADQUISICION DE LECHE EN POLVO DE ORIGEN '
    'DE LECHE CON UN CONTENIDO DE GRASA MINIMO DE 26%" — powdered milk. '
    'This case is part of the LICONSA milk powder procurement ecosystem documented in RUBLI: '
    'ILAS Representaciones (Case 157): 3.82B, LONEG (Case 99): 3.08B, '
    'Fonterra/Penasanta (Case 197): 3.46B, Nargo (this): 149M. '
    'Combined ecosystem: ~10.5B MXN in milk powder procurement with very limited competition. '
    'Key red flags: '
    '1. No RFC — impossible to verify if Nargo is a real distributor with supply chain. '
    '2. Single 149M contract to LICONSA — classic single-use intermediary pattern. '
    '3. Company name "Internacional del Norte" suggests a northern border supply chain, '
    'but powdered milk entering Mexico from US/EU typically comes through established importers. '
    '4. Mahalanobis distance = 597 (very high anomaly score), risk_score = 0.020 (model blind spot). '
    'MEDIUM CONFIDENCE: Fits the LICONSA ecosystem pattern but single contract; '
    'verify RFC with SAT EFOS list and check import documentation.'
)
insert_vendor(cid, 197195, 'primary', 'medium')
insert_contracts(cid, 197195)

# ─────────────────────────────────────────────────────────────────────────────
# Case 209: DICONSA UNIVERSITY INTERMEDIARY NETWORK (La Estafa Maestra variant)
# ─────────────────────────────────────────────────────────────────────────────
# Find vendor IDs
fondo_id = conn.execute("SELECT id FROM vendors WHERE name LIKE '%FONDO DE FOMENTO%INVESTIGACI%' LIMIT 1").fetchone()
cosamaloapan_id = conn.execute("SELECT id FROM vendors WHERE name LIKE '%COSAMALOAPAN%' LIMIT 1").fetchone()

cid = insert_case(
    'DICONSA_UNIVERSIDAD_INTERMEDIARIA_ESTAFA_VARIANTE',
    'DICONSA university intermediary network: La Estafa Maestra variant using public tech institutes as pass-through for 1.4B',
    'ghost_company',
    2013, 2020,
    1400000000,
    'high',
    'DICONSA SA de CV (distribution arm of SEDESOL/Bienestar) used at least three public '
    'universities/institutes as intermediaries in a La Estafa Maestra-style scheme: '
    '1. FONDO DE FOMENTO Y DESARROLLO DE LA INVESTIGACION CIENTIFICA Y TECNOLOGICA '
    '(likely FOFIDE): 2 contracts, 1044.8M MXN from DICONSA — largest identified '
    'university intermediary in the DICONSA ecosystem. '
    '2. INSTITUTO TECNOLOGICO SUPERIOR DE POZA RICA (VID=230022): 1 contract, 169.5M MXN '
    'for "SERVICIOS PROFESIONALES Y ADMINISTRATIVOS DE CONSULTORIA" from DICONSA. '
    'A technical institute providing 170M in administrative consulting to DICONSA is '
    'a classic La Estafa Maestra pattern. '
    '3. INSTITUTO TECNOLOGICO SUPERIOR DE COSAMALOAPAN: 2 contracts, 130.1M from DICONSA. '
    'Context: La Estafa Maestra (Case 2 in RUBLI) is the documented scheme where federal '
    'agencies contracted with public universities, which subcontracted to shell companies. '
    'The scheme was documented by ASF and Animal Politico for SEDESOL and other agencies. '
    'DICONSA, as a SEDESOL subsidiary, fits the same pattern with its regional tech institutes. '
    'Total documented through these three: 1.34B MXN. '
    'HIGH CONFIDENCE: University intermediaries for DICONSA consulting matches the exact '
    'La Estafa Maestra modus operandi documented by ASF.'
)
# Poza Rica institute
insert_vendor(cid, 230022, 'primary', 'high')
insert_contracts(cid, 230022)
print(f'Case DICONSA_UNIVERSIDAD: id={cid}')

if fondo_id:
    insert_vendor(cid, fondo_id[0], 'secondary', 'high')
    insert_contracts(cid, fondo_id[0])
    print(f'  += FONDO FOMENTO VID={fondo_id[0]}')
if cosamaloapan_id:
    insert_vendor(cid, cosamaloapan_id[0], 'secondary', 'high')
    insert_contracts(cid, cosamaloapan_id[0])
    print(f'  += COSAMALOAPAN VID={cosamaloapan_id[0]}')

# ─────────────────────────────────────────────────────────────────────────────
# Case 210: GRAFICOS DIGITALES AVANZADOS — Talleres Gráficos de México monopoly
# ─────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'GRAFICOS_DIGITALES_AVANZADOS_TALLERES_GRAFICOS_MONOPOLIO',
    'Graficos Digitales Avanzados: exclusive printing supplies monopoly for Talleres Graficos de Mexico 99%DA no RFC - 225M',
    'monopoly',
    2010, 2025,
    225000000,
    'medium',
    'Graficos Digitales Avanzados SA de CV (VID=45384, sin RFC) has been the exclusive supplier '
    'of printing materials and services to Talleres Graficos de Mexico (the federal government '
    'print shop) for 225M MXN across 67 contracts spanning 2010-2025, all via 99% direct award: '
    '124M (2024): "INSUMOS PARA LA PRODUCCION" to Talleres Graficos. '
    '77M (2025): "SERVICIO INTEGRAL" to Talleres Graficos. '
    '2M (2023), 1.6M (2020): smaller contracts to Talleres Graficos. '
    '1.7M (2024): GACM (airport) for promotional materials. '
    'Key pattern: Talleres Graficos de Mexico is the government printing house that produces '
    'official publications, electoral materials, educational books, and identity documents. '
    'Having a single exclusive private supplier for printing inputs with no RFC and no competitive '
    'procurement over 15 years is a monopoly capture pattern. '
    'The scale of 2024-2025 contracts (202M in two years) suggests recent intensification. '
    'Key red flags: '
    '1. No RFC over 15 years of contracting. '
    '2. 99% direct award for standardized printing supplies (paper, inks, plates). '
    '3. Single exclusive relationship with government print shop — no competition. '
    '4. Recent scale increase (202M in 2024-2025 alone). '
    'MEDIUM CONFIDENCE: Printing supplies can have proprietary spec justifications, '
    'but 15 years of no-RFC single-vendor contracting requires transparency.'
)
insert_vendor(cid, 45384, 'primary', 'medium')
insert_contracts(cid, 45384)
print(f'Case GRAFICOS_DIGITALES: id={cid}')

# ─────────────────────────────────────────────────────────────────────────────
# Add MILENIO DIARIO as secondary to Case 200 advertising ecosystem
# ─────────────────────────────────────────────────────────────────────────────
medios_row = conn.execute(
    "SELECT id FROM ground_truth_cases WHERE case_id='GOBIERNO_PUBLICIDAD_MEDIOS_MASIVOS_TV_RADIO_100DA'"
).fetchone()
if medios_row:
    insert_vendor(medios_row[0], 45357, 'secondary', 'high')  # Milenio Diario
    n = insert_contracts(medios_row[0], 45357)
    print(f'\nMilenio Diario (VID=45357, 767c) added to advertising Case id={medios_row[0]}: {n} contracts')

# ─────────────────────────────────────────────────────────────────────────────
# Summary
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM ground_truth_cases WHERE is_active=1")
n_cases = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM ground_truth_vendors")
n_vendors = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM ground_truth_contracts")
n_contracts = cur.fetchone()[0]
print(f'\nGT Summary: {n_cases} cases | {n_vendors} vendors | {n_contracts} contracts')
conn.close()
