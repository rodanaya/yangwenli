"""Insert Cases 38+: Grupo Zohmex, ADIBSA Construcciones, and more."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3

DB = 'RUBLI_NORMALIZED.db'
conn = sqlite3.connect(DB)
today = '2026-03-08T00:00:00'

def insert_case(case_id, name, case_type, y1, y2, amt, confidence, src_asf, src_news, src_legal, notes):
    conn.execute("""INSERT OR IGNORE INTO ground_truth_cases
        (case_id,case_name,case_type,year_start,year_end,estimated_fraud_mxn,confidence_level,source_asf,source_news,source_legal,notes,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        (case_id,name,case_type,y1,y2,amt,confidence,src_asf,src_news,src_legal,notes,today))

def insert_vendor(case_id, vendor_id, vendor_name, rfc, role, evidence_strength, notes):
    conn.execute("""INSERT OR IGNORE INTO ground_truth_vendors
        (case_id,vendor_id,vendor_name_source,rfc_source,role,evidence_strength,match_method,match_confidence,notes,created_at)
        VALUES (?,?,?,?,?,?,'vendor_match','high',?,?)""",
        (case_id,vendor_id,vendor_name,rfc,role,evidence_strength,notes,today))

def insert_contracts(case_id, vendor_id):
    cids = [r[0] for r in conn.execute('SELECT id FROM contracts WHERE vendor_id=?', (vendor_id,)).fetchall()]
    for cid in cids:
        conn.execute("""INSERT OR IGNORE INTO ground_truth_contracts
            (case_id,contract_id,evidence_strength,match_method,match_confidence,created_at)
            VALUES (?,?,'medium','vendor_match','high',?)""", (case_id, cid, today))
    return len(cids)

# CASE 38: Grupo Zohmex — SEDATU Construction Conflict of Interest (2023-2024)
insert_case(
  'GRUPO_ZOHMEX_SEDATU_CONFLICT_2023',
  'Grupo Zohmex SA de CV — SEDATU Construction Conflict of Interest (ASF 2024)',
  'conflict_of_interest',
  2020, 2024, 330000000, 'medium',
  'ASF Cuenta Publica 2023 — probable damage 14.1M MXN (duplicidad de conceptos)',
  'Expansion; Latinus; Animal Politico (2024)',
  'Congressional inquiry; ASF audit SEDATU-OP-009-512-2023',
  'Grupo Zohmex SA de CV received SEDATU contract SEDATU-OP-009-512-2023 (260.7M MXN) for construction works. ASF Cuenta Publica 2023 audit found: (1) duplicidad de conceptos causing probable damage 14.1M MXN; (2) quality execution failures; (3) conflict of interest — Narciso Agundez Gomez, API (Agencia de Promotora y Integradora) director simultaneously served as commissioner of Grupo Zohmex, a direct violation of LAASSP conflict-of-interest provisions. DB: 330M MXN, 7 contracts 2020-2024. Risk_score=0.010 — severe model blind spot (construction fraud + COI invisible to procurement-phase model).'
)
insert_vendor('GRUPO_ZOHMEX_SEDATU_CONFLICT_2023', 254344, 'GRUPO ZOHMEX, S.A DE C.V.', None, 'primary', 'medium',
  '330M MXN | 7 contracts | no RFC in DB | 42.9pct DA rate | SEDATU-OP-009-512-2023 = 260.7M | ASF: 14.1M probable damage | COI: director Narciso Agundez also API commissioner | risk_score=0.010 (blind spot)')
c38 = insert_contracts('GRUPO_ZOHMEX_SEDATU_CONFLICT_2023', 254344)
print(f'Case 38 (Grupo Zohmex): {c38} contracts')

# CASE 39: ADIBSA Construcciones — SEDATU Ghost Construction (2023)
insert_case(
  'ADIBSA_CONSTRUCCIONES_SEDATU_2023',
  'ADIBSA Construcciones SA de CV — SEDATU Construction Contract (2023)',
  'procurement_fraud',
  2023, 2023, 129000000, 'low',
  None,
  'Proceso; La Jornada (2024); MCCI follow-up on SEDATU irregularities',
  'SFP preliminary investigation; linked to SEDATU contractor network',
  'ADIBSA Construcciones SA de CV (RFC: ACO160707FRA) received a 129.3M MXN single contract from SEDATU in 2023 with 0 competition (100% direct award structure). Part of broader SEDATU contractor network investigated after ASF found multiple companies receiving non-competitive construction contracts from the same directorates. Company incorporated 2016, received major federal contract 7 years later with no established track record. Risk_score=0.016 (low) — consistent with new-vendor blind spot. CONFIDENCE LOW: direct financial harm not yet individually confirmed; included as part of SEDATU network pattern.'
)
insert_vendor('ADIBSA_CONSTRUCCIONES_SEDATU_2023', 267054, 'ADIBSA CONSTRUCCIONES SA DE CV', 'ACO160707FRA', 'primary', 'low',
  '129M MXN | 1 contract | RFC:ACO160707FRA | SEDATU direct award 2023 | incorporated 2016 | no competition | risk_score=0.016 (low)')
c39 = insert_contracts('ADIBSA_CONSTRUCCIONES_SEDATU_2023', 267054)
print(f'Case 39 (ADIBSA): {c39} contracts')

conn.commit()

total_cases = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
print(f'\n=== GROUND TRUTH TOTALS ===')
print(f'Cases:     {total_cases}')
print(f'Vendors:   {total_vendors}')
print(f'Contracts: {total_contracts}')
conn.close()
