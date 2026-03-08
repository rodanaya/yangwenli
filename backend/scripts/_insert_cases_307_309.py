"""Insert GT cases 307-309: Grimann, DLP Medical, Prodifarma.

Key findings from research:
- GRIMANN (VID=20375): Patented drug distributor (RS=0.990, 81.2% DA).
  Titles say "COMPRA CONSOLIDADA DE MEDICAMENTOS (1 CLAVE) PATENTE" — single-patent drug.
  High DA legally justified under LAASSP Art. 41. Confidence: low (probable false positive).

- DLP MEDICAL (VID=4642): Material de curacion/radiologico distributor (RS=1.000, 0% DA, 2.8% SB).
  1.29B MXN dominated by single 2006 IMSS contract of 1.146B (88.7% of total).
  No patented drugs — generic medical/radiological supplies. Opaque vendor, vanishes post-2007.
  Confidence: medium.

- PRODIFARMA (VID=19872): Diabetes diagnostic service provider to IMSS (RS=1.000, 0% DA, 15.4% SB).
  One dominant contract: 580M MXN "Servicio Integral Deteccion Diabetes Mellitus" 2005.
  Service+device captive model (glucometers+strips+lancets). No RFC. 99.5% value in IMSS.
  Confidence: medium.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from pathlib import Path

DB = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def insert_cases():
    conn = sqlite3.connect(str(DB))
    cur = conn.cursor()

    cases = [
        {
            "case_id": "GRIMANN_MEDICAMENTO_PATENTE_IMSS_2005_2025",
            "case_name": "Grimann — Distribuidor Medicamento Patente IMSS/ISSSTE Sin RFC 0.57B 2005-2025",
            "case_type": "concentrated_monopoly",
            "year_start": 2005,
            "year_end": 2025,
            "confidence_level": "low",
            "notes": (
                "GRIMANN S.A. DE C.V. (VID=20375) suministra una clave de medicamento patentado a IMSS, "
                "ISSSTE e institutos nacionales entre 2005 y 2025. El 81.2% de sus 16 contratos son "
                "adjudicaciones directas (AD) bajo 'COMPRA CONSOLIDADA DE MEDICAMENTOS (1 CLAVE) "
                "PATENTE 2025-2026', lo que indica justificacion LAASSP Art. 41 por exclusividad de "
                "patente. RS=0.990 derivado de alta concentracion y DA. Sin RFC. Confianza BAJA: "
                "patron consistente con proveedor de farmaco de patente unica autorizado legalmente "
                "— probable falso positivo del modelo. Requiere verificacion en IMPI y expedientes "
                "COMPRANET para confirmar exclusividad farmaceutica real antes de clasificar como caso."
            ),
            "estimated_fraud_mxn": 574671974,
            "vendor_ids": [20375],
        },
        {
            "case_id": "DLP_MEDICAL_MATERIAL_CURACION_IMSS_2002_2007",
            "case_name": "DLP Medical — Material Curacion/Radiologico IMSS/ISSSTE 1.29B Sin RFC 2002-2007",
            "case_type": "concentrated_monopoly",
            "year_start": 2002,
            "year_end": 2007,
            "confidence_level": "medium",
            "notes": (
                "DLP MEDICAL S.A. DE C.V. (VID=4642) proveyo material de curacion, estomatologia, "
                "radiologico y de laboratorio a IMSS (91.3% del valor), ISSSTE y sistemas estatales "
                "de salud entre 2002 y 2007. RS=1.000, ARIA IPS=0.661. Concentracion extrema en un "
                "contrato singular de 1.146B MXN con IMSS en 2006 (88.7% del total historico). "
                "Sin RFC, 72 contratos, 0% DA (todas licitaciones publicas), 2.8% single-bid. "
                "La magnitud de un solo contrato en un distribuidor sin RFC que desaparece post-2007 "
                "es anomala. No hay evidencia de drogas patentadas — suministros medicos genericos. "
                "Patron sospechoso: mega-contrato IMSS opaco, multiples delegaciones, cese abrupto."
            ),
            "estimated_fraud_mxn": 1292239035,
            "vendor_ids": [4642],
        },
        {
            "case_id": "PRODIFARMA_SERVICIO_DIABETES_IMSS_2005_2009",
            "case_name": "Prodifarma — Servicio Integral Diabetes IMSS Sin RFC 0.58B 2005-2009",
            "case_type": "concentrated_monopoly",
            "year_start": 2005,
            "year_end": 2009,
            "confidence_level": "medium",
            "notes": (
                "PRODIFARMA PROMOCIONES Y DISTRIBUCIONES FARMACEUTICAS S.A. DE C.V. (VID=19872) "
                "obtuvo contrato de 580M MXN en 2005 con IMSS para 'Servicio Integral para la "
                "Deteccion de Diabetes Mellitus' en delegaciones Veracruz Norte y Veracruz Sur. "
                "Modelo 'servicio integral' (equipo+insumos+servicio) genera dependencia cautiva "
                "en el proveedor. El contrato representa 99.5% del valor historico total. "
                "Sin RFC. 26 contratos (2005-2009), 0% DA, 15.4% single-bid. RS=1.000, IPS=0.658. "
                "Estructura de contrato integral de diagnostico de diabetes + distribucion de "
                "glucometros/lancetas/cintas sin RFC sugiere posible intermediario cautivo. "
                "Requiere cruce con registros COFEPRIS y ASF Cuenta Publica 2005-2006."
            ),
            "estimated_fraud_mxn": 583319057,
            "vendor_ids": [19872],
        },
    ]

    for case in cases:
        cur.execute(
            """
            INSERT OR IGNORE INTO ground_truth_cases
            (case_id, case_name, case_type, year_start, year_end,
             estimated_fraud_mxn, source_news, confidence_level, notes)
            VALUES (?,?,?,?,?,?,?,?,?)
            """,
            (
                case["case_id"],
                case["case_name"],
                case["case_type"],
                case["year_start"],
                case["year_end"],
                case["estimated_fraud_mxn"],
                "ARIA_AUTO",
                case["confidence_level"],
                case["notes"],
            ),
        )

        case_db_id = cur.lastrowid
        if case_db_id == 0:
            case_db_id = cur.execute(
                "SELECT id FROM ground_truth_cases WHERE case_id=?", (case["case_id"],)
            ).fetchone()[0]
        print(f"Case db_id={case_db_id}: {case['case_name']}")

        for vendor_id in case["vendor_ids"]:
            vname = conn.execute(
                "SELECT name FROM vendors WHERE id=?", (vendor_id,)
            ).fetchone()
            vname = vname[0] if vname else f"VID_{vendor_id}"
            cur.execute(
                """INSERT OR IGNORE INTO ground_truth_vendors
                   (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
                   VALUES (?,?,?,?,?)""",
                (case_db_id, vendor_id, vname, case["confidence_level"], "vendor_id_match"),
            )
            contracts = conn.execute(
                "SELECT id FROM contracts WHERE vendor_id=?", (vendor_id,)
            ).fetchall()
            for (cid,) in contracts:
                cur.execute(
                    """INSERT OR IGNORE INTO ground_truth_contracts
                       (case_id, contract_id, evidence_strength, match_method)
                       VALUES (?,?,?,?)""",
                    (case_db_id, cid, case["confidence_level"], "vendor_id_match"),
                )
            print(f"  VID={vendor_id} ({vname}): {len(contracts)} contracts inserted")

    conn.commit()

    total_cases = conn.execute(
        "SELECT COUNT(*) FROM ground_truth_cases"
    ).fetchone()[0]
    total_vendors = conn.execute(
        "SELECT COUNT(*) FROM ground_truth_vendors WHERE vendor_id IS NOT NULL"
    ).fetchone()[0]
    total_contracts = conn.execute(
        "SELECT COUNT(*) FROM ground_truth_contracts"
    ).fetchone()[0]

    print(f"\nGT totals:")
    print(f"  {total_cases} cases")
    print(f"  {total_vendors} vendors")
    print(f"  {total_contracts} contracts")
    conn.close()


if __name__ == "__main__":
    insert_cases()
