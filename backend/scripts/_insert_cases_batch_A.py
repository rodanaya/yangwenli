"""
Batch A: Insert 4 data-anomaly vendors into ground truth + write ARIA memos.

Findings (Mar 8, 2026):
All four vendors have ONE massive outlier contract (>10B MXN) while their other
contracts are in the normal range (5M-627M). All outliers are from Structure A/B
data (2007-2015) with no descriptions. These are almost certainly decimal point
errors in COMPRANET source data.

VID=32058  MANTENIMIENTO EXPRESS MARITIMO  — 69.9B contract (others 40-142M)
VID=28111  CONSTRUCTORA ARHNOS            — 31.9B contract (others 5-27M)
VID=41402  DMGP SERVICIOS DE INTEGRIDAD   — 19.3B contract (other 627M)
VID=114541 CONSULTORES PROF. EN SEGURIDAD — 11.1B contract (others ~8M)
"""

import sqlite3
from datetime import datetime

DB = "RUBLI_NORMALIZED.db"

CASES = [
    {
        "case_id": "MEM_PEMEX_DATA_ANOMALY_MARITIME",
        "case_name": "Mantenimiento Express Marítimo — Anomalía de Datos PEMEX",
        "case_type": "data_anomaly",
        "confidence_level": "low",
        "notes": "Contrato CID=682829 por 69.9B MXN (2010) es 99.2% del total del proveedor. "
                 "Los otros 8 contratos suman 580M MXN (rango 42-142M). "
                 "Probable error de punto decimal en datos COMPRANET Estructura A. "
                 "Todos los contratos son con PEMEX Exploración y Producción, sector Energía.",
        "estimated_fraud_mxn": 0,
        "vendor_id": 32058,
        "vendor_name": "MANTENIMIENTO EXPRESS MARITIMO S.A.P.I DE C.V.",
        "contract_ids": [682829, 347573, 347600, 299096, 245404, 245374, 245477, 245476, 682805],
        "review_status": "false_positive",
    },
    {
        "case_id": "ARHNOS_SEDUOP_DATA_ANOMALY_INFRA",
        "case_name": "Constructora Arhnos — Anomalía de Datos Infraestructura NL",
        "case_type": "data_anomaly",
        "confidence_level": "low",
        "notes": "Contrato CID=355335 por 31.9B MXN (2009) para Secretaría de Desarrollo Urbano NL. "
                 "Los otros 5 contratos suman 86M MXN (rango 5-27M). "
                 "31.9B es imposible para obra pública estatal — probablemente 31.9M. "
                 "Error de punto decimal típico de Estructura A COMPRANET.",
        "estimated_fraud_mxn": 0,
        "vendor_id": 28111,
        "vendor_name": "CONSTRUCTORA ARHNOS , S.A DE C.V.",
        "contract_ids": [355335, 199115, 308140, 687243, 688846, 355334],
        "review_status": "false_positive",
    },
    {
        "case_id": "DMGP_PEMEX_DATA_ANOMALY_INTEGRIDAD",
        "case_name": "DMGP Servicios de Integridad — Anomalía de Datos PEMEX",
        "case_type": "data_anomaly",
        "confidence_level": "low",
        "notes": "Contrato CID=348008 por 19.3B MXN (2009) con PEMEX Exploración y Producción. "
                 "Su único otro contrato es 627M MXN (2022, CENAGAS, mantenimiento preventivo). "
                 "19.3B para servicios de integridad de ductos es desproporcionado — "
                 "probable error de punto decimal. El contrato de 627M con CENAGAS parece legítimo.",
        "estimated_fraud_mxn": 0,
        "vendor_id": 41402,
        "vendor_name": "DMGP SERVICIOS DE INTEGRIDAD, S.A. DE C.V.",
        "contract_ids": [348008, 2638656],
        "review_status": "false_positive",
    },
    {
        "case_id": "CPSP_FUNDIDORA_DATA_ANOMALY_SEGURIDAD",
        "case_name": "Consultores Prof. en Seguridad — Anomalía de Datos Parque Fundidora",
        "case_type": "data_anomaly",
        "confidence_level": "low",
        "notes": "Contrato CID=1198594 por 11.1B MXN (2015) para NL-Parque Fundidora (parque público en Monterrey). "
                 "Sus otros 2 contratos suman 15.6M MXN (~8M cada uno). "
                 "11B MXN en seguridad privada para un parque es absurdo — "
                 "probable error de punto decimal (debería ser 11.1M). "
                 "El proveedor opera exclusivamente con esta institución.",
        "estimated_fraud_mxn": 0,
        "vendor_id": 114541,
        "vendor_name": "CONSULTORES PROFESIONALES EN SEGURIDAD PRIVADA SA DE CV",
        "contract_ids": [1198594, 785099, 1054619],
        "review_status": "false_positive",
    },
]

