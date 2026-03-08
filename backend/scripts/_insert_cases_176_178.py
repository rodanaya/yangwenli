"""Insert GT cases 176-178: Sodexo voucher ecosystem, Servicios Industriales IMSS security,
GAMI Ingenieria infrastructure DA irregularities."""
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


def insert_vendor(case_db_id, vendor_id, role='primary', confidence='medium'):
    v = conn.execute('SELECT name, rfc FROM vendors WHERE id=?', (vendor_id,)).fetchone()
    vname = v[0] if v else str(vendor_id)
    vrfc = v[1] if v else None
    match_conf = 1.0 if confidence == 'high' else (0.9 if confidence == 'medium' else 0.7)
    conn.execute('''INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, rfc_source, role, evidence_strength, match_method, match_confidence, created_at)
        VALUES (?,?,?,?,?,?,?,?,?)''',
        (case_db_id, vendor_id, vname, vrfc, role, confidence, 'vendor_id_direct', match_conf, now))
    conn.commit()
    print(f'  Vendor {vendor_id}: {vname[:60]}')


def insert_contracts(case_db_id, vendor_id):
    n = conn.execute('''INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id)
        SELECT ?, id FROM contracts WHERE vendor_id=?''', (case_db_id, vendor_id)).rowcount
    conn.commit()
    print(f'  -> {n} contracts linked for vendor {vendor_id}')
    return n


# ──────────────────────────────────────────────────────────────────────────────
# Case 176: SODEXO MOTIVATION SOLUTIONS — Meal Voucher Ecosystem 8.79B
# ──────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'SODEXO_MOTIVATION_GOVT_VOUCHER_ECOSYSTEM_8B',
    'Sodexo Motivation Solutions Govt Voucher Ecosystem 8.79B (2002-2024)',
    'procurement_fraud',
    2002, 2024,
    8790000000,
    'medium',
    'Sodexo Motivation Solutions México SA de CV (VID=474, sin RFC) received 8.79B MXN in 1,215 contracts '
    'over 23 years (2002-2024) at 37.8% direct award. Part of the documented government meal/benefit '
    'voucher monopoly ecosystem: Efectivale (VID=64, 15.25B 2002-2010, Case 175) + TOKA INTERNACIONAL '
    '(VID=102627, 53.11B, GT) + SI VALE MEXICO (VID=44362, 15.92B, GT) + EDENRED MEXICO (VID=44372, '
    '38.73B, GT) + SODEXO (this case) = ~122B MXN to the same French multinational group and domestic '
    'equivalents over 23 years. Sodexo is a French multinational (HQ Paris) operating the Pluxee/Pass '
    'benefit voucher brand in Mexico. Top institutions: Secretaría de Salud (8c, 1.44B, 38%DA) — note: '
    '623M DA + 623M DA on consecutive days Dec 2010 (threshold splitting pattern); CONAGUA (131c, 0.69B, '
    '15%DA); Luz y Fuerza del Centro (5c, 0.66B, 0%DA, pre-2009); SEPOMEX/Correos de México (4c, 0.63B, '
    '25%DA); FGR (3c, 0.61B, 33%DA — 280M DA "Adquisición de combustible"). Key red flag: FGR paid Sodexo '
    '280M DA in 2020 for "fuel acquisition" — unusual for a meal voucher company; likely fuel cards/vouchers. '
    'Medium confidence: Pattern reflects same institutional capture as EDENRED/TOKA ecosystem. Sodexo is a '
    'legitimate business, but the 23-year monopoly and DA usage warrants documentation as part of the broader '
    'voucher cartel investigation.'
)
insert_vendor(cid, 474, 'primary', 'medium')
insert_contracts(cid, 474)


# ──────────────────────────────────────────────────────────────────────────────
# Case 177: SERVICIOS INDUSTRIALES E INSTITUCIONALES — IMSS Security 11.51B
# ──────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'SERVICIOS_INDUSTRIALES_INST_IMSS_SEGURIDAD_11B',
    'Servicios Industriales e Institucionales IMSS Security Services 24-Year Monopoly 11.51B',
    'procurement_fraud',
    2002, 2025,
    11510000000,
    'medium',
    'Servicios Industriales e Institucionales SA de CV (VID=2214, sin RFC) received 11.51B MXN in 788 '
    'contracts over 24 years (2002-2025) at 32.2% direct award for "SERVICIO DE SEGURIDAD SUBROGADA" '
    '(outsourced security guard services) at IMSS hospitals and facilities. Top institutions: IMSS (190c, '
    '6.27B, 48%DA), SSIMSS/Servicios de Salud IMSS (17c, 2.15B, 76%DA), AICM (3c, 0.43B, 0%DA), '
    'ASIPONA (3c, 0.38B, 33%DA), ASA (120c, 0.38B, 29%DA). Pattern escalation: 2025 shows dramatic '
    'increase — 53 contracts, 3.19B MXN at 74%DA in a single year, suggesting accelerating DA reliance. '
    'SSIMSS pays 76%DA for security services — implying that over 3/4 of IMSS security contracts to this '
    'vendor skip competitive procurement. 24 years of security service supply to IMSS without significant '
    'interruption is the institution capture pattern (P6). Security services for hospitals are not '
    'specialized enough to justify systematic DA procurement. The 2025 spike (3.19B at 74%DA) is the '
    'highest annual value and highest DA rate in the vendor\'s history. Without RFC, the vendor cannot be '
    'cross-referenced with SAT EFOS or SFP sanctions. Medium confidence: 24-year monopoly + 2025 DA spike '
    '+ no RFC = institution capture red flags. Less suspicious than pharma fraud (security services can '
    'legitimately use framework agreements), but the scale and longevity warrant inclusion.'
)
insert_vendor(cid, 2214, 'primary', 'medium')
insert_contracts(cid, 2214)


