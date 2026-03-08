"""Insert GT cases 195-202: Tas Tevel, Rapiscan, Fonterra/Peñasanta, LEIDOS, CANAUTO, Ediciones Castillo, Medios Masivos, Agencia Digital."""
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

# Case 195: TAS TEVEL - Policía Federal tactical transport NULL-description DA
cid = insert_case(
    'TAS_TEVEL_POLICIA_FEDERAL_TRANSPORTE_TACTICO_100DA',
    'Tas Tevel SA de CV Policia Federal Tactical Transport 100%DA Null Description - 923M',
    'procurement_fraud',
    2017, 2019,
    923000000,
    'high',
    'Tas Tevel SA de CV (VID=198525, sin RFC) received 923M MXN in 3 contracts at 100%DA to federal '
    'security forces. Policía Federal: 849M (2c, 100%DA) — 724M DA 2017 (NULL description) + '
    '125M DA 2017 (NULL description). Guardia Nacional: 74M DA 2019 '
    '"SERVICIO DE TRANSPORTE TERRESTRE EN APOYO AL DESPLIEGUE TÁCTICO". '
    'Critical anomalies: '
    '1. Both Policía Federal contracts (849M total) have NULL description — no information on what was provided. '
    '2. No RFC — impossible to verify beneficial ownership. '
    '3. The company name "Tas Tevel" does not correspond to any known Mexican transportation company. '
    '"Tevel" means "globe/world" in Hebrew — unusual name for a Mexican security transport firm. '
    '4. 724M DA 2017 in a single contract to Policía Federal with null description is one of the most '
    'opaque transactions in RUBLI for this amount level. '
    'Context: 2017 was a year of intensified federal security operations in Mexico '
    '(cartels, organized crime). "Transporte terrestre en apoyo al despliegue táctico" '
    'implies logistics for police operations — potentially buses, vehicles, fuel for large deployments. '
    'But a legitimate tactical transport contract should have detailed specification, '
    'route data, fleet size, duration — not a null description. '
    'Kol-Tov (Case 187) has a similarly unusual Hebrew-like name providing different services '
    '(hotel/food) to the same institutions (Policía Federal, SPF, Guardia Nacional). '
    'Together these two opaque companies received 2.56B from federal security forces at 100%DA. '
    'HIGH CONFIDENCE: null description + no RFC + 724M single DA to police = maximum red flag.'
)
insert_vendor(cid, 198525, 'primary', 'high')
insert_contracts(cid, 198525)

# Case 196: RAPISCAN - SAT/customs scanning equipment monopoly
cid = insert_case(
    'RAPISCAN_SAT_ADUANAS_ESCANER_SEGURIDAD_100DA',
    'Rapiscan Systems SAT/Customs Security Scanner Equipment/Maintenance 100%DA - 3.25B',
    'monopoly',
    2017, 2025,
    3250000000,
    'medium',
    'Two Rapiscan entities received a combined 3.25B MXN in 12 contracts at 100%DA for security '
    'scanning equipment and maintenance at Mexican customs and border control: '
    'RAPISCAN SYSTEMS INC (VID=205012, US parent): 2.509B in 2 contracts to SAT — '
    '2.475B DA 2018 (NULL description!) + 34M DA 2017. '
    'RAPISCAN SYSTEMS MEXICO SRL (VID=284117, RFC=RSM111012314): 740M in 10 contracts — '
    'ANAM/Agencia Nacional de Aduanas (552M, 100%DA), Guardia Nacional (121M), SEDENA (46M). '
    'Mexican maintenance contracts include: "Servicio de Mantenimiento y Actualización de Equipos '
    'Rapiscan" (435M DA 2022), "Servicio Integral de Asistencia en Seguridad Radiológica" (117M DA 2022). '
    'Rapiscan (OSI Systems) is one of ~4 companies globally making large cargo/vehicle inspection '
    'scanners used at ports of entry (others: Smiths Detection, Nuctech CN, AS&E). '
    'Mexico\'s customs has deployed Rapiscan equipment at major ports and border crossings. '
    'Once deployed, Rapiscan maintenance is sole-source — proprietary equipment. '
    'The 2.475B DA 2018 contract with NULL description from SAT is particularly concerning: '
    'this is likely the original equipment procurement that should have been competitively bid '
    '(Nuctech, Smiths, L3 all compete for government scanning contracts globally). '
    'Additionally, LEIDOS INC (VID=128837, 1.84B, 97%DA) also provides scanner maintenance/support '
    'for SAT — combined scanning security ecosystem = ~5.09B at very high DA rates.'
)
insert_vendor(cid, 205012, 'primary', 'medium')
insert_vendor(cid, 284117, 'secondary', 'medium')
insert_vendor(cid, 128837, 'secondary', 'low')
insert_contracts(cid, 205012)
insert_contracts(cid, 284117)
insert_contracts(cid, 128837)

