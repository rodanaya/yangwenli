"""
Batch G: Insert 4 investigated vendors into GT.

Vendors investigated 2026-03-08:
  VID=140538  INFRALUX SA DE CV — 7.8B, QRoo tourism, probable data error (7.76B single contract)
  VID=228202  PROC MINA S DE RL DE CV — 6.5B single NAICM airport contract, NAICM corruption documented
  VID=18363   CONSTRUCTORA Y PERFORADORA LATINA SA DE CV — 6.7B, 100% CFE drilling, 17c over 12yr
  VID=16324   TECNICOS ESPECIALIZADOS DE CHIAPAS SA DE CV — 6.2B, 109c, road construction, 22yr
"""
import sys
sys.stdout.reconfigure(encoding="utf-8")

import sqlite3
from datetime import datetime

DB = "RUBLI_NORMALIZED.db"

CASES = [
    {
        "case_id": "INFRALUX_QROO_TURISMO_DATA_ERROR",
        "case_name": "INFRALUX QRoo Turismo — Probable Error de Datos 7.76B",
        "case_type": "data_error",
        "confidence_level": "medium",
        "year_start": 2014,
        "year_end": 2018,
        "notes": (
            "INFRALUX SA DE CV (VID=140538) tiene 11 contratos por 7.82B MXN (2014-2018), "
            "pero un solo contrato de 7,757M MXN (id=1606815, 2017) representa el 99.1% del total. "
            "Este contrato es 450x mayor que el segundo contrato más grande de la misma institución "
            "(QRoo Secretaría de Turismo) en el mismo año. Probable error de punto decimal — "
            "debería ser ~77.6M MXN. Los otros 10 contratos suman solo 67.2M MXN en infraestructura "
            "turística y municipal normal (QRoo, Puebla, Tabasco). Sin RFC disponible."
        ),
        "estimated_fraud_mxn": 0,
    },
    {
        "case_id": "PROC_MINA_NAICM_AIRPORT_2018",
        "case_name": "PROC MINA — Contrato Único 6.5B NAICM (Nuevo Aeropuerto)",
        "case_type": "procurement_fraud",
        "confidence_level": "medium",
        "year_start": 2018,
        "year_end": 2018,
        "notes": (
            "PROC MINA S. DE R.L. DE C.V. (VID=228202) recibió un solo contrato por 6,498M MXN "
            "del Grupo Aeroportuario de la Ciudad de México para construcción del edificio central "
            "del NAICM (2018). El NAICM fue cancelado por AMLO tras referéndum y tiene múltiples "
            "investigaciones de ASF y SFP por sobrecostos e irregularidades. CICSA (Carlos Slim) "
            "recibió 84.8B del mismo proyecto. Empresa aparece solo para este megaproyecto — "
            "posible vehículo de propósito especial (SPV). Sin RFC, sin otros contratos gubernamentales."
        ),
        "estimated_fraud_mxn": 6_498_409_901,
    },
    {
        "case_id": "CONSTRUCTORA_LATINA_CFE_DRILLING_MONOPOLY",
        "case_name": "Constructora y Perforadora Latina — Monopolio Perforación CFE",
        "case_type": "concentrated_monopoly",
        "confidence_level": "low",
        "year_start": 2005,
        "year_end": 2017,
        "notes": (
            "Constructora y Perforadora Latina SA de CV (VID=18363) acumuló 6.66B MXN en 17 "
            "contratos (2005-2017), 100% con CFE, 0% adjudicación directa. Especialista en "
            "perforación geotérmica y petrolera. Los contratos más grandes: 1.71B (2009) y "
            "1.56B (2012). Concentración total en una sola institución durante 12 años. "
            "Patrón P6 (captura institucional). Sin embargo, la perforación geotérmica/petrolera "
            "requiere capacidad técnica especializada — podría ser monopolio legítimo por barreras "
            "técnicas. Sin RFC. Confianza baja sin evidencia de irregularidades específicas."
        ),
        "estimated_fraud_mxn": 0,
    },
    {
        "case_id": "TECNICOS_CHIAPAS_CARRETERAS_22YR",
        "case_name": "Técnicos Especializados de Chiapas — Concentración Carreteras 22 Años",
        "case_type": "concentrated_monopoly",
        "confidence_level": "medium",
        "year_start": 2003,
        "year_end": 2025,
        "notes": (
            "Técnicos Especializados de Chiapas SA de CV (VID=16324) acumuló 6.21B MXN en 109 "
            "contratos (2003-2025). Empresa chiapaneca con 22 años de contratos continuos en "
            "construcción y rehabilitación de carreteras. Principal cliente: CAPUFE (21c, 2.29B), "
            "seguido de BANOBRAS (7c, 1.30B), SCT (24c, 918M), SICT (8c, 466M), CONAGUA (15c, 290M). "
            "DA=10.1% (11/109), 90% licitación pública. Score promedio 0.810 con 60+ contratos en "
            "riesgo crítico. Patrón sospechoso: empresa regional que mantiene flujo constante de "
            "mega-contratos carreteros durante 4 sexenios. Sobrevive cambios de administración "
            "lo cual sugiere relaciones institucionales profundas o capacidad técnica real."
        ),
        "estimated_fraud_mxn": 0,
    },
]

