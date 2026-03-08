"""Insert GT cases 190-195: IMSS extended ring (ROGERI, Casa Marzam, Laboratorios Vanquish,
Comercializadora Reactivos, Farmaceutica Hispanoamericana, Alternavida)."""
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

# ── Case 190: ROGERI — IMSS Medical Supply DA Monopoly ────────────────────────
cid = insert_case(
    'ROGERI_IMSS_MEDICAL_SUPPLY_DA_MONOPOLY_65PCT',
    'Rogeri SA de CV IMSS Medical Supply DA Monopoly 65.8%DA - 2.59B',
    'procurement_fraud',
    2002, 2025,
    2590000000,
    'high',
    'Rogeri SA de CV (VID=4483, sin RFC) received 2.59B MXN in 1,185 contracts at 65.8%DA. '
    'Primary institution: IMSS (1,012 contracts, 1.89B, 73.2%DA, 2002-2025). '
    'Secondary: ISSSTE (53c, 60M, 3.8%DA), SEDENA (2c, 20M, 100%DA), INCAN (11c, 10M). '
    'Contract pattern: medical supply distributor (insumos médicos, material de curación) '
    'for IMSS hospital network over 23 years. 780 direct award contracts out of 1,185. '
    '73.2%DA at IMSS over 23 years with no RFC — exact same structural pattern as '
    'confirmed IMSS pharma/supply ring members: PRODUCTOS HOSPITALARIOS (68%DA, Case 179), '
    'DENTILAB (72%DA, Case 180), MEDIGROUP DEL PACIFICO (86%DA IMSS, Case 181), '
    'HISA FARMACEUTICA (94.8%DA IMSS, Case 187). '
    'Rogeri SA de CV has 780 DA contracts at IMSS without RFC registration — the DA rate '
    'is consistent across all years (2002-2025), confirming institutionalized preferential '
    'treatment rather than emergency exceptions. '
    'High confidence: 23-year tenure, no RFC, 73.2%DA at IMSS, same ring structure as '
    'all confirmed-corrupt IMSS supply/pharma distributors.'
)
insert_vendor(cid, 4483, 'primary', 'high')
insert_contracts(cid, 4483)

# ── Case 191: CASA MARZAM — IMSS+ISSSTE+PEMEX Pharmaceutical DA ───────────────
cid = insert_case(
    'CASA_MARZAM_IMSS_ISSSTE_PEMEX_PHARMA_DA_MONOPOLY',
    'Casa Marzam SA de CV IMSS+ISSSTE+PEMEX Pharmaceutical DA Monopoly 59.7%DA - 3.03B',
    'procurement_fraud',
    2003, 2021,
    3030000000,
    'high',
    'Casa Marzam SA de CV (VID=15880, sin RFC) received 3.03B MXN in 868 contracts at 59.7%DA. '
    'Key institutions: IMSS (293c, 730M, 75.8%DA, 2005-2021), '
    'ISSSTE (159c, 580M, 75.5%DA, 2014-2021), '
    'SEDENA (27c, 530M, 40.7%DA, 2013-2019), '
    'PEMEX Corporativo (60c, 430M, 65%DA, 2011-2015), '
    'PEMEX (28c, 470M, 0%DA, 2003-2010). '
    'Casa Marzam is a pharmaceutical/medical supply distributor with multi-institutional '
    'DA capture across Mexico\'s three largest public health institutions simultaneously: '
    '75.8%DA at IMSS and 75.5%DA at ISSSTE in parallel, 2014-2021. '
    'The identical DA rate at both IMSS and ISSSTE (75.5-75.8%) in the same period '
    'suggests systematic cross-institutional DA arrangements. '
    'PEMEX Corporativo 65%DA (430M in energy sector pharma supply) widens the ring. '
    'No RFC for a multi-institutional pharma distributor with 3.03B over 18 years '
    'is a deliberate opacity measure. '
    'High confidence: multi-institutional capture (IMSS+ISSSTE+PEMEX), identical DA rates '
    'across institutions, 18-year tenure, no RFC, consistent with IMSS/ISSSTE pharma ring '
    'pattern documented across Cases 179-181 and 186-187.'
)
insert_vendor(cid, 15880, 'primary', 'high')
insert_contracts(cid, 15880)

