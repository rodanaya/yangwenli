"""
Batch J: Insert 4 ground truth cases from vendor investigation.
Cases 26-29 (IDs 371-374).
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

import sqlite3
from datetime import datetime

DB = "RUBLI_NORMALIZED.db"

CASES = [
    {
        "id": 371,
        "case_id": "NEURONIC_IMSS_INTERMEDIARY_PHARMA",
        "case_name": "Neuronic Mexicana - Intermediario Farmacéutico IMSS",
        "case_type": "intermediary",
        "year_start": 2020,
        "year_end": 2025,
        "estimated_fraud_mxn": 497_000_000,
        "confidence_level": "medium",
        "notes": "Empresa de neurociencia/IT que a partir de 2020 recibe contratos millonarios de IMSS para adquisición de kits médicos y compras consolidadas farmacéuticas. Patrón de intermediario: 86% adjudicación directa, salto de <1M pre-2020 a 273M en un solo contrato 2024. 11 instituciones, concentración en IMSS (60%). Sin RFC registrado.",
        "vendor_id": 5402,
        "vendor_name": "NEURONIC MEXICANA S.A. DE C.V.",
        "evidence_strength": "circumstantial",
        "memo": (
            "## Investigación: NEURONIC MEXICANA S.A. DE C.V.\n\n"
            "**Tipo de patrón**: Intermediario farmacéutico sospechoso\n"
            "**Valor total**: $497.9M MXN (29 contratos, 2002-2025)\n"
            "**Puntuación de riesgo**: 0.754 (crítico en contratos principales)\n\n"
            "### Hallazgos clave\n\n"
            "1. **Salto abrupto en montos**: De contratos menores a $280K (2002-2017) a $44.5M en 2020 y $273M en un solo contrato de 2024 con IMSS. Patrón clásico de intermediario insertado en cadena de suministro.\n"
            "2. **Nombre incongruente**: 'Neuronic' sugiere empresa de neurociencia/IT, pero contratos principales son para kits médicos, vincristina, cisplatino y compras consolidadas farmacéuticas.\n"
            "3. **Concentración en IMSS**: 60% del valor ($301M) va a Servicios de Salud del IMSS, 29% adicional a IMSS directo. Patrón de proveedor cautivo.\n"
            "4. **Adjudicación directa dominante**: 86.2% de contratos por AD, incluyendo los de mayor monto.\n"
            "5. **Sin RFC**: No tiene RFC registrado en COMPRANET, dificultando verificación fiscal.\n\n"
            "### Recomendación\n"
            "Verificar en SAT si tiene actividad económica congruente con farmacéuticos. Cruzar con ASF Cuenta Pública IMSS 2020-2025. "
            "Posible esquema de intermediación donde empresa de nicho captura contratos de distribución farmacéutica masiva."
        ),
    },
    {
        "id": 372,
        "case_id": "MICROSCOPIA_NEUROLOGIA_OVERPRICING",
        "case_name": "Microscopía Electrónica - Contrato Atípico Neurología",
        "case_type": "overpricing",
        "year_start": 2010,
        "year_end": 2025,
        "estimated_fraud_mxn": 369_000_000,
        "confidence_level": "medium",
        "notes": "Empresa de insumos de microscopía con 82 contratos pequeños (<1M) pero un contrato de $369M en 2018 en el Instituto Nacional de Neurología para mantenimiento de equipo biomédico. Este contrato representa 97% de su facturación total. Posible sobreprecio extremo o error de datos. 82% adjudicación directa.",
        "vendor_id": 92697,
        "vendor_name": "MICROSCOPIA ELECTRONICA E INSUMOS",
        "evidence_strength": "circumstantial",
        "memo": (
            "## Investigación: MICROSCOPÍA ELECTRÓNICA E INSUMOS\n\n"
            "**Tipo de patrón**: Sobreprecio / anomalía extrema de monto\n"
            "**Valor total**: $380.1M MXN (82 contratos, 2010-2025)\n"
            "**Puntuación de riesgo**: 0.649 (crítico en contrato principal)\n\n"
            "### Hallazgos clave\n\n"
            "1. **Contrato extremadamente atípico**: Un solo contrato de $369.3M en 2018 con el Instituto Nacional de Neurología y Neurocirugía para 'Mantenimiento Preventivo y Correctivo a Equipo Biomédico'. Este contrato es 97.2% del valor total de la empresa.\n"
            "2. **Contratos normales son diminutos**: Los otros 81 contratos promedian $132K cada uno. El contrato atípico es 2,800x más grande que el promedio.\n"
            "3. **Posible error de datos**: El monto podría ser un error decimal ($369K vs $369M). Sin embargo, el contrato fue por licitación pública (no AD), lo cual sugiere proceso formal.\n"
            "4. **Perfil empresarial**: Proveedor especializado en microscopía, microtomos y procesadores de tejido — equipo de nicho. Un contrato de $369M para mantenimiento es extraordinario.\n"
            "5. **Concentración institucional**: 97.5% del valor en una sola institución (Neurología).\n\n"
            "### Recomendación\n"
            "Prioridad: verificar si el monto del contrato 2018 es correcto consultando COMPRANET original. "
            "Si el monto es correcto, investigar el proceso de licitación y justificación de precio. "
            "Un contrato de mantenimiento de $369M para un solo instituto es altamente inusual."
        ),
    },
    {
        "id": 373,
        "case_id": "ARMOR_LIFE_DEFENSE_BALLISTIC",
        "case_name": "Armor Life Lab - Proveedor Balístico Defensa",
        "case_type": "monopoly",
        "year_start": 2018,
        "year_end": 2025,
        "estimated_fraud_mxn": 263_000_000,
        "confidence_level": "low",
        "notes": "Empresa de equipo balístico con 11 contratos, $263M total. Contrato de $218M con SEDENA en 2025 para placas balísticas (83% del total). Alta concentración en sector defensa (SEDENA + SEMAR = 90%). Riesgo 0.908 por concentración extrema. Puede ser monopolio legítimo de equipo especializado o sobreprecio en defensa.",
        "vendor_id": 234430,
        "vendor_name": "ARMOR LIFE LAB, S.A. DE C.V.",
        "evidence_strength": "circumstantial",
        "memo": (
            "## Investigación: ARMOR LIFE LAB, S.A. DE C.V.\n\n"
            "**Tipo de patrón**: Monopolio / concentración en defensa\n"
            "**Valor total**: $263.4M MXN (11 contratos, 2018-2025)\n"
            "**Puntuación de riesgo**: 0.908 (máximo en todos los contratos)\n\n"
            "### Hallazgos clave\n\n"
            "1. **Contrato dominante**: $218.3M a SEDENA en 2025 para 'Placas Balísticas Stand Alone Nivel Especial FAVE01-01'. Representa 83% del valor total. Este contrato fue por licitación pública.\n"
            "2. **Concentración sector defensa**: SEDENA ($221.8M, 84%) + SEMAR ($14.5M, 5.5%) = 89.7% del valor en defensa/seguridad.\n"
            "3. **Crecimiento explosivo**: De $3.6M en 2019 a $218M en 2025. Salto de 60x en un solo año.\n"
            "4. **Diversificación previa sospechosa**: Contrato de $23.5M con BANSEFI (2018) para chalecos balísticos — ¿por qué un banco necesita equipo balístico?\n"
            "5. **Clientes municipales**: Contrato con gobierno municipal de Estado de México para chalecos — sugiere ventas a policías locales.\n\n"
            "### Atenuantes\n"
            "- El sector defensa tiene proveedores especializados limitados por requisitos técnicos y certificaciones\n"
            "- El contrato principal fue por licitación pública, no adjudicación directa\n"
            "- Equipo balístico es mercado de nicho con pocos fabricantes certificados\n\n"
            "### Recomendación\n"
            "Confianza baja en fraude. Posible monopolio legítimo de equipo certificado. "
            "Investigar si existe competencia real en placas balísticas nivel especial en México. "
            "Verificar el contrato BANSEFI 2018 — chalecos balísticos para institución financiera es inusual."
        ),
    },
    {
        "id": 374,
        "case_id": "IPC_SEMAR_DOSBOCAS_CONSTRUCTION",
        "case_name": "IPC Construcciones - Concentración SEMAR/Dos Bocas",
        "case_type": "institution_capture",
        "year_start": 2012,
        "year_end": 2025,
        "estimated_fraud_mxn": 891_000_000,
        "confidence_level": "medium",
        "notes": "Constructora con $891M en 38 contratos, concentrada en SEMAR (49%) y Dos Bocas (48%). Contratos de $426M (muelle Dos Bocas, 2024 AD) y $225M (SEMAR, 2017 AD) y $175M (hospital naval, 2022 AD). 74% por adjudicación directa — atípico para infraestructura. Patrón de captura institucional: misma constructora gana repetidamente en SEMAR durante 13 años.",
        "vendor_id": 43223,
        "vendor_name": "INGENIERIA PROYECTOS Y CONSTRUCCIONES IPC SA DE CV",
        "evidence_strength": "circumstantial",
        "memo": (
            "## Investigación: INGENIERÍA PROYECTOS Y CONSTRUCCIONES IPC S.A. DE C.V.\n\n"
            "**Tipo de patrón**: Captura institucional (SEMAR + Dos Bocas)\n"
            "**Valor total**: $891.4M MXN (38 contratos, 2012-2025)\n"
            "**Puntuación de riesgo**: 0.672 (crítico en contratos principales)\n\n"
            "### Hallazgos clave\n\n"
            "1. **Megacontrato Dos Bocas**: $425.6M por adjudicación directa en 2024 para 'Construcción del muelle para terminal de granel mineral del Puerto de Dos Bocas'. AD para obra de infraestructura portuaria de esta magnitud es altamente irregular.\n"
            "2. **Hospital Naval B.C.S.**: $174.8M por AD en 2022 para 'Construcción y Equipamiento de Hospital Naval en La Paz'. Segunda etapa de obra asignada directamente.\n"
            "3. **Captura de SEMAR**: 26 de 38 contratos (68%) son con Secretaría de Marina, totalizando $437M a lo largo de 13 años. Relación de proveedor cautivo.\n"
            "4. **Adjudicación directa dominante**: 73.7% por AD — extremadamente atípico para sector infraestructura donde las licitaciones públicas son la norma por ley.\n"
            "5. **Dos Bocas conexión**: 2 contratos con Administración del Puerto de Dos Bocas por $427M. Dos Bocas es proyecto emblemático con múltiples señalamientos de irregularidades.\n"
            "6. **Presencia municipal temprana**: Contratos iniciales (2012-2014) con municipio de Manzanillo, Colima — posible origen regional antes de escalar a contratos federales.\n\n"
            "### Recomendación\n"
            "Alta prioridad de investigación. La combinación de: (a) AD para obras >$100M, (b) 13 años de relación cautiva con SEMAR, y (c) participación en Dos Bocas "
            "constituye un patrón clásico de captura institucional. Cruzar con ASF auditorías de SEMAR y auditorías de Dos Bocas."
        ),
    },
]


def main():
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    now = datetime.now().isoformat()

    for case in CASES:
        # Insert ground_truth_cases
        c.execute("""
            INSERT OR IGNORE INTO ground_truth_cases
            (id, case_id, case_name, case_type, year_start, year_end,
             estimated_fraud_mxn, confidence_level, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            case["id"], case["case_id"], case["case_name"], case["case_type"],
            case["year_start"], case["year_end"], case["estimated_fraud_mxn"],
            case["confidence_level"], case["notes"], now,
        ))
        print(f"✓ Case {case['id']}: {case['case_id']}")

        # Insert ground_truth_vendors
        c.execute("""
            INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method, match_confidence, notes, created_at)
            VALUES (?, ?, ?, ?, 'exact_id', 1.0, ?, ?)
        """, (
            case["case_id"], case["vendor_id"], case["vendor_name"],
            case["evidence_strength"],
            f"Identified via ARIA risk screening. RS={case.get('estimated_fraud_mxn', 0)}",
            now,
        ))
        print(f"  → Vendor {case['vendor_id']}: {case['vendor_name']}")

        # Insert ground_truth_contracts
        c.execute("SELECT id FROM contracts WHERE vendor_id = ?", (case["vendor_id"],))
        contract_ids = [r[0] for r in c.fetchall()]
        inserted = 0
        for cid in contract_ids:
            c.execute("""
                INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id, evidence_strength, match_method, match_confidence, created_at)
                VALUES (?, ?, ?, 'vendor_match', 1.0, ?)
            """, (case["case_id"], cid, case["evidence_strength"], now))
            inserted += c.rowcount
        print(f"  → {inserted} contracts linked")

        # Upsert aria_queue memo
        c.execute("SELECT id FROM aria_queue WHERE vendor_id = ?", (case["vendor_id"],))
        existing = c.fetchone()
        if existing:
            c.execute("""
                UPDATE aria_queue SET memo_text = ?, memo_generated_at = ?, review_status = 'pending'
                WHERE vendor_id = ?
            """, (case["memo"], now, case["vendor_id"]))
            print(f"  → Updated memo in aria_queue")
        else:
            c.execute("""
                INSERT INTO aria_queue (vendor_id, vendor_name, memo_text, memo_generated_at, review_status, computed_at,
                    total_contracts, total_value_mxn, avg_risk_score)
                VALUES (?, ?, ?, ?, 'pending', ?, 0, 0, 0)
            """, (case["vendor_id"], case["vendor_name"], case["memo"], now, now))
            print(f"  → Inserted memo in aria_queue")

    conn.commit()

    # Verify
    c.execute("SELECT COUNT(*) FROM ground_truth_cases WHERE id >= 371")
    print(f"\nVerification: {c.fetchone()[0]} new GT cases")
    c.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id IN (?,?,?,?)",
              tuple(case["case_id"] for case in CASES))
    print(f"Verification: {c.fetchone()[0]} new GT vendors")
    c.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id IN (?,?,?,?)",
              tuple(case["case_id"] for case in CASES))
    print(f"Verification: {c.fetchone()[0]} new GT contracts")

    conn.close()
    print("\nDone. Batch J complete.")


if __name__ == "__main__":
    main()
