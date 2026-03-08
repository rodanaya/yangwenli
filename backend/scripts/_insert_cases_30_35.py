import sqlite3
import sys

DB = 'RUBLI_NORMALIZED.db'
conn = sqlite3.connect(DB)
today = '2026-03-08T00:00:00'

def get_contract_ids(vendor_ids):
    ids = []
    for vid in vendor_ids:
        rows = conn.execute('SELECT id FROM contracts WHERE vendor_id=?', (vid,)).fetchall()
        ids.extend([r[0] for r in rows])
    return ids

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

def insert_contracts(case_id, vendor_ids):
    cids = get_contract_ids(vendor_ids)
    for cid in cids:
        conn.execute("""INSERT OR IGNORE INTO ground_truth_contracts
            (case_id,contract_id,evidence_strength,match_method,match_confidence,created_at)
            VALUES (?,?,'medium','vendor_match','high',?)""",
            (case_id, cid, today))
    return len(cids)

# CASE 30: BIRMEX Medicine Overpricing 2025
insert_case(
  'BIRMEX_MEDICINE_OVERPRICING_2025',
  'BIRMEX Medicine Overpricing Ring 2025',
  'overpricing',
  2020, 2025, 7000000000, 'high',
  'COFEPRIS sanction; SFP inhabilitacion of Biomics Lab (April 2025)',
  'Animal Politico; El Universal; Proceso; La Silla Rota (April-May 2025)',
  'SFP inhabilitacion definitiva Biomics Lab; Secretaria Anticorrupcion investigation',
  'BIRMEX annulled 26B MXN consolidated medicine purchase after 13B MXN sobreprecio across 175 medication codes. Biomics Lab MX inhabilitada by SFP after falsifying COFEPRIS registration docs. Farmaceuticos Maypo under investigation (6.24B MXN AMLO-era contracts). 59+ companies submitted false documentation. Four BIRMEX officials removed. Largest recent medicine procurement scandal under Sheinbaum administration.'
)
insert_vendor('BIRMEX_MEDICINE_OVERPRICING_2025', 258535, 'BIOMICS LAB MEXICO SA DE CV', 'BLM200122KD7', 'primary', 'high',
  '1.832B MXN | 182 contracts | RFC:BLM200122KD7 | SFP inhabilitada definitiva April 2025 | falsified COFEPRIS docs | risk_score=0.689')
insert_vendor('BIRMEX_MEDICINE_OVERPRICING_2025', 2873, 'FARMACEUTICOS MAYPO S.A DE C.V', None, 'secondary', 'medium',
  '87.97B MXN total (18,772 contracts) | under SFP investigation BIRMEX | 6.24B MXN AMLO era | RFC FMA9301181B1 not in DB | risk_score=0.664')
c30 = insert_contracts('BIRMEX_MEDICINE_OVERPRICING_2025', [258535, 2873])
print(f'Case 30 (BIRMEX): {c30} contracts')

# CASE 31: IMSS Diabetes/Insulin Ring 2022-2024
insert_case(
  'IMSS_DIABETES_OVERPRICING_RING_2022_2024',
  'IMSS Diabetes/Insulin Ring - 19 Shell Companies 1000pct Overpricing',
  'overpricing',
  2022, 2024, 1666000000, 'high',
  None,
  'MCCI (contralacorrupcion.mx) May 2025; Noroeste; Dossier Politico; OjoCivico',
  'Congressional complaint filed; MCCI investigation; IMSS procurement data',
  'IMSS awarded 1,666M MXN across 1,382 contracts to 19 newly-created companies for diabetes and insulin meds at 678-1022pct above consolidated prices. Poyago SA de CV charged 2,300 MXN for sitagliptina/metformina vs 225 MXN consolidated (1022pct markup). Ring linked to Amilcar Olan (former IMSS Tabasco official). Direct award rate rose from 80pct (2018) to 95pct (2023). All companies created shortly before contracts.'
)
insert_vendor('IMSS_DIABETES_OVERPRICING_RING_2022_2024', 300207, 'POYAGO SA DE CV', 'POY121128FY4', 'primary', 'high',
  '373M MXN | 28 contracts | RFC:POY121128FY4 | 2300 MXN vs 225 MXN consolidated = 1022pct markup | linked to Amilcar Olan accountant | risk_score=0.157')
insert_vendor('IMSS_DIABETES_OVERPRICING_RING_2022_2024', 281352, 'GRUPO OSHERX SA DE CV', 'GOS2202175F2', 'primary', 'high',
  '242M MXN | 76 contracts | RFC:GOS2202175F2 | 2150 MXN vs 260 MXN glucose strips = 827pct markup | risk_score=0.072 (blind spot)')
