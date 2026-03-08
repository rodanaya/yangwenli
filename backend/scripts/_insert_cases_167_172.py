"""Insert GT cases 167-172: Vitalmex cartel, GAMS Solutions, AVIOR BIRMEX, Farmaceuticos MAYPO,
Alimentacion Bienestar shells, POYAGO diabetes overpricing. Also add Abastecedora to Case 20."""
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
# Add ABASTECEDORA DE MEDICINAS (VID=291533) to existing Ethomedical case (Case 20)
# ──────────────────────────────────────────────────────────────────────────────
print('\n=== Adding Abastecedora to Ethomedical case ===')
etho_case = conn.execute("SELECT id FROM ground_truth_cases WHERE case_id='ETHOMEDICAL_MEDICINE_OVERPRICING'").fetchone()
if etho_case:
    etho_id = etho_case[0]
    insert_vendor(etho_id, 291533, 'secondary', 'high')
    insert_contracts(etho_id, 291533)
    print(f'  Added VID=291533 (Abastecedora de Medicinas y Materiales) to case {etho_id}')
else:
    print('  WARNING: Ethomedical case not found')


# ──────────────────────────────────────────────────────────────────────────────
# Case 167: VITALMEX COFECE Medical Equipment Cartel
# ──────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'VITALMEX_COFECE_CARTEL_MEDICO',
    'Vitalmex Group COFECE Medical Equipment Cartel ~101B MXN',
    'monopoly',
    2002, 2025,
    50000000000,
    'high',
    'COFECE (Comision Federal de Competencia Economica) formally documented and fined the Vitalmex cartel 626M MXN in 2019 '
    'for market allocation and price-fixing in the supply of medical equipment to IMSS, ISSSTE, and other public health institutions. '
    'The group operates through 7+ interconnected entities: '
    'VITALMEX INTERNACIONAL (VID=4325, 32.06B, 40%DA, rs=0.962), '
    'CENTRUM PROMOTORA INTERNACIONAL (VID=4715, 17.76B, 42%DA, rs=0.946), '
    'HEMOSER (VID=6038, 17.16B, 42%DA, rs=0.990), '
    'SELECCIONES MEDICAS DEL CENTRO (VID=31371, 16.27B, 59%DA, rs=0.790), '
    'SELECCIONES MEDICAS (VID=4427, 14.55B, 16%DA, rs=0.985), '
    'VITALMEX COMERCIAL (VID=35633, 1.85B), GRUPO VITALMEX (VID=28769, 1.81B). '
    'Combined group revenue from government contracts: ~101.5B MXN. '
    'COFECE finding: the cartel coordinated bids across multiple entities to distribute contracts, '
    'presenting apparent competition while allocating market shares. '
    'Fraud estimate (50B) is conservative — reflects the overpriced portion attributable to cartel pricing, '
    'not total legitimate revenue. All entities show high risk scores (0.79-0.99). '
    'None have RFC in COMPRANET (pre-2018 data structures). '
    'Primary products: dialysis equipment, hemodialysis consumables, surgical instruments, hospital beds. '
    'Primary buyers: IMSS (dominant), ISSSTE, SSA, SEDENA. '
    'COFECE resolution IO-007-2014, final resolution 2019.'
)
for vid, role in [(4325, 'primary'), (4715, 'primary'), (6038, 'primary'),
                   (31371, 'primary'), (4427, 'primary'), (35633, 'secondary'), (28769, 'secondary')]:
    insert_vendor(cid, vid, role, 'high')
    insert_contracts(cid, vid)


# ──────────────────────────────────────────────────────────────────────────────
# Case 168: GAMS SOLUTIONS IMSS Pharma Favoritism — 6.28B Single DA
# ──────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'GAMS_SOLUTIONS_IMSS_DA_6280M',
    'GAMS Solutions IMSS 6.28B Direct Award Pharma Favoritism 88%DA - 8.21B',
    'procurement_fraud',
    2015, 2025,
    8210000000,
    'high',
    'GAMS Solutions SA de CV (RFC: GSO151013EH6) received 8.21B MXN in 2,665 contracts at 88%DA from IMSS and INSABI. '
    'CRITICAL: Single DA contract from IMSS in 2021 for 6,283M MXN — code "D1P1619" — is the largest single '
    'pharmaceutical direct award in our dataset. '
    'A 6.28B direct award for what appears to be a pharmaceutical supply contract (no detailed title) '
    'from IMSS bypasses competitive bidding entirely. '
    'Context: GAMS Solutions was incorporated in 2015 (RFC prefix GSO151013) and grew to become a '
    'major IMSS pharmaceutical supplier in <5 years. '
    'IMSS pharma favoritism pattern documented by multiple investigative sources: '
    'certain vendors receive massive single-year DA contracts based on "sole supplier" justifications '
    'that are difficult to verify. '
    'GAMS has rs=0.994 (near-maximum risk score). '
    'Total 2,665 contracts include 88%DA at volumes inconsistent with normal competitive procurement. '
    'Secondary buyer: Instituto de Salud para el Bienestar (INSABI) — 54M+40M DA. '
    'No RFC in COMPRANET for main entity (data structure limitation). '
    'This vendor requires urgent cross-reference with SAT EFOS list and SFP sanction database.'
)
insert_vendor(cid, 235708, 'primary', 'high')
insert_contracts(cid, 235708)