VENDORS = [
    {
        "case_id": "INFRALUX_QROO_TURISMO_DATA_ERROR",
        "vendor_id": 140538,
        "vendor_name_source": "INFRALUX SA DE CV",
        "rfc_source": None,
        "role": "beneficiary",
        "evidence_strength": "medium",
        "match_method": "name_exact",
        "match_confidence": 1.0,
        "notes": "Contrato 7,757M probable error decimal. Investigar monto original en COMPRANET.",
    },
    {
        "case_id": "PROC_MINA_NAICM_AIRPORT_2018",
        "vendor_id": 228202,
        "vendor_name_source": "PROC MINA S. DE R.L. DE C.V.",
        "rfc_source": None,
        "role": "beneficiary",
        "evidence_strength": "medium",
        "match_method": "name_exact",
        "match_confidence": 1.0,
        "notes": "SPV para NAICM. Contrato único 6.5B para edificio central. Proyecto cancelado con irregularidades documentadas.",
    },
    {
        "case_id": "CONSTRUCTORA_LATINA_CFE_DRILLING_MONOPOLY",
        "vendor_id": 18363,
        "vendor_name_source": "CONSTRUCTORA Y PERFORADORA LATINA, S.A. DE C.V.",
        "rfc_source": None,
        "role": "beneficiary",
        "evidence_strength": "low",
        "match_method": "name_exact",
        "match_confidence": 1.0,
        "notes": "100% CFE drilling. Monopolio posiblemente legítimo por barreras técnicas en perforación geotérmica.",
    },
    {
        "case_id": "TECNICOS_CHIAPAS_CARRETERAS_22YR",
        "vendor_id": 16324,
        "vendor_name_source": "TECNICOS ESPECIALIZADOS DE CHIAPAS S.A. DE C.V.",
        "rfc_source": None,
        "role": "beneficiary",
        "evidence_strength": "medium",
        "match_method": "name_exact",
        "match_confidence": 1.0,
        "notes": "109 contratos carreteros en 22 años, 4 sexenios. Concentración en CAPUFE/SCT/BANOBRAS.",
    },
]

