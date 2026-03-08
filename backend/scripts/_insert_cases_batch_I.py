"""
Batch I: Insert 4 ground truth cases for RUBLI.

Case 26: VISE Road Construction Single-Bid Dominance
Case 27: PCC Road Paving Single-Bid Dominance
Case 28: DL Medica Medical Supply Concentration
Case 29: GUTSA Infraestructura / Grupo Hermes
"""
import sqlite3, sys, json
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8")

DB = "RUBLI_NORMALIZED.db"

CASES = [
    {
        "case_id": "26",
        "case_name": "VISE Road Construction Single-Bid Dominance",
        "case_type": "Single-bid dominance",
        "confidence_level": "medium",
        "notes": (
            "Constructora y Pavimentadora VISE SA de CV: 5.7B MXN across 133 contracts (2002-2017), "
            "95% single-bid rate in public tenders. Concentrated at SCT (3B MXN, 68 contracts). "
            "No RFC on file. Road construction company winning nearly all competitive tenders "
            "as sole bidder suggests systematic competition suppression."
        ),
        "estimated_fraud_mxn": 5700000000,
        "vendors": [
            {"vendor_id": 1144, "vendor_name_source": "CONSTRUCTORA Y PAVIMENTADORA VISE, S.A. DE C.V.",
             "evidence_strength": "circumstantial", "match_method": "name_exact"},
        ],
    },
    {
        "case_id": "27",
        "case_name": "PCC Road Paving Single-Bid Dominance",
        "case_type": "Single-bid dominance",
        "confidence_level": "medium",
        "notes": (
            "Pavimentaciones Caminos y Compactaciones SA de CV: 5.6B MXN across 130 contracts (2002-2022), "
            "99.2% single-bid rate. Works across 26 institutions including SCT (1.6B) and Nuevo León (1.3B). "
            "No RFC. Near-perfect single-bid rate across two decades and multiple institutions is "
            "statistically anomalous — consistent with bid-rigging or market allocation."
        ),
        "estimated_fraud_mxn": 5600000000,
        "vendors": [
            {"vendor_id": 1154, "vendor_name_source": "PAVIMENTACIONES CAMINOS Y COMPACTACIONES, S.A. DE C.V.",
             "evidence_strength": "circumstantial", "match_method": "name_exact"},
        ],
    },
    {
        "case_id": "28",
        "case_name": "DL Medica IMSS/INSABI Medical Supply Concentration",
        "case_type": "Concentrated monopoly",
        "confidence_level": "medium",
        "notes": (
            "DL Medica SA de CV: 5.7B MXN across 416 contracts (2019-2025). "
            "Explosive growth: 196M in 2019 → 3,235M in 2025 (16.5x increase). "
            "Concentrated at IMSS (2.7B), INSABI (1.3B), IMSS-BIENESTAR (1.2B). "
            "153 direct awards under multiple justifications (emergency, failed tenders, patents). "
            "No RFC. Rapid scaling during healthcare system restructuring (INSABI→IMSS-Bienestar) "
            "with heavy direct award use suggests potential intermediary or favored-vendor scheme."
        ),
        "estimated_fraud_mxn": 5700000000,
        "vendors": [
            {"vendor_id": 246450, "vendor_name_source": "DL MEDICA SA DE CV",
             "evidence_strength": "circumstantial", "match_method": "name_exact"},
        ],
    },
    {
        "case_id": "29",
        "case_name": "GUTSA Infraestructura Single-Bid Infrastructure",
        "case_type": "Single-bid dominance",
        "confidence_level": "low",
        "notes": (
            "GUTSA Infraestructura SA de CV: 2.1B MXN across 14 contracts (2003-2009), "
            "100% single-bid rate. Part of Grupo Hermes conglomerate (Hank family). "
            "Large infrastructure contracts at SCT and IMSS with zero competition. "
            "Grupo Hermes has been subject to investigations for political connections and "
            "preferential contract awards. Average contract 150M MXN with no competitive pressure."
        ),
        "estimated_fraud_mxn": 2100000000,
        "vendors": [
            {"vendor_id": 11497, "vendor_name_source": "GUTSA INFRAESTRUCTURA, S. A. DE C.V.",
             "evidence_strength": "circumstantial", "match_method": "name_exact"},
        ],
    },
]

