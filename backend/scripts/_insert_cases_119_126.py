"""Insert Cases 119-126: media/TV, fuel vouchers, operadora abasto, medical distributors, Airbus."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3

DB = 'RUBLI_NORMALIZED.db'
conn = sqlite3.connect(DB)
today = '2026-03-08T00:00:00'

def insert_case(case_id, name, case_type, y1, y2, amt, confidence, src_asf, src_news, src_legal, notes):
    conn.execute("""INSERT OR IGNORE INTO ground_truth_cases
        (case_id,case_name,case_type,year_start,year_end,estimated_fraud_mxn,confidence_level,source_asf,source_news,source_legal,notes,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        (case_id,name,case_type,y1,y2,amt,confidence,src_asf,src_news,src_legal,notes,today))

def insert_vendor(case_id, vendor_id, vendor_name, rfc, role, evidence_strength, notes):
    conn.execute("""INSERT OR IGNORE INTO ground_truth_vendors
        (case_id,vendor_id,vendor_name_source,rfc_source,role,evidence_strength,match_method,match_confidence,notes,created_at)
        VALUES (?,?,?,?,?,?,'vendor_match','high',?,?)""",
        (case_id,vendor_id,vendor_name,rfc,role,evidence_strength,notes,today))

def insert_contracts(case_id, vendor_id):
    cids = [r[0] for r in conn.execute('SELECT id FROM contracts WHERE vendor_id=?', (vendor_id,)).fetchall()]
    for cid in cids:
        conn.execute("""INSERT OR IGNORE INTO ground_truth_contracts
            (case_id,contract_id,evidence_strength,match_method,match_confidence,created_at)
            VALUES (?,?,'medium','vendor_match','high',?)""", (case_id, cid, today))
    return len(cids)

# CASE 119: ESTUDIOS AZTECA — government TV advertising monopoly 100%DA
insert_case(
  'ESTUDIOS_AZTECA_GOVT_ADVERTISING_DA',
  'Estudios Azteca SA de CV — 5.65B Government TV Advertising at 99.8%DA (2010-2021)',
  'monopoly',
  2010, 2021, 5650000000, 'medium',
  None,
  'SFP oversight of government media spending; ASF review of tourism/health advertising DA',
  'Fundar/IMCO analysis of government advertising expenditure',
  'Estudios Azteca SA de CV (no RFC in COMPRANET) — the advertising/production subsidiary of TV Azteca — received 5.65B MXN across 499 contracts at 99.8% direct award rate from multiple government institutions. Concentration: Consejo de Promocion Turistica (CPTM) 1.13B at 100%DA (9 contracts, 2011-2018); IMSS 790M at 100%DA (23 contracts, 2013-2021); Pronosticos para la Asistencia Publica 710M at 100%DA (14 contracts, 2010-2018). Top contracts: 200M DA 2018 and 180M DA 2018 for "transmision de mensajes publicitarios en television" and "espacios publicitarios de television." Government advertising on commercial television should be allocated through competitive bidding (LAASSP allows DA only for unique audience characteristics). The 99.8%DA rate for TV advertising contracts — which have multiple competing networks (Televisa, TV Azteca, pay TV) — constitutes a systematic evasion of competitive advertising procurement. Combined with its competitor Televisa (VID=46629, 7.33B at 99.8%DA), these two media giants collectively captured over 13B in government advertising through DA instead of competitive media buying processes. Risk_score=0.151. CONFIDENCE MEDIUM: 5.65B at 99.8%DA confirmed; advertising nature documented; no RFC; companion case to Televisa (VID=46629).'
)
insert_vendor('ESTUDIOS_AZTECA_GOVT_ADVERTISING_DA', 45436, 'ESTUDIOS AZTECA SA DE CV', None, 'primary', 'medium',
  '5.65B MXN | 499c | No RFC | CPTM 1.13B @100%DA | IMSS 790M @100%DA | Pronosticos 710M @100%DA | TV advertising at 99.8%DA | rs=0.151')
c119 = insert_contracts('ESTUDIOS_AZTECA_GOVT_ADVERTISING_DA', 45436)
print(f'Case 119 (Estudios Azteca): {c119} contracts')

