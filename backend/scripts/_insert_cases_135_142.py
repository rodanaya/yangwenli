"""Insert ground truth cases 135-142: Individual person IMSS, foreign Casa de Moneda, DICONSA ring members."""
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

# Case 135: CESAR FUENTES AGUIRRE - Individual person receiving 1.73B from IMSS
cid = insert_case(
    'CESAR_FUENTES_AGUIRRE_IMSS_PERSONA_FISICA',
    'Cesar Alfonso Fuentes Aguirre - Persona Fisica 1.73B IMSS 90%DA',
    'ghost_company',
    2015, 2024,
    1730000000,
    'high',
    'Individual person (persona fisica) receiving 1.73B MXN from IMSS in 1,375 contracts at 90%DA. '
    'No RFC visible in COMPRANET. Largest individual contracts: 421M DA 2016, 344M LP 2016, 278M DA 2016. '
    'No descriptions visible for top contracts. Pattern: individual natural person receiving '
    'hundreds of millions in DA from a social security institution raises extreme red flags. '
    'May be a ghost identity, a front for a medical services operation, or a physician receiving '
    'inflated personal service contracts. IMSS historically uses DA for individual medical specialists '
    'but not at this scale.'
)
insert_vendor(cid, 148437, 'primary', 'high')
insert_contracts(cid, 148437)

# Case 136: PV METALLS LLC - Foreign company supplying coins metal to Casa de Moneda
cid = insert_case(
    'PV_METALLS_CASA_MONEDA_100DA_2020',
    'PV Metalls LLC Foreign Entity 1.66B Casa de Moneda 100%DA Metal Sheets',
    'procurement_fraud',
    2020, 2022,
    1660000000,
    'high',
    'PV Metalls LLC (foreign entity, no RFC — likely Latvian/Baltic LLC) received 1.66B MXN from '
    'Casa de Moneda de Mexico in 15 contracts at 100%DA during 2020-2022. '
    'Contracts are for coin manufacturing metal: LAMINA MATERIA PRIMA (raw metal sheets), '
    'LAMINA CMM BCE NUC $1.00 (bronze-coated steel for 1-peso coins), '
    'LAMINA CMM ALP NUC $10.00 (alpaca/nickel-silver for 10-peso coins). '
    'Largest contracts: 836M DA 2022, 641M DA 2021, 507M DA 2021. '
    'Casa de Moneda is a national security institution — foreign LLC with 100%DA for metal supply '
    'raises serious procurement integrity concerns. Competitive bidding for metal commodities '
    'is standard practice (London Metal Exchange pricing). '
    'COVID-19 era timing coincides with other emergency procurement irregularities.'
)
insert_vendor(cid, 266005, 'primary', 'high')
insert_contracts(cid, 266005)

# Case 137: DEMOS DESARROLLO DE MEDIOS (La Jornada) - Government advertising DA
cid = insert_case(
    'DEMOS_LA_JORNADA_GOVT_ADVERTISING_DA',
    'Demos Desarrollo de Medios (La Jornada) Government Advertising 100%DA',
    'procurement_fraud',
    2010, 2025,
    1680000000,
    'medium',
    'Demos Desarrollo de Medios SA de CV (sin RFC) — parent company of La Jornada newspaper — '
    'received 1.68B MXN in 1,000 contracts at 100%DA during 2010-2025. '
    'IMSS: 410M@100%DA for institutional campaign advertising, recurring 53M/year 2020-2024. '
    'Loteria Nacional: 300M@100%DA for newspaper advertising, recurring 50M/year 2020-2023. '
    'Government advertising to a politically aligned newspaper via DA (no media tender) '
    'creates editorial independence conflict of interest — same pattern as Televisa/TV Azteca '
    'duopoly (Cases 119-120) but for print media. '
    'La Jornada is a left-leaning daily newspaper closely aligned with AMLO/Morena government.'
)
insert_vendor(cid, 45722, 'primary', 'medium')
insert_contracts(cid, 45722)