MEMOS = {
    1144: (
        "## Investigación: Constructora y Pavimentadora VISE SA de CV\n\n"
        "**Valor total:** $5,700M MXN | **Contratos:** 133 (2002-2017) | **Riesgo promedio:** 0.546\n\n"
        "### Hallazgos principales\n"
        "- **Tasa de licitación con postor único: 95%** — en 130 de 133 licitaciones públicas, VISE fue el único participante.\n"
        "- Concentración en SCT (Secretaría de Comunicaciones y Transportes): 68 contratos por $3,030M.\n"
        "- Sin RFC registrado en COMPRANET.\n"
        "- Operaciones activas por 15 años (2002-2017) con patrón consistente de postor único.\n\n"
        "### Análisis de riesgo\n"
        "Una tasa de postor único del 95% en licitaciones públicas durante 15 años es estadísticamente "
        "incompatible con competencia genuina. El patrón sugiere posible manipulación de bases de licitación, "
        "requisitos técnicos exclusionarios, o acuerdos previos con potenciales competidores.\n\n"
        "### Recomendación\n"
        "Cruzar con auditorías de ASF sobre contratos carreteros de SCT 2002-2017. "
        "Verificar si VISE tiene vínculos corporativos con otras constructoras del padrón."
    ),
    1154: (
        "## Investigación: Pavimentaciones Caminos y Compactaciones SA de CV\n\n"
        "**Valor total:** $5,600M MXN | **Contratos:** 130 (2002-2022) | **Riesgo promedio:** 0.679\n\n"
        "### Hallazgos principales\n"
        "- **Tasa de postor único: 99.2%** — 129 de 130 licitaciones sin competencia.\n"
        "- Opera en 26 instituciones distintas (SCT, Nuevo León, Puebla, CONAGUA, SICT).\n"
        "- Sin RFC registrado.\n"
        "- Contrato máximo: $565M MXN (2016).\n\n"
        "### Análisis de riesgo\n"
        "La tasa de postor único más alta (99.2%) entre los proveedores investigados. "
        "A diferencia de VISE, opera en múltiples estados y niveles de gobierno, lo que descarta "
        "explicaciones geográficas. La persistencia del patrón por 20 años en 26 instituciones "
        "sugiere un esquema sistemático de supresión de competencia.\n\n"
        "### Recomendación\n"
        "Investigar relación entre PCC y VISE (mismo sector, mismo patrón). "
        "Verificar si comparten directivos, representantes legales o domicilios fiscales."
    ),
    246450: (
        "## Investigación: DL Medica SA de CV\n\n"
        "**Valor total:** $5,700M MXN | **Contratos:** 416 (2019-2025) | **Riesgo promedio:** 0.901\n\n"
        "### Hallazgos principales\n"
        "- **Crecimiento explosivo:** de $196M (2019) a $3,235M (2025) — incremento de 16.5x en 6 años.\n"
        "- Concentración en sistema de salud: IMSS ($2,705M), INSABI ($1,307M), IMSS-BIENESTAR ($1,183M).\n"
        "- 153 adjudicaciones directas bajo múltiples justificaciones (emergencia, licitaciones desiertas, "
        "caso fortuito, patentes).\n"
        "- Sin RFC registrado.\n"
        "- Aparición súbita en 2019 coincide con creación de INSABI y restructuración del sistema de salud.\n\n"
        "### Análisis de riesgo\n"
        "El perfil de DL Medica es consistente con un distribuidor intermediario que capitaliza la "
        "desarticulación del sistema de compras consolidadas de salud. El uso de múltiples justificaciones "
        "de adjudicación directa y el crecimiento exponencial durante la transición INSABI→IMSS-Bienestar "
        "son señales de alerta de un posible esquema de proveedor favorecido.\n\n"
        "### Recomendación\n"
        "Prioridad alta. Cruzar con Cuenta Pública ASF 2020-2024 y con listado EFOS del SAT. "
        "Investigar estructura corporativa y beneficiarios reales."
    ),
    11497: (
        "## Investigación: GUTSA Infraestructura SA de CV\n\n"
        "**Valor total:** $2,100M MXN | **Contratos:** 14 (2003-2009) | **Riesgo promedio:** 0.792\n\n"
        "### Hallazgos principales\n"
        "- **Tasa de postor único: 100%** — todos los contratos ganados sin competencia.\n"
        "- Parte del conglomerado Grupo Hermes (familia Hank Rhon).\n"
        "- Contratos grandes en SCT ($265M) e IMSS ($259M).\n"
        "- Contrato máximo: $520M MXN (2005).\n"
        "- Sin RFC registrado.\n\n"
        "### Análisis de riesgo\n"
        "GUTSA es filial de Grupo Hermes, conglomerado con vínculos políticos documentados. "
        "La tasa de 100% postor único en obras de infraestructura de alto valor es una señal "
        "de alerta consistente con influencia indebida en procesos de licitación. "
        "El período de actividad (2003-2009) coincide con el sexenio Fox-Calderón.\n\n"
        "### Recomendación\n"
        "Cruzar con investigaciones periodísticas sobre Grupo Hermes. "
        "Verificar si otros vehículos del grupo (GUTSA Construcciones, Hermes Infraestructura) "
        "también aparecen en la base de datos con patrones similares."
    ),
}


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")
    cur = conn.cursor()

    # Get next auto-increment id for ground_truth_cases
    cur.execute("SELECT MAX(id) FROM ground_truth_cases")
    max_id = cur.fetchone()[0] or 0

    for i, case in enumerate(CASES):
        new_id = max_id + 1 + i
        case_id = case["case_id"]
        print(f"\n--- Inserting Case {case_id}: {case['case_name']} ---")

        # Check if case_id already exists
        cur.execute("SELECT id FROM ground_truth_cases WHERE case_id=?", (case_id,))
        if cur.fetchone():
            print(f"  SKIP: case_id={case_id} already exists")
            continue

        cur.execute(
            """INSERT INTO ground_truth_cases
               (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (new_id, case_id, case["case_name"], case["case_type"],
             case["confidence_level"], case["notes"], case["estimated_fraud_mxn"]),
        )
        print(f"  Inserted case id={new_id}, case_id={case_id}")

        for v in case["vendors"]:
            vid = v["vendor_id"]
            # Insert GT vendor
            cur.execute(
                """INSERT OR IGNORE INTO ground_truth_vendors
                   (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
                   VALUES (?, ?, ?, ?, ?)""",
                (case_id, vid, v["vendor_name_source"], v["evidence_strength"], v["match_method"]),
            )
            print(f"  Vendor {vid}: {v['vendor_name_source'][:50]}")

            # Insert GT contracts
            cur.execute("SELECT id FROM contracts WHERE vendor_id=?", (vid,))
            contract_ids = [r[0] for r in cur.fetchall()]
            for cid in contract_ids:
                cur.execute(
                    "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?, ?)",
                    (case_id, cid),
                )
            print(f"  Linked {len(contract_ids)} contracts")

            # Update aria_queue with memo and GT flag
            memo = MEMOS.get(vid, "")
            now = datetime.now().isoformat()
            cur.execute(
                """UPDATE aria_queue SET
                   in_ground_truth=1, memo_text=?, memo_generated_at=?,
                   review_status='confirmed'
                   WHERE vendor_id=?""",
                (memo, now, vid),
            )
            updated = cur.rowcount
            print(f"  aria_queue updated: {updated} row(s)")

    conn.commit()

    # Verify
    print("\n=== VERIFICATION ===")
    for case in CASES:
        cid = case["case_id"]
        cur.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (cid,))
        row = cur.fetchone()
        print(f"Case {cid}: {row[0] if row else 'NOT FOUND'}")
        cur.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (cid,))
        print(f"  Contracts: {cur.fetchone()[0]}")
        cur.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (cid,))
        print(f"  Vendors: {cur.fetchone()[0]}")

    # Total GT stats
    cur.execute("SELECT COUNT(*) FROM ground_truth_cases")
    print(f"\nTotal GT cases: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(DISTINCT vendor_id) FROM ground_truth_vendors")
    print(f"Total GT vendors: {cur.fetchone()[0]}")

    conn.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