# CASE 120: Also add Televisa (VID=46629) as companion to Estudios Azteca
insert_case(
  'TELEVISA_GOVT_ADVERTISING_DA',
  'Televisa SA de CV — 7.33B Government TV Advertising at 99.8%DA (2010-2025)',
  'monopoly',
  2010, 2025, 7330000000, 'medium',
  None,
  'SFP oversight of government media spending; ASF CPTM/IMSS advertising audits',
  'Fundar METRICS: gastos de publicidad gubernamental; IMCO analysis',
  'Televisa (VID=46629, no RFC in COMPRANET) received 7.33B MXN across 418 contracts at 99.8% direct award rate. Concentration: Consejo de Promocion Turistica (CPTM) 1.53B at 100%DA (8 contracts, 2011-2017); IMSS 940M at 100%DA (14 contracts, 2013-2025); SEP 690M at 100%DA (21 contracts, 2010-2022); Pronosticos 480M at 100%DA (9 contracts). Together with Estudios Azteca (Case 119), the Televisa-Azteca advertising duopoly captured over 13B MXN in government advertising through systematic 100%DA, preventing competitive media buying. Mexican law (LAASSP Art. 41 IX) allows advertising DA only when a specific medium reaches a unique audience — but this exception is routinely abused to sole-source all government advertising to the two terrestrial TV oligopolies. The combined 13B+ in DA advertising to Televisa and TV Azteca subsidiaries represents one of the largest systematic monopoly captures outside of the pharmaceutical sector. rs=0.166. CONFIDENCE MEDIUM: 7.33B at 99.8%DA confirmed; advertising nature documented; no RFC.'
)
insert_vendor('TELEVISA_GOVT_ADVERTISING_DA', 46629, 'Televisa', None, 'primary', 'medium',
  '7.33B MXN | 418c | No RFC | CPTM 1.53B @100%DA | IMSS 940M @100%DA | SEP 690M @100%DA | TV advertising at 99.8%DA | rs=0.166 | Companion to Case 119 (Azteca)')
c120 = insert_contracts('TELEVISA_GOVT_ADVERTISING_DA', 46629)
print(f'Case 120 (Televisa advertising): {c120} contracts')

# CASE 121: EFECTIVALE S DE RL DE CV — Guardia Nacional 2.08B fuel DA 2020
insert_case(
  'EFECTIVALE_GUARDIA_NACIONAL_FUEL_DA_2020',
  'Efectivale S de RL de CV — Guardia Nacional 3.13B Fuel/Voucher Services (2.08B Single DA 2020)',
  'overpricing',
  2019, 2025, 12080000000, 'medium',
  None,
  'ASF Cuenta Publica Guardia Nacional 2020 (fuel procurement)',
  'SFP oversight of Guardia Nacional procurement 2019-2020',
  'Efectivale S de RL de CV (no RFC in COMPRANET) — a fuel card/voucher company — received 12.08B MXN across 2,575 contracts at 52.7% direct award rate. Critical: Guardia Nacional 3.13B at 83%DA across 6 contracts (2019-2020), including a single DA of 2.08B MXN in 2020 for "SERVICIO DE SUMINISTRO DE COMBUSTIBLE PARA EL PARQUE VEHICULAR" (fleet fuel supply service). The Guardia Nacional was created in 2019 and set up initial contracts in 2019-2020. However, a 2.08B single DA for fuel supply — bypassing competitive bidding for what is a commodity service with multiple potential providers — is a significant irregularity. Mexico\'s LAASSP requires competitive bidding above 1M MXN for services; a 2.08B fuel contract would normally require licitacion publica internacional. Additional: SEMAR 650M at 70%DA (27 contracts), SCT 1.24B at 17%DA. Efectivale also received a 630M LP in 2025 for fuel supply, suggesting competitive capacity exists. The 2.08B DA in 2020 appears unjustified under emergency conditions for a commodity service. rs=0.861. CONFIDENCE MEDIUM: 2.08B single DA to Guardia Nacional confirmed; commodity service (fuel) should be competitively bid; no RFC.'
)
insert_vendor('EFECTIVALE_GUARDIA_NACIONAL_FUEL_DA_2020', 45016, 'EFECTIVALE S DE RL DE CV', None, 'primary', 'medium',
  '12.08B MXN | 2575c | No RFC | Guardia Nacional 3.13B @83%DA (6c) | 2.08B single DA 2020 fuel | SEMAR 650M @70%DA | rs=0.861')
