"""Insert GT cases 151-158: BIRMEX, Baxter dialysis, Currie Brown, Praxair, TELMEX, BConnect, Lumo SOFOM, Gabor paper."""
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

# Case 151: BIRMEX - Government intermediary for IMSS/ISSSTE pharmacy and vaccine supply
cid = insert_case(
    'BIRMEX_GOBIERNO_INTERMEDIARIO_VACUNAS',
    'BIRMEX Government Vaccine/Pharmacy Intermediary Monopoly 52%DA - 26.69B',
    'monopoly',
    2003, 2025,
    26690000000,
    'medium',
    'Laboratorios de Biologicos y Reactivos de Mexico SA de CV (BIRMEX) (sin RFC) — state-owned pharmaceutical '
    'company — received 26.69B MXN in 289 contracts at 52%DA. '
    'IMSS: 15.3B@49%DA (80c), ISSSTE: 4.1B@43%DA (51c), CENSIA: 3.7B@38%DA (13c), SS: 2.4B@69%DA, INSABI: 2.3B@84%DA. '
    'BIRMEX operates as a government intermediary for IMSS and ISSSTE pharmacy chains '
    '("SERVICIO INTEGRAL PARA LA ADMINISTRACION Y OPERACION DE LA CADENA DE FARMACIAS"). '
    'G2G contracting allows ISSSTE to award directly to BIRMEX (another government entity), '
    'which then sub-contracts to private vendors including UAB Jorinis (Case 25) and others. '
    'This creates an opacity layer: public resources flow through BIRMEX without normal competition scrutiny. '
    'BIRMEX also receives DA contracts from INSABI at 84%DA for vaccine supply. '
    'The G2G exemption may be appropriately used for some contracts but creates systemic '
    'accountability gaps when BIRMEX then sources from private suppliers without competitive bidding.'
)
insert_vendor(cid, 38095, 'primary', 'medium')
insert_contracts(cid, 38095)

# Case 152: BAXTER dialysis monopoly - dominant peritoneal dialysis supplier to IMSS
cid = insert_case(
    'BAXTER_DIALISIS_IMSS_MONOPOLY',
    'Baxter SA de CV IMSS Peritoneal Dialysis Monopoly 75%DA - 28.11B',
    'monopoly',
    2002, 2025,
    28110000000,
    'low',
    'Baxter SA de CV (sin RFC) received 28.11B MXN in 3,599 contracts at 75%DA from IMSS and ISSSTE. '
    'IMSS alone accounts for the vast majority. '
    'Product focus: peritoneal dialysis solutions (Dialisis Peritoneal Automatizada, '
    'Dialisis Peritoneal Continua Ambulatoria), IV solutions, and parenteral nutrition. '
    'Largest DA contracts: 1.009B DA 2020 (IMSS dialysis prevalentes), 684M DA 2020 (IMSS dialysis CAPD). '
    'Baxter is the global dominant supplier of peritoneal dialysis (PD) technology — '
    'IMSS prescribes PD for CKD patients at home, tying them to Baxter consumables. '
    'Mexico has one of the highest CKD rates in the world; IMSS has over 50,000 patients on PD. '
    'The 75%DA rate over two decades reflects a structural medical monopoly (proprietary PD systems '
    'lock patients and institutions to single-brand consumables). '
    'Low fraud confidence: this appears to be a legitimate technology lock-in, not deliberate corruption, '
    'though the absence of competitive mechanisms for PD consumables warrants scrutiny.'
)
insert_vendor(cid, 5319, 'primary', 'low')
insert_contracts(cid, 5319)

# Case 153: CURRIE & BROWN ISSSTE mega-supervision contract
cid = insert_case(
    'CURRIE_BROWN_ISSSTE_SUPERVISION_MEGACONTRATO',
    'Currie & Brown Mexico ISSSTE 25.8B Supervision Megacontract 2022',
    'overpricing',
    2015, 2025,
    25900000000,
    'high',
    'Currie & Brown Mexico SA de CV (sin RFC) — Mexican subsidiary of UK project management firm — '
    'received 25.90B MXN in only 7 contracts. '
    'CRITICAL: A single LP contract from ISSSTE in 2022-01-07 for 25,789M MXN '
    '("SUPERVISION DE LOS CONTRATOS DE PRESTACION DE SERVICIOS EN...") '
    'represents one of the largest project management/supervision contracts in Mexican history. '
    'For context: 25.8B MXN is ~$1.3B USD for project supervision services alone. '
    'Currie & Brown ISSSTE (2c: 25.82B, 0%DA via LP), IMSS (2c: 64M, 50%DA). '
    'Project supervision fees typically represent 1-5% of construction costs; '
    '25.8B supervision implies an underlying construction program of 500B-2.5 trillion MXN '
    '(which would be the entire ISSSTE hospital portfolio). '
    'Either this contract represents systematic overpricing of management fees, '
    'or it is a multi-decade umbrella contract recorded at total face value. '
    'Was awarded via LP (competitive) but the magnitude requires urgent independent verification. '
    'Currie & Brown Mexico has no RFC — unusual for a company receiving 25B+ in government contracts.'
)
insert_vendor(cid, 126642, 'primary', 'high')
insert_contracts(cid, 126642)