# ──────────────────────────────────────────────────────────────────────────────
# Case 178: GAMI INGENIERIA — Infrastructure DA Irregularities 4.15B ASIPONA + 2B ISSSTE
# ──────────────────────────────────────────────────────────────────────────────
cid = insert_case(
    'GAMI_INGENIERIA_INFRAESTRUCTURA_DA_IRREGULARIDADES',
    'GAMI Ingenieria Infrastructure DA Irregularities 14.2B (4.15B ASIPONA + 2B ISSSTE)',
    'procurement_fraud',
    2016, 2025,
    6200000000,
    'low',
    'GAMI Ingenieria e Instalaciones SA de CV (VID=139, sin RFC) received 14.2B MXN in 60 contracts '
    'over 24 years at 11.7% direct award. Main red flags are two large direct award contracts: '
    '(1) ASIPONA Manzanillo 4.147B DA (2020-02-28) for "CONCLUSIÓN DEL ROMPEOLAS OESTE EN EL PUERTO '
    'DE MANZANILLO" — completing the western breakwater at Manzanillo port via DA rather than competitive '
    'tender for a massive port infrastructure project; (2) ISSSTE 1.999B DA (2022-12-06) for "TRABAJOS '
    'PARA LLEVAR A CABO LA CONS..." (construction works) at ISSSTE facilities. Additional ISSSTE DA '
    'contracts total 3.39B at 62%DA across 8 contracts. Top institutions: ASIPONA Manzanillo (1c, 4.15B, '
    '100%DA); ISSSTE (8c, 3.39B, 62%DA); SCT (16c, 2.45B, 6%DA — legitimate competitive). The 4.15B '
    'ASIPONA DA appears to be a "complementary works" direct award similar to the CICSA/FONATUR '
    '"extraordinary works" pattern documented in Case 170 — where an original competitive project has '
    'cost overruns or scope expansions recognized via DA outside the original tender. LOW confidence: '
    'GAMI is a legitimate engineering firm with mostly competitive contracts (11.7% overall DA); the two '
    'large DAs may have legal justification under LAASSP Art. 41 exceptions. Document for monitoring; '
    'cross-reference with ASF Cuenta Pública 2020-2022 for Manzanillo port and ISSSTE construction audits.'
)
insert_vendor(cid, 139, 'primary', 'low')
insert_contracts(cid, 139)


# ──────────────────────────────────────────────────────────────────────────────
# FP flags in aria_queue
# ──────────────────────────────────────────────────────────────────────────────
print('\nSetting FP flags in aria_queue...')

aria_exists = conn.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='aria_queue'"
).fetchone()

if aria_exists:
    cur = conn.execute("PRAGMA table_info(aria_queue)")
    aria_cols = [row[1] for row in cur.fetchall()]

    if 'fp_structural_monopoly' in aria_cols:
        for vid in [39208, 227880, 99916, 18406]:
            r = conn.execute('UPDATE aria_queue SET fp_structural_monopoly=1 WHERE vendor_id=?', (vid,))
            print(f'  VID={vid}: fp_structural_monopoly=1 ({r.rowcount} row(s))')
    else:
        print('  fp_structural_monopoly column not found — skipping')

    if 'fp_data_error' in aria_cols:
        for vid in [114541]:
            r = conn.execute('UPDATE aria_queue SET fp_data_error=1 WHERE vendor_id=?', (vid,))
            print(f'  VID={vid}: fp_data_error=1 ({r.rowcount} row(s))')
    else:
        print('  fp_data_error column not found — skipping')

    conn.commit()
    print('FP flags set for VIDs: 39208 (NOBLE), 227880 (APP), 99916 (AGUAS), 18406 (COBRA), 114541 (CONSULTORES_ERROR)')
else:
    print('  aria_queue table not found — skipping FP flags')


# ──────────────────────────────────────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────────────────────────────────────
total_cases = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]

gtc_exists = conn.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='ground_truth_contracts'"
).fetchone()
total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0] if gtc_exists else 0

conn.close()
print(f'\nGT Summary: {total_cases} cases | {total_vendors} vendors | {total_contracts} contracts')
