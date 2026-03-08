"""Insert GT cases 208-213: MEDAM IMSS biomedical waste ring, Vantage INSABI pharma logistics capture,
   Forefront Medica multi-institution neurosurgery DA, Codequim CENAPRECE insecticide monopoly,
   KBN Medical ISSSTE orthopedics DA, Solomed SSISSSTE pharma emerging capture."""
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

# ── Case 208: MEDAM — IMSS Biomedical Waste Ring 62.3%DA ──────────────────
cid = insert_case(
    'MEDAM_IMSS_BIOMEDICAL_WASTE_DA_RING_62PCT',
    'Medam S de RL de CV IMSS Biomedical Waste (RPBI) DA Ring 62.3%DA - 1.67B',
    'procurement_fraud',
    2010, 2025,
    1000000000,
    'high',
    'Medam S de RL de CV (VID=45114, sin RFC) received 1.67B MXN in 765 contracts '
    'at 57.1%DA across 15 years. '
    'Primary institution: IMSS (308c, 881M, 62.3%DA, 2010-2025) — biohazardous waste '
    'management (RPBI): "Servicio de Recoleccion, Transporte, Almacenamiento, '
    'Tratamiento y Disposicion Final de Residuos Peligrosos Biologico Infecciosos." '
    'Additional: SSISSSTE (17c, 521M, 76.5%DA, 2023-2025 — new entity, very high DA), '
    'ISSSTE (265c, 120M, 48.7%DA, 2010-2025), BIRMEX (12c, 26M, 33.3%DA). '
    'KEY PATTERN: 308 IMSS contracts at 62.3%DA for biomedical waste management. '
    'RPBI disposal services have multiple certified providers in Mexico (Stericycle, '
    'GHPE, Tecmed, Biotecnologia e Innovacion Ambiental, and many regional companies '
    'with SEMARNAT RPBI licenses). No technical exclusivity justifies 62.3%DA at IMSS. '
    'The SSISSSTE entry (2023-2025) at 76.5%DA suggests DA capture extending to the '
    'new IMSS subsidiary entity. Meanwhile ISSSTE is 48.7%DA — lower, suggesting the '
    'DA capture is IMSS-system-specific rather than market-wide. '
    'No RFC for a company with 1.67B over 15 years in a regulated environmental services sector. '
    '765 total contracts makes this one of the most prolific ring members by contract count. '
    'High confidence: 62.3%DA at IMSS (308c, 15yr), 76.5%DA at SSISSSTE (new subsidiary), '
    'ISSSTE at lower 48.7%DA confirming institution-specific capture, no RFC, '
    'commodity service with multiple certified providers, same structural pattern as '
    'all IMSS supply ring members (Cases 190-201).'
)
insert_vendor(cid, 45114, 'primary', 'high')
insert_contracts(cid, 45114)

