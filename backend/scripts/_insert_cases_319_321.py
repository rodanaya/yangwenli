"""Insert GT cases 319-321: ESMA Instalaciones, Constructora Germer, Telecomunicación y Equipos."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3

DB = "RUBLI_NORMALIZED.db"

def insert_cases():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    cases = [
        {
            'case_id': 'ESMA_INSTALACIONES_CAPUFE_CARRETERAS_2010_2025',
            'case_name': 'ESMA Instalaciones — Rehabilitación Carreteras CAPUFE/SCT 7.72B Sin RFC 2010-2025',
            'case_type': 'institution_capture',
            'confidence_level': 'medium',
            'description': 'ESMA Instalaciones SA de CV (sin RFC) recibió 7.72B MXN en 113 contratos de CAPUFE (3.84B, 59c), SCT/SICT (2.33B) y BANOBRAS (1.35B) para rehabilitación de autopistas y carreteras. 96.5% vía licitación pública pero con alta concentración en infraestructura carretera federal.',
            'total_amount': 7720000000,
            'vendor_ids': [54881],
        },
        {
            'case_id': 'CONSTRUCTORA_GERMER_IMSS_OBRAS_2002_2025',
            'case_name': 'Constructora Germer — Construcción/Rehabilitación IMSS 6.80B Sin RFC (contrato 4.57B sospechoso)',
            'case_type': 'overpricing',
            'confidence_level': 'medium',
            'description': 'Constructora Germer SA de CV (sin RFC) recibió 6.80B MXN del IMSS (93 contratos, 6.43B = 94.5% del total). Un solo contrato de 2007 por 4.57B MXN para "Reparación de Acabados Incluyendo Pintura" es extremadamente sospechoso — reparación de acabados y pintura no justifica un contrato de 4.57B.',
            'total_amount': 6800000000,
            'vendor_ids': [6602],
        },
        {
            'case_id': 'TELECOMUNICACION_EQUIPOS_MEDICOS_IMSS_ISSSTE_DA',
            'case_name': 'Telecomunicación y Equipos — Equipo Médico/Mantenimiento IMSS/ISSSTE 4.89B DA 39.4% Sin RFC',
            'case_type': 'institution_capture',
            'confidence_level': 'medium',
            'description': 'Telecomunicación y Equipos SA de CV (sin RFC) recibió 4.89B MXN del IMSS (2.87B), ISSSTE (1.33B) y SEDENA (256M) en equipo médico y servicios de mantenimiento. El nombre sugiere telecomunicaciones pero 95% de contratos son equipo médico — industry mismatch significativo. Contrato 2014 cita "titularidad de patente o licenciamiento exclusivo" para justificar DA de mantenimiento.',
            'total_amount': 4890000000,
            'vendor_ids': [13415],
        },
    ]

    for case in cases:
        cur.execute("""
            INSERT OR IGNORE INTO ground_truth_cases
            (case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn)
            VALUES (?,?,?,?,?,?)
        """, (case['case_id'], case['case_name'], case['case_type'], case['confidence_level'],
              case['description'], case['total_amount']))

        case_db_id = cur.lastrowid
        if case_db_id == 0:
            case_db_id = cur.execute("SELECT id FROM ground_truth_cases WHERE case_id=?", (case['case_id'],)).fetchone()[0]
        print(f"Case db_id={case_db_id}: {case['case_name'][:60]}")

        for vendor_id in case['vendor_ids']:
            vname = conn.execute('SELECT name FROM vendors WHERE id=?', (vendor_id,)).fetchone()
            vname = vname[0] if vname else f'VID_{vendor_id}'
            cur.execute("INSERT OR IGNORE INTO ground_truth_vendors (case_id, vendor_id, vendor_name_source, evidence_strength, match_method) VALUES (?,?,?,?,?)",
                        (case_db_id, vendor_id, vname, case['confidence_level'], 'aria_auto'))
            contracts = conn.execute('SELECT id FROM contracts WHERE vendor_id=?', (vendor_id,)).fetchall()
            for (cid,) in contracts:
                cur.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)", (case_db_id, cid))
            print(f"  VID={vendor_id}: {len(contracts)} contracts")

    conn.commit()
    print(f"\nGT: {conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]} cases")
    print(f"    {conn.execute('SELECT COUNT(*) FROM ground_truth_vendors WHERE vendor_id IS NOT NULL').fetchone()[0]} vendors")
    print(f"    {conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]} contracts")
    conn.close()

if __name__ == '__main__':
    insert_cases()