# Case 154: PRAXAIR medical oxygen and PEMEX gas
cid = insert_case(
    'PRAXAIR_MEXICO_OXIGENO_PEMEX_GAS',
    'Praxair Mexico Medical Oxygen PEMEX Gas 67%DA - 17.82B',
    'monopoly',
    2002, 2025,
    17820000000,
    'low',
    'Praxair Mexico S de RL de CV (sin RFC) received 17.82B MXN in 2,810 contracts at 67%DA. '
    'Largest contract: 6.029B LP 2005 from PEMEX Exploracion y Produccion (industrial gas). '
    'Medical oxygen: 422M LP 2024 (IMSS), 398M DA 2025 (ISSSTE), 354M LP 2025 (IMSS), 292M LP 2025 (IMSS). '
    'Praxair (now Linde) is the main competitor to Infra SA (Case 147) in medical oxygen supply. '
    'Linde-Praxair merger (2018) created the world\'s largest industrial gas company — '
    'both Infra and Praxair now operate under Linde umbrella in some markets. '
    'The PEMEX 6B contract from 2005 appears to be a legitimate competitive LP contract. '
    'Medical oxygen contracts mirror the Infra pattern: trending toward higher DA rates in recent years. '
    'The combination of Infra (41.82B, Case 147) + Praxair (17.82B) = 59.64B total '
    'in medical oxygen and industrial gas from 2 suppliers raising similar DA concerns. '
    'Low confidence: the industrial gas market has legitimate oligopolistic characteristics; '
    'the PEMEX LP contract was competitive. However, the DA medical oxygen trend warrants monitoring.'
)
insert_vendor(cid, 1486, 'primary', 'low')
insert_contracts(cid, 1486)

# Case 155: TELMEX telecom government monopoly
cid = insert_case(
    'TELMEX_TELECOM_GOBIERNO_MONOPOLY_DA',
    'TELMEX Government Telecom Monopoly 77%DA - 20.55B',
    'monopoly',
    2002, 2025,
    20550000000,
    'medium',
    'Telefonos de Mexico SAB de CV (sin RFC) received 20.55B MXN in 2,422 contracts at 77%DA. '
    'Top contracts: 1.794B DA 2022 to Banco del Bienestar (communications/security), '
    '1.025B LP 2007 to ISSSTE, 811M DA 2025 to FGR (WAN/LAN integral telecom), '
    '692M DA 2021 to Guardia Nacional (telephone/long distance), 672M LP 2015 to SAT. '
    'Institutions: Banco Bienestar, ISSSTE, FGR, Guardia Nacional, SAT, Jalisco SCT. '
    'TELMEX (owned by Carlos Slim/America Movil) is Mexico\'s dominant fixed-line telecom. '
    'Similar pattern to Uninet SA (Case 150, 15.13B, 56%DA) but larger and more institutionally spread. '
    'While TELMEX controls the last-mile infrastructure (natural monopoly for fixed lines), '
    'the government has alternative providers for WAN services (Axtel, Megacable, Totalplay). '
    'The 1.794B single DA to Banco del Bienestar for "servicio integral administrado de '
    'comunicaciones y seguridad" is the largest single contract and most suspicious. '
    'Combined Telmex (20.55B) + Axtel (14.04B) = 34.59B in government telecom at high DA rates '
    '— suggesting systematic market allocation between Slim-controlled entities (TELMEX/Axtel).'
)
insert_vendor(cid, 473, 'primary', 'medium')
insert_contracts(cid, 473)

