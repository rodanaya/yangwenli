"""GT cases 211-218: LICONSA international dairy, LICONSA transport, more SEGALMEX shells, IMSS blind spots."""
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
# Case 211: LICONSA INTERNATIONAL DAIRY ECOSYSTEM
# Land O'Lakes (2.95B) + Philpot Dairy (2.29B) + Industrias Lacteas Asturianas (1.99B)
# ─────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'LICONSA_LACTEOS_INTERNACIONALES_DA_ECOSISTEMA',
    'LICONSA International Dairy Ecosystem: Land O Lakes + Philpot + Industrias Lacteas Asturianas 100%DA no RFC - 7.2B',
    'monopoly',
    2002, 2025,
    7240000000,
    'medium',
    'LICONSA contracts with three major international dairy companies exclusively via direct award, '
    'with none of the three having RFC registered in COMPRANET, for a combined 7.24B MXN: '
    '1. LAND O\'LAKES INC (VID=44870, US dairy cooperative): 2.953B, 10 contracts, 100% DA, no RFC. '
    'Land O\'Lakes is a major US dairy cooperative. Powdered milk supply to LICONSA. '
    '2. PHILPOT DAIRY PRODUCTS LTD (VID=43454, UK dairy): 2.290B, 10 contracts, 100% DA, no RFC. '
    'UK dairy importer/exporter. Multiple large contracts. '
    '3. INDUSTRIAS LACTEAS ASTURIANAS SA (VID=44871, Spanish dairy): 1.998B, 5 contracts, 100% DA, no RFC. '
    'A Spanish Asturian dairy company. '
    'Combined with already-documented LICONSA ecosystem: '
    'ILAS (3.82B) + LONEG (3.08B) + Fonterra/Penasanta (3.46B) + Nargo (149M) + this batch (7.24B) '
    '= approximately 17.75B MXN in LICONSA milk procurement with very limited competitive bidding. '
    'Key issues: '
    '1. Three foreign dairy companies without RFC in Mexico receiving ~7.2B in government contracts. '
    '2. All three via 100% direct award — no international competitive bidding for major dairy imports. '
    '3. Mexico is a signatory to multiple trade agreements (USMCA, EU-Mexico) that should enable '
    'competitive procurement of dairy commodities at international benchmark prices. '
    'MEDIUM CONFIDENCE: May be technically justified under ley de adquisiciones provisions for '
    'single sources, but scale (7.2B) without competition requires ASF audit of pricing benchmarks.'
)
insert_vendor(cid, 44870, 'primary', 'medium')    # Land O'Lakes
insert_contracts(cid, 44870)
insert_vendor(cid, 43454, 'secondary', 'medium')   # Philpot Dairy
insert_contracts(cid, 43454)
insert_vendor(cid, 44871, 'secondary', 'medium')   # Industrias Lacteas Asturianas
insert_contracts(cid, 44871)

# ─────────────────────────────────────────────────────────────────────────────
# Case 212: LICONSA TRANSPORT ECOSYSTEM
# Transliquidos Lopez (2.9B) + Transportes Tranasa (1.285B) + EHL (981M)
# ─────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'LICONSA_TRANSPORTE_DISTRIBUCION_DA_ECOSISTEMA',
    'LICONSA Transport Distribution Ecosystem: Transliquidos Lopez + Tranasa + EHL del Centro 100%DA - 5.2B',
    'monopoly',
    2002, 2025,
    5200000000,
    'medium',
    'LICONSA contracted with three transport/distribution companies for the logistics of its milk '
    'distribution network, exclusively via direct award, all without RFC: '
    '1. TRANSLIQUIDOS REFRIGERADOS LOPEZ SA de CV (VID=27258): 2.901B, 176 contracts, no RFC. '
    'The largest LICONSA transport supplier. Refrigerated transport for perishable dairy products. '
    '2. TRANSPORTES TRANASA SA de CV (VID=21193): 1.285B, 65 contracts, no RFC. '
    'Major transport provider, sustained multi-year relationship. '
    '3. TRANSPORTES EHL DEL CENTRO SA de CV (VID=52258): 981M, 111 contracts, no RFC. '
    'Third major transport provider. '
    'Combined: 5.17B in LICONSA milk transport/distribution via 100% DA with no RFC for any vendor. '
    'Key issues: '
    '1. Three major logistics companies without RFC managing the distribution of a national food program. '
    '2. Distribution costs represent a significant portion of program costs and are impossible to audit. '
    '3. 100% direct award for transport services that are highly competitive in the Mexican market. '
    '4. LICONSA distributes to ~6 million low-income beneficiary families — opacity in distribution '
    'costs represents a systemic risk to the program. '
    'MEDIUM CONFIDENCE: Transport can have preferential relationships, but scale + no RFC is notable.'
)
insert_vendor(cid, 27258, 'primary', 'medium')    # Transliquidos
insert_contracts(cid, 27258)
insert_vendor(cid, 21193, 'secondary', 'medium')   # Tranasa
insert_contracts(cid, 21193)
insert_vendor(cid, 52258, 'secondary', 'medium')   # EHL del Centro
insert_contracts(cid, 52258)