insert_vendor('IMSS_DIABETES_OVERPRICING_RING_2022_2024', 286381, 'PHARMA TRIMED SA DE CV', 'PTR210715AA5', 'primary', 'medium',
  '7M MXN | 1 contract | RFC:PTR210715AA5 | Colima IMSS | 1750 MXN vs 225 MXN = 678pct markup')
c31 = insert_contracts('IMSS_DIABETES_OVERPRICING_RING_2022_2024', [300207, 281352, 286381])
print(f'Case 31 (IMSS Diabetes Ring): {c31} contracts')

# CASE 32: Simulated Competition Ring (Konkistolo/FamilyDuck)
insert_case(
  'KONKISTOLO_SIMULATED_COMPETITION_RING_2022_2025',
  'Konkistolo / FamilyDuck Simulated Competition Ring - 5 Shell Companies',
  'bid_rigging',
  2022, 2025, 1925000000, 'high',
  None,
  'MCCI Anuario de la Corrupcion 2025',
  'SFP inhabilitacion of Adiam Abastecedora (August 2025); identity theft reports',
  'Network of 5 recently-created companies simulated competition in federal tenders. Konkistolo majority partner reported identity theft; non-existent address. FamilyDuck (885M MXN) and Grupo Pelmu (515M MXN) appear as competitors in same procedures. All score 0.000 in v5.1 - complete blind spot (new companies, no historical concentration). Adiam separately inhabilitada 15 months for 11,000 mattress fraud 37.6M MXN. Total network ~1.9B MXN.'
)
insert_vendor('KONKISTOLO_SIMULATED_COMPETITION_RING_2022_2025', 297273, 'KONKISTOLO SA DE CV', 'KON230118UV6', 'primary', 'high',
  '243M MXN | 93 contracts | RFC:KON230118UV6 | non-existent address | identity theft | risk_score=0.000 SEVERE BLIND SPOT')
insert_vendor('KONKISTOLO_SIMULATED_COMPETITION_RING_2022_2025', 293066, 'COMERCIALIZADORA FAMILYDUCK SA DE CV', 'CFA230107UC6', 'primary', 'high',
  '885M MXN | 79 contracts | RFC:CFA230107UC6 | simulated competition co-conspirator | risk_score=0.000 SEVERE BLIND SPOT')
insert_vendor('KONKISTOLO_SIMULATED_COMPETITION_RING_2022_2025', 279096, 'GRUPO PELMU SA DE CV', 'GPE050222296', 'primary', 'high',
  '515M MXN | 217 contracts | RFC:GPE050222296 | simulated competition co-conspirator | risk_score=0.000 SEVERE BLIND SPOT')
insert_vendor('KONKISTOLO_SIMULATED_COMPETITION_RING_2022_2025', 288385, 'TODOLOGOS.COM SA DE CV', 'TOD220214AR9', 'primary', 'medium',
  '163M MXN | 75 contracts | RFC:TOD220214AR9 | co-conspirator | risk_score=0.000 SEVERE BLIND SPOT')
insert_vendor('KONKISTOLO_SIMULATED_COMPETITION_RING_2022_2025', 291049, 'ADIAM ABASTECEDORA DE INSUMOS Y ALIMENTOS MEXICO SA DE CV', 'AAI211104U57', 'associated', 'high',
  '119M MXN | 11 contracts | RFC:AAI211104U57 | SFP inhabilitada 15mo Aug 2025 | mattress fraud 37.6M MXN | ex-mayor Taxco Omar Jalil Flores Majul')
c32 = insert_contracts('KONKISTOLO_SIMULATED_COMPETITION_RING_2022_2025', [297273, 293066, 279096, 288385, 291049])
print(f'Case 32 (Konkistolo ring): {c32} contracts')

# CASE 33: Cloud Enterprise Services / Guardia Nacional Drones
insert_case(
  'CLOUD_ENTERPRISE_GN_DRONE_OVERPRICING_2023',
  'Cloud Enterprise Services - Guardia Nacional Drone Overpricing 2023',
  'overpricing',
  2022, 2024, 125000000, 'medium',
  None,
  'Proceso (Nov 2023); La Silla Rota; La Jornada; Reporte Indigo',
  'Congressional complaint to SFP, FGR, SAT, SHCP, UIF (November 2023)',
  'Cloud Enterprise Services S de RL de CV awarded GN drone contract (119.2M MXN, Oct 2023) despite not scoring highest in tender. Drone airworthiness certificate was amateur registration from Israel (Colugo ARC53 built by amateur). Also held contracts with SEDENA and SHCP. Owner Enrique Ruiz Hernandez. Total: 125M MXN, 25 contracts.'
)
insert_vendor('CLOUD_ENTERPRISE_GN_DRONE_OVERPRICING_2023', 142577, 'CLOUD ENTERPRISE SERVICES S DE RL DE CV', None, 'primary', 'medium',
  '125M MXN | 25 contracts | no RFC in DB | GN drone contract 119.2M MXN Oct 2023 | false airworthiness cert | owner Enrique Ruiz Hernandez | risk_score=0.063')