# ── Case 209: VANTAGE — INSABI Pharma Logistics Capture 95.7%DA ───────────
cid = insert_case(
    'VANTAGE_INSABI_PHARMA_LOGISTICS_CAPTURE_96PCT',
    'Vantage Servicios Integrales de Salud INSABI Pharma Logistics DA 95.7%DA - 2.35B',
    'procurement_fraud',
    2016, 2025,
    1300000000,
    'medium',
    'Vantage Servicios Integrales de Salud SA de CV (VID=173854, sin RFC) received 2.35B MXN '
    'in 241 contracts at 47.3%DA. '
    'Primary institution: INSABI (23c, 861M, 95.7%DA, 2019-2022) — pharmaceutical logistics: '
    '"Servicio Integral de Logistica de Almacenamiento y Distribucion de Bienes Terapeuticos '
    '(Medicamentos)". '
    'Additional: IMSS (32c, 769M, 65.6%DA, 2016-2025), Morelos state health (1c, 567M, 0%DA LP), '
    'ISSSTE (21c, 85M, 66.7%DA, 2018-2023), SSISSSTE (17c, 24M, 35.3%DA, 2025). '
    'KEY PATTERN: 95.7%DA at INSABI (22 of 23 contracts DA) during 2019-2022 INSABI era. '
    'Pharmaceutical logistics and warehousing services have multiple providers in Mexico '
    '(DHL Supply Chain, PBF Logistica, Miebach, specialized pharma 3PLs). '
    'The 567M LP contract at Morelos state health (0%DA) demonstrates the vendor CAN win '
    'competitively — making the 95.7%DA at INSABI suspicious. '
    'IMSS at 65.6%DA (32c) and ISSSTE at 66.7%DA (21c) extend the DA capture across '
    'federal health institutions. '
    'No RFC for a company with 2.35B in health sector logistics over 9 years. '
    'Medium confidence: 95.7%DA at INSABI is very high, but INSABI was a short-lived '
    'institution (2019-2023) with widespread DA during COVID-era emergency procurement. '
    'The LP win at Morelos (567M) and lower DA at SSISSSTE 2025 (35.3%) suggest '
    'the DA pattern may partially reflect INSABI institutional dysfunction rather than '
    'pure vendor capture. Still suspicious given 65.6%DA at IMSS over 32 contracts.'
)
insert_vendor(cid, 173854, 'primary', 'medium')
insert_contracts(cid, 173854)

# ── Case 210: FOREFRONT MEDICA — Multi-Institution Neurosurgery DA 80.1% ──
cid = insert_case(
    'FOREFRONT_MEDICA_MULTI_INSTITUTION_NEUROSURGERY_DA_80PCT',
    'Forefront Medica Mexico SA de CV Multi-Institution Neurosurgery DA 80.1%DA - 1.08B',
    'procurement_fraud',
    2009, 2025,
    900000000,
    'high',
    'Forefront Medica Mexico SA de CV (VID=41094, sin RFC) received 1.08B MXN in 352 contracts '
    'at 79.8%DA across 16 years. '
    'Institution breakdown: '
    'SEDENA (2c, 571M, 50%DA, 2019-2021), '
    'Secretaria de Marina (109c, 187M, 89.9%DA, 2010-2020), '
    'Hospital Juarez (16c, 82M, 68.8%DA, 2012-2025), '
    'ISSSTE (155c, 76M, 83.2%DA, 2010-2025), '
    'Inst. Nac. Neurologia (23c, 73M, 60.9%DA, 2010-2024). '
    'Contract descriptions: "Servicio Integral de Neurocirugia", "Arrendamiento de Equipo '
    'Medico para Procedimientos del Servicio de Neurocirugia", "Materiales, Accesorios y '
    'Suministros Medicos." '
    'KEY PATTERN: 79.8%DA overall across FIVE health/defense institutions. '
    'Marina 89.9%DA (98 of 109 DA) and ISSSTE 83.2%DA (129 of 155 DA) are the strongest '
    'signals. Neurosurgery supplies and equipment leasing have multiple suppliers '
    '(Medtronic, Stryker Neurovascular, B. Braun, Integra LifeSciences all have Mexican '
    'distributors). The "Servicio Integral" model (equipment + consumables bundled) '
    'is a common DA justification vehicle but does not constitute true sole-source. '
    'The breadth of DA capture (5 institutions, 352 contracts) distinguishes this from '
    'a simple institutional relationship — this vendor has systematically secured DA '
    'at every institution it serves. '
    'No RFC for a company with 1.08B in medical device/supply contracts over 16 years. '
    'High confidence: 79.8%DA across 352 contracts at 5 institutions (none below 50%DA), '
    'no RFC, neurosurgery supplies with multiple market suppliers, 16-year tenure, '
    'systematic multi-institution DA capture pattern unique among investigated vendors.'
)
insert_vendor(cid, 41094, 'primary', 'high')
insert_contracts(cid, 41094)

