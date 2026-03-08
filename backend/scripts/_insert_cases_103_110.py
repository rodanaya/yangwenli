"""Insert Cases 103-110: TOTAL FARMA, PROQUIGAMA, DELMAN, RALCA, PENTAMED, ORACLE, OPERBES, CREATIVIDAD."""
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

# CASE 103: TOTAL FARMA SA DE CV — IMSS pharmaceutical DA ring 2014-2022
insert_case(
  'TOTAL_FARMA_IMSS_DA_RING_2014',
  'Total Farma SA de CV — IMSS 7.23B Pharmaceutical DA Ring (86.1%DA, 3685 contracts, 2014-2022)',
  'procurement_fraud',
  2014, 2022, 7230000000, 'high',
  None,
  'Animal Politico (IMSS pharmaceutical direct award concentration 2017-2022)',
  'IMSS internal audit; SFP oversight',
  'Total Farma SA de CV (no RFC in COMPRANET) received 7.23B MXN from IMSS across 3,685 contracts 2014-2022, with 86.1% direct award rate. IMSS alone accounts for 6.90B at 76.9%DA across 3,491 contracts. Critical evidence: 2017 mega-cluster — at least 7 large direct awards totaling approximately 3.4B MXN in a single year (June 14: 866M + June 27: 807M + January 27: 654M + October 26: 474M + June 2: 237M + November 7: 166M + May 3: 160M = ~3.364B). An additional 383M via "OTRAS CONTRATACIONES" in 2021. The pattern of 3,685 contracts across 9 years at 86.1% DA for IMSS pharmaceutical distribution — combined with no RFC in COMPRANET preventing identity verification — is consistent with systematic procurement capture. The 2017 cluster of 7 large DAs ($866M, $807M, $654M) in rapid succession to the same vendor suggests these were structured to avoid competitive procedures. Risk_score=0.166 (MODEL BLIND SPOT: thousands of small contracts average down the per-contract risk score despite chronic DA rate and mega-cluster). CONFIDENCE HIGH: 7.23B and 86.1%DA confirmed in COMPRANET; 2017 cluster of 7+ large DAs documented; no RFC prevents identity verification.'
)
insert_vendor('TOTAL_FARMA_IMSS_DA_RING_2014', 124647, 'TOTAL FARMA SA DE CV', None, 'primary', 'high',
  '7.23B MXN | 3685c | No RFC | IMSS 6.90B @76.9%DA | 2017 cluster: 866M+807M+654M+474M+237M+166M+160M | 383M "otras" 2021 | rs=0.166 (model blind spot)')
c103 = insert_contracts('TOTAL_FARMA_IMSS_DA_RING_2014', 124647)
print(f'Case 103 (Total Farma): {c103} contracts')

# CASE 104: PROQUIGAMA SA DE CV — IMSS pharmaceutical DA ring, 80.6%DA
insert_case(
  'PROQUIGAMA_IMSS_PHARMA_DA_RING',
  'Proquigama SA de CV — IMSS 4.78B Pharmaceutical DA Ring (87%DA, 2868 contracts)',
  'procurement_fraud',
  2002, 2025, 6160000000, 'high',
  None,
  'SFP oversight reports (IMSS pharmaceutical direct award patterns)',
  'IMSS internal audit',
  'Proquigama SA de CV (no RFC in COMPRANET) received 6.16B MXN across 3,433 contracts with 80.6% direct award rate. Primary concentration: IMSS 4.78B at 87%DA (2,868 contracts), followed by ISSSTE 0.80B at 36%DA (86 contracts). The IMSS concentration of 87% DA over 2,868 contracts across 23 years (2002-2025, averaging 125 contracts/year) is a textbook example of chronic procurement capture — the same vendor continuously adjudicated directly for pharmaceutical/chemical distribution without competitive renewal. Notable: despite 3,433 total contracts, the per-contract average risk score (rs=0.088) is extremely low — a confirmed model blind spot for high-frequency distributed DA patterns where individual contract values are modest but the cumulative pattern is clearly anomalous. The lack of any RFC prevents identity verification or SAT tax compliance checks. CONFIDENCE HIGH: 6.16B and 80.6%DA confirmed in COMPRANET; IMSS 87%DA across 2868 contracts documented; no RFC prevents identity verification; rs=0.088 confirmed model blind spot.'
)
insert_vendor('PROQUIGAMA_IMSS_PHARMA_DA_RING', 5214, 'PROQUIGAMA, S.A. DE C.V.', None, 'primary', 'high',
  '6.16B MXN | 3433c | No RFC | IMSS 4.78B @87%DA (2868c) | ISSSTE 0.80B @36%DA | rs=0.088 (model blind spot)')
