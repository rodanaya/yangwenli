"""Insert GT cases 292-294: Solomed, KBN Medical, Soluglob Ikon."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
import os

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB = "RUBLI_NORMALIZED.db"


def insert_cases():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    cases = [
        {
            "case_id": "SOLOMED_IMSS_CONCENTRACION_MEDICA_2009_2025",
            "case_name": "Solomed — Concentración Sistémica de Suministros Médicos IMSS/ISSSTE (2.33B MXN)",
            "case_type": "concentrated_monopoly",
            "year_start": 2009,
            "year_end": 2025,
            "confidence_level": "medium",
            "notes": (
                "SOLOMED S.A. DE C.V. (sin RFC) acumula 111 contratos por 2,331 MDP entre 2009-2025, "
                "concentrados en 19 instituciones distintas pero con IMSS como cliente dominante. "
                "Tasa de adjudicación directa del 54% (60 contratos). Risk score v5.1 = 0.989 (crítico). "
                "IPS ARIA = 0.658 (Tier 2). Ausencia de RFC impide verificación SAT/EFOS. "
                "Patrón: concentración en suministros médicos consolidados (medicamentos, material de "
                "curación) a una sola empresa sin identificador fiscal verificable. Sin evidencia documental "
                "de corrupción confirmada; patrón estadístico consistente con captura institucional. "
                "Fuente: COMPRANET. Revisión ARIA automática."
            ),
            "estimated_fraud_mxn": 2331471966.0,
            "vendor_ids": [40859],
        },
        {
            "case_id": "KBN_MEDICAL_ISSSTE_ORTOPEDIA_CONCENTRACION_2003_2025",
            "case_name": "KBN Medical — Monopolio de Osteosíntesis y Endoprótesis ISSSTE (1.26B MXN)",
            "case_type": "institution_capture",
            "year_start": 2003,
            "year_end": 2025,
            "confidence_level": "medium",
            "notes": (
                "KBN MEDICAL S.A. DE C.V. (sin RFC) concentra 13 contratos por 1,261 MDP, "
                "de los cuales 46% se adjudican al ISSSTE. Especialidad exclusiva: servicio integral "
                "de osteosíntesis y endoprótesis ortopédicas en unidades hospitalarias del ISSSTE. "
                "Tasa de adjudicación directa 53.8% (7 de 13 contratos). Contrato principal 2020 por "
                "537M MDP (licitación); contratos 2022 y 2024 por 339M y 161M respectivamente por "
                "adjudicación directa. Risk score v5.1 = 1.000 (crítico máximo). IPS ARIA = 0.661 (Tier 2). "
                "Ausencia de RFC impide verificación fiscal. Patrón de captura institucional: proveedor "
                "único recurrente en nicho de alto valor (implantes ortopédicos) sin competencia visible. "
                "No se encontró evidencia pública de sanción. Requiere verificación con ASF Cuenta Pública "
                "ISSSTE 2020-2024. Fuente: COMPRANET. Revisión ARIA automática."
            ),
            "estimated_fraud_mxn": 1261035156.0,
            "vendor_ids": [13414],
        },
        {
            "case_id": "SOLUGLOB_IKON_SERVICIO_MEDICO_INTEGRAL_MULTISECTOR_2013_2025",
            "case_name": "Soluglob Ikon — Servicio Médico Integral Capitado Multisector (2.35B MXN)",
            "case_type": "concentrated_monopoly",
            "year_start": 2013,
            "year_end": 2025,
            "confidence_level": "medium",
            "notes": (
                "SOLUGLOB IKON SA DE CV (sin RFC) acumula 106 contratos por 2,351 MDP entre 2013-2025 "
                "a través de 17 instituciones distintas. Tasa de adjudicación directa 54.7% (58 contratos). "
                "Risk score v5.1 = 0.786 (alto). IPS ARIA = 0.651 (Tier 2). "
                "Contrato más grande: 1,175 MDP en 2023 al 'Instituto para Devolver al Pueblo lo Robado' "
                "(INDEP, ex-SAE) para servicio médico integral capitado del Fondo de Pensiones Banrural — "
                "modalidad inusual de contratación de servicio médico completo (3 niveles de atención) "
                "a proveedor privado sin red propia visible. Contrato 2022 con NAFIN por 510M MDP y "
                "2021 con NAFIN por 429M MDP bajo el mismo objeto. Concentración atípica: un solo proveedor "
                "sin RFC gana contratos de servicio médico integral en entidades tan diversas como NAFIN, "
                "INDEP, Lotería Nacional, SEDENA y hospitales estatales. Ausencia de RFC impide verificar "
                "capacidad operativa real. Patrón consistente con intermediario o empresa paraguas que "
                "subcontrata servicios médicos. Fuente: COMPRANET. Revisión ARIA automática."
            ),
            "estimated_fraud_mxn": 2351311760.0,
            "vendor_ids": [108273],
        },
    ]

    inserted_cases = []

    for case in cases:
        cur.execute(
            """
            INSERT OR IGNORE INTO ground_truth_cases
            (case_id, case_name, case_type, year_start, year_end, confidence_level,
             notes, estimated_fraud_mxn, created_at)
            VALUES (?,?,?,?,?,?,?,?,date('now'))
            """,
            (
                case["case_id"],
                case["case_name"],
                case["case_type"],
                case["year_start"],
                case["year_end"],
                case["confidence_level"],
                case["notes"],
                case["estimated_fraud_mxn"],
            ),
        )

        case_db_id = cur.lastrowid
        if case_db_id == 0:
            case_db_id = cur.execute(
                "SELECT id FROM ground_truth_cases WHERE case_id=?", (case["case_id"],)
            ).fetchone()[0]

        inserted_cases.append(case_db_id)
        print(f"Case: {case['case_name']} (db_id={case_db_id})")

        for vendor_id in case["vendor_ids"]:
            row = conn.execute("SELECT name, rfc FROM vendors WHERE id=?", (vendor_id,)).fetchone()
            vendor_name = row[0] if row else f"VID_{vendor_id}"
            rfc_source = row[1] if row and row[1] else "sin_RFC"

            cur.execute(
                """
                INSERT OR IGNORE INTO ground_truth_vendors
                (case_id, vendor_id, vendor_name_source, rfc_source, role,
                 evidence_strength, match_method, match_confidence, created_at)
                VALUES (?,?,?,?,?,?,?,?,date('now'))
                """,
                (
                    case_db_id,
                    vendor_id,
                    vendor_name,
                    rfc_source,
                    "primary",
                    case["confidence_level"],
                    "vendor_id_direct",
                    1.0,
                ),
            )

            contracts = conn.execute(
                "SELECT id FROM contracts WHERE vendor_id=?", (vendor_id,)
            ).fetchall()

            for (cid,) in contracts:
                cur.execute(
                    """
                    INSERT OR IGNORE INTO ground_truth_contracts
                    (case_id, contract_id, evidence_strength, match_method, match_confidence, created_at)
                    VALUES (?,?,?,?,?,date('now'))
                    """,
                    (case_db_id, cid, case["confidence_level"], "vendor_id_direct", 1.0),
                )

            print(f"  VID={vendor_id} ({vendor_name}): {len(contracts)} contracts linked")

    conn.commit()

    # Final counts
    total_cases = conn.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
    total_vendors = conn.execute(
        "SELECT COUNT(*) FROM ground_truth_vendors WHERE vendor_id IS NOT NULL"
    ).fetchone()[0]
    total_contracts = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
    print(f"\nFinal GT totals: {total_cases} cases, {total_vendors} vendors, {total_contracts} contracts")
    print(f"Case db_ids assigned: {inserted_cases}")
    conn.close()


if __name__ == "__main__":
    insert_cases()
