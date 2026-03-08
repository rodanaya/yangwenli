"""Insert GT cases 313-315: ESMA Instalaciones, Constructora Germer, Telecomunicacion y Equipos.

Run from backend/ directory:
    python -m scripts._insert_cases_313_315
"""
import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3

DB = "RUBLI_NORMALIZED.db"


def insert_cases():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    count = conn.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
    print(f"Current GT: max_id={max_id}, count={count}")

    cases = [
        {
            "case_id": "ESMA_INSTALACIONES_CAPUFE_SCT_CARRETERAS_2010_2025",
            "case_name": "ESMA Instalaciones Captura CAPUFE/SCT Carreteras 7.72B Sin RFC 2010-2025",
            "case_type": "institution_capture",
            "year_start": 2010,
            "year_end": 2025,
            "estimated_fraud_mxn": 7720000000.0,
            "confidence_level": "medium",
            "notes": (
                "ESMA INSTALACIONES SA DE CV acumula 7.72B MXN en contratos de obra civil carretera "
                "(rehabilitacion de pavimentos, ampliaciones, puentes vehiculares) entre 2010 y 2025, "
                "sin RFC registrado. El 96% del valor total concentrado en CAPUFE (59c, 3.84B, 49.7%) "
                "y SCT/SICT/BANOBRAS (45+c, 3.88B). El 96.5% son licitacion publica (DA=3.5%), pero la "
                "extrema concentracion institucional sin RFC genera riesgo de captura de adjudicador. "
                "RS=0.945 (critico). Requiere verificacion en Registro Publico y padron CAPUFE."
                "
[MEMO GENERADO: 2026-03-08]"
            ),
            "vendor_ids": [54881],
        },
        {
            "case_id": "CONSTRUCTORA_GERMER_IMSS_MONOPOLIO_OBRAS_2002_2025",
            "case_name": "Constructora Germer Monopolio IMSS Obras 6.80B Sin RFC 2002-2025",
            "case_type": "concentrated_monopoly",
            "year_start": 2002,
            "year_end": 2025,
            "estimated_fraud_mxn": 6800000000.0,
            "confidence_level": "medium",
            "notes": (
                "CONSTRUCTORA GERMER SA DE CV recibe el 94.6% de su facturacion (6.43B/6.80B MXN) "
                "del IMSS entre 2002 y 2025 (93 de 119 contratos), sin RFC registrado. "
                "El contrato mas grande (2007, 4.57B MXN) titulado Reparacion de Acabados Incluyendo "
                "Pintura no corresponde con el monto, sugiriendo posible subdeclaracion de alcance "
                "o contrato paraguas. DA=21.9%. Dominio monopsonista en IMSS durante 23 anyos sin RFC. "
                "RS=0.820. Requiere cruce ASF Cuenta Publica 2007."
                "
[MEMO GENERADO: 2026-03-08]"
            ),
            "vendor_ids": [6602],
        },
        {
            "case_id": "TELECOMUNICACION_EQUIPOS_IMSS_ISSSTE_MEDICO_DA_2003_2025",
            "case_name": "Telecomunicacion y Equipos Equipo Medico IMSS/ISSSTE DA 39.4pct 4.89B Sin RFC 2003-2025",
            "case_type": "institution_capture",
            "year_start": 2003,
            "year_end": 2025,
            "estimated_fraud_mxn": 4890000000.0,
            "confidence_level": "medium",
            "notes": (
                "TELECOMUNICACION Y EQUIPOS SA DE CV opera en mantenimiento de equipo medico e imagen "
                "diagnostica para IMSS (100c, 2.87B) e ISSSTE (13c, 1.33B), pese a que su razon social "
                "indica telecomunicaciones: mismatch industria-actividad real. DA=39.4% en 198 contratos "
                "2003-2025. Varios contratos citan titularidad de patente (LAASSP Art. 41). Sin RFC. "
                "Total 4.89B MXN. RS=0.811. Confianza media: posible justificacion tecnica legal."
                "
[MEMO GENERADO: 2026-03-08]"
            ),
            "vendor_ids": [13415],
        },
    ]

    for case in cases:
        cur.execute(
            "INSERT OR IGNORE INTO ground_truth_cases "
            "(case_id, case_name, case_type, year_start, year_end, estimated_fraud_mxn, "
            " source_news, confidence_level, notes) "
            "VALUES (?,?,?,?,?,?,?,?,?)",
            (
                case["case_id"], case["case_name"], case["case_type"],
                case["year_start"], case["year_end"], case["estimated_fraud_mxn"],
                "ARIA_AUTO", case["confidence_level"], case["notes"],
            ),
        )
        case_db_id = cur.lastrowid
        if case_db_id == 0:
            case_db_id = conn.execute(
                "SELECT id FROM ground_truth_cases WHERE case_id=?", (case["case_id"],)
            ).fetchone()[0]
        print(f"
Case db_id={case_db_id}: {case['case_name'][:70]}")

        for vendor_id in case["vendor_ids"]:
            vname = conn.execute("SELECT name FROM vendors WHERE id=?", (vendor_id,)).fetchone()
            vname = vname[0] if vname else f"VID_{vendor_id}"
            cur.execute(
                "INSERT OR IGNORE INTO ground_truth_vendors "
                "(case_id, vendor_id, vendor_name_source, evidence_strength, match_method) "
                "VALUES (?,?,?,?,?)",
                (case_db_id, vendor_id, vname, case["confidence_level"], "vendor_id_direct"),
            )
            contract_ids = conn.execute(
                "SELECT id FROM contracts WHERE vendor_id=?", (vendor_id,)
            ).fetchall()
            for (cid,) in contract_ids:
                cur.execute(
                    "INSERT OR IGNORE INTO ground_truth_contracts "
                    "(case_id, contract_id, evidence_strength, match_method) VALUES (?,?,?,?)",
                    (case_db_id, cid, case["confidence_level"], "vendor_id_direct"),
                )
            print(f"  VID={vendor_id} ({vname}): {len(contract_ids)} contracts linked")

    conn.commit()
    print(f"
GT final: {conn.execute('SELECT COUNT(*) FROM ground_truth_cases').fetchone()[0]} cases")
    print(f"         {conn.execute('SELECT COUNT(*) FROM ground_truth_vendors WHERE vendor_id IS NOT NULL').fetchone()[0]} vendors")
    print(f"         {conn.execute('SELECT COUNT(*) FROM ground_truth_contracts').fetchone()[0]} contracts")
    conn.close()


if __name__ == "__main__":
    insert_cases()