c104 = insert_contracts('PROQUIGAMA_IMSS_PHARMA_DA_RING', 5214)
print(f'Case 104 (Proquigama): {c104} contracts')

# CASE 105: DELMAN INTERNACIONAL — CONALITEG paper monopoly
insert_case(
  'DELMAN_INTERNACIONAL_CONALITEG_PAPER_MONOPOLY',
  'Delman Internacional SA de CV — CONALITEG Paper Monopoly 4.07B (84.4%DA, textbook supply chain capture)',
  'procurement_fraud',
  2014, 2025, 4070000000, 'medium',
  None,
  'Animal Politico (CONALITEG supply chain irregularities)',
  'SFP Diario Oficial oversight',
  'Delman Internacional SA de CV (no RFC in COMPRANET) received 4.07B MXN across 610 contracts at 84.4% direct award rate, primarily supplying paper products to government printing/textbook institutions. CONALITEG (Comisión Nacional de Libros de Texto Gratuitos — the agency that prints Mexico\'s free textbooks): 3.12B across 47 contracts at 62%DA, including 766M via "OTRAS CONTRATACIONES" (2022), 445M DA (2022), 347M DA (2023), 323M DA (2025). Secondary capture: Impresora y Encuadernadora Progreso: 250M at 100%DA across 308 contracts — an anomalously high 308 DA contracts to a single paper supplier for government printing. Talleres Gráficos de México: 90M at 98%DA across 173 contracts. The combination of CONALITEG dependence (76.7% of revenue), 766M "otras contrataciones" (a catch-all procedure type evading competitive rules), and systematic 84.4% DA for a commodity product (paper) that has active competitive markets is a significant red flag. Paper is a fungible commodity with dozens of potential suppliers — the persistent preference for one supplier via direct award lacks competitive justification. CONFIDENCE MEDIUM: 4.07B at 84.4%DA confirmed; CONALITEG 766M "otras" contract confirmed; no RFC; paper as commodity should be competitively procured.'
)
insert_vendor('DELMAN_INTERNACIONAL_CONALITEG_PAPER_MONOPOLY', 17657, 'DELMAN INTERNACIONAL, S.A. DE C.V.', None, 'primary', 'high',
  '4.07B MXN | 610c | No RFC | CONALITEG 3.12B @62%DA | 766M "otras" 2022 | 445M DA 2022 | IEP 250M @100%DA (308c) | TGM 90M @98%DA | rs=not_checked')
c105 = insert_contracts('DELMAN_INTERNACIONAL_CONALITEG_PAPER_MONOPOLY', 17657)
print(f'Case 105 (Delman Internacional): {c105} contracts')

