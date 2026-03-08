"""Insert GT cases 229-231."""
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

# Case 229: Tren Maya rail supply DA switch (Asimex del Caribe + Sumitomo)
db_id = insert_case(cur, 'FONATUR_TREN_MAYA_RIELES_DA_SWITCH',
    'Tren Maya Rieles FONATUR - Switch LP a DA 2022 (Asimex del Caribe + Sumitomo)',
    'procurement_fraud', 2020, 2022, 3820000000, 'low',
    'Asimex del Caribe y Sumitomo Corp Mexico suministraron rieles para Tren Maya via LP en 2020 pero via DA en 2022. Switch de LP a DA para mismo material es patrón de corrupción. Sumitomo: 2.566B DA oct-2022. Asimex: 1.251B DA nov-2022.')
insert_vendor(cur, db_id, 259308, 'ASIMEX DEL CARIBE SA DE CV', 'ACA870319MDA', 'primary', 'medium', 'rfc', 0.95, 'DA 1.251B nov-2022 rieles Tren Maya FONATUR, previo LP dic-2020')
insert_vendor(cur, db_id, 258808, 'SUMITOMO CORPORATION DE MEXICO', 'SCM780701MBA', 'secondary', 'medium', 'rfc', 0.95, 'DA 2.566B oct-2022 rieles Tren Maya FONATUR, previo LP dic-2020')
n1a = link_contracts(cur, db_id, 259308)
n1b = link_contracts(cur, db_id, 258808)
print(f"Case FONATUR_TREN_MAYA_RIELES: id={db_id}, {n1a+n1b} contracts")

# Case 230: GX2 Sinaloa water treatment overpricing
db_id2 = insert_case(cur, 'GX2_DESARROLLOS_SINALOA_POTABILIZADORA_SOBREPRECIO',
    'GX2 Desarrollos Sinaloa - Planta Potabilizadora 5.89B empresa nueva 2020',
    'overpricing', 2022, 2022, 5889000000, 'low',
    'Empresa creada en junio 2020 recibe 5.889B de gobierno municipal Sinaloa para rehabilitación de planta potabilizadora (floculación/sedimentación). Precio 5-15x por encima de valor de mercado para obra equivalente.')
insert_vendor(cur, db_id2, 288609, 'GX2 DESARROLLOS SA DE CV', 'GDE200619SG7', 'primary', 'medium', 'rfc', 0.99, 'Empresa creada jun-2020, primer gran contrato dic-2022 por 5.889B de gob. municipal Sinaloa')
n2 = link_contracts(cur, db_id2, 288609)
print(f"Case GX2_SINALOA: id={db_id2}, {n2} contracts")

# Case 231: CONAGUA security monopoly
db_id3 = insert_case(cur, 'COMERCIALIZADORA_SEGURIDAD_CONAGUA_MONOPOLIO',
    'Comercializadora Seguridad Privada - Monopolio Vigilancia CONAGUA OCLSP 4.34B',
    'institution_capture', 2025, 2025, 4342000000, 'low',
    'Empresa de seguridad privada captura 4.342B MXN en contrato único de vigilancia a inmuebles del Organismo de Cuenca Lerma-Santiago-Pacífico de CONAGUA. Un solo contrato = 99.4% del valor total del proveedor.')
insert_vendor(cur, db_id3, 305483, 'COMERCIALIZADORA DE SEGURIDAD PRIVADA CON RESPONSABILIDAD SOCIAL', 'CSP150702DK4', 'primary', 'medium', 'rfc', 0.99, 'Un contrato 4.342B LP mar-2025 CONAGUA-OCLSP vigilancia inmuebles')
n3 = link_contracts(cur, db_id3, 305483)
print(f"Case CONAGUA_SEGURIDAD: id={db_id3}, {n3} contracts")

conn.commit()

print("\nGT Summary:")
print(conn.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0], "cases")
print(conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0], "vendors")
print(conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0], "contracts")
conn.close()
