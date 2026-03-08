"""Insert GT cases 182-183: PEGSA (Dos Bocas port DA) and INGENIERIA Y CONTROL PROYECTOS (ISSSTE hospital DA)."""
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

# ── Case 182: PEGSA CONSTRUCCIONES — Puerto Dos Bocas ASIPONA DA ──────────────
cid = insert_case(
    'PEGSA_CONSTRUCCIONES_ASIPONA_DOS_BOCAS_DA_8B',
    'Pegsa Construcciones ASIPONA Dos Bocas DA Port Expansion 8.9B (2024-2025)',
    'procurement_fraud',
    2024, 2025,
    8903000000,
    'medium',
    'Pegsa Construcciones SA de CV (VID=56421, sin RFC) received 8.903B MXN in 2 contracts '
    '(100%DA) from Administración del Sistema Portuario Nacional Dos Bocas (ASIPONA Dos Bocas): '
    '0.935B DA (2024-06-13, "CONSTRUCCIÓN DE LA AMPLIACIÓN DEL P..."), '
    '7.968B DA (2025-08-05, "CONSTRUCCIÓN DE LA AMPLIACIÓN DEL P..."). '
    'ASIPONA Dos Bocas is the port authority for Puerto Dos Bocas (Paraíso, Tabasco), the '
    'port serving the PEMEX Olmeca refinery mega-project — the signature infrastructure '
    'initiative of the AMLO administration (2018-2024), with total budget exceeding 400B MXN. '
    'Pre-2024, PEGSA had 0.4B in total government contracts across SCT and port authorities, '
    'all via Licitación Pública. The jump from 0.4B total → 8.9B DA in 2024-2025 at a single '
    'politically-sensitive port authority (connected to the Olmeca refinery) is anomalous. '
    '100% DA for 7.968B in port construction at Dos Bocas (2025) violates LAASSP requirements '
    'for competitive bidding on construction projects above 10M MXN. No RFC for a company '
    'winning 9.3B in public works. The Olmeca refinery-Dos Bocas ecosystem is documented by '
    'ASF (Cuenta Pública 2022, 2023) for contract irregularities, cost overruns (original '
    'estimate: 8B USD, current: 16B+ USD), and PEMEX transparency concerns. '
    'Related to Case 178 (GAMI INGENIERIA, VID=139, 3.35B DA at FONATUR) — same political '
    'environment of post-2020 mega-project direct awards. '
    'Medium confidence: LP→DA jump is clear but port expansion projects can legitimately use '
    'DA for continuation of existing contractors under original LPN framework. Requires ASF '
    'verification of whether PEGSA was original LP winner and whether DA was within legal bounds.'
)
insert_vendor(cid, 56421, 'primary', 'medium')
insert_contracts(cid, 56421)

# ── Case 183: INGENIERIA Y CONTROL DE PROYECTOS — ISSSTE hospital DA 2.5B ─────
cid = insert_case(
    'INGENIERIA_CONTROL_PROYECTOS_ISSSTE_IMSS_HOSPITAL_DA',
    'Ingenieria y Control de Proyectos ISSSTE Hospital DA 2.55B + IMSS 30%DA - 8.99B',
    'procurement_fraud',
    2003, 2024,
    2548000000,
    'medium',
    'Ingeniería y Control de Proyectos SA de CV (VID=16573, sin RFC) received 8.99B MXN in 42 '
    'contracts at 30.9%DA: IMSS (17c, 3.19B, 35.3%DA), ISSSTE (2c, 2.571B, 100%DA), '
    'Sinaloa Obras Públicas (2c, 0.985B, 0%DA), Querétaro Salud (1c, 0.661B, LP), '
    'SLP Salud (1c, 0.643B, LP), and FGR (1c, 0.230B). '
    'Largest contract: ISSSTE 2.548B DA (2022-11-30, "TRABAJOS PARA LLEVAR A CABO LA '
    'CONSTRUCCION..."). Second: IMSS 1.361B LP (2022-09-09, "PROYECTO INTEGRAL PARA LA '
    'REESTRUCTURA..."). The 2.548B DA to ISSSTE in November 2022 for hospital construction '
    'is the key red flag: LAASSP requires competitive bidding for construction above 10M MXN. '
    'A 2.548B DA for hospital construction to a single contractor without RFC is a clear '
    'violation unless emergency or sole-source justification exists. '
    'Pattern: 2003-2016 mostly LP (clean), 2017 onset of DA (66.7%DA), 2022 peak (100%DA ISSSTE). '
    'The parallel 2022 IMSS LP contract vs ISSSTE DA contract for the same contractor in the '
    'same year suggests ISSSTE used DA to bypass the LP process that IMSS required. '
    'No RFC for a company with 9B in hospital construction over 22 years. '
    'Related sector: Health institution construction procurement is a documented corruption '
    'vector (IMSS-INDICIADOS cases, multiple ASF audit findings). '
    'Medium confidence: Hospital construction DA at this scale is abnormal; however, some '
    'ISSSTE hospital projects legitimately use DA for continuation/emergency of existing '
    'contracts. Requires ASF Cuenta Pública 2022 verification for ISSSTE.'
)
insert_vendor(cid, 16573, 'primary', 'medium')
insert_contracts(cid, 16573)

# Summary
total_cases = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
print(f'\nGT Summary: {total_cases} cases | {total_vendors} vendors | {total_contracts} contracts')
conn.close()