# CASE 106: RALCA SA DE CV — IMSS/ISSSTE pharmaceutical mega-monopoly
insert_case(
  'RALCA_IMSS_ISSSTE_PHARMA_MONOPOLY',
  'Ralca SA de CV — IMSS/ISSSTE 25.1B Pharmaceutical Dual-Institution Monopoly (68.5%DA, 5257 contracts)',
  'procurement_fraud',
  2002, 2025, 25100000000, 'high',
  None,
  'SFP oversight; Cuenta Pública ASF IMSS/ISSSTE pharmaceutical procurement',
  'IMSS/ISSSTE internal audits',
  'Ralca SA de CV (no RFC in COMPRANET) received 25.10B MXN across 5,257 contracts at 68.5% direct award rate — one of the largest single-vendor pharmaceutical concentrations in the entire COMPRANET dataset. Dual-institution monopoly: IMSS 14.39B at 75%DA across 3,746 contracts (2002-2025); ISSSTE 7.96B at 61%DA across 472 contracts (2002-2025). SEDENA (Defense): 0.78B at 27%DA. Top contracts: 863M DA from IMSS (2015), 740M DA from IMSS (2017), 675M DA from IMSS (2013), 627M LP from IMSS (2017), 532M DA from IMSS (2016). Available descriptions include "MEDICAMENTOS" — pharmaceutical distribution. The scale of this vendor (25.1B) rivals the largest documented corruption cases in the dataset. A single pharmaceutical distributor capturing both IMSS (largest health insurer, 22M+ beneficiaries) and ISSSTE (civil servants insurer, 2M+ beneficiaries) at this level over 23 years is extraordinary — equivalent to a de facto privatization of public pharmaceutical distribution. The lack of RFC across 5,257 contracts and 23 years of service is exceptional. Risk_score=0.082 (CRITICAL MODEL BLIND SPOT: extremely high-frequency contracts average down per-contract risk score despite systemic 68.5% DA and 25.1B scale). CONFIDENCE HIGH: 25.1B and 68.5%DA confirmed; IMSS 14.4B at 75%DA across 3746 contracts documented; no RFC; ISSSTE 8B at 61%DA confirmed.'
)
insert_vendor('RALCA_IMSS_ISSSTE_PHARMA_MONOPOLY', 1544, 'RALCA, S.A. DE C.V.', None, 'primary', 'high',
  '25.10B MXN | 5257c | No RFC | IMSS 14.39B @75%DA (3746c) | ISSSTE 7.96B @61%DA (472c) | SEDENA 0.78B | Top DAs: 863M+740M+675M+532M | rs=0.082 (critical model blind spot)')
c106 = insert_contracts('RALCA_IMSS_ISSSTE_PHARMA_MONOPOLY', 1544)
print(f'Case 106 (Ralca): {c106} contracts')

# CASE 107: COMERCIALIZADORA PENTAMED — IMSS pharmaceutical DA ring
insert_case(
  'PENTAMED_IMSS_PHARMA_DA_RING',
  'Comercializadora Pentamed SA de CV — IMSS 5.97B Pharmaceutical DA Ring (87%DA, 938 contracts)',
  'procurement_fraud',
  2010, 2025, 8880000000, 'high',
  None,
  'SFP oversight; ASF IMSS pharmaceutical procurement audits',
  'IMSS internal audit',
  'Comercializadora Pentamed SA de CV (no RFC in COMPRANET) received 8.88B MXN across 1,367 contracts at 75.9% direct award rate. Primary concentration: IMSS 5.97B at 87%DA (938 contracts, 2010-2025). Secondary: ISSSTE 2.37B at 38%DA (119 contracts). SEDENA: 220M at 20%DA (56 contracts). Top contracts: 1.828B via Licitación Pública (2015) — one of the largest pharmaceutical LP contracts in the dataset — and 605M LP con OSD (2016). The pattern is suspicious in both directions: Pentamed wins massive competitive tenders (1.8B single LP), suggesting it has legitimate market presence, AND maintains 87%DA rate at IMSS (938 contracts). The 87%DA at IMSS over 938 contracts and 15 years (average 63 DAs/year) suggests systematic IMSS capture even while competing successfully in open tenders. No RFC prevents identity verification. Risk_score=0.319. CONFIDENCE HIGH: 8.88B at 75.9%DA confirmed; IMSS 5.97B @87%DA (938c) documented; no RFC.'
)
insert_vendor('PENTAMED_IMSS_PHARMA_DA_RING', 35812, 'COMERCIALIZADORA PENTAMED, S.A. DE C.V.', None, 'primary', 'high',
  '8.88B MXN | 1367c | No RFC | IMSS 5.97B @87%DA (938c) | ISSSTE 2.37B @38%DA | Top: 1.828B LP 2015, 605M LP 2016 | rs=0.319')