# ──────────────────────────────────────────────────────────────────────────────
# Case 169: AVIOR BIRMEX "Fuerza Mayor" DA — ASF Confirmed
# ──────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'AVIOR_BIRMEX_FUERZA_MAYOR_DA',
    'Almacenaje y Distribucion AVIOR BIRMEX Fuerza Mayor DA 3.98B - ASF Confirmed',
    'procurement_fraud',
    2020, 2025,
    3980000000,
    'high',
    'Almacenaje y Distribucion AVIOR SA de CV (RFC: ADA000803GM5, VID=280146) received 3.98B MXN '
    'in 16 contracts at 25%DA. rs=1.000 (maximum risk score). '
    'BIRMEX CHANNEL: The two largest contracts (2.028B + 0.692B = 2.72B) in 2024 are from '
    'BIRMEX (Laboratorios de Biologicos y Reactivos de Mexico) under '
    '"ADJUDICACION DIRECTA POR CASO FORTUITO O FUERZA MAYOR" — '
    'meaning BIRMEX justified bypassing any competitive process using "force majeure" circumstances. '
    'A 2.72B combined direct award for storage/distribution services under "force majeure" in 2024 '
    'is highly suspicious — force majeure provisions are meant for genuine emergency circumstances, '
    'not routine logistics contracts. '
    'ASF CONFIRMATION: ASF Cuenta Publica 2023 audit documented 819.6M MXN in undocumented '
    'BIRMEX payments to AVIOR for warehouse/storage operations with insufficient documentation '
    'and no competitive process justification. '
    'The remaining 1.26B comes from IMSS through competitive LP procedures. '
    'AVIOR appears to be a key node in the BIRMEX intermediary opacity system (see Case 151): '
    'BIRMEX receives government funds via G2G, then sub-contracts to private entities like AVIOR '
    'under "fuerza mayor" justifications without transparent tendering. '
    'RFC=ADA000803GM5 (incorporated 2000, consistent long-term BIRMEX supplier).'
)
insert_vendor(cid, 280146, 'primary', 'high')
insert_contracts(cid, 280146)


# ──────────────────────────────────────────────────────────────────────────────
# Case 170: FARMACEUTICOS MAYPO BIRMEX — ASF Documented, 88B total
# ──────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'FARMACEUTICOS_MAYPO_BIRMEX_ASF',
    'Farmaceuticos MAYPO BIRMEX Sub-Contract 88B 82%DA - ASF Documented',
    'monopoly',
    2002, 2025,
    88060000000,
    'medium',
    'Farmaceuticos MAYPO S.A de C.V (VID=2873, sin RFC) received 87.97B MXN in 18,772 contracts at 82%DA '
    'from IMSS, ISSSTE, INSABI, CENSIDA, and BIRMEX. '
    'Total across all MAYPO name variants: 88.06B MXN in 18,992 contracts. '
    'CRITICAL SIZE: 88B across 18,772 contracts makes MAYPO one of the largest pharmaceutical '
    'distributors in the Mexican government procurement database. '
    'TOP CONTRACTS (all >1B MXN each): 2.077B LP 2019 (IMSS), 1.981B DA 2018 (BIRMEX), '
    '1.761B DA 2017 (BIRMEX), 1.729B DA 2015 (IMSS), 1.552B LP 2018 (IMSS). '
    'ASF DOCUMENTED: Cuenta Publica 2022-2023 audits flagged BIRMEX sub-contracting to MAYPO '
    'for pharmaceutical distribution (152.5M MXN specifically documented as lacking '
    'proper supporting documentation and competitive process). '
    'The ASF-flagged amount is only the tip — the full BIRMEX-MAYPO relationship covers '
    'billions in DA contracts (VID=2873 contracts with institution=BIRMEX at 82%DA). '
    'The pattern: BIRMEX (G2G exempt from competition) channels drug procurement to MAYPO '
    'at DA rates, creating a two-layer opacity system. '
    'MEDIUM confidence: MAYPO may be a legitimate large-scale pharmaceutical distributor '
    '(similar to DISTRIBUIDORAS y CADENAS DE FARMACIAS model). '
    'The 82%DA rate and BIRMEX channel are the key red flags; '
    'the LP contracts (2019: 2.077B competitive) show some competitive procurement exists. '
    'Cross-reference with SFP sanction database and SAT EFOS definitivo list recommended.'
)
insert_vendor(cid, 2873, 'primary', 'medium')
insert_contracts(cid, 2873)