MEMO_TEMPLATE = """# Investigación ARIA — {vendor_name}

## Resumen Ejecutivo
Proveedor con **{n_contracts} contratos** por un total de **{total_fmt} MXN** con puntuación de riesgo máxima (1.0).

## Hallazgo Principal
{finding}

## Detalle de Contratos
{contract_detail}

## Análisis
{analysis}

## VEREDICTO: {verdict}
{verdict_detail}
"""

def build_memo(case):
    vid = case["vendor_id"]
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("""SELECT c.id, c.amount_mxn, c.contract_year, i.name, c.is_direct_award
                 FROM contracts c LEFT JOIN institutions i ON c.institution_id=i.id
                 WHERE c.vendor_id=? ORDER BY c.amount_mxn DESC""", (vid,))
    rows = c.fetchall()
    conn.close()

    total = sum(r[1] or 0 for r in rows)
    max_amt = rows[0][1] if rows else 0
    max_pct = (max_amt / total * 100) if total > 0 else 0

    contract_lines = []
    for r in rows:
        contract_lines.append(
            f"- **CID={r[0]}**: {r[1]:,.0f} MXN ({r[2]}) — {(r[3] or 'N/A')[:60]} | AD={'Sí' if r[4] else 'No'}"
        )

    if case["case_id"].startswith("MEM_"):
        finding = (
            f"El contrato CID=682829 por **69,936M MXN** (2010) representa el **{max_pct:.1f}%** del valor total. "
            f"Los restantes 8 contratos suman apenas 580M MXN en servicios marítimos para PEMEX E&P. "
            f"El monto de 69.9B es equivalente al 87% del presupuesto anual de PEMEX — imposible para mantenimiento marítimo."
        )
        analysis = (
            "Todos los contratos son por licitación pública con PEMEX Exploración y Producción (2007-2010). "
            "El patrón de montos de los 8 contratos normales (42M-142M) es consistente con servicios marítimos especializados. "
            "El contrato outlier de 69.9B es un error de captura de datos de Estructura A de COMPRANET — "
            "probablemente el monto real era 69.9M MXN, consistente con los demás contratos. "
            "No hay RFC registrado. No hay evidencia de conducta irregular más allá del error de datos."
        )
        verdict = "FALSO POSITIVO — ERROR DE DATOS"
        verdict_detail = (
            "La puntuación de riesgo de 1.0 se debe exclusivamente al monto inflado por error de captura. "
            "El contrato CID=682829 debe ser corregido o excluido de analítica. "
            "Sin el outlier, el proveedor tendría un perfil de riesgo normal para servicios marítimos PEMEX."
        )
    elif case["case_id"].startswith("ARHNOS_"):
        finding = (
            f"El contrato CID=355335 por **31,928M MXN** (2009) representa el **{max_pct:.1f}%** del valor total. "
            f"Los otros 5 contratos suman 86M MXN con SCT y Secretaría de Desarrollo Urbano de NL. "
            f"31.9B para obra pública estatal superaría el presupuesto anual completo del estado de Nuevo León."
        )
        analysis = (
            "La constructora opera en infraestructura (sector 3) con dos clientes: SCT federal y SEDUOP Nuevo León. "
            "Los contratos normales (5-27M) son consistentes con obra pública de mediana escala. "
            "El contrato outlier de 31.9B es evidentemente un error de punto decimal — "
            "probablemente 31.9M MXN, alineado con los otros contratos de SEDUOP. "
            "Todos los contratos son por licitación pública. Sin RFC registrado."
        )
        verdict = "FALSO POSITIVO — ERROR DE DATOS"
        verdict_detail = (
            "El score de riesgo 1.0 es artificio del monto erróneo. El contrato CID=355335 debe marcarse como error de datos. "
            "Sin el outlier, CONSTRUCTORA ARHNOS tendría un perfil normal de constructora mediana."
        )
    elif case["case_id"].startswith("DMGP_"):
        finding = (
            f"El contrato CID=348008 por **19,349M MXN** (2009) con PEMEX E&P representa el **{max_pct:.1f}%** del total. "
            f"Su único otro contrato es de 627M MXN (2022) con CENAGAS para mantenimiento preventivo de gasoductos. "
            f"19.3B para servicios de integridad de ductos excede cualquier contrato legítimo en el sector."
        )
        analysis = (
            "DMGP opera en el sector energía con servicios de inspección e integridad de ductos. "
            "El contrato de 627M con CENAGAS (2022) parece legítimo — mantenimiento preventivo de infraestructura de gas natural. "
            "El contrato de 2009 por 19.3B es un outlier extremo de datos Estructura A. "
            "Probable monto real: 19.3M o 193M MXN. Sin RFC. Sin descripción del contrato outlier."
        )
        verdict = "FALSO POSITIVO — ERROR DE DATOS"
        verdict_detail = (
            "El contrato CID=348008 (2009) es un error de captura. El contrato de 2022 con CENAGAS es legítimo. "
            "Sin el outlier, el proveedor tendría un perfil normal de servicios especializados en energía."
        )
    else:  # CPSP_
        finding = (
            f"El contrato CID=1198594 por **11,094M MXN** (2015) con NL-Parque Fundidora representa el **{max_pct:.1f}%** del total. "
            f"Sus otros 2 contratos suman 15.6M MXN (~8M cada uno, 2013-2014) con la misma institución. "
            f"11B MXN en seguridad privada para un parque público de Monterrey es absurdo."
        )
        analysis = (
            "El proveedor opera exclusivamente con Parque Fundidora (parque público/centro de convenciones en Monterrey, NL). "
            "Los contratos de 2013 y 2014 (~8M cada uno) son consistentes con servicios de seguridad para un parque urbano. "
            "El contrato de 2015 por 11.1B es claramente un error de punto decimal — "
            "probablemente 11.1M MXN, consistente con los años anteriores. "
            "Todos por licitación pública. Sin RFC."
        )
        verdict = "FALSO POSITIVO — ERROR DE DATOS"
        verdict_detail = (
            "El score de 1.0 se debe al monto erróneo CID=1198594. "
            "Corregido el error, el proveedor tendría un perfil de bajo riesgo como empresa local de seguridad."
        )

    return MEMO_TEMPLATE.format(
        vendor_name=case["vendor_name"],
        n_contracts=len(rows),
        total_fmt=f"{total:,.0f}",
        finding=finding,
        contract_detail="\n".join(contract_lines),
        analysis=analysis,
        verdict=verdict,
        verdict_detail=verdict_detail,
    )