# Case 197: FONTERRA + CORPORACION PEÑASANTA - LICONSA powdered milk international suppliers
cid = insert_case(
    'FONTERRA_PENASANTA_LICONSA_LECHE_POLVO_100DA',
    'Fonterra + Corporacion Alimentaria Penasanta LICONSA Powdered Milk 100%DA - 3.46B',
    'monopoly',
    2010, 2025,
    3460000000,
    'medium',
    'Two international dairy companies received 3.46B MXN in 24 contracts at 100%DA from LICONSA '
    'for powdered milk (leche descremada en polvo): '
    'FONTERRA MEXICO SA de CV (VID=44252, sin RFC): 1.172B in 10 contracts (2010-2015) from LICONSA. '
    'Fonterra (New Zealand) is the world\'s second-largest dairy company — its main product is '
    'skim milk powder traded globally (NZMP brand). '
    'CORPORACION ALIMENTARIA PEÑASANTA SA (VID=215287, sin RFC): 1.29B in 2 contracts — '
    '1.058B DA 2023 "ADQUISICIÓN DE HASTA 13,000 TM DE LECHE DESCREMADA EN POLVO" + 232M 2017. '
    'CORPORACION ALIMENTARIA PENASANTA (VID=149137, sin RFC): 999M in 2 contracts — '
    '987M DA 2022 "LECHE EN POLVO DE ORIGEN DE LECHE CRUDA DE VACA" + 198M 2015. '
    'Peñasanta/Capsa Food Group is a major Spanish dairy company. '
    'Both VID=215287 and VID=149137 are the same underlying company under name variations. '
    'Context: LICONSA distributes subsidized milk to ~6 million low-income Mexican families. '
    'The LICONSA powdered milk procurement ecosystem at 100%DA now includes: '
    '— ILAS Mexico (Case 157): 3.82B, 100%DA '
    '— Productos Loneg (Case 99): 3.08B, 91.7%DA '
    '— Fonterra + Peñasanta (this case): 3.46B, 100%DA '
    'Total documented DA powdered milk to LICONSA: ~10.36B MXN from 4+ suppliers, all at 90-100%DA. '
    'Powdered skim milk trades on CME Group and FAO/Fonterra Global Dairy Trade auctions — '
    'it is a fully commoditized product with transparent global pricing. '
    'Mexico could bid powdered milk internationally and achieve market-competitive prices. '
    'The consistent 100%DA across multiple international dairy giants over 15 years '
    'suggests institutional procurement capture, not legitimate sole-source justification.'
)
insert_vendor(cid, 44252, 'primary', 'medium')
insert_vendor(cid, 215287, 'secondary', 'medium')
insert_vendor(cid, 149137, 'secondary', 'medium')
insert_contracts(cid, 44252)
insert_contracts(cid, 215287)
insert_contracts(cid, 149137)

# Case 198: CAMARA NACIONAL AUTOTRANSPORTE - SEDENA transport broker
cid = insert_case(
    'CANAUTO_SEDENA_TRANSPORTE_MILITAR_INTERMEDIARIO_DA',
    'Camara Nacional Autotransporte SEDENA Military Transport Intermediary 100%DA - 794M',
    'procurement_fraud',
    2024, 2025,
    794000000,
    'high',
    'Cámara Nacional del Autotransporte de Pasaje y Turismo (CANAUTO, VID=305260, RFC=CNA890928VD2) '
    'received 794M MXN in 2 contracts at 100%DA from SEDENA in 2024: '
    '457M DA 2024 "CONTRATACIÓN SV. TRANSPORTE VIA TERRESTRE PARA PNAL. PERT. A [SEDENA]" '
    '337M DA 2024 "CONTRATACIÓN PASAJES TERRESTRES PNAL. ASISTE A ATENCIÓN MÉD." '
    'Critical issue: CANAUTO is NOT a bus company — it is the national trade association '
    'representing bus and passenger transport companies in Mexico. '
    'A trade association receiving 794M from SEDENA to broker military ground transportation '
    'and bus tickets for soldiers going to medical appointments is highly anomalous. '
    'This creates a problematic intermediary layer: SEDENA pays CANAUTO (the association), '
    'which then presumably pays actual bus companies — with no competitive procurement and '
    'an intermediary extracting a share. '
    'This is structurally similar to the G2G/intermediary patterns seen with BIRMEX '
    '(Case 25) — a semi-public entity acting as broker between government buyer and '
    'private market, eliminating competition and obscuring final recipient. '
    'SEDENA could contract bus companies directly through competitive procurement — '
    'CANAUTO has no service delivery capacity of its own. '
    'HIGH CONFIDENCE: trade association as contracting vehicle for military transport '
    'is a clear procurement integrity violation with no technical justification.'
)
insert_vendor(cid, 305260, 'primary', 'high')
insert_contracts(cid, 305260)

