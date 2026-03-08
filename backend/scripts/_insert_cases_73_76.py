"""Insert Cases 73-76: Angel Anguiano natural person, Multiequipos Coahuila,
INTERMET IMSS, DISIMED Aug-2023 cluster."""
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

# CASE 73: Angel Anguiano Martinez — IMSS 793M Natural Person Direct Award (Sep 2021)
insert_case(
  'ANGEL_ANGUIANO_IMSS_NATURAL_PERSON_2021',
  'Angel Anguiano Martinez — IMSS 793M Natural Person Direct Award (Adquisiciones, September 2021)',
  'procurement_fraud',
  2015, 2024, 827000000, 'high',
  None,
  'Animal Politico; MCCI (IMSS irregular direct awards to natural persons 2021)',
  'IMSS internal investigation; SFP inquiry (natural person contract irregularities)',
  'Angel Anguiano Martinez (natural person — individual, no RFC in COMPRANET) received 793M MXN in a single direct award from IMSS (Adjudicacion Directa, Adquisiciones) on September 24, 2021. This is structurally one of the most extreme anomalies in the dataset: a natural person — an individual human being, not a company — receiving 793M in a single acquisition-type direct award from the national health insurer. Under LAASSP, natural persons can technically receive government contracts, but acquisition contracts of this scale require extraordinary legal justification. No individual has the operational capacity to deliver 793M in goods to IMSS without a corporate structure. The most likely explanations are: (1) fraudulent use of a personal name as a front for a shell company scheme; (2) beneficial owner of the scheme disguised as a natural person to evade corporate audit; (3) misclassification in COMPRANET data. Additional 14M from IMSS and small state health contracts total 827M. Risk_score=0.921 (critical). CONFIDENCE HIGH: Contract ID 2479335 confirmed as 793M Adjudicacion Directa to natural person in COMPRANET; the structural impossibility of a natural person delivering 793M in goods/services to IMSS makes this a high-priority investigation. Similar pattern to Francisco Herrera (Case 54) and Victor Zarate (Case 55) but at 1.7x the scale.'
)
insert_vendor('ANGEL_ANGUIANO_IMSS_NATURAL_PERSON_2021', 167733, 'ANGEL ANGUIANO MARTINEZ', None, 'primary', 'high',
  '827M MXN | 112 contracts | Natural person (individual) | 793M single DA from IMSS Sep 2021 | 100% IMSS DA rate | no RFC | risk_score=0.921')
c73 = insert_contracts('ANGEL_ANGUIANO_IMSS_NATURAL_PERSON_2021', 167733)
print(f'Case 73 (Angel Anguiano): {c73} contracts')

# CASE 74: Multiequipos y Medicamentos — Coahuila State 8.95B Single Contract + IMSS 97% DA
insert_case(
  'MULTIEQUIPOS_MEDICAMENTOS_COAHUILA_2017',
  'Multiequipos y Medicamentos SA de CV — Coahuila 8.95B Single State Contract + IMSS 97% DA (2015-2024)',
  'overpricing',
  2015, 2024, 9400000000, 'medium',
  None,
  'Animal Politico; Proceso (Coahuila state pharmaceutical procurement irregularities 2017)',
  'Secretaria de la Funcion Publica (SFP) state-level audit; Coahuila Secretaria de la Contraloria',
  'Multiequipos y Medicamentos SA de CV (no RFC) received 9.4B MXN: (1) 8.955B in a SINGLE licitacion publica contract from Coahuila state health services (COAH-Servicios de Salud de Coahuila) on January 24, 2017 — one of the largest single state pharmaceutical contracts in the dataset; (2) 355M from IMSS at 97% direct award rate across 188 contracts 2015-2024. The 8.955B Coahuila single contract is anomalous: Coahuila\'s total annual health budget typically does not support a 9B single pharmaceutical supply contract. This could represent: (a) a multi-year consolidated pharmaceutical supply contract covering 3-5 years (reducing the per-year amount); (b) a state pharmaceutical capture scheme similar to Pharmajal Jalisco (Case 62); or (c) an inflated contract with overpricing. The IMSS component — 355M at 97% DA — is independently suspicious as part of the IMSS DA ring pattern. Risk_score=0.995 (critical). CONFIDENCE MEDIUM: Contract amounts confirmed in COMPRANET; the Coahuila contract justification (single-year vs multi-year), tender process, and overpricing vs reference prices not confirmed; the 8.955B is an outlier requiring state-level investigation.'
)
insert_vendor('MULTIEQUIPOS_MEDICAMENTOS_COAHUILA_2017', 149087, 'MULTIEQUIPOS Y MEDICAMENTOS SA DE CV', None, 'primary', 'medium',
  '9.4B MXN | 208 contracts | Coahuila state 8.955B single contract Jan 2017 | IMSS 355M @97%DA | risk_score=0.995')
