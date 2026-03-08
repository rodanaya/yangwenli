"""Insert GT cases 292-294 (Taller Eléctrico González, 3GH Multiservicios, México Montecitos)."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3

DB = "RUBLI_NORMALIZED.db"


def insert_cases():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    max_id = conn.execute('SELECT MAX(id) FROM ground_truth_cases').fetchone()[0]
    print(f'Current max GT case ID: {max_id}')

    cases = [
        {
            'case_id': 'TALLER_ELECTRICO_GONZALEZ_IMSS_NL_DA',
            'case_name': 'Taller Eléctrico González — Monopolio Mantenimiento Electromecánico IMSS Nuevo León (1.01B, 82.6% DA)',
            'case_type': 'institution_capture',
            'confidence_level': 'high',
            'description': (
                'TALLER ELECTRICO GONZALEZ SA DE CV (sin RFC) captura la totalidad del presupuesto '
                'de mantenimiento electromecánico del IMSS en Nuevo León. El 98% de su valor total '
                '(984.6M de 1.01B) corresponde a un solo contrato de 2021 (servicio de mantenimiento '
                'preventivo y correctivo a equipos). Patrón P6 (captura institucional): 22 de 23 contratos '
                'con un único cliente IMSS NL (82.6% adjudicaciones directas). Dos contratos licitados '
                'en 2021-2024 sugieren presión regulatoria sin romper la concentración. '
                'Activo 2013-2024. IPS ARIA: 0.66.'
            ),
            'total_amount': 1007613002,
            'vendor_ids': [103353],
            'review_status': 'needs_review',
        },
        {
            'case_id': '3GH_MULTISERVICIOS_IMSS_NL_DA',
            'case_name': '3GH Multiservicios — Servicios Electromecánicos IMSS Nuevo León (1.03B, 53.8% DA)',
            'case_type': 'concentrated_monopoly',
            'confidence_level': 'medium',
            'description': (
                '3GH MULTISERVICIOS S.A. DE C.V. (sin RFC) concentra 1.03B MXN exclusivamente '
                'con IMSS Nuevo León en 13 contratos (2016-2021). El 91.7% del valor procede de '
                'un único contrato de 2021 (941.1M) de mantenimiento preventivo y correctivo a equipo, '
                'prácticamente idéntico en descripción al de Taller Eléctrico González del mismo año '
                'y misma delegación IMSS NL. La similitud de contratos entre ambas empresas '
                '(misma institución, mismo año, misma descripción, cifras comparables) sugiere posible '
                'rotación o fragmentación premeditada. 53.8% DA, RS=1.000. IPS ARIA: 0.66. '
                'Sin RFC impide verificación SAT/EFOS.'
            ),
            'total_amount': 1025863093,
            'vendor_ids': [178705],
            'review_status': 'needs_review',
        },
        {
            'case_id': 'MEXICO_MONTECITOS_SEDENA_BALISTICO_DA',
            'case_name': 'México Montecitos — Proveedor Balístico SEDENA (1.37B, 60% DA, sin RFC)',
            'case_type': 'institution_capture',
            'confidence_level': 'medium',
            'description': (
                'MEXICO MONTECITOS SA DE CV (sin RFC) provee material balístico y equipo de protección '
                'a la Secretaría de la Defensa Nacional (SEDENA) en 30 contratos (2013-2020) por '
                '1.35B MXN, más 5 contratos a SSP CDMX por 14.6M. Descripción explícita de "placas '
                'balísticas stand alone nivel especial" y "material balístico". 60% adjudicaciones directas. '
                'En sector Defensa la alta concentración y DA tienen justificación parcial por requisitos '
                'de seguridad, pero la ausencia de RFC y la alta proporción DA para contratos de cientos '
                'de millones MXN merecen investigación. Activo 2013-2020. IPS ARIA: 0.66. '
                'Nota: sector Defensa tiene AUC más bajo (0.76) — clasificación con cautela.'
            ),
            'total_amount': 1365624866,
            'vendor_ids': [103197],
            'review_status': 'needs_review',
        },
    ]

    for case in cases:
        cur.execute("""
            INSERT OR IGNORE INTO ground_truth_cases
            (case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn,
             source_news, created_at)
            VALUES (?,?,?,?,?,?,?,datetime('now'))
        """, (case['case_id'], case['case_name'], case['case_type'], case['confidence_level'],
              case['description'], case['total_amount'], 'ARIA_AUTO'))

        case_db_id = cur.lastrowid
        if case_db_id == 0:
            case_db_id = cur.execute(
                "SELECT id FROM ground_truth_cases WHERE case_id=?", (case['case_id'],)
            ).fetchone()[0]
        print(f"Case: {case['case_name'][:70]}... (db_id={case_db_id})")

        for vendor_id in case['vendor_ids']:
            vendor_name = conn.execute(
                'SELECT name FROM vendors WHERE id=?', (vendor_id,)
            ).fetchone()
            vendor_name = vendor_name[0] if vendor_name else f'VID_{vendor_id}'
            cur.execute("""
                INSERT OR IGNORE INTO ground_truth_vendors
                (case_id, vendor_id, vendor_name_source, evidence_strength, match_method, match_confidence, created_at)
                VALUES (?,?,?,?,?,?,datetime('now'))
            """, (case_db_id, vendor_id, vendor_name, case['confidence_level'], 'vendor_id_match', case['confidence_level']))

            contracts = conn.execute(
                'SELECT id FROM contracts WHERE vendor_id=?', (vendor_id,)
            ).fetchall()
            for (cid,) in contracts:
                cur.execute(
                    "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id, evidence_strength, match_method, match_confidence, created_at) VALUES (?,?,?,?,?,datetime('now'))",
                    (case_db_id, cid, case['confidence_level'], 'vendor_id_match', case['confidence_level'])
                )
            print(f"  VID={vendor_id} ({vendor_name}): {len(contracts)} contracts inserted")

    conn.commit()
    total_cases = conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]
    total_vendors = conn.execute(
        'SELECT COUNT(DISTINCT vendor_id) FROM ground_truth_vendors WHERE vendor_id IS NOT NULL'
    ).fetchone()[0]
    total_contracts = conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]
    print(f"\nFinal GT totals:")
    print(f"  Cases:     {total_cases}")
    print(f"  Vendors:   {total_vendors}")
    print(f"  Contracts: {total_contracts}")
    conn.close()


if __name__ == '__main__':
    insert_cases()
