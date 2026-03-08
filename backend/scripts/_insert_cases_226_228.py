"""Insert GT cases 226-228: IMSS fraud ecosystem."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3

DB = "RUBLI_NORMALIZED.db"

def insert_case(cur, case_id, case_name, case_type, year_start, year_end, estimated_fraud_mxn, confidence_level, notes):
    cur.execute("INSERT OR IGNORE INTO ground_truth_cases (case_id, case_name, case_type, year_start, year_end, estimated_fraud_mxn, confidence_level, notes) VALUES (?,?,?,?,?,?,?,?)",
        (case_id, case_name, case_type, year_start, year_end, estimated_fraud_mxn, confidence_level, notes))
    return cur.execute("SELECT id FROM ground_truth_cases WHERE case_id=?", (case_id,)).fetchone()[0]

def insert_vendor(cur, case_db_id, vendor_id, vendor_name_source, rfc_source, role, evidence_strength, match_method, match_confidence, notes):
    cur.execute("INSERT OR IGNORE INTO ground_truth_vendors (case_id, vendor_id, vendor_name_source, rfc_source, role, evidence_strength, match_method, match_confidence, notes) VALUES (?,?,?,?,?,?,?,?,?)",
        (case_db_id, vendor_id, vendor_name_source, rfc_source, role, evidence_strength, match_method, match_confidence, notes))

def link_contracts(cur, case_db_id, vendor_id):
    cur.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) SELECT ?, c.id FROM contracts c WHERE c.vendor_id=?", (case_db_id, vendor_id))
    return cur.rowcount

conn = sqlite3.connect(DB)
cur = conn.cursor()

# Case 226
db_id = insert_case(cur, 'DIMM_EQUIPO_MEDICO_COVID_IMSS_DA',
    'Distribuidora Equipo Medico Industrial Mexico - Consumibles IMSS DA COVID',
    'procurement_fraud', 2019, 2020, 5670000000, 'medium',
    'Distribuidora sin RFC que recibio 3.895B via DA en dic-2020 para equipo critico COVID y 1.77B via DA pre-COVID. Patron de compra emergencia COVID sin licitacion.')
insert_vendor(cur, db_id, 26454, 'DISTRIBUIDORA DE EQUIPO MEDICO E INDUSTRIAL DE MEXICO SA DE CV', None, 'beneficiary', 'high', 'vendor_id', 0.99, 'DA IMSS 3.609B+286M en dic-2020 consumibles criticos COVID, 1.77B DA nov-2019')
n = link_contracts(cur, db_id, 26454)
print(f"Case DIMM_EQUIPO_MEDICO_COVID: id={db_id}, {n} contracts")

# Case 227
db_id2 = insert_case(cur, 'PROVEEDORA_SERVICIOS_SALUD_FINANCIERO_DA',
    'Proveedora Servicios Empresariales - Salud Financiero NAFINSA BANCOMEXT DA',
    'institution_capture', 2020, 2025, 6908000000, 'low',
    'Empresa sin RFC que monopoliza servicios de salud para 6 instituciones financieras federales. 6.9B total, mix LP/DA.')
insert_vendor(cur, db_id2, 82544, 'PROVEEDORA DE SERVICIOS EMPRESARIALES Y SOLUCIONES OPTIMAS SA DE CV', None, 'beneficiary', 'medium', 'vendor_id', 0.99, 'Managed healthcare para NAFINSA, BANCOMEXT, CNBV, BANJERCITO, Bco Bienestar, SHF. No RFC.')
n2 = link_contracts(cur, db_id2, 82544)
print(f"Case PROVEEDORA_SERVICIOS_SALUD: id={db_id2}, {n2} contracts")

# Case 228
db_id3 = insert_case(cur, 'LAMAP_ARMOT_LIMPIEZA_IMSS_SHELLS_2022',
    'LAMAP + ARMOT - Nuevas Empresas Shell Limpieza Hospitalaria IMSS 2021-2022',
    'ghost_company', 2023, 2025, 8390000000, 'medium',
    'Dos empresas creadas en 2021-2022 que capturan 8.4B en contratos de limpieza hospitalaria IMSS. Patron similar al IPN Cartel de la Limpieza a escala nacional.')
insert_vendor(cur, db_id3, 308216, 'LAMAP SA DE CV', 'LAM211108FQA', 'primary', 'high', 'rfc', 0.99, 'Empresa creada nov-2021, capturo 4.725B en limpieza hospitalaria IMSS 2024-2025.')
insert_vendor(cur, db_id3, 291667, 'ARMOT SEGURIDAD PRIVADA Y SERVICIOS INSTITUCIONALES SA DE CV', 'ASP220621KC5', 'secondary', 'high', 'rfc', 0.99, 'Empresa creada jun-2022, nombre seguridad pero contratos de limpieza IMSS/ISSSTE. Mismatch industria.')
n3a = link_contracts(cur, db_id3, 308216)
n3b = link_contracts(cur, db_id3, 291667)
print(f"Case LAMAP_ARMOT: id={db_id3}, {n3a+n3b} contracts")

conn.commit()

# Summary
print("\nGT Summary:")
cases_count = conn.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
vendors_count = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
contracts_count = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
print(f"{cases_count} cases | {vendors_count} vendors | {contracts_count} contracts")
conn.close()
