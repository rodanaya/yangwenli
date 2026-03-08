"""Insert GT cases 301-303: Personas físicas + Airelecsa HVAC IMSS.

Findings summary:
- GERARDO NAVA (VID=146480): Single 4.816B contract from Chalma (tiny VER municipality,
  pop ~1,500) via licitación pública 2014. ALL other Chalma contracts that year total
  only 5.4M. This is almost certainly a decimal-point error (4.816M not 4.816B) OR
  extreme corruption. Confidence=LOW. Second contract (2020, 4.8M, SLP) is normal-sized.

- MAURICIO SOTELO (VID=14127): 875M IMSS contract (2010) = 93% of all 39 contracts (940M).
  Licitación pública but massive single contract for persona física with no RFC.
  Remaining contracts 2003-2025 are small IMSS maintenance/fumigation work (<13M each).
  Pattern: presta-nombre for large construction contractor. Confidence=MEDIUM.

- AIRELECSA (VID=107564): 814M licitación pública contract at IMSS 2021 = 94% of all
  revenue (863M total). All other 41 contracts are <10M each. 80x jump. No RFC.
  HVAC/electromechanical maintenance at IMSS NL. Confidence=MEDIUM.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3

DB = "RUBLI_NORMALIZED.db"


def insert_cases():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    cases = [
        {
            'case_id': 'GERARDO_NAVA_SAN_MARTIN_PERSONA_FISICA_CHALMA_VERACRUZ',
            'case_name': 'Gerardo Nava San Martín — Persona Física 4.816B Pavimento Chalma VER (posible error de datos)',
            'case_type': 'overpricing',
            'year_start': 2014,
            'year_end': 2020,
            'confidence_level': 'low',
            'estimated_fraud': 4816003499.0,
            'notes': (
                'Persona fisica sin RFC con contrato de 4,816,003,499 MXN (~4.8 mil millones) '
                'via licitacion publica 2014 del municipio de Chalma, Veracruz (municipio muy '
                'pequeno, ~1,500 hab) para CONSTRUCCION DE PAVIMENTO HIDRAULICO. '
                'El total de contratos de toda la municipalidad en 2014 es 4,821M — el 99.9% '
                'corresponde a este unico contrato. El otro contrato Chalma 2014 es 5.4M '
                '(MAGNUMSA, unidad deportiva). '
                'La segunda contratacion del proveedor (2020, 4.8M, SLP) es normal. '
                'Posibles explicaciones: (1) Error de captura — monto real podria ser 4.816M; '
                '(2) Corrupcion extrema — presta-nombre para constructora cartelizada. '
                'Sin RFC imposibilita verificacion. RS=1.000. '
                'Requiere cruzar con ASF Cuenta Publica 2014 municipio Chalma, VER.'
            ),
            'vendor_ids': [146480],
        },
        {
            'case_id': 'MAURICIO_SOTELO_SANTILLAN_PERSONA_FISICA_IMSS_875M',
            'case_name': 'Mauricio Sotelo Santillán — Persona Física 875M Adecuación Consultorios IMSS (sin RFC, 2010)',
            'case_type': 'overpricing',
            'year_start': 2003,
            'year_end': 2025,
            'confidence_level': 'medium',
            'estimated_fraud': 875577329.0,
            'notes': (
                'Persona fisica sin RFC con contrato de 875,577,329 MXN via licitacion publica '
                '2010 del IMSS para Adecuacion de consultorios PREVEN-IMSS en la UMF No.1 '
                'y unidades de la zona. '
                'Representa el 93% del total acumulado (940M en 39 contratos 2003-2025). '
                'El resto son contratos pequenos de mantenimiento IMSS Jalisco: '
                'areas verdes, fumigacion, obra civil (100K-13M MXN). '
                'Patron clasico de presta-nombre: persona fisica con historial de contratos '
                'menores sirve como fachada para contrato masivo de infraestructura hospitalaria. '
                'Proveedor activo hasta 2025 (IMSS Jalisco/Hidalgo) — relacion institucional '
                'de largo plazo. RS=0.993, ARIA IPS=0.658, patron P6. '
                'Pendiente: cruzar expediente licitacion IMSS 2010 y ASF Cuenta Publica.'
            ),
            'vendor_ids': [14127],
        },
        {
            'case_id': 'AIRELECSA_IMSS_HVAC_SALTO_814M_2021',
            'case_name': 'Airelecsa SA de CV — Captura Institucional IMSS HVAC 814M via Licitacion Publica 2021 (sin RFC)',
            'case_type': 'institution_capture',
            'year_start': 2013,
            'year_end': 2024,
            'confidence_level': 'medium',
            'estimated_fraud': 814473700.0,
            'notes': (
                'Empresa sin RFC de mantenimiento HVAC/electromecanico en IMSS Delegacion '
                'Nuevo Leon desde 2013. Patron normal 2013-2020 (contratos de 106K-9.5M MXN). '
                'En 2021 obtiene licitacion publica de 814,473,700 MXN para SERVICIO DE '
                'MANTENIMIENTO PREVENTIVO Y CORRECTIVO A EQUIPO (IMSS) — salto de ~80x '
                'respecto a su mayor contrato previo. '
                'Este contrato unico = 94% de sus ingresos totales (863M en 42 contratos). '
                'DA rate del 73.8% en contratos restantes confirma relacion preferencial '
                'con IMSS NL. RS=0.999, ARIA IPS=0.659, patron P6. '
                'Posible mecanismo: empresa con historial modesto utilizada como vehiculo '
                'para contrato inflado en 2021. Sin RFC imposibilita verificacion fiscal. '
                'Pendiente: verificar subcontratistas, expediente licitatorio 2021.'
            ),
            'vendor_ids': [107564],
        },
    ]

    for case in cases:
        cur.execute("""
            INSERT OR IGNORE INTO ground_truth_cases
            (case_id, case_name, case_type, year_start, year_end,
             estimated_fraud_mxn, confidence_level, notes, created_at)
            VALUES (?,?,?,?,?,?,?,?,datetime('now'))
        """, (
            case['case_id'], case['case_name'], case['case_type'],
            case['year_start'], case['year_end'],
            case['estimated_fraud'], case['confidence_level'], case['notes']
        ))

        case_db_id = cur.lastrowid
        if case_db_id == 0:
            row = conn.execute(
                "SELECT id FROM ground_truth_cases WHERE case_id=?",
                (case['case_id'],)
            ).fetchone()
            case_db_id = row[0] if row else None

        print(f"Case db_id={case_db_id}: {case['case_name'][:75]}...")

        for vendor_id in case['vendor_ids']:
            vname = conn.execute(
                'SELECT name FROM vendors WHERE id=?', (vendor_id,)
            ).fetchone()
            vname = vname[0] if vname else f'VID_{vendor_id}'

            cur.execute(
                """INSERT OR IGNORE INTO ground_truth_vendors
                   (case_id, vendor_id, vendor_name_source, evidence_strength,
                    match_method, match_confidence)
                   VALUES (?,?,?,?,?,?)""",
                (case_db_id, vendor_id, vname,
                 case['confidence_level'], 'vendor_id_direct', 1.0)
            )

            contracts = conn.execute(
                'SELECT id FROM contracts WHERE vendor_id=?', (vendor_id,)
            ).fetchall()
            for (cid,) in contracts:
                cur.execute(
                    """INSERT OR IGNORE INTO ground_truth_contracts
                       (case_id, contract_id, evidence_strength, match_method, match_confidence)
                       VALUES (?,?,?,?,?)""",
                    (case_db_id, cid, case['confidence_level'], 'vendor_id_direct', 1.0)
                )
            print(f"  VID={vendor_id} ({vname}): {len(contracts)} contracts linked")

    conn.commit()
    print(f"\nGT totals after insert:")
    print(f"  Cases:     {conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]}")
    print(f"  Vendors:   {conn.execute('SELECT COUNT(*) FROM ground_truth_vendors WHERE vendor_id IS NOT NULL').fetchone()[0]}")
    print(f"  Contracts: {conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]}")

    # Show the newly inserted cases
    print("\nNew cases:")
    for r in conn.execute(
        "SELECT id, case_id, confidence_level FROM ground_truth_cases WHERE id > 300 ORDER BY id"
    ).fetchall():
        print(f"  {r}")

    conn.close()


if __name__ == '__main__':
    insert_cases()