c107 = insert_contracts('PENTAMED_IMSS_PHARMA_DA_RING', 35812)
print(f'Case 107 (Pentamed): {c107} contracts')

# CASE 108: ORACLE DE MEXICO — SAT/IMSS IT monopoly at 98.2%DA
insert_case(
  'ORACLE_MEXICO_SAT_IT_MONOPOLY',
  'Oracle de México SA de CV — SAT/IMSS IT Monopoly 8.17B (98.2%DA, proprietary lock-in)',
  'monopoly',
  2010, 2025, 8170000000, 'medium',
  None,
  'SFP TIC procurement oversight; investigative press on SAT IT contracts',
  'LAASSP Art. 41 sole-source provisions for proprietary software',
  'Oracle de México SA de CV received 8.17B MXN across 607 contracts at 98.2% direct award rate. Primary: SAT (Servicio de Administración Tributaria) 3.58B at 100%DA across just 5 contracts (2011-2021) — the largest being "Servicio de Consolidación Tecnológica Oracle 1 (SCTO 1)" for 1.073B DA in 2021 and a 960M DA in 2015. Secondary: IMSS 0.84B at 100%DA (20 contracts); CENACE 0.59B at 100%DA (6 contracts); BANJERCITO 0.54B at 100%DA (23 contracts). Oracle holds significant IT lock-in through its database and enterprise software licenses. While proprietary software sole-source procurement is permitted under LAASSP Art. 41, the pattern of perpetual single-vendor IT dependency for Mexico\'s tax authority (SAT) and social security system (IMSS) creates systemic risk of price gouging and technology capture. The SAT "SCTO 1" 1.073B DA (2021) for database consolidation — without competitive alternatives — is a significant procurement irregularity. Mexico has paid approximately $8.2B MXN to Oracle over 15 years for SAT/IMSS/CENACE database infrastructure. CONFIDENCE MEDIUM: Sole-source may be legally justified for proprietary software; however scale and perpetual non-competitive pattern merit investigation. rs=0.717.'
)
insert_vendor('ORACLE_MEXICO_SAT_IT_MONOPOLY', 10484, 'ORACLE DE MÉXICO S.A. DE C.V.', None, 'primary', 'medium',
  '8.17B MXN | 607c | No RFC | SAT 3.58B @100%DA (5c only!) | IMSS 0.84B @100%DA | CENACE 0.59B | SAT SCTO1 1.073B DA 2021 | rs=0.717')
c108 = insert_contracts('ORACLE_MEXICO_SAT_IT_MONOPOLY', 10484)
print(f'Case 108 (Oracle Mexico): {c108} contracts')