c121 = insert_contracts('EFECTIVALE_GUARDIA_NACIONAL_FUEL_DA_2020', 45016)
print(f'Case 121 (Efectivale): {c121} contracts')

# CASE 122: OPERADORA PROGRAMAS ABASTO MULTIPLE — SEP/ISSSTE multi-institution DA ring
insert_case(
  'OPERADORA_ABASTO_MULTIPLE_ISSSTE_SEP_DA',
  'Operadora de Programas de Abasto Multiple SA de CV — 11.6B Multi-Institution DA Ring (SEP/ISSSTE/SEPOMEX)',
  'procurement_fraud',
  2010, 2020, 11614000000, 'medium',
  None,
  'ASF Cuenta Publica SEP/ISSSTE 2010-2018; SEPOMEX audit',
  'SFP oversight',
  'Operadora de Programas de Abasto Multiple SA de CV (no RFC in COMPRANET) received 11.61B MXN across 320 contracts at 51.6% direct award rate from four distinct government institutions. Concentration: SEP 4.97B at 36%DA (11 contracts, 2010-2018); INEGI 1.53B at 0%DA (9 contracts); ISSSTE 960M at 100%DA (1 contract, 2014); Servicio Postal Mexicano 940M at 20%DA (5 contracts). Critical: three large DAs with no descriptions: 960M DA (ISSSTE, 2014), 910M DA (institution unknown, 2010), 810M DA (institution unknown, 2015). A company named "Operadora de Programas de Abasto Multiple" providing diverse services to education (SEP), statistics (INEGI), health insurance (ISSSTE), and postal service (SEPOMEX) — without RFC — is anomalous. The name suggests multi-program supply operations, but the institutional diversity is extreme for a legitimate specialist supplier. The three large DA contracts with no descriptions (960M, 910M, 810M = 2.68B) from 2010-2015 are particularly opaque. Risk_score=0.778. CONFIDENCE MEDIUM: 11.6B confirmed; three large undescribed DAs (2.68B) confirmed; no RFC; cross-institutional pattern anomalous.'
)
insert_vendor('OPERADORA_ABASTO_MULTIPLE_ISSSTE_SEP_DA', 29085, 'OPERADORA DE PROGRAMAS DE ABASTO MULTIPLE, S.A. DE C.V.', None, 'primary', 'medium',
  '11.61B MXN | 320c | No RFC | SEP 4.97B @36%DA | INEGI 1.53B @0%DA | ISSSTE 960M @100%DA | SEPOMEX 940M | 3 undescribed DAs: 960M+910M+810M | rs=0.778')
c122 = insert_contracts('OPERADORA_ABASTO_MULTIPLE_ISSSTE_SEP_DA', 29085)
print(f'Case 122 (Operadora Abasto): {c122} contracts')

# CASE 123: GRUPO UNIMEDICAL SOLUCIONES — IMSS 1441c @88%DA blind spot
insert_case(
  'UNIMEDICAL_IMSS_DA_RING',
  'Grupo Unimedical Soluciones SA de CV — IMSS 1.14B 88%DA (1441 contracts — extreme model blind spot)',
  'procurement_fraud',
  2013, 2025, 1140000000, 'high',
  None,
  'ASF IMSS pharmaceutical procurement audits 2013-2025',
  'SFP IMSS oversight',
  'Grupo Unimedical Soluciones SA de CV (no RFC in COMPRANET) received 1.14B MXN across 1,845 contracts with 88.3% direct award rate. Primary: IMSS 640M at 88%DA across 1,441 contracts (2013-2025); INCMNSZ (National Institute of Medical Sciences and Nutrition) 140M at 100%DA across 155 contracts. Service: "ADQUISICION DE MEDICAMENTOS PARA EL CENTRO DE MEZCLAS" (IV drug compounding center supplies). This is a pharmaceutical/medical supply company with 1,441 DA contracts in IMSS over 12 years — averaging 120 DA per year. At 88%DA, nearly 9 of every 10 contracts bypass competitive bidding. Risk_score=0.080 (model blind spot: 1,845 small contracts dilute per-contract risk). The INCMNSZ pattern (155 contracts at 100%DA) mirrors the IMSS pattern, indicating systematic dual-institution capture. No RFC prevents identity verification. CONFIDENCE HIGH: 1.14B at 88.3%DA confirmed; IMSS 1441c @88%DA documented; no RFC; rs=0.080 blind spot.'
)
insert_vendor('UNIMEDICAL_IMSS_DA_RING', 30834, 'GRUPO UNIMEDICAL SOLUCIONES S.A. DE C.V.', None, 'primary', 'high',
  '1.14B MXN | 1845c | No RFC | IMSS 640M @88%DA (1441c) | INCMNSZ 140M @100%DA (155c) | rs=0.080 (blind spot)')