# Case 138: CUETARA DISTRIBUCION - DICONSA food ring member
cid = insert_case(
    'CUETARA_DICONSA_100DA_FOOD_RING',
    'Cuetara Distribucion DICONSA 100%DA Food Ring Member',
    'procurement_fraud',
    2010, 2025,
    2000000000,
    'medium',
    'Cuetara Distribucion SA de CV (sin RFC) received 2.00B MXN from DICONSA/Alimentacion para el '
    'Bienestar in 5,596 contracts at 100%DA. Food distributor in the DICONSA ring alongside '
    'Molinos Azteca (8.07B), Industrial Patrona (3.94B), Marcas Nestle (5.18B), and others. '
    'Model blind spot: rs=0.000.'
)
insert_vendor(cid, 80346, 'primary', 'medium')
insert_contracts(cid, 80346)

# Case 139: COMERCIALIZADORA PEPSICO MEXICO - DICONSA food ring
cid = insert_case(
    'PEPSICO_MEXICO_DICONSA_100DA_RING',
    'Comercializadora Pepsico Mexico DICONSA 100%DA Food Ring',
    'procurement_fraud',
    2010, 2019,
    1840000000,
    'medium',
    'Comercializadora Pepsico Mexico S de RL de CV (sin RFC) received 1.84B MXN from DICONSA '
    'in 6,945 contracts at 100%DA during 2010-2019. '
    'All contracts to DICONSA (1.82B@100%DA). PepsiCo product distribution for community stores. '
    'The Pepsico brand without RFC is unusual for a PepsiCo subsidiary. Model blind spot: rs=0.000. '
    'Part of the DICONSA food program ring totaling over 31B MXN in 100%DA to food suppliers.'
)
insert_vendor(cid, 44997, 'primary', 'medium')
insert_contracts(cid, 44997)

# Case 140: ALEN DEL NORTE - DICONSA cleaning products ring (13,945 contracts!)
cid = insert_case(
    'ALEN_NORTE_DICONSA_100DA_RING',
    'Alen del Norte DICONSA 100%DA Cleaning Products 13945 Contracts',
    'procurement_fraud',
    2010, 2025,
    1780000000,
    'medium',
    'Alen del Norte SA de CV (sin RFC) received 1.78B MXN from DICONSA/Alimentacion para el '
    'Bienestar in 13,945 contracts at 100%DA — the most contracts in the DICONSA ring. '
    'Alen is a major Mexican cleaning products company (detergents, soap). '
    'DICONSA sells cleaning products alongside food in community stores. '
    '13,945 micro-DA contracts over 15 years = fraccionamiento sistematico. Model blind spot: rs=0.000.'
)
insert_vendor(cid, 45050, 'primary', 'medium')
insert_contracts(cid, 45050)

# Case 141: MINSA SA - DICONSA corn flour (competitor to Maseca)
cid = insert_case(
    'MINSA_DICONSA_100DA_MASA_HARINA',
    'Minsa SA DICONSA 100%DA Corn Flour (Masa Harina) Capture',
    'procurement_fraud',
    2010, 2021,
    1770000000,
    'medium',
    'Minsa SA de CV (sin RFC) received 1.77B MXN from DICONSA in 5,514 contracts at 100%DA. '
    'Minsa produces masa harina (corn flour for tortillas) — competitor to Maseca/Gruma. '
    'All contracts to DICONSA. Corn flour distribution to community stores is a legitimate '
    'government program, but 100%DA for a commodity product available from multiple suppliers '
    'violates competitive procurement requirements. Model blind spot: rs=0.000.'
)
insert_vendor(cid, 45117, 'primary', 'medium')
insert_contracts(cid, 45117)

# Case 142: COMERCIALIZADORA COLUMBIA - DICONSA ring member
cid = insert_case(
    'COMERCIALIZADORA_COLUMBIA_DICONSA_DA',
    'Comercializadora Columbia DICONSA 98%DA 1.69B Capture',
    'procurement_fraud',
    2010, 2020,
    1690000000,
    'medium',
    'Comercializadora Columbia SA de CV (sin RFC) received 1.69B MXN from DICONSA '
    'in 62 contracts at 98%DA during 2010-2020. Unlike the micro-contract DICONSA suppliers, '
    'Columbia uses fewer but larger contracts (avg 27M each). '
    'All value to DICONSA at 98%DA. Another member of the multi-billion food distribution ring. '
    'Model rs=0.191 — slightly higher due to fewer, larger contracts.'
)
insert_vendor(cid, 61022, 'primary', 'medium')
insert_contracts(cid, 61022)

# Summary
total_cases = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
print(f'\nGT Summary: {total_cases} cases | {total_vendors} vendors | {total_contracts} contracts')
conn.close()