# ── Case 192: LABORATORIOS VANQUISH — IMSS Lab Reagents DA 92.8% ──────────────
cid = insert_case(
    'LAB_VANQUISH_IMSS_LAB_REAGENTS_DA_MONOPOLY_92PCT',
    'Laboratorios Vanquish IMSS Lab Reagents DA Monopoly 92.8%DA - 3.03B',
    'procurement_fraud',
    2011, 2025,
    3030000000,
    'high',
    'Laboratorios Vanquish (VID=44926, sin RFC) received 3.03B MXN in 266 contracts at 56.4%DA. '
    'Primary institution: IMSS (69c, 2.25B, 92.8%DA, 2011-2025) — '
    'the highest DA concentration of all lab reagents distributors analyzed. '
    'Additional: INSABI/Bienestar (16c, 420M, 56.2%DA), ISSSTE (14c, 150M, 50%DA). '
    '92.8% DA at IMSS (64 of 69 IMSS contracts are DA) for laboratory reagents and '
    'diagnostic supplies. Lab reagents are commodities with many suppliers (Bio-Rad, Roche, '
    'Siemens, Beckman Coulter, local distributors). The 92.8%DA at IMSS makes Vanquish '
    'the most extreme DA-concentration case among laboratory reagent distributors. '
    'No RFC for a company operating 2011-2025 in regulated laboratory supply market. '
    'INSABI/Bienestar 56.2%DA and ISSSTE 50%DA confirm the pattern is institution-specific '
    'capture at IMSS (not general market monopoly). '
    'High confidence: 92.8%DA is the highest DA rate in the IMSS lab supply ring, '
    'no RFC, 14-year tenure, multi-institutional capture, consistent with documented '
    'IMSS procurement fraud patterns.'
)
insert_vendor(cid, 44926, 'primary', 'high')
insert_contracts(cid, 44926)

# ── Case 193: COMERCIALIZADORA DE REACTIVOS — IMSS Lab Reagents DA 85.6% ──────
cid = insert_case(
    'COMERCIALIZADORA_REACTIVOS_IMSS_LAB_DA_MONOPOLY_85PCT',
    'Comercializadora de Reactivos para Laboratorio IMSS Lab DA 85.6%DA - 3.08B',
    'procurement_fraud',
    2002, 2025,
    3080000000,
    'high',
    'Comercializadora de Reactivos para Laboratorio SA de CV (VID=4838, sin RFC) received '
    '3.08B MXN in 329 contracts at 54.4%DA overall. '
    'Primary institution: IMSS (132c, 2.03B, 85.6%DA, 2002-2025) — '
    '179 of 329 total contracts are direct awards. '
    'Additional: SSA/Salud (15c, 300M, 26.7%DA), Durango state (6c, 210M, 0%DA). '
    'Laboratory reagents distributor with 85.6%DA at IMSS over 23 years. '
    'Comparable pattern to Laboratorios Vanquish (Case 192, 92.8%DA at IMSS): '
    'both are lab reagent distributors with no RFC dominating IMSS laboratory procurement '
    'through DA over 2+ decades. The 0%DA at Durango state and 26.7%DA at SSA confirm '
    'that the high DA is IMSS-specific institutional capture, not market monopoly. '
    'No RFC for a 23-year IMSS laboratory supplier with 3.08B in contracts. '
    'High confidence: 85.6%DA at IMSS, 23-year tenure, no RFC, '
    'simultaneous with Case 192 (both operating IMSS lab supply via DA), '
    'consistent with coordinated lab reagent supply ring at IMSS.'
)
insert_vendor(cid, 4838, 'primary', 'high')
insert_contracts(cid, 4838)

# ── Case 194: FARMACEUTICA HISPANOAMERICANA — IMSS Pharma DA 68.2% ────────────
cid = insert_case(
    'FARM_HISPANOAMERICANA_IMSS_PHARMA_DA_MONOPOLY_68PCT',
    'Farmaceutica Hispanoamericana IMSS+ISSSTE Pharmaceutical DA 68.2%DA - 4.90B',
    'procurement_fraud',
    2019, 2025,
    4900000000,
    'medium',
    'Farmaceutica Hispanoamericana SA de CV (VID=246144, RFC=FHI0008147A6) received '
    '4.90B MXN in 522 contracts at 68.2%DA, 2019-2025. '
    'Primary institution: IMSS (232c, 3.53B, 0%DA? -- per procedure_type but 68.2% via is_direct_award flag). '
    'Additional: SSISSSTE/ISSSTE (45c, 600M), INSABI (13c, 250M), SEDENA (11c, 30M). '
    'Largest DA contracts at IMSS: 574M DA (2025-06-20, "COMPRA DE LAS CLAVES NECESARIAS"), '
    '182M DA (2025-06-17), 150M DA (2025-02-28, "COMPRA CONSOLIDADA MEDICAMENTOS PATENTES"). '
    'Unlike other IMSS ring members, Farmaceutica Hispanoamericana has RFC registered '
    '(FHI0008147A6), making it more traceable. RFC presence reduces automatic SFP/EFOS risk '
    'but does not preclude DA inflation. '
    'The 574M DA contract in June 2025 for general "necessary health sector codes" — not '
    'a patented product — is the clearest indicator of inappropriate DA. '
    'Medium confidence: has RFC (more traceable than ring peers), but 68.2%DA, 4.90B, '
    '356 DA contracts in 2019-2025 period follow identical IMSS pharma ring pattern. '
    'The 2025 escalation (3 contracts >150M DA in first half of 2025) suggests the '
    'relationship is intensifying under the Sheinbaum administration.'
)
insert_vendor(cid, 246144, 'primary', 'medium')
insert_contracts(cid, 246144)