c123 = insert_contracts('UNIMEDICAL_IMSS_DA_RING', 30834)
print(f'Case 123 (Grupo Unimedical): {c123} contracts')

# CASE 124: SUMINISTROS MEDICOS DEL CENTRO — SEMAR/SEDENA medical supplies DA ring
insert_case(
  'SUMINISTROS_MEDICOS_SEMAR_SEDENA_DA',
  'Suministros Medicos del Centro SA de CV — SEMAR/SEDENA 1.13B Medical Supplies DA Ring (1239 contracts)',
  'procurement_fraud',
  2010, 2025, 1130000000, 'medium',
  None,
  'ASF Cuenta Publica SEMAR/SEDENA medical procurement 2010-2025',
  'SFP defense medical procurement oversight',
  'Suministros Medicos del Centro SA de CV (no RFC in COMPRANET) received 1.13B MXN across 1,239 contracts at 73.3% direct award rate, supplying medical products to defense/security institutions. SEMAR (Navy): 410M at 75%DA (400 contracts, 2010-2025); SEDENA (Army): 200M at 20%DA (50 contracts); Hospital General de Mexico: 170M at 74%DA (158 contracts). Defense medical procurement often has security-justified restrictions. However, SEMAR at 75%DA over 400 contracts and Hospital General at 74%DA over 158 contracts suggests the DA pattern extends beyond classified procurement. No RFC prevents identity verification. The 1239-contract volume at 73.3%DA (avg ~5.4M/contract) is consistent with chronic DA pharmaceutical distribution. Risk_score=0.182. CONFIDENCE MEDIUM: 1.13B at 73.3%DA confirmed; SEMAR 400c @75%DA; no RFC; dual military-civilian pattern.'
)
insert_vendor('SUMINISTROS_MEDICOS_SEMAR_SEDENA_DA', 11640, 'SUMINISTROS MEDICOS DEL CENTRO, S.A. DE C.V.', None, 'primary', 'medium',
  '1.13B MXN | 1239c | No RFC | SEMAR 410M @75%DA (400c) | SEDENA 200M | HGM 170M @74%DA | rs=0.182')
c124 = insert_contracts('SUMINISTROS_MEDICOS_SEMAR_SEDENA_DA', 11640)
print(f'Case 124 (Suministros Medicos Centro): {c124} contracts')

