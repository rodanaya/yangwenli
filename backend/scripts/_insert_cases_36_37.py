"""Insert Cases 36-37: GRUFESA + Grupo Industrial Asad."""
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

# CASE 36: GRUFESA — Pharmaceutical Oligopoly and SFP Sanctions
insert_case(
  'GRUFESA_PHARMA_OLIGOPOLY_2012_2020',
  'GRUFESA Grupo Farmacos Especializados — Pharma Oligopoly + SFP Inhabilitacion',
  'monopoly',
  2007, 2020, 15000000000, 'medium',
  None,
  'El Universal; Sin Embargo; Animal Politico (2019-2020); Proceso; PODER Latam',
  'SFP inhabilitacion 2 years (false information to IMSS bidding process); COFECE monopoly investigation (2019); AMLO presidential veto (April 2019)',
  'GRUFESA (Grupo Farmacos Especializados SA de CV) was the largest pharmaceutical supplier to IMSS/ISSSTE with 35.2pct market share and 106.8B MXN in contracts 2012-2018. SFP inhabilitada 2 years for stating under oath that all offered medicines were manufactured in Mexico when one brand was foreign. AMLO vetoed in April 2019 for suspected monopoly practices. COFECE opened monopoly investigation. Also identified with 79.1pct direct award rate (6,360 contracts, 133.4B MXN total 2007-2020 in DB). Got court injunction to challenge AMLO veto. Market concentration meets OECD flagging criteria. Confidence MEDIUM: regulatory violations + SFP sanction confirmed; criminal conviction pending.'
)
insert_vendor('GRUFESA_PHARMA_OLIGOPOLY_2012_2020', 29277, 'GRUPO FARMACOS ESPECIALIZADOS, S.A. DE C.V.', 'GFE061004F65', 'primary', 'medium',
  '133.4B MXN | 6,360 contracts | RFC:GFE061004F65 (IMSS portal) | no RFC in DB | SFP inhabilitada 2yr | 35.2pct IMSS/ISSSTE market share 2012-2018 | 79.1pct DA rate | risk_score=0.981 (model DETECTS)')
c36 = insert_contracts('GRUFESA_PHARMA_OLIGOPOLY_2012_2020', 29277)
print(f'Case 36 (GRUFESA): {c36} contracts')

# CASE 37: Grupo Industrial Asad — Uniform Contract Non-Compliance (2025-2026)
insert_case(
  'GRUPO_INDUSTRIAL_ASAD_UNIFORM_FRAUD_2022_2025',
  'Grupo Industrial Asad SA de CV — Clothing/Uniform Contract Non-Compliance (SFP 2026)',
  'procurement_fraud',
  2015, 2025, 905000000, 'medium',
  None,
  'Infobae (Feb 11 2026); La Cronica (Feb 10 2026); Gaceta de Tamaulipas',
  'SFP inhabilitacion 15 months + fine 791,980 MXN (published DOF Feb 10 2026); registered Directorio de Sancionados',
  'Grupo Industrial Asad SA de CV accumulated 4 rescinded contracts in 4 months 20 days, all related to consolidated acquisition of clothing, uniforms, footwear and equipment. Secretaria Anticorrupcion y Buen Gobierno (formerly SFP) sanctioned with 791,980 MXN fine and 15-month inhabilitacion (DOF Feb 10, 2026). Now blocked from new federal contracts. DB: 905M MXN across 173 contracts 2015-2025. Main clients: ISSSTE and IMSS. Risk score 0.128 — LOW detection despite confirmed SFP sanction.'
)
insert_vendor('GRUPO_INDUSTRIAL_ASAD_UNIFORM_FRAUD_2022_2025', 148733, 'GRUPO INDUSTRIAL ASAD SA DE CV', None, 'primary', 'medium',
  '905M MXN | 173 contracts | no RFC in DB | main clients ISSSTE + IMSS | 70.5pct DA rate | 4 contracts rescinded in 5 months | SFP inhabilitada 15mo Feb 2026 | fine 791,980 MXN | risk_score=0.128 (low — not detected)')
c37 = insert_contracts('GRUPO_INDUSTRIAL_ASAD_UNIFORM_FRAUD_2022_2025', 148733)
print(f'Case 37 (Asad): {c37} contracts')

conn.commit()

total_cases = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
print(f'\n=== GROUND TRUTH TOTALS ===')
print(f'Cases:     {total_cases}')
print(f'Vendors:   {total_vendors}')
print(f'Contracts: {total_contracts}')
conn.close()
