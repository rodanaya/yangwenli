"""Insert GT cases 216-223: IT/tech/services DA monopoly vendors from ARIA queue mining."""
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

# ── Case 216: ALTUM TECNOLOGIC — IT DA monopoly at AEFCM (high confidence) ──
# VID=256792 | RFC: ATE180426DU6 | Founded 2018
# 720M at Autoridad Educativa Federal CDMX (100% DA), 168M at SEPOMEX (75% DA)
# New company (2018 incorporation) winning large pluriannual DA computer leasing contracts
# at education authority. Pattern matches Cases 12 (TOKA), 19 (MAINBIT), 205 (METRO NET).
case_db_id = insert_case(
    'ALTUM_TECNOLOGIC_AEFCM_IT_DA_2020',
    'Altum Tecnologic IT DA Monopoly at AEFCM',
    'IT monopoly',
    2020, 2025,
    900_000_000,  # ~720M AEFCM DA + 126M SEPOMEX DA
    'high',
    'RFC ATE180426DU6 (founded 2018). 1.1B total, 48% DA overall. '
    '720M at AEFCM (100% DA) for pluriannual computer leasing. '
    '168M at SEPOMEX (75% DA). New company winning large IT contracts via DA '
    'at education authority — matches TOKA/MAINBIT/METRO_NET IT monopoly pattern.'
)
insert_vendor(case_db_id, 256792, role='primary', confidence='high')
insert_contracts(case_db_id, 256792)

# ── Case 217: GOTT UND GLUCK — Cleaning services DA ring (high confidence) ──
# VID=43734 | No RFC | Unusual German name for Mexican cleaning company
# 279M at SEP (33% DA), 202M at IPN (80% DA), 180M at AEFCM (83% DA),
# 93M at SAT (33% DA), 79M at SHCP (67% DA)
# Peak 2019: 374M across 20 contracts, 80% DA. Cleaning services DA at
# education/fiscal agencies — same pattern as IPN Cartel de la Limpieza (Case 10).
case_db_id = insert_case(
    'GOTT_UND_GLUCK_LIMPIEZA_SEP_IPN_DA',
    'Gott und Gluck Cleaning Services DA Ring',
    'Bid rigging',
    2016, 2024,
    650_000_000,  # ~202M IPN (80%DA) + 180M AEFCM (83%DA) + 79M SHCP (67%DA) + portion of SEP/SAT DA
    'high',
    'No RFC. Unusual German name for Mexican cleaning firm. 1.05B total, 62.3% DA. '
    'IPN 202M (80% DA), AEFCM 180M (83% DA), SHCP 79M (67% DA). '
    'Peak 2019: 374M/20 contracts at 80% DA. Cleaning services DA at education/fiscal '
    'agencies — same pattern as IPN_CARTEL_LIMPIEZA (Case 10). '
    'Won LP at SEP/SAT but high DA at IPN/AEFCM suggests captured contracting officers.'
)
insert_vendor(case_db_id, 43734, role='primary', confidence='high')
insert_contracts(case_db_id, 43734)

# ── Case 218: OFI STORE — IT managed services DA at CAPUFE (medium confidence) ──
# VID=44822 | No RFC
# 527M at ISSSTE (100% DA, 2011), 452M at CAPUFE (80% DA, 2014-2025)
# "Servicios administrados de bienes informaticos para CAPUFE" — IT managed services
# Long-running DA monopoly at CAPUFE (toll highway operator) for IT equipment leasing.
case_db_id = insert_case(
    'OFI_STORE_CAPUFE_ISSSTE_IT_DA',
    'Ofi Store IT Managed Services DA Monopoly',
    'IT monopoly',
    2011, 2025,
    800_000_000,  # 527M ISSSTE (100%DA) + 362M CAPUFE (80%DA)
    'medium',
    'No RFC. 1.58B total, 70.5% DA. ISSSTE 527M (100% DA, 2011). '
    'CAPUFE 452M (80% DA, 2014-2025) for IT managed equipment services. '
    'SSA 187M (33% DA). Long-running IT DA at CAPUFE matches IT monopoly pattern. '
    'Also won LP at PEMEX (146M, 0% DA) showing legitimate competitive capability, '
    'but DA dominance at CAPUFE/ISSSTE is suspicious.'
)
insert_vendor(case_db_id, 44822, role='primary', confidence='medium')
insert_contracts(case_db_id, 44822)

# ── Case 219: TECNO ALTA DISTRIBUCION — Vehicle transport DA at INAH (medium confidence) ──
# VID=57242 | No RFC | Name says "tech distribution" but services are vehicle transport
# 408M at INAH (100% DA, 2015-2024), 497M at SEP (50% DA, 2010-2011)
# Vehicle transportation/fleet services at 100% DA for 10 years at INAH
# despite many competitors. Pattern matches Case 200 (Casanova Rent Volks FGR).
case_db_id = insert_case(
    'TECNO_ALTA_INAH_TRANSPORTE_100DA',
    'Tecno Alta Vehicle Transport DA Monopoly at INAH',
    'Procurement fraud',
    2010, 2024,
    500_000_000,  # 408M INAH (100%DA) + PEMEX DA portion
    'medium',
    'No RFC. Name "Tecno Alta Distribucion" but provides vehicle transportation services. '
    '1.56B total, 92.2% DA. INAH 408M (100% DA, 2015-2024) — 10 years of DA vehicle '
    'fleet services at cultural heritage institute. SEP 497M (50% DA). PEMEX 430M (50% DA). '
    'Vehicle transport has many competitors — no technical exclusivity for DA. '
    'Matches Casanova Rent Volks FGR transport DA pattern.'
)
insert_vendor(case_db_id, 57242, role='primary', confidence='medium')
insert_contracts(case_db_id, 57242)