# ─────────────────────────────────────────────────────────────────────────────
# Case 213: LICONSA PACKAGING ECOSYSTEM
# Tetra Pak (1.297B) + Poly Rafia (590M) + Empaques Plasticos Industriales (696M)
# ─────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'LICONSA_EMPAQUES_PACKAGING_DA_ECOSISTEMA',
    'LICONSA Packaging Ecosystem: Tetra Pak + Poly Rafia + Empaques Plasticos Industriales 100%DA no RFC - 2.5B',
    'monopoly',
    2002, 2025,
    2500000000,
    'low',
    'LICONSA contracted with packaging suppliers for its milk distribution, all via direct award without RFC: '
    '1. TETRA PAK SA de CV (VID=45541): 1.297B, 126 contracts, no RFC. '
    'Tetra Pak is the globally dominant aseptic packaging supplier — their lock-in is technically '
    'justified given LICONSA uses Tetra Pak machines. However the absence of RFC for a 1.3B '
    'vendor is an administrative concern. '
    '2. EMPAQUES PLASTICOS INDUSTRIALES SA de CV (VID=9173): 696M, 13 contracts, no RFC. '
    'Plastic packaging supplier. '
    '3. POLY RAFIA SA de CV (VID=71832): 590M, 12 contracts, no RFC. '
    'Polypropylene raffia packaging. '
    'Note: Tetra Pak\'s lock-in is partially legitimate (proprietary filling machines). '
    'The other packaging suppliers are in a more competitive market and should be licitados. '
    'LOW CONFIDENCE: Tetra Pak has technical justification. Other packaging vendors need review.'
)
insert_vendor(cid, 45541, 'primary', 'low')    # Tetra Pak
insert_contracts(cid, 45541)
insert_vendor(cid, 71832, 'secondary', 'low')   # Poly Rafia
insert_contracts(cid, 71832)
insert_vendor(cid, 9173, 'secondary', 'low')    # Empaques Plasticos
insert_contracts(cid, 9173)

# ─────────────────────────────────────────────────────────────────────────────
# Case 214: LICONSA ANIMAL / AGRO INTERMEDIARIES
# INTERFOOD INC (949M) + INDAMEX (884M) + LAMEX (734M) + APIS FOOD BV (732M)
# + QUESERIA DOS LAGUNAS (1.125B)
# ─────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'LICONSA_INTERMEDIARIOS_AGRO_DA_ECOSISTEMA',
    'LICONSA Agro Intermediaries: Interfood + Indamex + Lamex + Apis Food + Queseria Dos Lagunas 100%DA - 4.4B',
    'ghost_company',
    2010, 2025,
    4400000000,
    'medium',
    'Five additional LICONSA food/dairy intermediaries, all via 100% direct award, most without RFC: '
    '1. INTERFOOD INC (VID=223449): 949M, 1 contract, no RFC. A company named "Interfood Inc" '
    'with a single 949M contract and no RFC — classic single-use intermediary. '
    '2. INDAMEX INDUSTRIALIZADORA DE ALIMENTOS MEXICANOS SA de CV (VID=290377): 884M, 8 contracts, '
    'RFC=IIA191113HL0 (company founded 2019). Young company with 884M in LICONSA contracts. '
    '3. LAMEX AGRIALIMENTOS S de RL de CV (VID=297307): 734M, 1 contract, RFC=LAG170918AR9. '
    'One 734M single contract. '
    '4. APIS FOOD BV (VID=124418): 732M, 3 contracts, no RFC. A Dutch BV company with no RFC. '
    '5. QUESERIA DOS LAGUNAS SA de CV (VID=310464): 1.125B, 10 contracts, RFC=QDL790104TX1. '
    'A cheese manufacturer receiving >1B from LICONSA. '
    'Combined: 4.42B in LICONSA procurement via DA. '
    'RED FLAGS: '
    '1. Single-contract entities (Interfood, Lamex) — single-use intermediaries. '
    '2. Dutch BV (Apis Food) and foreign entities without Mexican RFC. '
    '3. INDAMEX founded 2019, immediately began receiving hundreds of millions from LICONSA. '
    'MEDIUM CONFIDENCE: Pattern of intermediaries fits LICONSA procurement opacity ecosystem.'
)
insert_vendor(cid, 223449, 'primary', 'high')   # Interfood Inc (single 949M no-RFC)
insert_contracts(cid, 223449)
insert_vendor(cid, 290377, 'secondary', 'medium')  # INDAMEX (new company, 884M)
insert_contracts(cid, 290377)
insert_vendor(cid, 297307, 'secondary', 'medium')  # LAMEX
insert_contracts(cid, 297307)
insert_vendor(cid, 124418, 'secondary', 'medium')  # APIS FOOD BV (Dutch, no RFC)
insert_contracts(cid, 124418)
insert_vendor(cid, 310464, 'secondary', 'low')     # Queseria Dos Lagunas
insert_contracts(cid, 310464)

