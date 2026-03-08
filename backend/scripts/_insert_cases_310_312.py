"""Insert GT cases 310-312: Landsteiner Scientific, Alvartis Pharma, Medi Access Seguros.

Run from backend/ directory:
    python -m scripts._insert_cases_310_312
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3

DB = "RUBLI_NORMALIZED.db"


def insert_cases():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    count = conn.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
    print(f"Current GT: max_id={max_id}, count={count}")

    cases = [
        {
            "case_id": "LANDSTEINER_SCIENTIFIC_ARV_MONOPOLY_2019_2025",
            "case_name": "Landsteiner Scientific — Monopolio ARV/Diagnóstico IMSS Sin RFC 6.66B MXN",
            "case_type": "concentrated_monopoly",
            "year_start": 2002,
            "year_end": 2025,
            "confidence_level": "medium",
            "notes": (
                "Landsteiner Scientific S.A. de C.V. es proveedor de medicamentos antirretrovirales (ARV) "
                "genéricos y reactivos diagnósticos al sector salud mexicano. Sin RFC registrado en COMPRANET. "
                "Concentración principal en IMSS (80c, 4.27B MXN) y CENSIDA (3c, 1.25B MXN). "
                "Vende ARV genéricos —Efavirenz/Emtricitabina/Tenofovir— para VIH/SIDA bajo adjudicación directa. "
                "Riesgo por ausencia de RFC, alta concentración institucional, y compras directas de alto valor "
                "en medicamentos controlados. Patrón consistente con monopolio de distribuidor intermediario. "
                "No es fabricante de patentes (Gilead es dueño de patentes TDF/FTC), "
                "por lo que exclusividad no está justificada por propiedad intelectual. "
                "Confianza media: requiere verificación ASF Cuenta Pública y COFEPRIS "
                "para confirmar si tiene registro como fabricante o sólo distribuidor."
                "\n[MEMO GENERADO: 2026-03-08]"
            ),
            "vendor_ids": [5724],
        },
        {
            "case_id": "ALVARTIS_PHARMA_CRECIMIENTO_ANOMALO_2016_2025",
            "case_name": "Alvartis Pharma — Crecimiento Anómalo DA 41% 4.62B MXN Sin RFC 2016-2025",
            "case_type": "concentrated_monopoly",
            "year_start": 2016,
            "year_end": 2025,
            "confidence_level": "medium",
            "notes": (
                "Alvartis Pharma S.A. de C.V. inició con contratos mínimos (621K MXN en 2016) y escala a "
                "4.62B MXN totales en 9 años, con 2.76B MXN solo en 2025. Sin RFC en COMPRANET. "
                "Opera en IMSS (42c, 3.16B), ISSSTE (24c, 277M), SSA (10c, 269M) e INSABI (22c, 241M). "
                "DA rate del 41.3% sobre 322 contratos. Vende medicamentos genéricos y suministros COVID-19. "
                "El crecimiento exponencial de empresa nueva sin RFC, con alta DA, "
                "abasteciendo múltiples instituciones públicas de salud, es patrón compatible con empresa "
                "intermediaria o proveedor con conexiones preferentes. "
                "Confianza media: requiere verificación de RFC real, fecha de constitución, "
                "y comparación de precios vs proveedores registrados."
                "\n[MEMO GENERADO: 2026-03-08]"
            ),
            "vendor_ids": [190131],
        },
        {
            "case_id": "MEDI_ACCESS_SEGUROS_ISES_INTERMEDIARIO_2013_2018",
            "case_name": "Medi Access Seguros de Salud — ISES Intermediario Médico 3.11B Sin RFC 2013-2018",
            "case_type": "single_use_intermediary",
            "year_start": 2013,
            "year_end": 2018,
            "confidence_level": "low",
            "notes": (
                "Medi Access Seguros de Salud S.A. de C.V. opera como Institución de Seguros Especializada en "
                "Salud (ISES) administrando servicios médicos integrales para entidades financieras del gobierno: "
                "NAFINSA (968M), SAE (923M), BANCOMEXT (480M), Lotería Nacional (591M), BANSEFI (74M). "
                "Promedio por contrato: 222M MXN. Sin RFC en COMPRANET. Activa 2013-2018 con 14 contratos. "
                "Las ISES son figuras legítimas reguladas por CNSF para administrar redes de prestadores médicos "
                "en sustitución de IMSS/ISSSTE para trabajadores de entidades especiales del gobierno. "
                "El patrón de intermediación es inherente al modelo ISES. Riesgo principal: ausencia de RFC, "
                "posible margen de intermediación excesivo, y concentración en instituciones financieras "
                "no sujetas al mismo nivel de escrutinio de COMPRANET que secretarías de estado. "
                "Confianza BAJA: el modelo ISES es legítimo y reconocido jurídicamente; la investigación debe "
                "enfocarse en precio vs benchmarks de mercado CNSF y solvencia real del asegurador."
                "\n[MEMO GENERADO: 2026-03-08]"
            ),
            "vendor_ids": [106586],
        },
    ]

    for case in cases:
        cur.execute(
            """
            INSERT OR IGNORE INTO ground_truth_cases
                (case_id, case_name, case_type, year_start, year_end,
                 confidence_level, notes)
            VALUES (?,?,?,?,?,?,?)
            """,
            (
                case["case_id"], case["case_name"], case["case_type"],
                case["year_start"], case["year_end"],
                case["confidence_level"], case["notes"],
            ),
        )

        case_db_id = cur.lastrowid
        if case_db_id == 0:
            case_db_id = conn.execute(
                "SELECT id FROM ground_truth_cases WHERE case_id=?", (case["case_id"],)
            ).fetchone()[0]
        print(f"\nCase db_id={case_db_id}: {case['case_name'][:70]}")

        for vendor_id in case["vendor_ids"]:
            vname = conn.execute("SELECT name FROM vendors WHERE id=?", (vendor_id,)).fetchone()
            vname = vname[0] if vname else f"VID_{vendor_id}"
            cur.execute(
                """INSERT OR IGNORE INTO ground_truth_vendors
                   (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
                   VALUES (?,?,?,?,?)""",
                (case_db_id, vendor_id, vname, case["confidence_level"], "vendor_id_direct"),
            )
            # contracts.id is the primary key (not contract_id)
            contract_ids = conn.execute(
                "SELECT id FROM contracts WHERE vendor_id=?", (vendor_id,)
            ).fetchall()
            for (cid,) in contract_ids:
                cur.execute(
                    """INSERT OR IGNORE INTO ground_truth_contracts
                       (case_id, contract_id, evidence_strength, match_method) VALUES (?,?,?,?)""",
                    (case_db_id, cid, case["confidence_level"], "vendor_id_direct"),
                )
            print(f"  VID={vendor_id} ({vname}): {len(contract_ids)} contracts linked")

    conn.commit()

    print(f"\n{'='*60}")
    print(f"GT final: {conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]} cases")
    print(f"         {conn.execute('SELECT COUNT(*) FROM ground_truth_vendors WHERE vendor_id IS NOT NULL').fetchone()[0]} vendors")
    print(f"         {conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]} contracts")
    print(f"\nNew cases (id > {max_id}):")
    new = conn.execute(
        "SELECT id, case_id, confidence_level FROM ground_truth_cases WHERE id > ? ORDER BY id",
        (max_id,),
    ).fetchall()
    for row in new:
        print(f"  id={row[0]} | {row[1]} | confidence={row[2]}")
    conn.close()


if __name__ == "__main__":
    insert_cases()