# CASE 125: AIRBUS SLC — Guardia Nacional TETRA radio DA monopoly
insert_case(
  'AIRBUS_SLC_GUARDIA_NACIONAL_TETRA_DA',
  'Airbus SLC SA de CV — Guardia Nacional 2.04B TETRA Radio System 100%DA Technology Monopoly',
  'monopoly',
  2020, 2025, 2040000000, 'medium',
  None,
  'ASF Cuenta Publica Guardia Nacional 2020-2025 (radio communications)',
  'SFP oversight of Guardia Nacional technology procurement',
  'Airbus SLC SA de CV (no RFC in COMPRANET) — Airbus Group\'s radio communications subsidiary — received 2.04B MXN across 227 contracts at 93.8% direct award rate. Guardia Nacional concentration: 1.22B at 100%DA across 6 contracts (2020-2025). Key contracts: "SERVICIO INTEGRAL DE RADIOCOMUNICACION CON TECNOLOGIA TETRA" 270M DA 2023 and "DAR CONTINUIDAD A LOS SERVICIOS DE RADIOCOMUNICACION" 260M DA 2024. TETRA (Terrestrial Trunked Radio) is a proprietary European digital radio standard for which Airbus holds dominant market position in Mexico. The DA justification is likely LAASSP Art. 41 III (unique technology), which is legally valid for genuine sole-source technology. However, the 1.22B+ in TETRA services to the newly created Guardia Nacional — at 100%DA — raises questions about competitive alternatives (Motorola ASTRO, Kenwood, etc.) that were not evaluated. Preventive note: this pattern may be legitimate technology lock-in rather than corruption. Risk_score=0.197. CONFIDENCE MEDIUM: TETRA technology may justify sole-source; however scale ($1.22B GN at 100%DA) and ongoing renewal DAs warrant scrutiny.'
)
insert_vendor('AIRBUS_SLC_GUARDIA_NACIONAL_TETRA_DA', 43963, 'AIRBUS SLC SA DE CV', None, 'primary', 'medium',
  '2.04B MXN | 227c | No RFC | GN 1.22B @100%DA (6c) | TETRA radio 270M DA 2023 + 260M DA 2024 | rs=0.197 | Technology lock-in')
c125 = insert_contracts('AIRBUS_SLC_GUARDIA_NACIONAL_TETRA_DA', 43963)
print(f'Case 125 (Airbus SLC): {c125} contracts')

# CASE 126: WALA SERVICIOS MEXICO — IMSS 92%DA + CENISIDA 100%DA (2024-2025)
insert_case(
  'WALA_SERVICIOS_IMSS_DA_2024',
  'Wala Servicios Mexico SA de CV — IMSS 92%DA + Guardia Nacional Backpacks + CENISIDA 100%DA (2024-2025)',
  'procurement_fraud',
  2024, 2025, 1020000000, 'medium',
  None,
  'SFP oversight of IMSS consolidated pharmaceutical procurement 2025',
  'IMSS internal audit 2024-2025',
  'Wala Servicios Mexico SA de CV (RFC: CSB121108TR6, incorporated Nov 2012) received 1.02B MXN across 58 contracts at 77.6% direct award rate (2024-2025). Three distinct procurement patterns: (1) IMSS 480M at 92%DA (13 contracts, 2024-2025) for pharmaceutical consolidated purchases; (2) Guardia Nacional 240M via Licitacion Publica for "BOLSAS DE VIAJE Y MOCHILAS JUMBO" (travel bags and large backpacks) — a non-pharmaceutical contract to a company otherwise focused on medical supplies; (3) CENISIDA (National Center for HIV/STI Prevention) 170M at 100%DA (1 contract, 2025). The combination of IMSS pharmaceutical DA, Guardia Nacional equipment supplies, and CENISIDA HIV prevention contracts in a single company within 12 months (2024-2025) suggests rapid institutional capture across unrelated sectors. The Guardia Nacional backpack contract (240M LP) is particularly anomalous for a medical/pharmaceutical distributor. RFC verified: founded November 2012. Risk_score=0.397. CONFIDENCE MEDIUM: Three distinct institution types in 2024-2025; CENISIDA 170M @100%DA confirmed; IMSS 92%DA pattern; cross-sector anomaly.'
)
insert_vendor('WALA_SERVICIOS_IMSS_DA_2024', 305455, 'WALA SERVICIOS MEXICO SA DE CV', 'CSB121108TR6', 'primary', 'medium',
  '1.02B MXN | 58c | RFC:CSB121108TR6 (Nov 2012) | IMSS 480M @92%DA | GN 240M LP "backpacks" | CENISIDA 170M @100%DA | cross-sector 2024-2025 | rs=0.397')
c126 = insert_contracts('WALA_SERVICIOS_IMSS_DA_2024', 305455)
print(f'Case 126 (Wala Servicios): {c126} contracts')

conn.commit()
total_cases = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
print(f'\n=== GROUND TRUTH TOTALS ===')
print(f'Cases:     {total_cases}')
print(f'Vendors:   {total_vendors}')
print(f'Contracts: {total_contracts}')
conn.close()
