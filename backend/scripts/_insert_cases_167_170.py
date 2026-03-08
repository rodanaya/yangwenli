"""Insert GT cases 167-170: SAVI medical supply, COMERCIALIZADORA PRODUCTOS, OCEANOGRAFIA expansion, CICSA FONATUR DA."""
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

# Case 167: SAVI DISTRIBUCIONES - IMSS+ISSSTE medical supply
cid = insert_case(
    'SAVI_DISTRIBUCIONES_IMSS_ISSSTE_MEDICAL_DA',
    'Savi Distribuciones IMSS+ISSSTE Medical Supply 22%DA - 17.15B',
    'procurement_fraud',
    2003, 2025,
    17150000000,
    'medium',
    'SAVI DISTRIBUCIONES SA de CV (sin RFC) received 17.15B MXN in 1,213 contracts '
    'at 22.3%DA from government health institutions: IMSS (10.10B, 775 contracts), '
    'ISSSTE (4.44B, 137 contracts), Secretaría de Salud (0.68B), SEDENA (0.62B, single 618M DA). '
    'Largest contracts: IMSS 837M LP (2012), 786M LP (2013), 763M LP (2014), 641M LP (2014), '
    'SEDENA 618M DA (2013-11-20), IMSS 618M Inv (undated). '
    'SAVI operates across 14 years in the government health supply chain. '
    'Pattern similar to COMERCIALIZADORA PRODUCTOS INSTITUCIONALES and other IMSS pharma ring participants. '
    '22.3% DA rate is below the high-suspicion threshold (70%+) but the SEDENA DA for 618M '
    'in 2013 (military health supply at single direct award without RFC) is a notable red flag. '
    'The sustained 14-year relationship with IMSS and ISSSTE at Licitación for medicines '
    'suggests a privileged supplier position rather than open competition. '
    'Medium confidence: DA rate is lower than typical procurement fraud, but scale and no-RFC pattern '
    'combined with SEDENA DA warrant inclusion. Potential connection to broader IMSS pharma ring.'
)
insert_vendor(cid, 3846, 'primary', 'medium')
insert_contracts(cid, 3846)

# Case 168: COMERCIALIZADORA PRODUCTOS INSTITUCIONALES - IMSS+ISSSTE medicines
cid = insert_case(
    'COMERCIALIZADORA_PRODUCTOS_INST_IMSS_MEDICAMENTOS',
    'Comercializadora Productos Institucionales IMSS+ISSSTE Medicines 27%DA - 23.41B',
    'procurement_fraud',
    2002, 2025,
    23410000000,
    'medium',
    'Comercializadora de Productos Institucionales SA de CV (sin RFC) received 23.41B MXN '
    'in 1,816 contracts at 27.3%DA from government health institutions over 24 years: '
    'IMSS (16.88B, 1,146 contracts), ISSSTE (5.73B, 196 contracts), SEDENA (0.16B), PEMEX (0.09B). '
    'Largest contracts: IMSS 1,011M LP (2018-01-01, MEDICAMENTOS), 652M LP (2017), '
    '544M LIC (2019, MEDICAMENTOS), 475M LP (2015), 435M LP (2008). '
    'COMPRANET description consistently: "MEDICAMENTOS" (medicines/pharmaceuticals). '
    'At 24 years of active supply to IMSS+ISSSTE, this is one of the longest-tenured '
    'government pharmaceutical distributors in the dataset. '
    'Pattern: while individual contract procedures are mostly Licitación (legitimate), '
    'the 24-year continuous supply relationship without a single break suggests '
    'barriers to entry for competing distributors — a form of de facto monopoly. '
    'No RFC for a company with 23.41B in pharmaceutical supply over 24 years is unusual. '
    'The 27.3% DA rate includes renewal contracts where "continuity of supply" justifies DA. '
    'Medium confidence: similar to Case 162 (AXTEL, 14.04B telecom monopoly) — '
    'procurement monopoly through entrenched institutional relationships.'
)
insert_vendor(cid, 4636, 'primary', 'medium')
insert_contracts(cid, 4636)

