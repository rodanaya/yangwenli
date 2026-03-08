"""Insert Cases 40-42: Drive Producciones, Grupo GOI SP, Mednes Solutions — SFP-sanctioned ISSSTE/IMSS vendors."""
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

# CASE 40: Drive Producciones — ISSSTE Contract Fraud (2019)
insert_case(
  'DRIVE_PRODUCCIONES_ISSSTE_2019',
  'Drive Producciones SA de CV — ISSSTE Contract Fraud (SFP inhabilitacion)',
  'procurement_fraud',
  2019, 2021, 657000000, 'medium',
  None,
  'DOF SFP sanction registry; Secretaria Anticorrupcion y Buen Gobierno sanctions list',
  'SFP inhabilitacion con multa (SANCIONATORIA CON MULTA E INHABILITACION); registered Directorio de Sancionados',
  'Drive Producciones SA de CV (RFC: DPR100421R59) received two ISSSTE contracts on the same day (2019-07-03) totaling 656.9M MXN (335.8M + 321.1M), both through Licitacion Publica process. Subsequently sanctioned by SFP with inhabilitacion and fine for contract non-compliance or false documentation. Company name ("Producciones") suggests media/events firm, inconsistent with ISSSTE supply contracts — industry mismatch indicator. DB: 657M MXN, 2 contracts, risk_score=0.065 (low — model blind spot: same-day pair detected but licitacion procedure reduces score). CONFIDENCE MEDIUM: SFP sanction confirmed; specific fraud mechanism not yet individually documented in press.'
)
insert_vendor('DRIVE_PRODUCCIONES_ISSSTE_2019', 245743, 'DRIVE PRODUCCIONES SA DE CV', 'DPR100421R59', 'primary', 'medium',
  '657M MXN | 2 contracts | RFC:DPR100421R59 | ISSSTE 2019-07-03 x2 (335.8M+321.1M) | SFP inhabilitada+multa | industry mismatch (producciones→ISSSTE) | risk_score=0.065 blind spot')
c40 = insert_contracts('DRIVE_PRODUCCIONES_ISSSTE_2019', 245743)
print(f'Case 40 (Drive Producciones): {c40} contracts')

# CASE 41: Grupo GOI SP — ISSSTE COVID-Era Direct Award (2020)
insert_case(
  'GRUPO_GOI_SP_ISSSTE_COVID_2020',
  'Grupo GOI SP SA de CV — ISSSTE COVID-Era Direct Award (SFP inhabilitacion)',
  'procurement_fraud',
  2020, 2022, 201000000, 'medium',
  None,
  'DOF SFP sanction registry; Secretaria Anticorrupcion y Buen Gobierno sanctions list',
  'SFP inhabilitacion con multa; COVID-era procurement irregularities investigation',
  'Grupo GOI SP SA de CV (RFC: GGS110208EV3) received a 200.8M MXN direct award (Adjudicacion Directa) from ISSSTE on April 1, 2020 — during COVID-19 emergency procurement period when direct awards were widely abused. Subsequently sanctioned by SFP with inhabilitacion and fine. COVID-era ISSSTE direct awards became a systemic fraud vector (see also case BIRMEX_MEDICINE_OVERPRICING_2025 for parallel patterns). DB: 201M MXN, 1 contract. Risk_score=0.035 (very low — model blind spot: single direct award, new vendor, no concentration history). CONFIDENCE MEDIUM: SFP sanction confirmed; specific fraud mechanism (overpricing, false docs, non-delivery) not individually confirmed in press.'
)
insert_vendor('GRUPO_GOI_SP_ISSSTE_COVID_2020', 258886, 'GRUPO GOI SP SA DE CV', 'GGS110208EV3', 'primary', 'medium',
  '201M MXN | 1 contract | RFC:GGS110208EV3 | ISSSTE direct award April 2020 (COVID) | SFP inhabilitada+multa | risk_score=0.035 severe blind spot')
c41 = insert_contracts('GRUPO_GOI_SP_ISSSTE_COVID_2020', 258886)
print(f'Case 41 (Grupo GOI SP): {c41} contracts')

# CASE 42: Mednes Solutions — IMSS/INSABI Medical Fraud (2019-2020)
insert_case(
  'MEDNES_SOLUTIONS_IMSS_INSABI_2019_2020',
  'Mednes Solutions SA de CV — IMSS/INSABI Medical Supply Fraud (SFP inhabilitacion)',
  'overpricing',
  2019, 2021, 145000000, 'medium',
  None,
  'DOF SFP sanction registry; Secretaria Anticorrupcion y Buen Gobierno sanctions list',
  'SFP inhabilitacion con multa (SANCIONATORIA CON MULTA E INHABILITACION)',
  'Mednes Solutions SA de CV (RFC: MSO160926C28) supplied medical goods/services to IMSS and INSABI (Instituto de Salud para el Bienestar) across 44 contracts 2019-2020, totaling 145M MXN. Contracts span multiple procedure types (Licitacion Publica, Otras Contrataciones, Adjudicacion Directa). Company subsequently sanctioned by SFP with inhabilitacion and fine. In the context of BIRMEX/IMSS overpricing scandals of 2019-2020, this company matches the pattern of small medical suppliers charging above-consolidated prices. Risk scores: 0.23-0.27 (medium, correctly flagged by model). CONFIDENCE MEDIUM: SFP sanction confirmed; specific unit overpricing vs consolidated prices not individually quantified.'
)
insert_vendor('MEDNES_SOLUTIONS_IMSS_INSABI_2019_2020', 232878, 'MEDNE SOLUTIONS SA DE CV', 'MSO160926C28', 'primary', 'medium',
  '145M MXN | 44 contracts | RFC:MSO160926C28 | IMSS+INSABI 2019-2020 | SFP inhabilitada+multa | risk_score=0.23-0.27 (medium, correctly detected)')
c42 = insert_contracts('MEDNES_SOLUTIONS_IMSS_INSABI_2019_2020', 232878)
print(f'Case 42 (Mednes Solutions): {c42} contracts')

conn.commit()

total_cases = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
print(f'\n=== GROUND TRUTH TOTALS ===')
print(f'Cases:     {total_cases}')
print(f'Vendors:   {total_vendors}')
print(f'Contracts: {total_contracts}')
conn.close()
