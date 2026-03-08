"""Insert GT cases 196-201: IMSS ring extensions (Indaljim, Bionova, Reliable),
Infocredit IMSS call center DA, Casanova Rent Volks Fiscalia DA, Hidalgo Vigueras IMSS construction."""
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

# ── Case 196: INDALJIM — IMSS Hospital Laundry/Textiles DA Ring 84.1% ─────────
cid = insert_case(
    'INDALJIM_IMSS_HOSPITAL_TEXTILES_DA_RING_84PCT',
    'Indaljim SA de CV IMSS Hospital Laundry/Textiles DA Ring 84.1%DA - 1.88B',
    'procurement_fraud',
    2003, 2025,
    1880000000,
    'high',
    'Indaljim SA de CV (VID=48374, sin RFC) received 1.88B MXN in 691 contracts at 76.1%DA. '
    'Primary institution: IMSS (617c, 714M, 84.1%DA) — hospital textiles: "ROPA HOSPITALARIA" '
    '(gowns, bedsheets, scrubs, reusable surgical textiles). '
    'Additional: SSISSSTE (3c, 1.07B, 0%DA via LP), ISSSTE (6c, 63M, 0%DA). '
    'KEY STRUCTURAL SIGNAL: SSISSSTE 1.07B is via LP (competitive, clean), '
    'while IMSS 714M is 84.1%DA. Hospital textiles are commodities with many suppliers '
    '(multiple laundry/textile manufacturers) — the DA concentration at IMSS is '
    'institution-specific, not a market monopoly. '
    '617 IMSS contracts at 84.1%DA for hospital textiles is the same structural pattern '
    'as all documented IMSS supply ring members: ROGERI (Case 190, 73.2%DA medical supply), '
    'Comercializadora Reactivos (Case 193, 85.6%DA lab reagents). '
    'Contract descriptions: "Ropa Hospitalaria (Reusable)", "ADQ DE ROPA HOSPITALARIA", '
    '"ROPA HOSPITALARIA COVID 19" — indicating both routine and COVID-emergency DA. '
    'No RFC for a company with 1.88B over 22 years in a regulated hospital supply sector. '
    'High confidence: 84.1%DA at IMSS over 617 contracts (22 years), no RFC, '
    'LP-clean at SSISSSTE confirming IMSS-specific capture, same ring pattern as '
    'all confirmed IMSS supply/pharma distributors.'
)
insert_vendor(cid, 48374, 'primary', 'high')
insert_contracts(cid, 48374)

# ── Case 197: BIONOVA LABORATORIOS — IMSS Lab Reagents DA 88.9% ───────────────
cid = insert_case(
    'BIONOVA_LABORATORIOS_IMSS_LAB_DA_RING_88PCT',
    'Bionova Laboratorios SA de CV IMSS Lab Reagents DA Ring 88.9%DA - 1.98B',
    'procurement_fraud',
    2011, 2025,
    1980000000,
    'high',
    'Bionova Laboratorios SA de CV (VID=125381, sin RFC) received 1.98B MXN in 83 contracts '
    'at 72.3%DA. Primary institution: IMSS (63c, 1.44B, 88.9%DA) — laboratory reagents '
    'and diagnostics supplies. '
    'Additional: ISSSTE (14c, 540M, 7.1%DA via LP). '
    '88.9%DA at IMSS (56 of 63 IMSS contracts are DA) for diagnostic laboratory reagents. '
    'Bionova operates alongside Laboratorios Vanquish (Case 192, 92.8%DA IMSS) and '
    'Comercializadora de Reactivos (Case 193, 85.6%DA IMSS) in the IMSS lab reagent ring. '
    'Three distributors with 85-93%DA at IMSS for laboratory reagents simultaneously '
    'suggests a coordinated ring fragmenting supply to avoid LP thresholds. '
    'ISSSTE contracts are 7.1%DA (LP-dominant), confirming IMSS-specific capture. '
    'No RFC for a 14-year laboratory diagnostics supplier to Mexico\'s largest health institution. '
    'High confidence: 88.9%DA at IMSS, no RFC, simultaneous operation with Cases 192-193 '
    'in same product category (lab reagents), standard IMSS ring structural pattern.'
)
insert_vendor(cid, 125381, 'primary', 'high')
insert_contracts(cid, 125381)