# Case 169: OCEANOGRAFIA expansion (add as separate case documenting the full scale)
# Note: Case 7 already exists for Oceanografia with 54 contracts linked after our fix
# This case documents the full 22.46B scope explicitly
cid = insert_case(
    'OCEANOGRAFIA_PEMEX_FULL_SCALE_22B',
    'Oceanografia PEMEX Full Scale 22.46B — Banamex Fraud Expansion (50 contracts)',
    'procurement_fraud',
    2000, 2014,
    22460000000,
    'high',
    'Oceanografía SA de CV (VID=48) received 22.46B MXN in 50 contracts exclusively from '
    'PEMEX Exploración y Producción (PEP) at 0%DA (all via Licitación). '
    'Largest contracts: 4,875M (2007-09-20), 2,341M (2008-02-01), 1,479M (2005-05-20), '
    '1,339M (2006-09-04), 1,261M (2008-10-13). '
    'DOCUMENTED CORRUPTION: Oceanografía SA de CV was the center of the 2014 Banamex scandal '
    'where Citigroup disclosed a $400-585M fraud after Oceanografía used fake PEMEX receivables '
    'as collateral for short-term credit. Citigroup/Banamex fired ~30 employees and wrote off losses. '
    'PEMEX cancelled all contracts with Oceanografía in February 2014. '
    'Mexico\'s PGR (now FGR) opened investigations under Amado Yáñez Osuna, Oceanografía founder. '
    'The 22.46B in PEMEX contracts represents the procurement side of the scheme: '
    'Oceanografía inflated contract values and used PEMEX receivables fraudulently. '
    'This case documents the FULL 22.46B scope — Case 7 (OCEANOGRAFIA, 2 contracts via VID 8362) '
    'only captured 0.73B. VID 48 adds the remaining 21.73B across 50 contracts. '
    'High confidence: fully documented, multiple government and judicial proceedings.'
)
insert_vendor(cid, 48, 'primary', 'high')
insert_vendor(cid, 8362, 'secondary', 'high')
# Contracts already linked via the fix above, so avoid double-counting
# Only insert for VID 48 if not already linked to this case
n_169 = conn.execute('''INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id)
    SELECT ?, id FROM contracts WHERE vendor_id=48''', (cid,)).rowcount
conn.commit()
print(f'  -> {n_169} contracts linked for VID 48 → case {cid}')
n_169b = conn.execute('''INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id)
    SELECT ?, id FROM contracts WHERE vendor_id=8362''', (cid,)).rowcount
conn.commit()
print(f'  -> {n_169b} contracts linked for VID 8362 → case {cid}')

# Case 170: CICSA FONATUR TREN MAYA Direct Award irregularity
# CICSA itself is mostly legitimate (Licitación), but the 3.35B DA for "extraordinary works"
# and the FONATUR Tren Maya 16B LIC warrant documentation
cid = insert_case(
    'CICSA_FONATUR_TREN_MAYA_NAICM_DA_IRREGULARITIES',
    'CICSA FONATUR Tren Maya DA "Extraordinary Works" 3.35B + NAICM 84.83B — Carso Group',
    'procurement_fraud',
    2016, 2025,
    3350000000,
    'low',
    'Operadora CICSA SA de CV (VID=36961, Grupo Carso/Slim) received 140.53B MXN total '
    'in 35 contracts, primarily through Licitación for NAICM (cancelled airport) and '
    'FONATUR Tren Maya (active railway). Notable contracts: '
    '84.83B LIC (2017-02-13, Grupo Aeroportuario de la Ciudad de México — NAICM), '
    '27.45B LIC (2025-09-30, ARTF — Tren Saltillo-Nuevo Laredo 111km, Segmentos 13 y 14), '
    '15.99B LIC (2020-05-12, FONATUR — Tren Maya platform and track construction), '
    '3.35B AD (2024-07-04, FONATUR Tren Maya — "RECONOCE LOS TRABAJOS EXTRAORDINARIOS" '
    '[recognizes extraordinary works]). '
    'The 3.35B DA in July 2024 for "extraordinary works" is the key red flag: '
    'FONATUR unilaterally recognizing 3.35B in extra costs outside the original LIC tender '
    'violates LAASSP which requires DA justification beyond original contract scope. '
    'The Tren Maya project (total budget: ~300B MXN) has been documented by ASF and '
    'investigative press (Aristegui Noticias, Proceso) for lack of transparent competitive '
    'bidding and cost overruns. CICSA (Slim/Carso) received the largest single contracts. '
    'Context: Carlos Slim (Grupo Carso) has been a vocal supporter of Tren Maya; '
    'conflict of interest concerns raised by Mexican civil society. '
    'LOW confidence: main contracts are LP; only the 3.35B DA is clearly irregular. '
    'The NAICM contracts (now cancelled) add complexity — CICSA was paid partial completion. '
    'Document for monitoring; escalate if ASF Cuenta Pública 2024 confirms irregularities.'
)
insert_vendor(cid, 36961, 'primary', 'low')
insert_contracts(cid, 36961)

# Summary
total_cases = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
print(f'\nGT Summary: {total_cases} cases | {total_vendors} vendors | {total_contracts} contracts')
conn.close()
