"""Insert GT cases 326-329: Proacon, Human Corporis, Vantage Salud, Inovamedik."""
import sqlite3, pathlib

DB = pathlib.Path(__file__).resolve().parent.parent / "RUBLI_NORMALIZED.db"

CASES = [
    # 326 - PROACON MEXICO
    {
        "case_id": "PROACON_TUNELES_INFRAESTRUCTURA_2014_2025",
        "case_name": "Proacon Mexico — Monopolio de Tuneles Federales",
        "case_type": "concentrated_monopoly",
        "year_start": 2014,
        "year_end": 2025,
        "estimated_fraud_mxn": 4_170_000_000,
        "source_news": "Analisis RUBLI v5.1 — risk_score=0.899",
        "confidence_level": "medium",
        "notes": "8 contratos por 4.17B MXN, promedio 521M cada uno. Especialista en tuneles (TEP II CONAGUA, Omitlan, Barranca Larga). 0% adjudicacion directa pero concentracion extrema en tuneleria federal. Sin RFC registrado.",
        "vendors": [
            {"vendor_id": 126363, "vendor_name_source": "PROACON MEXICO", "role": "primary",
             "evidence_strength": "medium", "match_method": "exact_name", "match_confidence": 1.0,
             "notes": "8 contratos, 4.17B MXN, CONAGUA+SCT+CAPUFE, 100% licitacion publica, sin RFC"}
        ],
    },
    # 327 - HUMAN CORPORIS
    {
        "case_id": "HUMAN_CORPORIS_ACELERADORES_IMSS_2017_2025",
        "case_name": "Human Corporis — Monopolio Aceleradores Lineales IMSS",
        "case_type": "concentrated_monopoly",
        "year_start": 2017,
        "year_end": 2025,
        "estimated_fraud_mxn": 2_550_000_000,
        "source_news": "Analisis RUBLI v5.1 — risk_score=0.816",
        "confidence_level": "medium",
        "notes": "25 contratos por 2.55B MXN. Proveedor dominante de aceleradores lineales (radioterapia oncologica) para IMSS. 76% licitacion publica, 24% adjudicacion directa. Concentracion en equipo medico especializado de alta tecnologia. Sin RFC.",
        "vendors": [
            {"vendor_id": 201986, "vendor_name_source": "HUMAN CORPORIS SA DE CV", "role": "primary",
             "evidence_strength": "medium", "match_method": "exact_name", "match_confidence": 1.0,
             "notes": "25 contratos, 2.55B MXN, IMSS (14c/1.89B) + IMSS-Bienestar (6c/350M) + ISSSTE (2c/162M), aceleradores lineales oncologia"}
        ],
    },
    # 328 - VANTAGE SALUD
    {
        "case_id": "VANTAGE_SALUD_LOGISTICA_FARMACEUTICA_2016_2025",
        "case_name": "Vantage Servicios Integrales de Salud — Intermediario Logistico Farmaceutico",
        "case_type": "single_use_intermediary",
        "year_start": 2016,
        "year_end": 2025,
        "estimated_fraud_mxn": 2_350_000_000,
        "source_news": "Analisis RUBLI v5.1 — risk_score=0.877",
        "confidence_level": "medium",
        "notes": "249 contratos por 2.35B MXN. Intermediario de logistica farmaceutica: recepcion, almacenamiento, distribucion de medicamentos. Opera con INSABI (23c/861M), IMSS (32c/769M) y Servicios de Salud de Morelos (1c/567M). 46.6% adjudicacion directa. Nombre generico 'servicios integrales de salud' tipico de intermediarios. Sin RFC.",
        "vendors": [
            {"vendor_id": 173854, "vendor_name_source": "VANTAGE SERVICIOS INTEGRALES DE SALUD SA DE CV", "role": "primary",
             "evidence_strength": "medium", "match_method": "exact_name", "match_confidence": 1.0,
             "notes": "249 contratos, 2.35B MXN, INSABI+IMSS+Morelos, logistica y distribucion farmaceutica, 46.6% DA, sin RFC"}
        ],
    },
    # 329 - INOVAMEDIK
    {
        "case_id": "INOVAMEDIK_ANESTESIA_ISSSTE_2010_2025",
        "case_name": "Inovamedik — Monopolio Servicio Integral de Anestesia",
        "case_type": "concentrated_monopoly",
        "year_start": 2010,
        "year_end": 2025,
        "estimated_fraud_mxn": 2_200_000_000,
        "source_news": "Analisis RUBLI v5.1 — risk_score=0.859",
        "confidence_level": "medium",
        "notes": "30 contratos por 2.20B MXN. Proveedor monopolico de servicio integral de anestesia para ISSSTE (6c/1.20B), Secretaria de Salud Edo Mex (3c/548M) y Morelos (2c/135M). 15 anios de operacion continua 2010-2025. Modelo de servicio integral (equipo + gases + mantenimiento) que genera dependencia institucional. Sin RFC.",
        "vendors": [
            {"vendor_id": 89613, "vendor_name_source": "INOVAMEDIK, S.A. DE C.V.", "role": "primary",
             "evidence_strength": "medium", "match_method": "exact_name", "match_confidence": 1.0,
             "notes": "30 contratos, 2.20B MXN, ISSSTE (1.20B) + EdoMex Salud (548M) + Morelos (135M), servicio integral anestesia 2010-2025, sin RFC"}
        ],
    },
]

def main():
    conn = sqlite3.connect(str(DB))
    cur = conn.cursor()
    for case in CASES:
        cur.execute("""
            INSERT INTO ground_truth_cases
            (case_id, case_name, case_type, year_start, year_end,
             estimated_fraud_mxn, source_news, confidence_level, notes)
            VALUES (?,?,?,?,?,?,?,?,?)
        """, (
            case["case_id"], case["case_name"], case["case_type"],
            case["year_start"], case["year_end"], case["estimated_fraud_mxn"],
            case["source_news"], case["confidence_level"], case["notes"],
        ))
        db_case_id = case["case_id"]
        for v in case["vendors"]:
            cur.execute("""
                INSERT INTO ground_truth_vendors
                (case_id, vendor_id, vendor_name_source, role,
                 evidence_strength, match_method, match_confidence, notes)
                VALUES (?,?,?,?,?,?,?,?)
            """, (
                db_case_id, v["vendor_id"], v["vendor_name_source"], v["role"],
                v["evidence_strength"], v["match_method"], v["match_confidence"],
                v["notes"],
            ))
        print(f"Inserted case {db_case_id}")
    conn.commit()
    # Verify
    total_cases = cur.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
    total_vendors = cur.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    print(f"\nTotal GT cases: {total_cases}, Total GT vendors: {total_vendors}")
    conn.close()

if __name__ == "__main__":
    main()