# ── Case 211: CODEQUIM — CENAPRECE Insecticide Monopoly 100%DA ────────────
cid = insert_case(
    'CODEQUIM_CENAPRECE_INSECTICIDE_DA_MONOPOLY_100PCT',
    'Codequim SA de CV CENAPRECE Public Health Insecticide DA Monopoly 100%DA - 1.07B',
    'procurement_fraud',
    2010, 2025,
    800000000,
    'high',
    'Codequim SA de CV (VID=84409, sin RFC) received 1.07B MXN in 56 contracts at 73.2%DA. '
    'Primary institution: CENAPRECE (15c, 526M, 100%DA, 2012-2022) — insecticides for '
    'vector control: "Productos Insecticidas" for dengue/Zika/malaria programs. '
    'Additional: Secretaria de Salud (6c, 421M, 66.7%DA, 2023-2024 — CENAPRECE successor '
    'after 2022 restructuring), CENAPRECE new entity (1c, 39M, 100%DA, 2025), '
    'SSPC (6c, 27M, 100%DA, 2021-2022), IMSS (10c, 21M, 80%DA, 2010-2021). '
    'KEY PATTERN: 100%DA at CENAPRECE across 15 contracts over 10 years (2012-2022). '
    'After CENAPRECE was restructured under Secretaria de Salud in 2023, the DA relationship '
    'continued (66.7%DA at SSA, 100%DA at new CENAPRECE entity in 2025). '
    'The insecticide market for public health vector control has multiple global manufacturers '
    'and distributors: Bayer CropScience, BASF, Syngenta, Sumitomo Chemical, and domestic '
    'companies like Agricola El Sol, Promotora Tecnica Industrial. '
    'WHO-prequalified insecticides are available from 10+ manufacturers globally. '
    'The claim that a single distributor needs 100%DA for 10 years of insecticide supply '
    'is unjustifiable. SSPC contracts (100%DA) suggest the DA capture extends beyond health. '
    'No RFC for a company with 1.07B in public health insecticide contracts. '
    'High confidence: 100%DA at CENAPRECE for 10 years, DA continuing post-restructuring, '
    'multi-agency DA (CENAPRECE + SSA + SSPC + IMSS all high DA), no RFC, '
    'commodity market with WHO-prequalified alternatives, no sole-source justification.'
)
insert_vendor(cid, 84409, 'primary', 'high')
insert_contracts(cid, 84409)

# ── Case 212: KBN MEDICAL — ISSSTE Orthopedic Implants DA 50% ─────────────
cid = insert_case(
    'KBN_MEDICAL_ISSSTE_ORTHOPEDIC_IMPLANTS_DA_50PCT',
    'KBN Medical SA de CV ISSSTE Orthopedic Implants DA - 1.26B',
    'procurement_fraud',
    2003, 2025,
    600000000,
    'medium',
    'KBN Medical SA de CV (VID=13414, sin RFC) received 1.26B MXN in 13 contracts '
    'at 53.8%DA across 22 years. '
    'Primary institution: ISSSTE (6c, 1.238B, 50%DA, 2003-2025) — orthopedic implant services: '
    '"Servicio Integral de Osteosintesis y Endoprotesis Ortopedicas en las Unidades Medicas '
    'Hospitalarias del ISSSTE." '
    'Additional: CRAE Chiapas (4c, 19M, 75%DA, 2020-2022), SSISSSTE (1c, 1M, 100%DA, 2023). '
    'Largest contracts: ISSSTE 537M LP (2020), ISSSTE 339M DA (2022), ISSSTE 180M LP (2025), '
    'ISSSTE 162M DA (2024), ISSSTE 19M DA (2024). '
    'KEY PATTERN: Only 13 contracts but 1.26B concentrated at ISSSTE. '
    'The "Servicio Integral de Osteosintesis y Endoprotesis" model bundles implant supply '
    'with surgical support services, creating DA justification through service integration. '
    'Orthopedic implant market has major suppliers: Smith & Nephew, Stryker, DePuy Synthes '
    '(J&J), Zimmer Biomet, Medartis — all with Mexican distribution networks. '
    'The 50%DA at ISSSTE (3 DA, 3 LP) shows mixed procurement. The 339M DA in 2022 '
    'followed by 162M DA in 2024 suggests DA tendency increasing. '
    'No RFC for a company with 1.26B in orthopedic implant contracts over 22 years. '
    'Medium confidence: 50%DA at ISSSTE is moderate (not the 80%+ seen in clear ring cases), '
    'and the vendor does win major LP contracts (537M in 2020, 180M in 2025). '
    'However, no RFC over 22 years, plus the "Servicio Integral" bundling pattern used to '
    'justify DA for commodity orthopedic implants, warrants GT inclusion. '
    'The CRAE Chiapas 75%DA (4c) and SSISSSTE 100%DA (1c) extend the pattern beyond ISSSTE.'
)
insert_vendor(cid, 13414, 'primary', 'medium')
insert_contracts(cid, 13414)