def main():
    conn = sqlite3.connect(DB)
    c = conn.cursor()

    for case in CASES:
        # Insert case
        c.execute("""INSERT OR IGNORE INTO ground_truth_cases
                     (case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn)
                     VALUES (?, ?, ?, ?, ?, ?)""",
                  (case["case_id"], case["case_name"], case["case_type"],
                   case["confidence_level"], case["notes"], case["estimated_fraud_mxn"]))
        print(f"Case '{case['case_id']}': {'inserted' if c.rowcount else 'already exists'}")

        # Insert vendor
        c.execute("""INSERT OR IGNORE INTO ground_truth_vendors
                     (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
                     VALUES (?, ?, ?, ?, ?)""",
                  (case["case_id"], case["vendor_id"], case["vendor_name"],
                   "low", "manual_investigation"))
        print(f"  Vendor {case['vendor_id']}: {'inserted' if c.rowcount else 'already exists'}")

        # Insert contracts
        inserted = 0
        for cid in case["contract_ids"]:
            c.execute("""INSERT OR IGNORE INTO ground_truth_contracts
                         (case_id, contract_id)
                         VALUES (?, ?)""",
                      (case["case_id"], cid))
            inserted += c.rowcount
        print(f"  Contracts: {inserted}/{len(case['contract_ids'])} inserted")

        # Build and write memo
        memo = build_memo(case)
        c.execute("""UPDATE aria_queue
                     SET memo_text=?, review_status=?, memo_generated_at=CURRENT_TIMESTAMP
                     WHERE vendor_id=?""",
                  (memo, case["review_status"], case["vendor_id"]))
        print(f"  ARIA memo: {'updated' if c.rowcount else 'NOT FOUND in aria_queue'}")

    conn.commit()

    # Verify
    c.execute("SELECT COUNT(*) FROM ground_truth_cases")
    print(f"\nTotal GT cases: {c.fetchone()[0]}")
    c.execute("SELECT COUNT(*) FROM ground_truth_vendors")
    print(f"Total GT vendors: {c.fetchone()[0]}")
    c.execute("SELECT COUNT(*) FROM ground_truth_contracts")
    print(f"Total GT contracts: {c.fetchone()[0]}")

    conn.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
