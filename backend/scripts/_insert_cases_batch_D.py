"""
Batch D: Investigation of 4 high-value vendors (Mar 8, 2026)

Vendors investigated:
1. VID=83386 LUIS GABRIEL CARDENAS PEREZ — 3.4B, DATA ERROR (3.3B contract is decimal error)
2. VID=55419 ANGAR AZCAPOTZALCO — 4.2B, vehicle dealer for SEDENA (needs_review)
3. VID=105180 EPCCOR SA DE CV — 2.4B, infrastructure contractor (false_positive)
4. VID=13330 COMERCIALIZADORA BREVER — 1B, medical supply intermediary (needs_review)
"""

import sqlite3
import sys
import os
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")

CASES = [
    {
        "case_id": "CARDENAS_IMSS_DATA_ERROR",
        "case_name": "Luis Gabriel Cárdenas Pérez — Error de Datos IMSS",
        "case_type": "data_error",
        "confidence_level": "high",
        "notes": "Persona física con contrato de 3.3B MXN en 2010 (ID=677405) vs promedio de 1.3M en otros 20 contratos. Error decimal evidente (~2,400x su contrato típico). Proveedor legítimo de mantenimiento/limpieza IMSS.",
        "estimated_fraud_mxn": 0,
        "vendors": [
            {
                "vendor_id": 83386,
                "vendor_name_source": "LUIS GABRIEL CARDENAS PEREZ",
                "evidence_strength": "high",
                "match_method": "manual_investigation",
            }
        ],
        "contract_ids": [677405],
        "verdict": "false_positive",
        "memo": (
            "## Investigación: LUIS GABRIEL CÁRDENAS PÉREZ (VID=83386)\n\n"
            "**VEREDICTO: FALSO POSITIVO — ERROR DE DATOS**\n\n"
            "### Hallazgos\n"
            "- Persona física con 21 contratos IMSS (2010-2025), total reportado 3.4B MXN\n"
            "- **Contrato ID=677405 (2010): 3,348,315,776 MXN** — claramente error decimal\n"
            "- Los otros 20 contratos promedian 1.37M MXN (máx 3.4M)\n"
            "- El contrato anómalo es ~2,400x el promedio del proveedor\n"
            "- Servicios: mantenimiento preventivo, limpieza de cisternas, lavado de cristales\n"
            "- 100% IMSS, 0% adjudicación directa — patrón consistente de licitación\n\n"
            "### Conclusión\n"
            "Proveedor legítimo de servicios de mantenimiento. El contrato de 3.3B es un error "
            "de punto decimal en datos COMPRANET 2010 (Estructura A, calidad más baja). "
            "Monto real probable: ~3.3M MXN. No amerita investigación adicional.\n\n"
            "### Acción recomendada\n"
            "Marcar contrato 677405 como error de datos. No incluir en ground truth de corrupción."
        ),
    },
    {
        "case_id": "ANGAR_SEDENA_VEHICLES",
        "case_name": "Angar Azcapotzalco — Vehículos SEDENA",
        "case_type": "concentration_review",
        "confidence_level": "low",
        "notes": "Distribuidor de vehículos con 4.2B MXN en 19 contratos. Principales clientes: SEDENA (vehículos militares), INEGI, ISSFAM. Contratos grandes: 1.96B (equipamiento militar 2024), 1.2B (pickup doble cabina 2019). Patrón consistente con distribuidor autorizado de vehículos.",
        "estimated_fraud_mxn": 0,
        "vendors": [
            {
                "vendor_id": 55419,
                "vendor_name_source": "ANGAR AZCAPOTZALCO",
                "evidence_strength": "low",
                "match_method": "manual_investigation",
            }
        ],
        "contract_ids": [2876013, 2084236, 2876012, 1105275],
        "verdict": "needs_review",
        "memo": (
            "## Investigación: ANGAR AZCAPOTZALCO (VID=55419)\n\n"
            "**VEREDICTO: REQUIERE REVISIÓN — CONCENTRACIÓN EN DEFENSA**\n\n"
            "### Hallazgos\n"
            "- 19 contratos, 4.2B MXN total (2010-2025), sin RFC registrado\n"
            "- Principal cliente: SEDENA (vehículos militares y equipo terrestre)\n"
            "- Contrato más grande: 1,963M MXN (2024) — equipamiento y obra pública militar\n"
            "- Segundo: 1,213M MXN (2019) — adjudicación directa de camionetas pickup\n"
            "- También vende a INEGI (sedanes, camionetas), ISSFAM, Banjército\n"
            "- 36.8% adjudicación directa\n\n"
            "### Factores de riesgo\n"
            "- Nombre inusual para distribuidor de vehículos (\"Angar\" = hangar?)\n"
            "- Sin RFC — difícil verificar identidad corporativa\n"
            "- 1.2B MXN en adjudicación directa a SEDENA (2019)\n"
            "- Sector Defensa tiene concentración estructural (pocas opciones de proveedores)\n\n"
            "### Factores atenuantes\n"
            "- Patrón consistente con distribuidor autorizado de flotillas\n"
            "- También gana licitaciones públicas (63.2%)\n"
            "- Clientes diversos (SEDENA, INEGI, ISSFAM, CFE, gobiernos estatales)\n\n"
            "### Acción recomendada\n"
            "Verificar registro de distribuidor autorizado en SAT y SEDENA. "
            "La adjudicación directa de 1.2B a SEDENA amerita revisión de justificación."
        ),
    },
    {
        "case_id": "EPCCOR_INFRAESTRUCTURA",
        "case_name": "EPCCOR SA de CV — Constructora de Infraestructura",
        "case_type": "concentration_review",
        "confidence_level": "low",
        "notes": "Empresa constructora con 2.4B MXN en 15 contratos (2013-2022). Obras: Hospital IMSS (548M), Aeropuerto CDMX (371M), carreteras SCT (363M), infraestructura estatal Aguascalientes. Patrón típico de constructora mediana-grande con portafolio diversificado.",
        "estimated_fraud_mxn": 0,
        "vendors": [
            {
                "vendor_id": 105180,
                "vendor_name_source": "EPCCOR SA DE CV",
                "evidence_strength": "low",
                "match_method": "manual_investigation",
            }
        ],
        "contract_ids": [2664373, 2074795, 1035525],
        "verdict": "false_positive",
        "memo": (
            "## Investigación: EPCCOR SA DE CV (VID=105180)\n\n"
            "**VEREDICTO: FALSO POSITIVO — CONSTRUCTORA LEGÍTIMA**\n\n"
            "### Hallazgos\n"
            "- 15 contratos, 2.4B MXN total (2013-2022), sin RFC\n"
            "- Proyectos de infraestructura real y verificable:\n"
            "  - Hospital General IMSS (548M, 2022)\n"
            "  - Posiciones de contacto Dedo L, AICM (371M, 2019)\n"
            "  - Carreteras SCT (363M, 2014)\n"
            "  - Infraestructura hidráulica CONAGUA (83M, 2013)\n"
            "- Opera en Aguascalientes (estatal) y a nivel federal\n"
            "- 40% adjudicación directa — razonable para obra pública de emergencia\n\n"
            "### Conclusión\n"
            "Constructora mediana-grande con portafolio diversificado de obra pública. "
            "Los montos son consistentes con proyectos de infraestructura hospitalaria "
            "y aeroportuaria. Sin señales de empresa fantasma o intermediario.\n\n"
            "### Acción recomendada\n"
            "No amerita investigación adicional. Score alto por concentración legítima "
            "en sector infraestructura."
        ),
    },
    {
        "case_id": "BREVER_MEDICAL_SUPPLIES",
        "case_name": "Comercializadora Brever — Intermediario Material de Curación",
        "case_type": "intermediary_review",
        "confidence_level": "medium",
        "notes": "Comercializadora genérica sin RFC, 1B MXN en 55 contratos (2003-2025). Proveedor de material de curación a ISSSTE, IMSS, INSABI, SSA. Pico masivo en 2021 (807M MXN) durante crisis de abastecimiento médico. Nombre genérico, 20 instituciones, patrón de intermediario.",
        "estimated_fraud_mxn": 0,
        "vendors": [
            {
                "vendor_id": 13330,
                "vendor_name_source": "COMERCIALIZADORA BREVER, S. A. DE C. V.",
                "evidence_strength": "medium",
                "match_method": "manual_investigation",
            }
        ],
        "contract_ids": [2325166, 2326799, 2458948, 2404264],
        "verdict": "needs_review",
        "memo": (
            "## Investigación: COMERCIALIZADORA BREVER S.A. DE C.V. (VID=13330)\n\n"
            "**VEREDICTO: REQUIERE REVISIÓN — POSIBLE INTERMEDIARIO MÉDICO**\n\n"
            "### Hallazgos\n"
            "- 55 contratos, 1,007M MXN total (2003-2025), sin RFC registrado\n"
            "- 100% material de curación y suministros médicos\n"
            "- 20 instituciones compradoras (ISSSTE, IMSS, INSABI, SSA, hospitales)\n"
            "- **Pico 2021**: 807M MXN (80% del total) en solo ~10 contratos\n"
            "- Dos contratos idénticos ISSSTE: 278.7M MXN c/u (diferentes procedimientos)\n"
            "- 41.1% adjudicación directa\n\n"
            "### Señales de alerta\n"
            "- Nombre genérico \"Comercializadora\" — patrón típico de intermediario\n"
            "- Sin RFC a pesar de operar desde 2003\n"
            "- Explosión de volumen en 2021 (crisis de abastecimiento COVID)\n"
            "- 20 instituciones distintas — alcance inusual para comercializadora\n"
            "- Dos contratos ISSSTE por monto exacto (278.7M) en mismo año\n\n"
            "### Factores atenuantes\n"
            "- Opera desde 2003 (no es empresa nueva/shell)\n"
            "- Material de curación es mercado con muchos intermediarios legítimos\n"
            "- Los contratos consolidados INSABI/IMSS 2021 fueron crisis real de abasto\n\n"
            "### Acción recomendada\n"
            "1. Verificar RFC en SAT (posible EFOS Art. 69-B)\n"
            "2. Revisar si los dos contratos ISSSTE de 278.7M son duplicados o contratos distintos\n"
            "3. Investigar estructura accionaria — ¿quién es dueño de Brever?\n"
            "4. Cruzar con base de datos SFP de sanciones"
        ),
    },
]