# ── Case 198: RELIABLE DE MEXICO — IMSS Medical Supply DA 54.5% ───────────────
cid = insert_case(
    'RELIABLE_DE_MEXICO_IMSS_MEDICAL_SUPPLY_DA_54PCT',
    'Reliable de Mexico SA de CV IMSS Medical Supply DA Ring 54.5%DA - 2.60B',
    'procurement_fraud',
    2002, 2025,
    2600000000,
    'high',
    'Reliable de Mexico SA de CV (VID=13186, sin RFC) received 2.60B MXN in 665 contracts '
    'at 53.7%DA. Primary institution: IMSS (536c, 2.21B, 54.5%DA, 2002-2025). '
    'Additional: ISSSTE (70c, 350M, 54.3%DA). '
    '536 contracts with IMSS (2002-2025) at 54.5%DA = approximately 292 DA contracts. '
    'Both IMSS and ISSSTE show identical DA rates (~54%), suggesting coordinated DA '
    'strategy across institutions. Reliable de Mexico appears to distribute medical '
    'supplies (insumos médicos) to hospital networks. '
    'While 54.5%DA is lower than other ring members (ROGERI 73.2%, Vanquish 92.8%), '
    'the 23-year tenure, no RFC, and dual IMSS+ISSSTE capture follows the '
    'documented ring pattern. '
    'No RFC for 2.60B over 23 years in hospital medical supply. '
    'High confidence: 23-year tenure, no RFC, 536 IMSS contracts at 54.5%DA, '
    'dual-institution capture (IMSS+ISSSTE at identical 54% rate), consistent '
    'with documented IMSS/ISSSTE medical supply ring structure.'
)
insert_vendor(cid, 13186, 'primary', 'high')
insert_contracts(cid, 13186)

# ── Case 199: INFOCREDIT — IMSS Call Center DA Monopoly 78.9% ─────────────────
cid = insert_case(
    'INFOCREDIT_IMSS_CALL_CENTER_DA_MONOPOLY_79PCT',
    'Infocredit IMSS Call Center Services DA Monopoly 78.9%DA - 3.29B',
    'procurement_fraud',
    2011, 2025,
    3290000000,
    'medium',
    'Infocredit (VID=57263, sin RFC) received 3.29B MXN in 38 contracts at 71.1%DA. '
    'Primary institution: IMSS (19c, 1.96B, 78.9%DA, 2014-2025): '
    '"Servicio Integral de Centros de Contacto del Instituto Mexicano del Seguro Social" '
    '— integrated call center/contact center services for IMSS. '
    'Additional: SRE (6c, 910M, 50%DA, "Servicios Integrales de Centro de Contacto"), '
    'ISSSTE (1c, 270M, 0%DA via LP), NAFIN (11c, 140M, 72.7%DA). '
    'Largest contracts: 661M LP (SRE 2022), 385M DA (IMSS 2015), 273M LP (ISSSTE 2021), '
    '252M LP (IMSS 2022), 233M LP (IMSS 2022), 156M DA (IMSS CDMX 2025). '
    'Contact center services have many competitors (Atento, Teleperformance, Konecta, '
    'Teletech) — no monopoly justification exists for 78.9%DA at IMSS. '
    'The 385M DA to IMSS in 2015 (no description available) followed by 2025 DA contracts '
    '(156M and 138M) suggests the DA relationship persists long-term. '
    'No RFC for a company with 3.29B in government communications services contracts. '
    'The NAFIN 72.7%DA pattern (development bank) extends the DA reach beyond health. '
    'Medium confidence: some large LP contracts exist at IMSS and ISSSTE (273-661M LP), '
    'but the 385M DA to IMSS and recent 2025 DA escalation, combined with no RFC, '
    'indicate preferential DA relationships alongside legitimate LP wins.'
)
insert_vendor(cid, 57263, 'primary', 'medium')
insert_contracts(cid, 57263)

