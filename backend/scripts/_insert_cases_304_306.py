"""Insert GT cases 304-306.

Analysis summary:
- VID=13597 CENTRO DE ASISTENCIA RENAL: Hemodialysis subrogation (outsourced dialysis)
  exclusively to IMSS (90%) and SEDENA. 5.9B over 79 contracts 2003-2025. No RFC.
  Mixed procurement: many competitive licitaciones (58.2%) AND direct awards (41.8%).
  SEDENA contracts (5) all competitive, IMSS contracts mixed. Pattern = institution capture
  (single vendor monopolizes critical dialysis services across multiple federal health bodies).
  avg ~75M/contract is plausible for multi-year dialysis service. Confidence: medium
  (legitimate specialty market OR overpriced intermediary between clinic networks and IMSS).

- VID=31487 PRO INMUNE DE MEXICO: Broad-spectrum medication distribution 2007-2012 only.
  64 contracts, 2.33B, IMSS/ISSSTE/SSA. DA rate only 18.8% — mostly competitive licitaciones.
  Contract titles: "medicamentos, lacteos, narcoticos, psicotropicos y estupefacientes" —
  broad pharmaceutical distributor, not a specialized immunologics supplier.
  Largest contract 1.03B MXN in 2009 IMSS (ADQUISICION DE MEDICAMENTOS Y LACTEOS).
  No RFC. Ceased activity after 2012. Pattern = concentrated pharmaceutical distributor
  that disappeared. Confidence: medium (could be normal distributor OR fraudulent shell
  supplying overpriced generic meds; "Pro Inmune" name suggests specialty but contracts
  show general pharma supply).

- VID=35772 COSTO POR PROCEDIMIENTO: Company literally named "Cost per Procedure".
  No RFC. Provides endoscopy services exclusively to ISSSTE 2008-2014, then resurfaces
  at Hospital Juarez de Mexico in 2022. Key: 2008 contract = 459.6M MXN single-bid
  competitive licitacion for 3-year endoscopy service (2008-2010). Then 2011-2014
  direct awards totaling ~335M. Highly suspicious: unusual company name, no RFC,
  billing model embedded in company name = intermediary structure. Confidence: high.
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
            'case_id': 'CENTRO_ASISTENCIA_RENAL_IMSS_SEDENA_DIALISIS_2003_2025',
            'case_name': 'Centro de Asistencia Renal — Monopolio Hemodiálisis Subrogada IMSS/SEDENA 5.90B 2003-2025',
            'case_type': 'institution_capture',
            'confidence_level': 'medium',
            'description': (
                'CENTRO DE ASISTENCIA RENAL S.A. DE C.V. (sin RFC) acumula 5.90 mil millones de MXN '
                'en contratos de hemodiálisis subrogada con el IMSS (71 contratos, ~5.39B) y la SEDENA '
                '(5 contratos, ~491M) entre 2003 y 2025 — una relación ininterrumpida de 22 años con '
                'dos instituciones federales de salud críticas. El 41.8% de los contratos son adjudicaciones '
                'directas; el restante 58.2% son licitaciones en las que la empresa compite y gana de forma '
                'consistente. El contrato promedio (~75M MXN) es coherente con la operación de clínicas '
                'de diálisis multi-turno a nivel nacional. La ausencia de RFC impide verificar identidad '
                'fiscal y relaciones corporativas. Patrón primario: captura institucional — un solo proveedor '
                'domina los servicios de hemodiálisis subrogada en el sector salud federal durante más de dos '
                'décadas. Riesgo adicional: la extensión hacia contratos con SEDENA (desde 2017) indica '
                'diversificación estratégica de dependencias capturadas. Requiere verificación ASF '
                'Cuenta Pública 2010-2022 y revisión de precios unitarios por sesión de diálisis '
                'versus tarifas de mercado.'
            ),
            'total_amount': 5900000000,
            'vendor_ids': [13597],
            'review_status': 'needs_review',
        },
        {
            'case_id': 'PRO_INMUNE_DISTRIBUIDOR_FARMA_IMSS_2007_2012',
            'case_name': 'Pro Inmune de México — Distribuidor Farmacéutico IMSS/ISSSTE 2.33B 2007-2012',
            'case_type': 'concentrated_monopoly',
            'confidence_level': 'medium',
            'description': (
                'PRO INMUNE DE MEXICO S.A. DE C.V. (sin RFC) concentra 2.33 mil millones de MXN en '
                '64 contratos de suministro de medicamentos al IMSS (28 contratos, ~1.78B) e ISSSTE '
                '(25 contratos, ~495M) entre 2007 y 2012. Pese a su nombre que sugiere especialidad '
                'inmunológica, los contratos cubren medicamentos genéricos, lácteos, narcóticos, '
                'psicotrópicos y estupefacientes — perfil de distribuidor farmacéutico generalista. '
                'El contrato más grande (1.03B MXN, IMSS 2009, "ADQUISICION DE MEDICAMENTOS Y LACTEOS") '
                'es de alto volumen y escasa especificidad. La tasa de adjudicación directa es moderada '
                '(18.8%), con mayoría de licitaciones públicas. Señal de alerta: la empresa desaparece '
                'completamente después de 2012 sin continuidad. La ausencia de RFC impide rastrear '
                'estructura corporativa y relaciones con otros proveedores del sector. El nombre "Pro Inmune" '
                'puede ser un mecanismo de diferenciación para operar como proveedor de medicamentos de '
                'patente (biológicos, inmunosupresores) con precios elevados. Requiere verificación '
                'de si los medicamentos suministrados incluían biologics o innovadores bajo patente '
                'versus genéricos intercambiables, y cruce con registros SAT EFOS del período 2007-2012.'
            ),
            'total_amount': 2330000000,
            'vendor_ids': [31487],
            'review_status': 'needs_review',
        },
        {
            'case_id': 'COSTO_PROCEDIMIENTO_ENDOSCOPIA_ISSSTE_INTERMEDIARIO',
            'case_name': 'Costo por Procedimiento — Intermediario Endoscopia ISSSTE Sin RFC 0.83B 2008-2022',
            'case_type': 'overpricing',
            'confidence_level': 'high',
            'description': (
                'COSTO POR PROCEDIMIENTO S.A. DE C.V. (sin RFC) es una empresa cuyo nombre incorpora '
                'literalmente su modelo de facturación ("costo por procedimiento"), una estructura atípica '
                'en el mercado de servicios médicos mexicano. Provee "Servicio Integral de Endoscopia '
                'del Tubo Digestivo" exclusivamente al ISSSTE y al Hospital Juárez de México: '
                '11 contratos por 827M MXN entre 2008 y 2022. '
                'El primer contrato (2008, 459.6M MXN, licitación con un solo postor) cubre tres '
                'ejercicios fiscales (2008-2010) para endoscopia en unidades hospitalarias del ISSSTE. '
                'Los contratos 2011-2014 son adjudicaciones directas (335M MXN), indicando que tras '
                'ganar la licitación inicial se consolidó como proveedor exclusivo sin concurso posterior. '
                'Reaparece en 2022 en Hospital Juárez de México con contratos de "procedimientos de '
                'mínima invasión" (laparoscopia urológica, oncológica y pediátrica, ~25.5M MXN). '
                'Banderas rojas: (1) nombre incrustado con modelo de cobro — estructura de intermediario '
                'facturador, no de proveedor médico directo; (2) ausencia total de RFC impide verificación '
                'fiscal; (3) la endoscopia hospitalaria normalmente se presta con personal y equipos del '
                'hospital o mediante concesiones de largo plazo con hospitales privados certificados; '
                '(4) la combinación licitación pública sin competencia real (único postor) seguida de '
                'adjudicaciones directas es el patrón clásico de captura de licitación. '
                'Risk score = 1.000 (máximo). Altamente probable que sea un intermediario que subfactura '
                'a servicios de endoscopia de hospitales privados y cobra al ISSSTE con sobreprecio. '
                'Requiere investigación ASF Cuenta Pública ISSSTE 2008-2014 y verificación del registro '
                'COFEPRIS para prestadores de servicios de endoscopia.'
            ),
            'total_amount': 827000000,
            'vendor_ids': [35772],
            'review_status': 'needs_review',
        },
    ]

    for case in cases:
        cur.execute("""
            INSERT OR IGNORE INTO ground_truth_cases
            (case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn)
            VALUES (?,?,?,?,?,?)
        """, (
            case['case_id'], case['case_name'], case['case_type'], case['confidence_level'],
            case['description'], case['total_amount']
        ))

        case_db_id = cur.lastrowid
        if case_db_id == 0:
            case_db_id = cur.execute(
                "SELECT id FROM ground_truth_cases WHERE case_id=?", (case['case_id'],)
            ).fetchone()[0]
        print(f"Case db_id={case_db_id}: {case['case_name']}")

        for vendor_id in case['vendor_ids']:
            vrow = conn.execute('SELECT name FROM vendors WHERE id=?', (vendor_id,)).fetchone()
            vname = vrow[0] if vrow else f'VID_{vendor_id}'
            cur.execute(
                "INSERT OR IGNORE INTO ground_truth_vendors "
                "(case_id, vendor_id, vendor_name_source, evidence_strength, match_method) "
                "VALUES (?,?,?,?,?)",
                (case_db_id, vendor_id, vname, case['confidence_level'], 'vendor_id')
            )
            contracts = conn.execute(
                'SELECT id FROM contracts WHERE vendor_id=?', (vendor_id,)
            ).fetchall()
            for (cid,) in contracts:
                cur.execute(
                    "INSERT OR IGNORE INTO ground_truth_contracts "
                    "(case_id, contract_id, match_method) VALUES (?,?,?)",
                    (case_db_id, cid, 'vendor_id')
                )
            print(f"  VID={vendor_id} ({vname}): {len(contracts)} contracts linked")

    conn.commit()

    print(f"\nGT totals:")
    print(f"  Cases:     {conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]}")
    print(f"  Vendors:   {conn.execute('SELECT COUNT(*) FROM ground_truth_vendors WHERE vendor_id IS NOT NULL').fetchone()[0]}")
    print(f"  Contracts: {conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]}")

    # Show the new cases
    print("\nNew cases inserted:")
    rows = conn.execute(
        "SELECT id, case_id, confidence_level, estimated_fraud_mxn FROM ground_truth_cases ORDER BY id DESC LIMIT 3"
    ).fetchall()
    for r in rows:
        print(f"  id={r[0]} | {r[1]} | conf={r[2]} | {r[3]/1e9:.2f}B")

    conn.close()


if __name__ == '__main__':
    insert_cases()
