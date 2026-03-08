"""Insert GT cases 334-337 for 4 high-risk vendors."""
import sqlite3, pathlib

DB = pathlib.Path(__file__).resolve().parent.parent / "RUBLI_NORMALIZED.db"

CASES = [
    {
        "id": 334,
        "case_id": "MK_HUMANA_ISSSTE_HEMODIALISIS",
        "case_name": "MK Humana - Monopolio Hemodiálisis ISSSTE",
        "case_type": "concentrated_monopoly",
        "confidence_level": "medium",
        "notes": "Proveedor con 1.06B MXN en solo 6 contratos (2006-2010). 100% licitación pública, 0% adjudicación directa. Dos mega-contratos de hemodiálisis integral ISSSTE (672M y 367M MXN). Sin RFC registrado. Concentración extrema en servicios de hemodiálisis para ISSSTE con contratos atípicamente grandes.",
        "estimated_fraud_mxn": 1_060_000_000,
        "vendor_id": 26289,
        "vendor_name": "MK HUMANA S.A. DE C.V.",
        "contract_ids": [179140, 165400, 165570, 201427, 223216, 670662],
    },
    {
        "id": 335,
        "case_id": "CONSTRUOBRAS_GARZA_CARRETERAS",
        "case_name": "Construobras de la Garza - Concentración Carreteras SCT/CAPUFE",
        "case_type": "concentrated_monopoly",
        "confidence_level": "medium",
        "notes": "Constructora con 2.86B MXN en 75 contratos (2002-2020). 98.7% licitación pública. Sin RFC. Contratos grandes en modernización de carreteras (Victoria-Matamoros 308M, SCT 262M, ruta 97 125M). Opera principalmente en Tamaulipas/Noreste con SCT, CAPUFE y secretarías estatales. Patrón de concentración geográfica y sectorial sostenido por 18 años.",
        "estimated_fraud_mxn": 2_860_000_000,
        "vendor_id": 10456,
        "vendor_name": "CONSTRUOBRAS DE LA GARZA S.A. DE C.V.",
        "contract_ids": [31989, 31988, 85539, 85519, 84917, 84785, 84790, 84493, 84789, 84788, 140076, 140103, 92573, 140090, 142656, 140119, 140120, 199426, 253287, 256324, 256311, 253227, 256336, 253264, 310163, 306581, 310226, 310220, 306643, 354127, 356704, 533680, 454449, 647418, 491455, 738269, 846106, 835274, 787063, 1017000, 1039213, 909684, 992759, 937309, 1046748, 896617, 1034083, 925283, 934967, 1008036, 982853, 1197512, 1245421, 1236027, 1087633, 1471785, 1493222, 1351496, 1468741, 1467213, 1335014, 1381044, 1494654, 1402927, 1441903, 1511982, 1701304, 1594098, 1570218, 1536337, 1526365, 1874692, 1870958, 2022577, 2192414],
    },
    {
        "id": 336,
        "case_id": "ABASTECIMIENTOS_IMSS_ELEVADORES",
        "case_name": "Abastecimientos y Servicios Industriales - Mega-contrato Elevadores IMSS",
        "case_type": "overpricing",
        "confidence_level": "medium",
        "notes": "Proveedor con 667M MXN en 10 contratos (2013-2019). 50% adjudicación directa. Sin RFC. Un solo mega-contrato de elevadores IMSS por 559M MXN (84% del total) — atípico para empresa de abastecimientos industriales. Contratos menores en calderas, equipos electromecánicos e impermeabilización. Patrón de diversificación sospechosa: elevadores, calderas, impermeabilización sugiere empresa fachada flexible.",
        "estimated_fraud_mxn": 667_000_000,
        "vendor_id": 107890,
        "vendor_name": "ABASTECIMIENTOS Y SERVICIOS INDUSTRIALES DEL",
        "contract_ids": [737418, 1058399, 1032852, 1192297, 1425357, 1507700, 1614100, 1943099, 1974644, 2043075],
    },
    {
        "id": 337,
        "case_id": "ELECTROMECANICOS_CARIBE_IMSS",
        "case_name": "Servicios Electromecánicos del Caribe - Concentración Mantenimiento IMSS",
        "case_type": "concentrated_monopoly",
        "confidence_level": "medium",
        "notes": "Proveedor con 840M MXN en 52 contratos (2010-2023). 48.1% adjudicación directa. Sin RFC. Mega-contrato de mantenimiento electromecánico IMSS por 512M MXN (61% del total). 100% dependiente de IMSS. Contratos en plantas de emergencia, transformadores y equipos electromecánicos. Patrón de captura institucional: 13 años como proveedor exclusivo IMSS en mantenimiento electromecánico.",
        "estimated_fraud_mxn": 840_000_000,
        "vendor_id": 62994,
        "vendor_name": "SERVICIOS ELECTROMECANICOS DEL CARIBE SA DE CV",
        "contract_ids": [502641, 425886, 553453, 655366, 532659, 497097, 448188, 580305, 847832, 818700, 853677, 710399, 949686, 1012322, 1001258, 1152832, 1220788, 1097821, 1402108, 1154669, 1324678, 1645247, 1328468, 1347961, 1338731, 1718458, 1525801, 1533924, 1857392, 1872639, 1863484, 2088810, 1981146, 2086020, 2065824, 2077318, 2247448, 2223520, 2247090, 2223490, 2461618, 2466303, 2448433, 2447333, 2452791, 2450509, 2468353, 2433001, 2684543, 2563642, 2696060, 2853009],
    },
]

def main():
    conn = sqlite3.connect(str(DB))
    cur = conn.cursor()
    for c in CASES:
        cur.execute(
            "INSERT OR IGNORE INTO ground_truth_cases (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn) VALUES (?,?,?,?,?,?,?)",
            (c["id"], c["case_id"], c["case_name"], c["case_type"], c["confidence_level"], c["notes"], c["estimated_fraud_mxn"]),
        )
        cur.execute(
            "INSERT OR IGNORE INTO ground_truth_vendors (case_id, vendor_id, vendor_name_source, evidence_strength, match_method) VALUES (?,?,?,?,?)",
            (c["case_id"], c["vendor_id"], c["vendor_name"], "medium", "name_exact"),
        )
        for cid in c["contract_ids"]:
            cur.execute(
                "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                (c["case_id"], cid),
            )
        print(f"Case {c['id']} ({c['case_id']}): 1 vendor, {len(c['contract_ids'])} contracts")
    conn.commit()
    # Totals
    total_cases = cur.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
    total_vendors = cur.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    total_contracts = cur.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
    print(f"\nGT totals: {total_cases} cases, {total_vendors} vendors, {total_contracts} contracts")
    conn.close()

if __name__ == "__main__":
    main()