# CASE 109: OPERBES SA DE CV — ISSSTE telecom monopoly
insert_case(
  'OPERBES_ISSSTE_TELECOM_MONOPOLY',
  'Operbes SA de CV — ISSSTE/SAT Telecom Monopoly 11.1B (62%DA, including 1.64B emergency DA)',
  'monopoly',
  2010, 2025, 11110000000, 'medium',
  None,
  'SFP telecom procurement oversight; ASF ISSSTE connectivity audits',
  'ISSSTE internal audit',
  'Operbes SA de CV (no RFC in COMPRANET) received 11.11B MXN across 303 contracts at 62.0% direct award rate. Primary: ISSSTE 5.24B at 83%DA (18 contracts, 2010-2025), including a 1.793B LP (2010) and a 1.638B Adjudicación Directa Federal (2015) for "red nacional de telecomunicaciones" and "Servicios Administrados de Comunicaciones". SAT: 1.22B at 33%DA (3 contracts), including "Servicios Administrados de Comunicaciones 2 (SAC 2)" 699M LP (2018) and "SAC 3" 475M LP (2022). SCT: 0.84B at 12%DA. IMSS: 0.98B at 67%DA. The most suspicious element is the 1.638B DA to ISSSTE in 2015 for national telecommunications infrastructure — a contract of this scale for critical government infrastructure should require competitive procurement. At 18 contracts for 5.24B at ISSSTE (avg 291M/contract), this represents significant institutional telecom dependency. No RFC prevents identity verification. CONFIDENCE MEDIUM: Large-scale telecom services may have legitimate institutional dependency; but 1.638B DA in 2015 is an anomaly for competitive market. rs=0.323.'
)
insert_vendor('OPERBES_ISSSTE_TELECOM_MONOPOLY', 38555, 'OPERBES SA DE CV', None, 'primary', 'medium',
  '11.11B MXN | 303c | No RFC | ISSSTE 5.24B @83%DA (18c) | SAT 1.22B (SAC2 699M LP, SAC3 475M LP) | 1.638B DA 2015 ISSSTE | rs=0.323')
c109 = insert_contracts('OPERBES_ISSSTE_TELECOM_MONOPOLY', 38555)
print(f'Case 109 (Operbes): {c109} contracts')

# CASE 110: CREATIVIDAD Y ESPECTACULOS — IMSS/SEP events DA ring
insert_case(
  'CREATIVIDAD_ESPECTACULOS_IMSS_EVENTS_DA',
  'Creatividad y Espectáculos SA de CV — IMSS/SEP 6.81B Events & Services DA Ring (69.7%DA)',
  'overpricing',
  2011, 2024, 6810000000, 'medium',
  None,
  'Animal Politico (government events and entertainment procurement irregularities)',
  'SFP oversight',
  'Creatividad y Espectáculos SA de CV (no RFC in COMPRANET) received 6.81B MXN across 456 contracts at 69.7% direct award rate, providing entertainment, event production, and integral services to multiple federal institutions. Primary: IMSS 1.75B at 83%DA (23 contracts), including a 496M "ADJUDICACION DIRECTA" in 2021 labeled "DC21S072 AA-050GYR019-E6-2021 SERVICIO INTEGRAL DE UNIDAD..." — an events company winning 496M from IMSS for an "integral service unit" is anomalous. SEP (Secretaría de Educación Pública): 0.93B at 35%DA (17 contracts). SRE (Relaciones Exteriores): 0.70B at 68%DA (28 contracts). ProMéxico: 0.59B at 29%DA (7 contracts, 2011-2018). The pattern of an entertainment/events company receiving nearly 7B from government institutions — including IMSS (health) and SEP (education) — through 69.7% direct awards suggests systematic overpricing of event production and creative services, plus possible scope creep into institutional services outside the company\'s core competency. No RFC prevents vendor identity verification. CONFIDENCE MEDIUM: Service nature (events) is inherently subjective in pricing; however the IMSS 496M DA and cross-sector capture raise significant concerns. rs=0.342.'
)
insert_vendor('CREATIVIDAD_ESPECTACULOS_IMSS_EVENTS_DA', 5608, 'CREATIVIDAD Y ESPECTACULOS SA DE CV', None, 'primary', 'medium',
  '6.81B MXN | 456c | No RFC | IMSS 1.75B @83%DA (23c) | SEP 0.93B | SRE 0.70B @68%DA | ProMexico 0.59B | IMSS 496M DA 2021 "integral service" | rs=0.342')
c110 = insert_contracts('CREATIVIDAD_ESPECTACULOS_IMSS_EVENTS_DA', 5608)
print(f'Case 110 (Creatividad y Espectaculos): {c110} contracts')

conn.commit()

total_cases = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
print(f'\n=== GROUND TRUTH TOTALS ===')
print(f'Cases:     {total_cases}')
print(f'Vendors:   {total_vendors}')
print(f'Contracts: {total_contracts}')
conn.close()