# Case 156: BConnect ISSSTE contact center - year-end mega-DA
cid = insert_case(
    'BCONNECT_ISSSTE_CONTACT_CENTER_DA_2014',
    'BConnect Services ISSSTE Contact Center 4.35B Year-End DA 2014',
    'procurement_fraud',
    2014, 2025,
    4920000000,
    'high',
    'BConnect Services SA de CV (sin RFC) received 4.92B MXN in only 13 contracts at 69%DA. '
    'ISSSTE: 4.8B@50%DA (4c), BANSEFI: 60M, NAFIN: 39M. '
    'CRITICAL: Top contract = 4,351M MXN DA from ISSSTE on 2014-12-31 (December 31, year-end!). '
    'Contract description: contact center and digital campaign services for ISSSTE. '
    'A 4.35B direct award on December 31 is an extreme year-end budget dump. '
    'For context: a professional contact center for 12 million ISSSTE beneficiaries '
    'at realistic market rates would cost ~200-500M/year, not 4.35B. '
    'Subsequent ISSSTE contracts in 2018 (272M LP) and 2021 (140M LP) are competitively bid '
    'and much smaller — suggesting the 2014 DA at 17x normal scale was anomalous. '
    'BConnect (no RFC) appears specialized in ISSSTE digital/contact services. '
    'The company name, no RFC, single massive year-end DA, and 7x overvaluation vs. '
    'subsequent LP contracts are classic procurement fraud indicators.'
)
insert_vendor(cid, 78178, 'primary', 'high')
insert_contracts(cid, 78178)

# Case 157: LUMO FINANCIERA SOFOM - vehicle leasing Bienestar/SEGALMEX
cid = insert_case(
    'LUMO_FINANCIERA_SOFOM_VEHICULOS_BIENESTAR',
    'Lumo Financiera del Centro SOFOM ENR Vehicle Leasing Bienestar 71%DA - 4.35B',
    'procurement_fraud',
    2016, 2025,
    4350000000,
    'high',
    'Lumo Financiera del Centro SA de CV SOFOM ENR (sin RFC) received 4.35B MXN in 251 contracts '
    'at 71%DA for vehicle leasing to social welfare institutions. '
    'SEGALMEX: 1.109B@67%DA (6c), IMSS: 920M@74%DA (23c), Secretaria de Bienestar: 518M@100%DA (4c), '
    'INEA: 363M@100%DA, SEP: 137M@100%DA. '
    'Top contracts: 646M DA (SEGALMEX), 345M DA (Bienestar), 263M LP (SEGALMEX), 256M DA (IMSS). '
    'This is the same SOFOM vehicle-leasing-to-welfare-agencies pattern as Integra Arrenda '
    '(Case 143, 12.17B, 3.6B single DA to Bienestar). '
    'A SOFOM ENR (non-bank financial entity) providing vehicle leasing to social welfare programs '
    'at 71%DA raises the same procurement integrity concerns: '
    'Vehicle leasing is a competitive market (multiple rental companies, SOFOM entities); '
    '100%DA to Bienestar and INEA for government vehicle fleets bypasses competition. '
    'No RFC for a company receiving 4.35B in social welfare vehicle contracts is anomalous. '
    'Pattern: at least 2 SOFOMs (Integra + Lumo) dominating welfare-agency vehicle leasing via DA.'
)
insert_vendor(cid, 127959, 'primary', 'high')
insert_contracts(cid, 127959)

# Case 158: GRUPO PAPELERO GABOR CONALITEG paper monopoly
cid = insert_case(
    'GRUPO_PAPELERO_GABOR_CONALITEG_MONOPOLY',
    'Grupo Papelero Gabor CONALITEG Paper Monopoly 92%DA - 4.94B',
    'monopoly',
    2010, 2025,
    4940000000,
    'medium',
    'Grupo Papelero Gabor SA de CV (sin RFC) received 4.94B MXN in 1,039 contracts at 92%DA. '
    'CONALITEG (national textbooks): 3.875B@44%DA (32c), '
    'Impresora y Encuadernadora Progreso: 902M@100%DA (849c micro-contracts). '
    'Top contracts: 1.236B LP 2022 (CONALITEG paper), 610M DA 2022 (CONALITEG offset paper), '
    '550M LP 2025 (CONALITEG), 317M LP 2021 (CONALITEG), 283M DA 2024 (CONALITEG). '
    'CONALITEG produces 200+ million textbooks per year for Mexican public schools — '
    'paper is one of the largest cost components. '
    'While CONALITEG contracts are majority LP (competitive), 849 micro-contracts to '
    'Impresora y Encuadernadora Progreso at 100%DA push the overall DA rate to 92%. '
    'The micro-contract pattern (IEP: 849c at 100%DA, avg ~1M each) suggests systematic '
    'fraccionamiento (contract splitting to stay below DA thresholds) for paper supply to '
    'a captive government printer. '
    'No RFC for a company supplying 4.94B in paper to national textbook production is anomalous.'
)
insert_vendor(cid, 17873, 'primary', 'medium')
insert_contracts(cid, 17873)

# Summary
total_cases = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
print(f'\nGT Summary: {total_cases} cases | {total_vendors} vendors | {total_contracts} contracts')
conn.close()