# ─────────────────────────────────────────────────────────────────────────────
# Case 215: REMAINING SEGALMEX SHELLS (batch 2)
# PNPDMI 638M + Soluciones Integrales Transporte 500M + Micro Credit 347M
# + Transportes SUVI 328M + Palmicultores 327M + Forza Arrendadora 289M
# + Fruverloz 271M + Abacomex 247M
# ─────────────────────────────────────────────────────────────────────────────
segalmex_row = conn.execute(
    "SELECT id FROM ground_truth_cases WHERE case_id='SEGALMEX_DISTRIBUCION_ALIMENTOS'"
).fetchone()
print(f'\nSEGALMEX case: {segalmex_row}')
segalmex_db_id = segalmex_row[0] if segalmex_row else None

if segalmex_db_id:
    batch2 = [
        267977,  # PNPDMI 638M
        262050,  # SOLUCIONES INTEGRALES AL TRANSPORTE 500M
        251510,  # MICRO CREDIT SAPI 347M (financial company)
        267480,  # TRANSPORTES SUVI 328M
        285212,  # PALMICULTORES DE SAN MARCOS 327M
        239702,  # FORZA ARRENDADORA AUTOMOTRIZ 289M (car leasing)
        242977,  # FRUVERLOZ 271M
        198116,  # ABACOMEX 247M
        198285,  # AGRO TECNOLOGIAS DE JALISCO 233M
        155246,  # AGROASEMEX 179M
    ]
    for vid in batch2:
        insert_vendor(segalmex_db_id, vid, 'secondary', 'high')
        n = insert_contracts(segalmex_db_id, vid)
        name = conn.execute('SELECT name FROM vendors WHERE id=?', (vid,)).fetchone()[0]
        print(f'  SEGALMEX += VID={vid} ({name[:40]}): {n}c')

# ─────────────────────────────────────────────────────────────────────────────
# Case 216: LICONSA INDIVIDUAL AND COOPERATIVE VENDORS
# Alfonso Nava Burgos (person, 678M) + Transliquidos/transport supplements
# ─────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'LICONSA_PERSONA_FISICA_COOPERATIVAS_DA',
    'LICONSA individual/cooperative vendors: Alfonso Nava Burgos (person, 678M) + Union Logistica Jalisco + Grupo Turbofin - 1.8B',
    'ghost_company',
    2002, 2025,
    1800000000,
    'high',
    'Three individual/cooperative vendors without RFC receiving major LICONSA contracts via DA: '
    '1. ALFONSO NAVA BURGOS (VID=7252): 678M, 57 contracts, no RFC. '
    'A PHYSICAL PERSON with 678M in government contracts for LICONSA — one of the largest '
    'individual person vendors in the database. 57 contracts over multiple years. '
    'Individual persons receiving hundreds of millions from LICONSA is anomalous — '
    'they typically act as front men for larger supply networks. '
    '2. UNION LOGISTICA DE JALISCO POBA S de RL de CV (VID=189997): 582M, 39 contracts, no RFC. '
    '3. GRUPO TURBOFIN S A P I de CV (VID=263579): 601M, 3 contracts, RFC=GTU1304047B1. '
    'A "financial/turbine" named company (Turbofin) receiving 601M from LICONSA. '
    'Combined: 1.86B in LICONSA contracts to individuals and small collectives. '
    'HIGH CONFIDENCE for Alfonso Nava Burgos: Physical person receiving 678M from food program = '
    'definite front/intermediary. Standard LICONSA procurement fraud indicator.'
)
insert_vendor(cid, 7252, 'primary', 'high')     # Alfonso Nava Burgos (individual)
insert_contracts(cid, 7252)
insert_vendor(cid, 263579, 'secondary', 'medium')  # Grupo Turbofin
insert_contracts(cid, 263579)
insert_vendor(cid, 189997, 'secondary', 'medium')  # Union Logistica Jalisco
insert_contracts(cid, 189997)