c33 = insert_contracts('CLOUD_ENTERPRISE_GN_DRONE_OVERPRICING_2023', [142577])
print(f'Case 33 (GN Drones): {c33} contracts')

# CASE 34: Barredora Guinda / Tabasco Network
insert_case(
  'BARREDORA_GUINDA_TABASCO_NETWORK_2024',
  'La Barredora Guinda - Tabasco EFOS Ghost Network (Conagua 2024)',
  'ghost_company',
  2020, 2024, 2360000000, 'high',
  None,
  'MCCI (contralacorrupcion.mx) February 2026; El Sol de Chiapas; UnoTV',
  'SAT EFOS Definitivo (Comercio y Construccion de Tabasco confirmed)',
  'Network of 20 companies linked to Alejandro Marquez El Ganso (friend of ex-secretary Adan Augusto Lopez) received 2.36B MXN from Conagua and state agencies in Tabasco, Campeche, Chiapas, Hidalgo, Puebla, Quintana Roo. Lead company on SAT EFOS Definitivo list. Three linked companies bid together in Conagua river-cleaning procedure May 2024. MCCI published February 2026.'
)
insert_vendor('BARREDORA_GUINDA_TABASCO_NETWORK_2024', 248612, 'COMERCIO Y CONSTRUCCION DE TABASCO SA DE CV', 'CCT1808139U3', 'primary', 'high',
  '23M MXN in DB | 17 contracts | RFC:CCT1808139U3 | SAT EFOS Definitivo | linked to El Ganso / Adan Augusto Lopez | Conagua bidder May 2024 | risk_score=0.006 blind spot')
c34 = insert_contracts('BARREDORA_GUINDA_TABASCO_NETWORK_2024', [248612])
print(f'Case 34 (Barredora Guinda): {c34} contracts')

# CASE 35: Interaccion Biomedica / Clan Biomedica IPN-ISSSTE
insert_case(
  'INTERACCION_BIOMEDICA_IPN_ISSSTE_GHOST_NETWORK',
  'Clan Biomedica - Interaccion Biomedica + 83 Shells (IPN/ISSSTE)',
  'ghost_company',
  2012, 2023, 1613000000, 'high',
  None,
  'Milenio; Infobae (March 2026); La Silla Rota; El Universal',
  'FGR indictment FED/FECC/UNAI-CDMX/0000530/2019; Javier Tapia Santoyo vinculado a proceso March 6 2026',
  'Javier Tapia Santoyo (ex-secretary IPN, ex-treasurer ISSSTE) ran 84 shell companies headed by Interaccion Biomedica SA de CV. Received 1.613B MXN from ISSSTE (2012-2019). Tapia co-director while serving as public official. FGR opened 2019. Tapia formally vinculado March 6, 2026. Company on SAT EFOS definitivo. In DB: 41M MXN / 41 contracts (underrepresented - Structure B coverage gaps).'
)
insert_vendor('INTERACCION_BIOMEDICA_IPN_ISSSTE_GHOST_NETWORK', 148296, 'INTERACCION BIOMEDICA SA DE CV', None, 'primary', 'high',
  '41M MXN in DB | 41 contracts | SAT EFOS definitivo | FGR indictment 2019 | Tapia Santoyo vinculado March 2026 | 84-shell network | 1.613B MXN ISSSTE total | risk_score=0.180')
c35 = insert_contracts('INTERACCION_BIOMEDICA_IPN_ISSSTE_GHOST_NETWORK', [148296])
print(f'Case 35 (Clan Biomedica): {c35} contracts')

conn.commit()

total_cases = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
total_vendors = conn.execute('SELECT COUNT(*) FROM ground_truth_vendors').fetchone()[0]
total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
print(f'\n=== FINAL GROUND TRUTH TOTALS ===')
print(f'Cases:     {total_cases}')
print(f'Vendors:   {total_vendors}')
print(f'Contracts: {total_contracts}')
conn.close()