MEMOS = {
    140538: (
        "VEREDICTO: PROBABLE ERROR DE DATOS — Requiere verificación en COMPRANET.\n\n"
        "INFRALUX SA DE CV (VID=140538) aparece con 7.82B MXN en 11 contratos (2014-2018), "
        "pero el 99.1% del valor proviene de un solo contrato (id=1606815) por 7,757M MXN "
        "con la Secretaría de Turismo de Quintana Roo (2017).\n\n"
        "EVIDENCIA DE ERROR:\n"
        "1. El contrato de 7,757M es 450x mayor que el siguiente contrato más grande de la "
        "misma institución en 2017 (17.2M MXN a Agregados y Maquinaria del Caribe).\n"
        "2. Los otros 10 contratos de INFRALUX suman solo 67.2M MXN — escala coherente "
        "con empresa mediana de infraestructura turística.\n"
        "3. Probable error de punto decimal: 7,757M → 77.6M MXN (consistente con obras "
        "de remodelación de Av. Tulum en Cancún).\n\n"
        "ACCIÓN: Verificar monto original en portal COMPRANET. Si confirmado como error, "
        "corregir a 77.57M MXN. Si monto real, investigar como mega-proyecto turístico.\n\n"
        "INSTITUCIONES: QRoo Turismo (5c, 7.78B), QRoo Infraestructura (2c, 26M), "
        "Puebla San Andrés Cholula (2c, 11M), Tabasco Centro (2c, 6.3M)."
    ),
    228202: (
        "VEREDICTO: SOSPECHOSO — Vehículo de propósito especial en megaproyecto NAICM cancelado.\n\n"
        "PROC MINA S. DE R.L. DE C.V. (VID=228202) recibió exactamente 1 contrato gubernamental "
        "por 6,498M MXN del Grupo Aeroportuario de la Ciudad de México (GACM) para la "
        "\"construcción del edificio del centro\" del Nuevo Aeropuerto Internacional de México (2018).\n\n"
        "CONTEXTO NAICM:\n"
        "1. El NAICM fue cancelado en octubre 2018 tras referéndum organizado por AMLO.\n"
        "2. La ASF documentó múltiples irregularidades en adjudicaciones del GACM.\n"
        "3. Otros contratistas principales: CICSA/Carlos Slim (84.8B), ICA (7.5B+7.1B), "
        "COCONAL (7.9B) — todos investigados.\n"
        "4. PROC MINA aparece exclusivamente para este proyecto — formato típico de SPV "
        "(sociedad de propósito especial) creada para un solo contrato.\n"
        "5. S. DE R.L. DE C.V. es estructura corporativa poco común en construcción pública.\n\n"
        "PATRÓN: Empresa de un solo contrato en megaproyecto con irregularidades documentadas. "
        "Sin presencia previa ni posterior en contratación federal. Sin RFC registrado.\n\n"
        "ACCIÓN: Verificar existencia real de la empresa en Registro Público de Comercio. "
        "Investigar relación con otros contratistas NAICM (posible subcontratación o testaferro)."
    ),
    18363: (
        "VEREDICTO: INCONCLUSO — Monopolio técnico posiblemente legítimo en perforación CFE.\n\n"
        "Constructora y Perforadora Latina SA de CV (VID=18363) acumuló 6.66B MXN en 17 "
        "contratos exclusivamente con CFE (2005-2017). 0% adjudicación directa — todos "
        "por licitación pública.\n\n"
        "ANÁLISIS:\n"
        "1. Contratos de gran escala: 1.71B (2009), 1.56B (2012), 663M (2007) — "
        "consistentes con perforación geotérmica/petrolera profunda.\n"
        "2. 100% concentración en CFE durante 12 años consecutivos.\n"
        "3. La perforación geotérmica requiere equipo y personal altamente especializado — "
        "pocas empresas mexicanas tienen capacidad para proyectos de esta escala.\n"
        "4. Todos por licitación pública sugiere proceso competitivo real.\n"
        "5. Score promedio 0.576, pero 5 contratos en riesgo crítico (RS=1.0) por "
        "concentración extrema en sector energía.\n\n"
        "FACTORES ATENUANTES: Licitación pública 100%, sector técnico especializado, "
        "13 años de operación continua.\n"
        "FACTORES DE RIESGO: Concentración total en CFE, montos muy elevados, "
        "sin diversificación institucional.\n\n"
        "ACCIÓN: Baja prioridad. Verificar si existen auditorías ASF sobre contratos "
        "de perforación CFE 2005-2017. Si no hay hallazgos, clasificar como monopolio "
        "técnico legítimo."
    ),
    16324: (
        "VEREDICTO: SOSPECHOSO — Concentración carretera prolongada en 4 sexenios.\n\n"
        "Técnicos Especializados de Chiapas SA de CV (VID=16324) acumuló 6.21B MXN en "
        "109 contratos de construcción y rehabilitación de carreteras (2003-2025).\n\n"
        "PATRONES SOSPECHOSOS:\n"
        "1. 22 años de contratos continuos — sobrevive Fox, Calderón, Peña Nieto, AMLO "
        "y Sheinbaum sin interrupción. Inusual para empresa regional.\n"
        "2. Contratos individuales de 200-400M MXN en rehabilitación de pavimento — "
        "montos altos para empresa chiapaneca.\n"
        "3. 60+ contratos con score de riesgo crítico (RS=1.0).\n"
        "4. Concentración en CAPUFE (2.29B, 37% del total) + SCT/SICT (1.38B, 22%).\n"
        "5. Nombre genérico \"Técnicos Especializados\" en estado con alta incidencia "
        "de corrupción en obra pública.\n\n"
        "FACTORES ATENUANTES:\n"
        "1. DA=10.1% (bajo) — 90% por licitación pública.\n"
        "2. 11 instituciones diferentes (diversificación moderada).\n"
        "3. Descripción de obras coherente (fresado, reposición de carpeta, losas hidráulicas).\n\n"
        "ACCIÓN: Prioridad media. Verificar:\n"
        "- Auditorías ASF de CAPUFE y SCT en Chiapas/sur de México.\n"
        "- Registro en QuiénEsQuién.wiki para identificar beneficiarios reales.\n"
        "- Si hay relación con funcionarios de CAPUFE o SCT regional."
    ),
}