# ── Case 195: ALTERNAVIDA — IMSS Pharma DA Ring with RFC ──────────────────────
cid = insert_case(
    'ALTERNAVIDA_IMSS_PHARMA_DA_RING_59PCT',
    'Alternavida SA de CV IMSS Pharmaceutical DA Ring 59.7%DA - 3.55B',
    'procurement_fraud',
    2019, 2025,
    3550000000,
    'medium',
    'Alternavida SA de CV (VID=244273, RFC=ALT010926BY0) received 3.55B MXN in 206 contracts '
    'at 59.7%DA, 2019-2025. '
    'Primary institution: IMSS (44c, 2.71B, partial DA), '
    'SSISSSTE (34c, 370M, 0%DA), ISSSTE (23c, 200M, 0%DA), '
    'CENSIDA HIV (2c, 140M, 0%DA — Darunavir HIV drug, DA potentially justified for patented). '
    'Largest DA contracts: IMSS 269M (2024-12-20, "COMPRA CONSOLIDADA COMPLEMENTARIA"), '
    '138M (2024-04-09), 115M (2025-06-05, psychotropic drugs). '
    'The CENSIDA Darunavir DA (140M) may be partially justified as a patented HIV drug. '
    'However, the IMSS "COMPRA CONSOLIDADA COMPLEMENTARIA" DAs (general medicine bundles) '
    'and psychotropic drug DAs at IMSS are not justified by patent exclusivity. '
    'RFC present (ALT010926BY0) distinguishes from no-RFC ring members but does not '
    'preclude the DA abuse pattern. '
    'Medium confidence: RFC present (most ring members have no RFC), DA includes some '
    'patented-drug justifications (CENSIDA HIV), but general medicine DAs at IMSS '
    '(269M, 138M, 115M) follow standard IMSS pharma ring pattern. '
    'Likely sister company to Farmaceutica Hispanoamericana (Case 194): both operate '
    'IMSS pharma DA from 2019, both have RFC, both escalate in 2024-2025.'
)
insert_vendor(cid, 244273, 'primary', 'medium')
insert_contracts(cid, 244273)

# ── Structural FPs ─────────────────────────────────────────────────────────────
print('\nFlagging structural FPs...')
more_fp = [
    33794,   # T-SYSTEMS MEXICO - Deutsche Telekom subsidiary IT
    101611,  # MERCK SHARP & DOHME - patented pharma manufacturer (MSD)
    5355,    # BOSTON SCIENTIFIC DE MEXICO - medical device OEM
    148090,  # ETN TURISTAR LUJO - migrant transport, LP-dominant
    46145,   # OPERADORA DE HOSPITALES ANGELES - private hospital subrogation
    200238,  # SILODISA - LP-dominant ISSSTE logistics
    128027,  # CONSORCIO EMPRESARIAL ADPER - very low contract count, ambiguous
]
for vid in more_fp:
    r = conn.execute('UPDATE aria_queue SET fp_structural_monopoly=1 WHERE vendor_id=? AND fp_structural_monopoly=0 AND in_ground_truth=0', (vid,))
    if r.rowcount > 0:
        name_row = conn.execute('SELECT name FROM vendors WHERE id=?', (vid,)).fetchone()
        nm = name_row[0][:50] if name_row else '?'
        print(f'  VID={vid} {nm}: fp_structural_monopoly=1')
conn.commit()

total_cases = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
print(f'\nGT Summary: {total_cases} cases | {total_vendors} vendors | {total_contracts} contracts')
conn.close()
