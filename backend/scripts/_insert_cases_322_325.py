"""Insert GT cases 322-333.

Cases 322-325: Perez Zepeda, Silodisa, Distribuidora Luna, Ing. ADM (ARIA auto-detected).
Cases 330-333: Dragados CONAGUA, Grupo Operativo ISSSTE, Lavanderia Hospitales, GVARGAS Pemex.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3

DB = "RUBLI_NORMALIZED.db"

# --- Cases 322-325 (original ARIA detections) ---
CASES_A = [
    {
        'id': 322,
        'case_id': 'PEREZ_ZEPEDA_INC_ABARROTES_ANOMALY',
        'case_name': 'Persona Física Pérez Zepeda — Contrato Anómalo de Abarrotes INC',
        'case_type': 'overpricing',
        'confidence_level': 'medium',
        'estimated_fraud_mxn': 726_000_000,
        'notes': (
            'Persona física suministrando abarrotes al Instituto Nacional de Cardiología. '
            'Contrato 2018 por 725.8M MXN es anómalo vs demás contratos (100K-4M). Sin RFC. 92% DA.'
        ),
        'vendor_ids': [149312],
    },
    {
        'id': 323,
        'case_id': 'SILODISA_ISSSTE_CADENA_SUMINISTRO',
        'case_name': 'Silodisa SAPI — Monopolio de Cadena de Suministro Farmacéutico ISSSTE',
        'case_type': 'concentrated_monopoly',
        'confidence_level': 'medium',
        'estimated_fraud_mxn': 3_310_000_000,
        'notes': (
            'Silodisa obtuvo contrato de 2.87B MXN en 2017 para cadena de suministro de medicamentos ISSSTE. '
            'Monopolio logístico farmacéutico. Estructura SAPI. Sin RFC.'
        ),
        'vendor_ids': [200238],
    },
    {
        'id': 324,
        'case_id': 'DISTRIBUIDORA_LUNA_MATERIAL_CURACION',
        'case_name': 'Distribuidora Médica Luna — Contrato Anómalo Material de Curación ISSSTE',
        'case_type': 'overpricing',
        'confidence_level': 'medium',
        'estimated_fraud_mxn': 714_000_000,
        'notes': (
            'Contrato 2017 por 714.1M MXN concentra 96% del valor total. '
            'Demás 77 contratos suman <28.4M. Ratio anómala 25:1. Sin RFC.'
        ),
        'vendor_ids': [14312],
    },
    {
        'id': 325,
        'case_id': 'ING_ADM_CFE_SCT_INFRAESTRUCTURA',
        'case_name': 'Ingeniería y Servicios ADM — Contratos Multi-Sector CFE/SCT/CAPUFE',
        'case_type': 'concentrated_monopoly',
        'confidence_level': 'low',
        'estimated_fraud_mxn': 2_540_000_000,
        'notes': (
            '2.54B MXN en 19 contratos (2011-2018) con CFE, SCT, CAPUFE. '
            '73.7% licitación pública — menor riesgo procedimental. Sin RFC.'
        ),
        'vendor_ids': [84232],
    },
]

# --- Cases 330-333 (user-specified) ---
CASES_B = [
    (330, 'DRAGADOS_CONAGUA_INSTITUTION_CAPTURE',
     'Dragados y Urbanizaciones Siglo 21 — Captura Institucional CONAGUA',
     'institution_capture', 2006, 2025, 3218000000, None, None, None, 'medium',
     'Vendor concentrado 94% en CONAGUA (84/89 contratos, 3.18B MXN). 85% single-bid. '
     'Patron P6: domina obra hidraulica federal 19 anios. Sin RFC.'),
    (331, 'GRUPO_OPERATIVO_ISSSTE_VIGILANCIA',
     'Grupo Operativo Internacional — Monopolio Vigilancia ISSSTE',
     'concentrated_monopoly', 2003, 2015, 652000000, None, None, None, 'medium',
     'Seguridad privada con 97% valor en ISSSTE (631M/652M). '
     'Contratos plurianuales vigilancia 2005-2015. 72% single-bid. Sin RFC.'),
    (332, 'LAVANDERIA_HOSPITALES_MONOPOLIO_SALUD',
     'Lavanderia de Hospitales y Sanatorios — Monopolio Lavanderia Sector Salud',
     'concentrated_monopoly', 2002, 2025, 4064000000, None, None, None, 'medium',
     'Monopolio lavanderia hospitalaria ISSSTE/IMSS-Bienestar/IMSS/HGM/SSA. '
     '157 contratos, 64% single-bid, 23 anios. 4.06B MXN. Sin RFC.'),
    (333, 'GVARGAS_PEMEX_INTERMEDIARIO',
     'GVARGAS Comercializadora — Intermediario Equipo Seguridad Pemex',
     'single_use_intermediary', 2008, 2019, 509000000, None, None, None, 'medium',
     'Comercializadora generica, 75% valor en Pemex-EP (380M/509M). '
     '67.8% DA, 83 contratos. Commodities via intermediario. Sin RFC.'),
]

VENDORS_B = [
    (330, 24384, 'DRAGADOS Y URBANIZACIONES SIGLO 21 S.A. DE C.V.', None,
     'primary', 'circumstantial', 'exact_name', 1.0,
     '94% CONAGUA, 85% single-bid, 19 anios'),
    (331, 13583, 'GRUPO OPERATIVO INTERNACIONAL EN SEGURIDAD PRIVADA, S.A. DE C.V.', None,
     'primary', 'circumstantial', 'exact_name', 1.0,
     '97% ISSSTE, vigilancia plurianual, 72% single-bid'),
    (332, 4699, 'LAVANDERIA DE HOSPITALES Y SANATORIOS S.A. DE C.V.', None,
     'primary', 'circumstantial', 'exact_name', 1.0,
     'Monopolio lavanderia multi-institucional 23 anios'),
    (333, 34768, 'GVARGAS COMERCIALIZADORA SA DE CV', None,
     'primary', 'circumstantial', 'exact_name', 1.0,
     'Intermediario commodities Pemex, 67.8% DA'),
]


def main():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    # Cases 322-325
    for case in CASES_A:
        cur.execute("""
            INSERT OR IGNORE INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn)
            VALUES (?,?,?,?,?,?,?)
        """, (case['id'], case['case_id'], case['case_name'], case['case_type'],
              case['confidence_level'], case['notes'], case['estimated_fraud_mxn']))
        case_db_id = case['id']
        print(f"Case {case_db_id}: {case['case_name'][:60]}")
        for vendor_id in case['vendor_ids']:
            vname = conn.execute('SELECT name FROM vendors WHERE id=?', (vendor_id,)).fetchone()
            vname = vname[0] if vname else f'VID_{vendor_id}'
            cur.execute(
                "INSERT OR IGNORE INTO ground_truth_vendors "
                "(case_id, vendor_id, vendor_name_source, evidence_strength, match_method) "
                "VALUES (?,?,?,?,?)",
                (case_db_id, vendor_id, vname, case['confidence_level'], 'aria_auto'))
            ids = conn.execute('SELECT id FROM contracts WHERE vendor_id=?', (vendor_id,)).fetchall()
            for (cid,) in ids:
                cur.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                            (case_db_id, cid))
            print(f"  VID={vendor_id}: {len(ids)} contracts")

    # Cases 330-333
    for c in CASES_B:
        cur.execute("""
            INSERT OR IGNORE INTO ground_truth_cases
            (id, case_id, case_name, case_type, year_start, year_end, estimated_fraud_mxn,
             source_asf, source_news, source_legal, confidence_level, notes)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        """, c)
        print(f"Case {c[0]}: {c[2][:60]}")

    for v in VENDORS_B:
        cur.execute("""
            INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, rfc_source, role,
             evidence_strength, match_method, match_confidence, notes)
            VALUES (?,?,?,?,?,?,?,?,?)
        """, v)
        vid = v[1]
        ids = cur.execute("SELECT id FROM contracts WHERE vendor_id=?", (vid,)).fetchall()
        for (cid,) in ids:
            cur.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                        (v[0], cid))
        print(f"  VID={vid}: {len(ids)} contracts")

    conn.commit()
    total_cases = cur.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
    total_vendors = cur.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE vendor_id IS NOT NULL").fetchone()[0]
    total_contracts = cur.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
    print(f"\nGT totals: {total_cases} cases, {total_vendors} vendors, {total_contracts} contracts")
    conn.close()


if __name__ == '__main__':
    main()