# Case 199: EDICIONES CASTILLO - CONALITEG textbooks second publisher 100%DA
cid = insert_case(
    'EDICIONES_CASTILLO_CONALITEG_LIBROS_100DA',
    'Ediciones Castillo SA de CV CONALITEG Textbooks 100%DA - 1.15B',
    'monopoly',
    2015, 2025,
    1149000000,
    'medium',
    'Ediciones Castillo SA de CV (VID=46992, sin RFC) received 1.149B MXN in 176 contracts at 100%DA, '
    'almost entirely from CONALITEG (Comisión Nacional de Libros de Texto Gratuitos). '
    'Similar to Editorial Santillana (Case 189, 1.56B, 99%DA), Ediciones Castillo is a '
    'private publisher receiving 100%DA from CONALITEG for supplementary secondary school textbooks. '
    'Ediciones Castillo is a Mexican educational publisher (part of Macmillan Publishers). '
    'Together, Editorial Santillana (1.56B) + Ediciones Castillo (1.15B) + other publishers = '
    'a systematic 100%DA allocation of CONALITEG textbook spending across multiple private publishers '
    'without competitive procurement. '
    'CONALITEG distributes free textbooks to ~25 million Mexican public school students annually. '
    'The supplementary reading program represents 2.7B+ distributed without licitación '
    'across at least 2 major publishers (and likely more). '
    'A single open tender for supplementary reading for secondary schools — '
    'specifying content requirements and quality standards — '
    'would allow multiple publishers to compete on price, potentially saving hundreds of millions annually. '
    'Medium confidence: individual titles may have copyright justification, '
    'but the 100%DA pattern across 176 contracts over 10 years is not consistent '
    'with legitimate sole-source procurement.'
)
insert_vendor(cid, 46992, 'primary', 'medium')
insert_contracts(cid, 46992)

# Case 200: MEDIOS MASIVOS MEXICANOS + GIM TELEVISION + Radiorama etc. - Government broadcasting advertising
cid = insert_case(
    'GOBIERNO_PUBLICIDAD_MEDIOS_MASIVOS_TV_RADIO_100DA',
    'Medios Masivos Mexicanos + GIM TV Nacional + Radiorama Govt Advertising 100%DA - 2.77B',
    'monopoly',
    2010, 2025,
    2770000000,
    'medium',
    'A cluster of media/advertising companies received 2.77B MXN at 100%DA for government '
    'advertising across TV, radio, and digital channels: '
    'MEDIOS MASIVOS MEXICANOS SA de CV (VID=54851, sin RFC): 1.082B (423c, 100%DA) — '
    'media buying/advertising. '
    'GIM TELEVISION NACIONAL SA de CV (VID=189766, sin RFC): 1.034B (84c, 100%DA) — '
    'TV distribution and advertising. '
    'RADIORAMA SA de CV (VID=45797, sin RFC): 578M (338c, 100%DA) — radio network. '
    'NRM COMUNICACIONES SA de CV (VID=46961, sin RFC): 576M (403c, 100%DA) — media. '
    'IMAGEN RADIO COMERCIAL SA de CV (VID=172817, sin RFC): 634M (205c, 100%DA) — radio. '
    'Combined with the Televisa (Case 184, 2.33B) + TV Azteca (749M) advertising cases, '
    'the total documented government advertising ecosystem at 100%DA exceeds 8B MXN. '
    'The pattern is systematic: the Mexican government never competitively bids advertising '
    'placements across any media type (TV, radio, digital, print). '
    'The LAASSP Art. 41 "single provider" exemption is systematically misapplied — '
    'multiple media channels exist within each category that could be competitively tendered. '
    'Government advertising spending has been identified as a political influence mechanism '
    'by Freedom House, Artículo 19, and CIDE research on media capture in Mexico. '
    'Medium confidence: advertising DA has some justification (creative continuity, '
    'specific channel requirements) but the universal 100%DA pattern at this scale '
    'reflects institutional resistance to competitive media buying.'
)
insert_vendor(cid, 54851, 'primary', 'medium')
insert_vendor(cid, 189766, 'secondary', 'medium')
insert_vendor(cid, 45797, 'secondary', 'medium')
insert_vendor(cid, 46961, 'secondary', 'medium')
insert_vendor(cid, 172817, 'secondary', 'medium')
insert_contracts(cid, 54851)
insert_contracts(cid, 189766)
insert_contracts(cid, 45797)
insert_contracts(cid, 46961)
insert_contracts(cid, 172817)