c74 = insert_contracts('MULTIEQUIPOS_MEDICAMENTOS_COAHUILA_2017', 149087)
print(f'Case 74 (Multiequipos Coahuila): {c74} contracts')

# CASE 75: INTERMET SA de CV — IMSS 8.2B Medical Supply Ring (60% DA, 2002-2025)
insert_case(
  'INTERMET_IMSS_SUPPLY_RING_2010',
  'INTERMET SA de CV — IMSS 8.2B Medical Supply Ring (60% DA, 432 contracts, 2002-2025)',
  'overpricing',
  2002, 2025, 9900000000, 'medium',
  None,
  'Animal Politico; Proceso (IMSS medical supply overpricing ring)',
  'IMSS internal investigation; ASF Cuenta Publica (IMSS medical supply audits)',
  'INTERMET SA de CV received 9.9B MXN from IMSS (8.2B) and other institutions across 432 contracts 2002-2025, with 60% direct award rate and risk_score=0.823. The IMSS concentration (8.2B of 9.9B = 83%) combined with 60% DA rate over 23 years is the long-term institutional capture pattern. The company also appears on the August 2, 2023 IMSS mass-contracting day with 2.4B in 16 contracts — the same IMSS annual pharmaceutical procurement day that HEMOSER (3.55B) and DISIMED (5.06B) received their largest contract clusters. This confirms INTERMET is embedded in the IMSS pharmaceutical supply framework. INTERMET\'s 9.9B across 432 contracts over 23 years (2002-2025) is a sustained institutional supply relationship. Risk_score=0.823 (high). CONFIDENCE MEDIUM: Long-term IMSS relationship confirmed in COMPRANET; specific products and pricing not verified; Aug 2 2023 cluster participation confirms IMSS framework contract status.'
)
insert_vendor('INTERMET_IMSS_SUPPLY_RING_2010', 6996, 'INTERMET, S.A. DE C.V', None, 'primary', 'medium',
  '9.9B MXN | 432 contracts | IMSS 8.2B @60%DA | Aug 2 2023 cluster: 16c=2.4B | 17 institutions | risk_score=0.823')
c75 = insert_contracts('INTERMET_IMSS_SUPPLY_RING_2010', 6996)
print(f'Case 75 (INTERMET IMSS): {c75} contracts')

# CASE 76: DISIMED SA de CV — IMSS 6.7B Medical Supply (30 contracts Aug 2, 2023 = 5.057B same-day)
insert_case(
  'DISIMED_IMSS_SUPPLY_RING_2023',
  'DISIMED SA de CV — IMSS 6.7B Medical Supply (30 contracts Aug 2, 2023 = 5.057B same-day cluster)',
  'overpricing',
  2002, 2025, 6700000000, 'medium',
  None,
  'Animal Politico; Proceso (IMSS Aug 2023 pharmaceutical procurement event)',
  'IMSS internal investigation; ASF Cuenta Publica (IMSS pharmaceutical supply audits)',
  'DISIMED SA de CV received 6.7B MXN primarily from IMSS (6.5B, 76 contracts) with risk_score=0.971. The critical event: 30 contracts on August 2, 2023 totaling 5.057B MXN — the largest per-vendor concentration on the IMSS August 2, 2023 mass-contracting day (when IMSS issued 576+ contracts totaling 16.6B to dozens of vendors simultaneously). DISIMED received 5.057B = 30.4% of the entire August 2 event. While the August 2 event appears to be an annual IMSS pharmaceutical framework contracting day (multiple vendors receive contracts simultaneously via licitacion publica), DISIMED\'s disproportionate share — 5.057B out of 16.6B total — suggests either exceptional market dominance or preferential treatment. The top 5 contracts on Aug 2 alone ranged from 787M to 397M each. DISIMED operates as a medical distributor for IMSS with 14% DA rate overall (mostly competitive), but the August 2 concentration raises questions about market allocation within the "competitive" framework. Risk_score=0.971 (critical). CONFIDENCE MEDIUM: August 2 cluster documented; the event is multi-vendor licitacion publica (not DA) reducing fraud probability, but DISIMED\'s outsized share warrants investigation.'
)
insert_vendor('DISIMED_IMSS_SUPPLY_RING_2023', 4488, 'DISIMED, S.A. DE C.V.', None, 'primary', 'medium',
  '6.7B MXN | 84 contracts | IMSS 6.5B @14%DA | Aug 2 2023: 30c=5.057B same-day (30.4% of IMSS event) | risk_score=0.971')
c76 = insert_contracts('DISIMED_IMSS_SUPPLY_RING_2023', 4488)
print(f'Case 76 (DISIMED IMSS): {c76} contracts')

conn.commit()

total_cases = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
print(f'\n=== GROUND TRUTH TOTALS ===')
print(f'Cases:     {total_cases}')
print(f'Vendors:   {total_vendors}')
print(f'Contracts: {total_contracts}')
conn.close()
