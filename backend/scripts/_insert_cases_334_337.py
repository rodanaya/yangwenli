"""GT Cases 334-337: Disequi, ICAPSA, Grupo ADDIM, Laboratorios Sydenham."""
import sqlite3, pathlib

DB = pathlib.Path(__file__).resolve().parent.parent / "RUBLI_NORMALIZED.db"

CASES = [
    {
        "case_id": "DISEQUI_PCR_SALUD_CONCENTRACION",
        "id": 334,
        "case_name": "Disequi SA de CV - Concentracion PCR en Salud Reproductiva",
        "case_type": "concentrated_monopoly",
        "confidence_level": "medium",
        "notes": "Proveedor sin RFC con 739M MXN en 7 contratos (2014-2018). 82% del valor concentrado en 2 adjudicaciones directas al Centro Nacional de Equidad de Genero (327M+279M). Reactivos PCR para cuantificacion de acidos nucleicos. Patron de vendor_concentration extrema en nicho de salud reproductiva.",
        "estimated_fraud_mxn": 739_000_000,
        "vendor_id": 129508,
        "vendor_name_source": "DISEQUI SA DE CV",
    },
    {
        "case_id": "ICAPSA_CARRETERAS_SCT_INFRAESTRUCTURA",
        "id": 335,
        "case_name": "ICAPSA Infraestructura - Concentracion en carreteras SCT/CAPUFE",
        "case_type": "concentrated_monopoly",
        "confidence_level": "medium",
        "notes": "Proveedor sin RFC con 682M MXN en 21 contratos (2016-2025). 0% adjudicacion directa pero risk_score=0.810. Concentrado en modernizacion y reparacion de carreteras federales para SCT/SICT y CAPUFE. Contrato mas grande: 354M MXN en 2023 para ampliacion km 306+000. Actividad continua 9 anos sugiere relacion institucional establecida.",
        "estimated_fraud_mxn": 682_000_000,
        "vendor_id": 172629,
        "vendor_name_source": "ICAPSA INFRAESTRUCTURA DE DESARROLLO SA DE CV",
    },
    {
        "case_id": "GRUPO_ADDIM_EQUIPOS_IMSS_ISSSTE",
        "id": 336,
        "case_name": "Grupo ADDIM - Equipos electromecanicos y bombas IMSS/ISSSTE",
        "case_type": "concentrated_monopoly",
        "confidence_level": "medium",
        "notes": "Proveedor sin RFC con 460M MXN en 9 contratos (2014-2021). RS=0.893. Patron mixto: equipos electromecanicos (172M, calderas 93M, aires acondicionados 44M) para IMSS via licitacion, mas adjudicacion directa de 145M en bombas de infusion para ISSSTE en 2020 (pandemia). Diversidad de productos (calderas, aires, bombas medicas) sugiere intermediario mas que fabricante.",
        "estimated_fraud_mxn": 460_000_000,
        "vendor_id": 140788,
        "vendor_name_source": "GRUPO ADDIM SA DE CV",
    },
    {
        "case_id": "LAB_SYDENHAM_MEDICAMENTOS_SALUD",
        "id": 337,
        "case_name": "Laboratorios Sydenham - Proveedor dominante medicamentos sector salud",
        "case_type": "concentrated_monopoly",
        "confidence_level": "medium",
        "notes": "Proveedor sin RFC con 1.42B MXN en 83 contratos (2008-2025). RS=0.903. Proveedor farmaceutico con presencia de 17 anos en IMSS, ISSSTE, INSABI. Explosion de valor en 2025: 1.31B MXN (92% del total historico) en compra consolidada de medicamentos. Dos adjudicaciones directas de 522M y 31M en 2025. Patron de crecimiento exponencial tardio y concentracion institucional extrema.",
        "estimated_fraud_mxn": 1_415_000_000,
        "vendor_id": 38345,
        "vendor_name_source": "LABORATORIOS SYDENHAM S.A. DE C.V.",
    },
]


def main():
    conn = sqlite3.connect(str(DB))
    c = conn.cursor()
    for case in CASES:
        c.execute(
            """INSERT OR IGNORE INTO ground_truth_cases
               (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (case["id"], case["case_id"], case["case_name"], case["case_type"],
             case["confidence_level"], case["notes"], case["estimated_fraud_mxn"]),
        )
        c.execute(
            """INSERT OR IGNORE INTO ground_truth_vendors
               (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
               VALUES (?, ?, ?, ?, ?)""",
            (case["case_id"], case["vendor_id"], case["vendor_name_source"],
             case["confidence_level"], "vendor_id_direct"),
        )
        c.execute("SELECT id FROM contracts WHERE vendor_id = ?", (case["vendor_id"],))
        cids = [r[0] for r in c.fetchall()]
        for cid in cids:
            c.execute(
                "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?, ?)",
                (case["case_id"], cid),
            )
        print(f"Case {case['id']} ({case['case_id']}): vendor {case['vendor_id']}, {len(cids)} contracts")
    conn.commit()
    c.execute("SELECT COUNT(*) FROM ground_truth_cases")
    print(f"\nTotal GT cases: {c.fetchone()[0]}")
    c.execute("SELECT COUNT(*) FROM ground_truth_vendors")
    print(f"\nTotal GT vendors: {c.fetchone()[0]}")
    conn.close()


if __name__ == "__main__":
    main()