# ─────────────────────────────────────────────────────────────────────────────
# Case 217: SPIMED IMSS LARGE NULL CONTRACT
# SPIMED (308M null to IMSS 2021) + COMEVO (IMSS 2024)
# ─────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'SPIMED_COMEVO_IMSS_INSUMOS_GRANDES_NULL_DA',
    'Spimed + Comevo: large IMSS medical supply contracts with null descriptions 100%DA - 470M',
    'procurement_fraud',
    2021, 2024,
    470000000,
    'medium',
    'Two IMSS medical supply distributors with large contracts: '
    '1. SPIMED SA de CV (VID=258597): 308M in a SINGLE 2021 direct award to IMSS with NULL description. '
    'A 308M direct award to a medical supply company with zero description of what was supplied is '
    'a critical transparency failure. Spimed has 150 additional smaller contracts (mostly 1-2M) to '
    'ISSSTE and other health institutions. '
    '2. COMEVO SA de CV (VID=305351, RFC=COM1812066L2): 160M to IMSS in 2024 for '
    '"ADQUISICION DE MEDICAMENTOS E INSUMOS PARA LA SALUD" via 100% DA. '
    'Founded 2018, immediately receiving major IMSS contracts by 2024. '
    'Context: IMSS medical procurement was one of the documented COVID-era fraud vectors. '
    'The pattern of large null-description DA contracts to medical distributors persists beyond COVID. '
    'MEDIUM CONFIDENCE: The 308M null contract is highly suspicious; Comevo is a newer pattern '
    'needing more investigation against SAT EFOS list.'
)
insert_vendor(cid, 258597, 'primary', 'high')    # SPIMED 308M null
insert_contracts(cid, 258597)
insert_vendor(cid, 305351, 'secondary', 'medium') # COMEVO 160M
insert_contracts(cid, 305351)

# ─────────────────────────────────────────────────────────────────────────────
# Case 218: CAR INFORMATION SYSTEM — BANJERCITO vehicle history monopoly
# ─────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'CAR_INFORMATION_SYSTEM_BANJERCITO_HISTORIAL_VEHICULAR_DA',
    'Car Information System: exclusive vehicle history lookup monopoly for BANJERCITO 100%DA - 2.34B',
    'monopoly',
    2011, 2024,
    2340000000,
    'medium',
    'Car Information System SA de CV (VID=67322) is the exclusive provider of vehicle history '
    'database lookup services ("consulta de historial vehicular a traves de servicio web") to '
    'BANJERCITO (Banco Nacional del Ejercito, Fuerza Aerea y Armada) for 2.34B MXN across '
    '14 contracts spanning 2011-2024, at 93% direct award rate: '
    '2013 contracts totaling ~1.25B (all NULL descriptions). '
    '2021: 385M "Consulta de historial vehicular a traves de un servicio web". '
    '2020: 249M for same service. '
    '2024: 114M DA. '
    'BANJERCITO uses vehicle history checks for its military personnel loan approvals '
    '(auto loans, housing loans) and vehicle registration for crossing military checkpoints. '
    'Key issues: '
    '1. CAPTIVE MARKET: A single private company holds the exclusive vehicle history database '
    'that BANJERCITO requires for its financial operations. '
    '2. PRICING OPACITY: 2.34B for "web service consultations" — the per-query cost is unknown. '
    '3. NULL DESCRIPTIONS in 2013 contracts (1.25B total) — the largest transactions are the '
    'most opaque. '
    '4. MONOPOLY BY DATA: The company controls a proprietary database that the institution '
    'depends on — a lock-in through data control rather than technology. '
    'MEDIUM CONFIDENCE: Vehicle history services can have legitimate exclusive providers '
    '(similar to Carfax in US), but scale + null descriptions requires pricing audit.'
)
insert_vendor(cid, 67322, 'primary', 'medium')
insert_contracts(cid, 67322)

# ─────────────────────────────────────────────────────────────────────────────
# Summary
n_cases = conn.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
n_vendors = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
n_contracts = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
print(f'\nGT Summary: {n_cases} cases | {n_vendors} vendors | {n_contracts} contracts')
conn.close()