def main():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Get next numeric ID
    max_id = c.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] or 0
    next_id = max_id + 1

    cases_inserted = 0
    vendors_inserted = 0
    contracts_inserted = 0
    memos_written = 0

    for case in CASES:
        # Insert case
        c.execute(
            """INSERT OR IGNORE INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn)
            VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                next_id,
                case["case_id"],
                case["case_name"],
                case["case_type"],
                case["confidence_level"],
                case["notes"],
                case["estimated_fraud_mxn"],
            ),
        )
        if c.rowcount > 0:
            cases_inserted += 1
            print(f"  [CASE] {case['case_id']} (id={next_id})")
        else:
            print(f"  [SKIP] {case['case_id']} already exists")
            # Find existing id
            r = c.execute(
                "SELECT id FROM ground_truth_cases WHERE case_id=?",
                (case["case_id"],),
            ).fetchone()
            if r:
                next_id = r[0]

        # Insert vendors
        for v in case["vendors"]:
            c.execute(
                """INSERT OR IGNORE INTO ground_truth_vendors
                (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
                VALUES (?, ?, ?, ?, ?)""",
                (
                    case["case_id"],
                    v["vendor_id"],
                    v["vendor_name_source"],
                    v["evidence_strength"],
                    v["match_method"],
                ),
            )
            if c.rowcount > 0:
                vendors_inserted += 1
                print(f"    [VENDOR] {v['vendor_name_source']} (vid={v['vendor_id']})")

        # Insert contracts
        for cid in case.get("contract_ids", []):
            c.execute(
                """INSERT OR IGNORE INTO ground_truth_contracts
                (case_id, contract_id)
                VALUES (?, ?)""",
                (case["case_id"], cid),
            )
            if c.rowcount > 0:
                contracts_inserted += 1

        # Write memo to aria_queue
        now = datetime.now().isoformat()
        for v in case["vendors"]:
            c.execute(
                """UPDATE aria_queue SET memo_text=?, review_status=?, memo_generated_at=?
                WHERE vendor_id=?""",
                (case["memo"], case["verdict"], now, v["vendor_id"]),
            )
            if c.rowcount > 0:
                memos_written += 1
                print(f"    [MEMO] Updated aria_queue for vid={v['vendor_id']} -> {case['verdict']}")
            else:
                # Try insert if not in queue
                try:
                    c.execute(
                        """INSERT INTO aria_queue (vendor_id, memo_text, review_status, memo_generated_at)
                        VALUES (?, ?, ?, ?)""",
                        (v["vendor_id"], case["memo"], case["verdict"], now),
                    )
                    if c.rowcount > 0:
                        memos_written += 1
                        print(f"    [MEMO] Inserted aria_queue for vid={v['vendor_id']} -> {case['verdict']}")
                except Exception as e:
                    print(f"    [MEMO-ERR] {e}")

        next_id += 1

    conn.commit()
    conn.close()

    print(f"\n=== SUMMARY ===")
    print(f"Cases inserted:    {cases_inserted}")
    print(f"Vendors inserted:  {vendors_inserted}")
    print(f"Contracts linked:  {contracts_inserted}")
    print(f"Memos written:     {memos_written}")


if __name__ == "__main__":
    main()