# ── Case 213: SOLOMED — SSISSSTE Emerging Pharma Capture 63.6%DA ──────────
cid = insert_case(
    'SOLOMED_SSISSSTE_PHARMA_EMERGING_CAPTURE_64PCT',
    'Solomed SA de CV SSISSSTE/IMSS Consolidated Pharma Supply Emerging Capture - 2.33B',
    'procurement_fraud',
    2009, 2025,
    1200000000,
    'medium',
    'Solomed SA de CV (VID=40859, sin RFC) received 2.33B MXN in 111 contracts at 54.1%DA. '
    'Primary institution: IMSS (11c, 1.742B, 36.4%DA, 2009-2025), '
    'SSISSSTE (33c, 473M, 63.6%DA, 2025 only — new entity concentrated DA). '
    'Additional: ISSSTE (6c, 66M, 50%DA, 2010-2025), '
    'Hospital Gea Gonzalez (4c, 19M, 50%DA, 2025), '
    'Hospital General Mexico (4c, 11M, 50%DA, 2025). '
    'Contract descriptions: "Compra Consolidada de Medicamentos, Bienes Terapeuticos, '
    'Material de Curacion" — consolidated pharmaceutical purchases for the health sector. '
    'KEY PATTERN: The SSISSSTE entry in 2025 is concerning: 33 contracts at 63.6%DA '
    '(21 of 33 DA) for consolidated pharma supply at IMSS new subsidiary. '
    'Meanwhile IMSS proper shows only 36.4%DA (4 of 11 DA) — relatively clean. '
    'This suggests an emerging capture at the new SSISSSTE entity (created 2023) '
    'where procurement oversight may be less mature. '
    'Consolidated pharmaceutical procurement has hundreds of potential distributors. '
    'No RFC for a company with 2.33B in pharmaceutical supply over 16 years. '
    'Medium confidence: IMSS DA rate is moderate (36.4%), but the sudden 2025 SSISSSTE '
    'concentration (33c at 63.6%DA) in a single year, combined with 50%DA at three '
    'additional hospitals in 2025, suggests an emerging capture pattern. '
    'The IMSS historical rate is low enough that this could reflect SSISSSTE '
    'institutional dysfunction rather than vendor corruption. Monitor 2026 data.'
)
insert_vendor(cid, 40859, 'primary', 'medium')
insert_contracts(cid, 40859)

# ── Structural FPs ─────────────────────────────────────────────────────────
print('\nFlagging structural FPs...')
more_fp = [
    238348,  # BIOGEN MEXICO - patented MS drugs manufacturer (Tecfidera/Dimetilfumarato, Avonex), DA justified for patented pharma
    1381,    # CARL ZEISS DE MEXICO - OEM surgical microscopes/optics manufacturer, DA justified for brand-exclusive maintenance
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