def main():
    conn = sqlite3.connect(DB, timeout=60)
    conn.execute("PRAGMA busy_timeout=60000")
    conn.execute("PRAGMA journal_mode=WAL")
    cur = conn.cursor()
    now = datetime.utcnow().isoformat()

    inserted_cases = 0
    inserted_vendors = 0
    inserted_contracts = 0
    updated_memos = 0

    # Insert cases
    for case in CASES:
        cur.execute("SELECT id FROM ground_truth_cases WHERE case_id=?", (case["case_id"],))
        if cur.fetchone():
            print(f"  SKIP case {case['case_id']} (already exists)")
            continue
        cur.execute(
            """INSERT INTO ground_truth_cases
               (case_id, case_name, case_type, year_start, year_end,
                estimated_fraud_mxn, confidence_level, notes, created_at)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (
                case["case_id"], case["case_name"], case["case_type"],
                case.get("year_start"), case.get("year_end"),
                case["estimated_fraud_mxn"], case["confidence_level"],
                case["notes"], now,
            ),
        )
        print(f"  + case {case['case_id']}")
        inserted_cases += 1

    # Insert vendors
    for v in VENDORS:
        cur.execute(
            "SELECT id FROM ground_truth_vendors WHERE vendor_id=? AND case_id=?",
            (v["vendor_id"], v["case_id"]),
        )
        if cur.fetchone():
            print(f"  SKIP vendor {v['vendor_id']} for case {v['case_id']}")
            continue
        cur.execute(
            """INSERT INTO ground_truth_vendors
               (case_id, vendor_id, vendor_name_source, rfc_source, role,
                evidence_strength, match_method, match_confidence, notes, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (
                v["case_id"], v["vendor_id"], v["vendor_name_source"],
                v["rfc_source"], v["role"], v["evidence_strength"],
                v["match_method"], v["match_confidence"], v["notes"], now,
            ),
        )
        print(f"  + vendor {v['vendor_id']} ({v['vendor_name_source'][:40]})")
        inserted_vendors += 1

    # Insert GT contracts
    for v in VENDORS:
        vid = v["vendor_id"]
        cid = v["case_id"]
        cur.execute("SELECT id, amount_mxn, contract_year FROM contracts WHERE vendor_id=?", (vid,))
        rows = cur.fetchall()
        for ctr_id, amt, yr in rows:
            cur.execute(
                "SELECT id FROM ground_truth_contracts WHERE case_id=? AND contract_id=?",
                (cid, ctr_id),
            )
            if cur.fetchone():
                continue
            cur.execute(
                """INSERT INTO ground_truth_contracts
                   (case_id, contract_id, amount_source, year_source,
                    evidence_strength, match_method, match_confidence, notes, created_at)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (cid, ctr_id, amt, yr, v["evidence_strength"], "vendor_match", 1.0, None, now),
            )
            inserted_contracts += 1

    # Update aria_queue memos
    for vid, memo in MEMOS.items():
        cur.execute(
            "UPDATE aria_queue SET memo_text=?, memo_generated_at=?, review_status='reviewed' WHERE vendor_id=?",
            (memo, now, vid),
        )
        if cur.rowcount > 0:
            updated_memos += 1
            print(f"  ~ memo for VID={vid}")
        else:
            print(f"  ! VID={vid} not in aria_queue (memo saved to GT only)")

    conn.commit()
    conn.close()

    print(f"\nBatch G results:")
    print(f"  Cases inserted:    {inserted_cases}")
    print(f"  Vendors inserted:  {inserted_vendors}")
    print(f"  Contracts linked:  {inserted_contracts}")
    print(f"  Memos updated:     {updated_memos}")


if __name__ == "__main__":
    main()