# Case 201: AGENCIA DIGITAL + CINETIKA - Digital/content advertising DA
cid = insert_case(
    'AGENCIA_DIGITAL_CINETIKA_GOBIERNO_CONTENIDOS_100DA',
    'Agencia Digital + Cinetika Producciones Govt Digital/Video Content 100%DA - 1.31B',
    'monopoly',
    2015, 2025,
    1310000000,
    'medium',
    'Two digital/video production companies received 1.31B MXN at 100%DA for government '
    'digital content and advertising: '
    'AGENCIA DIGITAL SA de CV (VID=51704, sin RFC): 664M (430c, 100%DA) — digital advertising. '
    'CINETIKA PRODUCCIONES SA de CV (VID=72966, sin RFC): 645M (7c, 100%DA) — video/film production. '
    'Cinetika\'s 7 contracts: likely large video production contracts for government campaigns. '
    '645M in 7 contracts = avg 92M each — very large production budgets. '
    'Agencia Digital: 430 contracts at avg 1.5M each — smaller digital placements at 100%DA. '
    'Together with Medios Masivos/GIM/Radiorama (Case 200) and Televisa/TV Azteca (Cases 184/189), '
    'these form the complete government advertising ecosystem: '
    'TV (Televisa 2.33B + TV Azteca 749M), radio (Radiorama 578M + Imagen 634M + NRM 576M + MMM 1B+), '
    'digital (Agencia Digital 664M), video production (Cinetika 645M, Havas Media 1.66B), '
    'GIM TV Nacional 1.034B. '
    'Total documented government advertising at 100%DA: ~10-11B MXN. '
    'For comparison, Mexico\'s annual federal advertising budget per Presupuesto de Egresos '
    'was typically 2-5B MXN — suggesting many contracts are undercounted or span multiple years. '
    'The complete absence of competitive bidding in ANY advertising contract across ANY administration '
    'is a systemic governance failure that facilitates political media capture.'
)
insert_vendor(cid, 51704, 'primary', 'medium')
insert_vendor(cid, 72966, 'secondary', 'medium')
insert_contracts(cid, 51704)
insert_contracts(cid, 72966)

# Case 202: VIVERES DE SAN RAFAEL + COMERCIALIZADORA DULCINEA - APBSA/DICONSA food supply shells
cid = insert_case(
    'VIVERES_DULCINEA_APBSA_DICONSA_ALIMENTOS_100DA',
    'Viveres San Rafael + Comercializadora Dulcinea APBSA/DICONSA Food Supply 100%DA - 1.61B',
    'monopoly',
    2020, 2025,
    1610000000,
    'medium',
    'Two food supply companies received 1.61B MXN at 100%DA exclusively from APBSA '
    '(Alimentación para el Bienestar) and DICONSA for food distribution: '
    'VIVERES DE SAN RAFAEL SA de CV (VID=199011, sin RFC): 845M (428c, 100%DA) — food/grocery supplies. '
    'COMERCIALIZADORA DULCINEA SA de CV (VID=288240, sin RFC): 763M (370c, 100%DA) — food/sweets. '
    'Both companies supply exclusively to APBSA (formerly DICONSA), the government rural food network. '
    'Total contracts: 428+370 = 798 micro-contracts between them. '
    'This is part of the broader APBSA/DICONSA captive procurement ecosystem: '
    '— Fábrica de Jabón La Corona (1.499B, 100%DA) for soap/cleaning '
    '— Suministros de Maiz del Mayab (2.15B, 100%DA) for corn '
    '— Hari Masa del Sureste (716M, 100%DA) for masa/corn dough '
    '— Viveres de San Rafael (845M, 100%DA) for general groceries '
    '— Comercializadora Dulcinea (763M, 100%DA) for confectionery/sweets '
    'Together these 5 vendors represent ~6.0B in 100%DA food supply to APBSA/DICONSA. '
    'The rural community store network should have competitive regional suppliers — '
    'instead it appears captured by a small number of exclusive providers. '
    'Neither Viveres de San Rafael nor Dulcinea has an RFC registered — opacity for '
    'companies receiving hundreds of millions in social welfare food contracts.'
)
insert_vendor(cid, 199011, 'primary', 'medium')
insert_vendor(cid, 288240, 'secondary', 'medium')
insert_contracts(cid, 199011)
insert_contracts(cid, 288240)

# Summary
total_cases = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
print(f'\nGT Summary: {total_cases} cases | {total_vendors} vendors | {total_contracts} contracts')
conn.close()