# ──────────────────────────────────────────────────────────────────────────────
# Case 171: Alimentacion para el Bienestar Shell Network (MCCI Aug 2025)
# ──────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'ALIMENTACION_BIENESTAR_SHELL_NETWORK_2023',
    'Alimentacion Bienestar Shell Network KONKISTOLO/FamilyDuck/Pelmu/Todologos ~1.8B',
    'ghost_companies',
    2022, 2025,
    1800000000,
    'high',
    'MCCI (Mexicanos Contra la Corrupcion y la Impunidad) documented in August 2025 a network of '
    'shell companies recently incorporated (2022-2023) that collectively received ~1.8B MXN '
    'in direct awards from ALIMENTACION PARA EL BIENESTAR S.A. de C.V. '
    '(the government food distribution entity under Bienestar program). '
    'ALL FOUR VENDORS have rs=0.000 — a confirmed MODEL BLIND SPOT: '
    'micro-DA shell companies with no prior contracts and recent incorporation scores near zero '
    'because they have no vendor_concentration history. '
    'The four shells identified: '
    '(1) KONKISTOLO SA DE CV (VID=297273, RFC=KON230118UV6, inc. Jan 2023) — 93c, 243M, 99%DA; '
    '(2) COMERCIALIZADORA FAMILYDUCK SA DE CV (VID=293066, RFC=CFA230107UC6, inc. Jan 2023) — 79c, 885M, 100%DA; '
    '(3) GRUPO PELMU SA DE CV (VID=279096, RFC=GPE050222296, inc. Feb 2022) — 217c, 406M+107M DICONSA, 99%DA; '
    '(4) TODOLOGOS.COM SA DE CV (VID=288385, RFC=TOD220214AR9, inc. Feb 2022) — 75c, 150M+14M DICONSA, 100%DA. '
    'PATTERN: All incorporated within weeks of each other in Jan-Feb 2022 and Jan 2023. '
    'All have near-identical names (descriptive/fantastical, no historical business). '
    'All contract exclusively with ALIMENTACION PARA EL BIENESTAR and DICONSA. '
    'ALIMENTACION PARA EL BIENESTAR itself is a government-adjacent entity managing '
    'food distribution under the BIENESTAR social program — creating a G2G-adjacent channel '
    'that bypasses normal procurement scrutiny. '
    'MCCI August 2025 report documents this as a systematic fraccionamiento scheme where '
    'the Bienestar food program sub-contracts food supply to shell companies without competition, '
    'with total estimated fraud ~2B MXN across known and unknown shells. '
    'This replicates the DICONSA micro-DA pattern (Case 164) but for the Bienestar channel.'
)
for vid, role in [(297273, 'primary'), (293066, 'primary'), (279096, 'primary'), (288385, 'primary')]:
    insert_vendor(cid, vid, role, 'high')
    insert_contracts(cid, vid)


# ──────────────────────────────────────────────────────────────────────────────
# Case 172: POYAGO IMSS Diabetes Drug Overpricing (MCCI 2024)
# ──────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'POYAGO_IMSS_DIABETES_OVERPRICING_2024',
    'POYAGO SA de CV IMSS Diabetes Drug 1000%+ Overpricing - MCCI 2024',
    'overpricing',
    2020, 2025,
    370000000,
    'high',
    'POYAGO SA de CV (VID=300207, RFC=POY121128FY4) received 370M MXN in 28 contracts at 100%DA from IMSS. '
    'MCCI (Mexicanos Contra la Corrupcion y la Impunidad) 2024 investigation documented that IMSS '
    'paid POYAGO prices 1000%+ above market rate for diabetes medications — specifically '
    'insulin and oral hypoglycemic agents supplied directly to IMSS pharmacies without competitive bidding. '
    'For context: if a medication costs 10 MXN in the open market, POYAGO billed IMSS 100+ MXN. '
    'The 100%DA rate (28 contracts, all direct awards) means IMSS never opened these purchases '
    'to competition — a key enabler of the overpricing scheme. '
    'Diabetes prevalence in Mexico: ~14.1% of adults, making IMSS diabetes drug procurement '
    'one of the largest pharmaceutical expenditure categories. '
    'POYAGO appears to be a new entrant to IMSS pharmaceutical supply: RFC=POY121128 (November 2012 incorporation) '
    'but contracting concentrated in 2020-2025 period. '
    'The combination of 100%DA + MCCI-documented 1000%+ overpricing + sole-supplier positioning '
    'in a captive market (IMSS patients cannot easily switch pharmacies) is a textbook '
    'pharmaceutical procurement fraud pattern. '
    'Fraud estimate (370M) represents total contract value; actual overcharge is approx 300-340M MXN '
    '(assuming true market value was 3-10% of invoiced price). '
    'rs=0.157 — moderate risk score despite clear fraud indicators: POYAGO has too few contracts '
    'to generate high vendor_concentration signal, illustrating the small-vendor blind spot.'
)
insert_vendor(cid, 300207, 'primary', 'high')
insert_contracts(cid, 300207)


# Summary
total_cases = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
print(f'\nGT Summary: {total_cases} cases | {total_vendors} vendors | {total_contracts} contracts')
conn.close()