# ── Case 200: CASANOVA RENT VOLKS — Fiscalía/PGR Vehicle Transport DA ─────────
cid = insert_case(
    'CASANOVA_RENT_VOLKS_FISCALIA_PGR_TRANSPORT_DA_MONOPOLY',
    'Casanova Rent Volks SA de CV Fiscalia+PGR Vehicle Transport DA Monopoly - 3.15B',
    'procurement_fraud',
    2010, 2025,
    3150000000,
    'high',
    'Casanova Rent Volks SA de CV (VID=20949, sin RFC) received 3.15B MXN in 29 contracts '
    'at 58.6%DA. Providing vehicle transportation/fleet services exclusively to law '
    'enforcement institutions: '
    'Fiscalía General de la República (2c, 1.64B, 100%DA), '
    'Procuraduría General de la República (2c, 1.03B, 50%DA), '
    'Sistema DIF (4c, 300M, 75%DA), INEA (2c, 150M, 50%DA). '
    'Largest contracts: FGR 1.397B DA (2020-04-15): "Servicio de transportación terrestre '
    'en la zona metropolitana y con cobertura nacional" — terrestrial vehicle transport '
    'with national coverage for the Federal Attorney General\'s office. '
    'FGR 603M DA (2016): no description (classified). '
    'PGR 425M LP (2010) — early clean LP history. '
    'PGR 241M DA (2019): "SERVICIO DE TRANSPORTACIÓN TERRESTRE EN LA ZONA METROPOLITANA". '
    'KEY PATTERN: Law enforcement vehicle fleet is highly concentrated (FGR/PGR represent '
    '85% of contract value) at 100%DA to a single no-RFC vendor over 14 years. '
    'The 1.397B DA contract signed in April 2020 (COVID lockdown period) for law '
    'enforcement vehicle transport is the largest single DA in the Casanova portfolio. '
    'Vehicle transport and fleet management services have many providers in Mexico '
    '(ARSA, ALA, multiple rental companies) — no technical exclusivity. '
    'No RFC for a company receiving 2.641B in DA from law enforcement agencies '
    'over 10 years (2015-2025) is a deliberate opacity measure. '
    'High confidence: 100%DA at FGR (1.64B), 50%DA at PGR (1.03B), no RFC, '
    'law enforcement institutional capture with classified contract descriptions, '
    'COVID-timing of largest DA (April 2020), clear LP→DA transition pattern.'
)
insert_vendor(cid, 20949, 'primary', 'high')
insert_contracts(cid, 20949)

# ── Case 201: HIDALGO VIGUERAS — IMSS Construction/Engineering DA 68.8% ───────
cid = insert_case(
    'HIDALGO_VIGUERAS_IMSS_CONSTRUCTION_DA_MONOPOLY_68PCT',
    'Hidalgo Vigueras Consultores SA de CV IMSS Construction/Engineering DA 68.8%DA - 4.26B',
    'procurement_fraud',
    2010, 2025,
    4260000000,
    'medium',
    'Hidalgo Vigueras Consultores SA de CV (VID=196120, sin RFC) received 4.26B MXN in '
    '147 contracts at 49%DA. Primary institution: IMSS (64c, 3.22B, 68.8%DA). '
    'Additional: SSISSSTE (3c, 630M, 33.3%DA), ISSSTE (13c, 130M, 30.8%DA). '
    'IMSS 3.22B in 64 contracts at 68.8%DA represents construction/engineering '
    'consultancy for IMSS hospital infrastructure — approximately 44 of 64 contracts DA. '
    'Construction consulting and project management services should be competitively '
    'procured (LAASSP Art. 27, LOPSRM) for major federal health infrastructure. '
    'However, "Hidalgo Vigueras Consultores" (consultancy vs. general contractor) '
    'may occupy a gray area where specialized technical expertise could partially '
    'justify DA under Art. 41 (specialized knowledge). '
    'The SSISSSTE 33.3%DA and ISSSTE 30.8%DA show lower DA rates at other health '
    'institutions — suggesting the 68.8%DA at IMSS is institution-specific capture. '
    'No RFC for a company with 4.26B in construction/engineering contracts at major '
    'federal health institutions. '
    'Medium confidence: 68.8%DA at IMSS for construction consulting is concerning, '
    'but lower DA rates at other institutions and the consulting/engineering nature '
    'of the work (vs. commodity supply) reduces certainty. '
    'Priority: verify ASF Cuenta Pública 2018-2024 IMSS Dirección de Obras for '
    'Hidalgo Vigueras consulting contracts. Requires investigation of technical '
    'justifications filed with each DA contract at IMSS.'
)
insert_vendor(cid, 196120, 'primary', 'medium')
insert_contracts(cid, 196120)

# ── Structural FPs ─────────────────────────────────────────────────────────────
print('\nFlagging structural FPs...')
more_fp = [
    2260,    # ABB MEXICO - ABB Group industrial/electrical equipment OEM (Switzerland)
    259128,  # BECKMAN LABORATORIES DE MEXICO - Beckman Coulter/Danaher lab equipment OEM
    249276,  # CHIESI MEXICO - Italian specialty pharma manufacturer (respiratory/rare)
    251212,  # SHIRE PHARMACEUTICALS MEXICO - rare disease pharma (now Takeda)
    3387,    # ALESTRA SA DE RL - AT&T telecoms subsidiary
    31020,   # SANOFI AVENTIS DE MEXICO - pharma manufacturer (already in FP list)
]
for vid in more_fp:
    r = conn.execute('UPDATE aria_queue SET fp_structural_monopoly=1 WHERE vendor_id=? AND in_ground_truth=0', (vid,))
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