# ── Case 220: SCONTINUIDAD LATAM — Data center DA at IPICYT (medium confidence) ──
# VID=218413 | RFC: SLA970110SB2
# 750M at FIFOMI (LP, 2019), 634M at IPICYT (80% DA, 2021-2024), 526M at SAT (LP)
# IPICYT is a tiny research institute in San Luis Potosi spending 634M on DA data center services
# while larger agencies (SAT, FIFOMI) use LP for the same services from this vendor.
case_db_id = insert_case(
    'SCONTINUIDAD_LATAM_IPICYT_DATA_CENTER_DA',
    'SContinuidad LATAM Data Center DA at IPICYT',
    'IT monopoly',
    2019, 2025,
    500_000_000,  # 634M at IPICYT (80% DA)
    'medium',
    'RFC SLA970110SB2. 2.01B total, 52.2% DA. IPICYT 634M (80% DA, 2021-2024) for '
    'data center/cloud migration services at small research institute in SLP. '
    'Same vendor wins LP at larger agencies: FIFOMI 750M (0% DA), SAT 526M (0% DA). '
    'Discrepancy suggests captured contracting at IPICYT — legitimate IT company '
    'but IPICYT DA spending is disproportionate for a research institute.'
)
insert_vendor(case_db_id, 218413, role='primary', confidence='medium')
insert_contracts(case_db_id, 218413)

# ── Case 221: SOLUCIONES TECNOLOGICAS ESPECIALIZADAS — IT DA at welfare agencies (medium) ──
# VID=19883 | No RFC
# 845M at IMSS (0% DA, 2007-2016), 321M at Bienestar (100% DA), 257M at Becas (50% DA)
# 212M at ISSSTE (38.5% DA), 208M at Diconsa (80% DA)
# Won large LP at IMSS but 100% DA at Bienestar, 80% DA at Diconsa
# IT compute leasing across welfare agencies with high DA rates.
case_db_id = insert_case(
    'SOLUCIONES_TEC_BIENESTAR_IT_DA',
    'Soluciones Tecnologicas Especializadas IT DA at Welfare Agencies',
    'IT monopoly',
    2005, 2025,
    800_000_000,  # Bienestar 321M (100%DA) + Diconsa 208M (80%DA) + Becas 129M + ISSSTE DA portion
    'medium',
    'No RFC. 2.93B total, 62.6% DA. Mixed DA pattern: IMSS 845M (0% DA) proving '
    'legitimate competitive capability, but Bienestar 321M (100% DA), Diconsa 208M (80% DA), '
    'Becas 257M (50% DA). IT compute leasing (PinPad, computers, digitalization). '
    'DA concentration at smaller welfare agencies while winning LP at large agencies.'
)
insert_vendor(case_db_id, 19883, role='primary', confidence='medium')
insert_contracts(case_db_id, 19883)

# ── Case 222: GRUPO ESTUDIAT — Office supplies DA at Diconsa (medium confidence) ──
# VID=152690 | No RFC
# 503M at CONAFE (20% DA), 343M at Impresora Progreso (91% DA, 2017-2018)
# 275M at Diconsa (100% DA, 2017-2022) — school supplies at food distribution agency
# Diconsa is a food distribution entity — why is it buying school supplies via 100% DA?
case_db_id = insert_case(
    'GRUPO_ESTUDIAT_DICONSA_CONAFE_SUPPLIES_DA',
    'Grupo Estudiat Office/School Supplies DA',
    'Procurement fraud',
    2015, 2025,
    600_000_000,  # 343M Impresora (91%DA) + 275M Diconsa (100%DA) + CONAFE DA portion
    'medium',
    'No RFC. 1.15B total, 73.2% DA. School supplies (calculators, pencils, paper, notebooks) '
    'for education programs. Diconsa 275M (100% DA, 2017-2022) — Diconsa is food distribution, '
    'not education; outsized school supply spend via DA is anomalous. '
    'Impresora y Encuadernadora Progreso 343M (91% DA, 2017-2018). '
    'CONAFE 503M (20% DA) — legitimate LP at education body, but high DA elsewhere.'
)
insert_vendor(case_db_id, 152690, role='primary', confidence='medium')
insert_contracts(case_db_id, 152690)


# ── Structural FPs ─────────────────────────────────────────────────────────
print('\nFlagging structural FPs...')
more_fp = [
    271567,  # HYOSUNG SOLUTIONS — Korean ATM OEM manufacturer, sells hardware to government banks
    44843,   # SHARP CORPORATION MEXICO — Global OEM for printers/copiers/managed print services
    18436,   # SGS DE MEXICO — Swiss multinational testing/certification body (SGS SA)
    31696,   # IQSEC — Cybersecurity firm, mostly LP contracts, legitimate specialization
    17174,   # SOLUCIONES INTELIGENTES TECNOLOGICAS — single 2.125B LP contract at state level, rest tiny
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
