"""
Insert GT cases 298-300:
- Case 298: DESARROLLO DE INFRAESTRUCTURA I.C.G. SA DE CV (VID=185928)
- Case 299: REISCO OPERADORA DE SERVICIOS SA DE CV (VID=116886)
- Case 300: CONSORCIO CONTINENTAL DE INFRAESTRUCTURA (VID=124162)
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import sqlite3
from pathlib import Path

DB_PATH = str(Path(__file__).parent.parent / "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    cur = conn.cursor()

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"Current max GT case ID: {max_id}")
    assert max_id < 298, f"ID conflict: max_id={max_id} >= 298"

    # CASE 298: ICG Infraestructura
    cur.execute("""
        INSERT OR IGNORE INTO ground_truth_cases (
            id, case_id, case_name, case_type,
            year_start, year_end, estimated_fraud_mxn,
            confidence_level, notes
        ) VALUES (
            298,
            'ICG_INFRAESTRUCTURA_DA_HOSPITAL_MARUATA',
            'ICG Infraestructura — Adjudicaciones Directas en Obra Publica sin RFC (1.03B, 2015-2024)',
            'institution_capture',
            2015, 2024, 283617637.0,
            'medium',
            'DESARROLLO DE INFRAESTRUCTURA I.C.G. SA DE CV (VID=185928, sin RFC) acumulo 1.03B MXN en 10 contratos de obra publica 2015-2024. Contratos hospitalarios en Maruata Michoacan (283M) adjudicados directamente en 2023-2024. 60% DA, 40% single-bid en licitaciones. RS=0.773, IPS=0.636.'
        )
    """)
    print("Inserted case 298")

    cur.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors (
            case_id, vendor_id, vendor_name_source,
            role, evidence_strength, match_method, match_confidence, notes
        ) VALUES (
            298, 185928,
            'DESARROLLO DE INFRAESTRUCTURA I.C.G. SA DE CV',
            'primary', 'medium', 'vendor_id_direct', 'high',
            'Sin RFC. RS=0.773. 10 contratos 2015-2024, 6 DA, 4 single-bid. Hospital Maruata: 283M DA 2023-2024.'
        )
    """)

    ids_298 = [r[0] for r in conn.execute("SELECT id FROM contracts WHERE vendor_id=185928").fetchall()]
    cur.executemany("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (298, ?)", [(c,) for c in ids_298])
    print(f"Inserted {len(ids_298)} contracts for case 298")

    # CASE 299: REISCO
    cur.execute("""
        INSERT OR IGNORE INTO ground_truth_cases (
            id, case_id, case_name, case_type,
            year_start, year_end, estimated_fraud_mxn,
            confidence_level, notes
        ) VALUES (
            299,
            'REISCO_LIMPIEZA_SINGLE_BID_SCT_SEP_IPN',
            'REISCO Operadora — Servicios Limpieza 32.6% Single-Bid SCT/SEP/IPN (1.18B, 2013-2018)',
            'bid_rigging',
            2013, 2018, 590000000.0,
            'medium',
            'REISCO OPERADORA DE SERVICIOS SA DE CV (VID=116886, sin RFC) concentro 1.18B MXN en 129 contratos de limpieza 2013-2018. 42/129 (32.6%) resultaron single-bid en procedimientos competitivos. Clientes: IPN 294M, SCT 209M, SEP 112M. Desaparece del COMPRANET post-2018. RS=0.309, IPS=0.640.'
        )
    """)
    print("Inserted case 299")

    cur.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors (
            case_id, vendor_id, vendor_name_source,
            role, evidence_strength, match_method, match_confidence, notes
        ) VALUES (
            299, 116886,
            'REISCO OPERADORA DE SERVICIOS SA DE CV',
            'primary', 'medium', 'vendor_id_direct', 'high',
            'Sin RFC. RS=0.309. 129 contratos 2013-2018. Single-bid rate 32.6% (42/129). Top: IPN 294M, SCT 209M, SEP 112M.'
        )
    """)

    ids_299 = [r[0] for r in conn.execute("SELECT id FROM contracts WHERE vendor_id=116886").fetchall()]
    cur.executemany("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (299, ?)", [(c,) for c in ids_299])
    print(f"Inserted {len(ids_299)} contracts for case 299")

    # CASE 300: Consorcio Continental
    cur.execute("""
        INSERT OR IGNORE INTO ground_truth_cases (
            id, case_id, case_name, case_type,
            year_start, year_end, estimated_fraud_mxn,
            confidence_level, notes
        ) VALUES (
            300,
            'CONSORCIO_CONTINENTAL_SINGLE_BID_SCT_MICH',
            'Consorcio Continental — 100% Single-Bid en Licitaciones SIOP Michoacan (1.13B, 2015-2025)',
            'bid_rigging',
            2015, 2025, 565000000.0,
            'medium',
            'CONSORCIO CONTINENTAL DE INFRAESTRUCTURA (VID=124162, sin RFC) gano 16 contratos de obra publica por 1.13B MXN con 100% single-bid rate (0% DA). Todos sus contratos licitados no recibieron competidores. 95% del valor: SIOP Michoacan (2015-2025). Contratos: 318.8M (2025), 156.5M (2023), 124.7M (2019), 95.7M (2024). Posible colusión o acuerdo con área contratante. RS=0.830.'
        )
    """)
    print("Inserted case 300")

    cur.execute("""
        INSERT OR IGNORE INTO ground_truth_vendors (
            case_id, vendor_id, vendor_name_source,
            role, evidence_strength, match_method, match_confidence, notes
        ) VALUES (
            300, 124162,
            'CONSORCIO CONTINENTAL DE INFRAESTRUCTURA',
            'primary', 'medium', 'vendor_id_direct', 'high',
            'Sin RFC. RS=0.830. 16 contratos 2015-2025. 100% single-bid. SIOP Michoacan 95% del valor.'
        )
    """)

    ids_300 = [r[0] for r in conn.execute("SELECT id FROM contracts WHERE vendor_id=124162").fetchall()]
    cur.executemany("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (300, ?)", [(c,) for c in ids_300])
    print(f"Inserted {len(ids_300)} contracts for case 300")

    conn.commit()

    total_cases = conn.execute("SELECT COUNT(*) FROM ground_truth_cases").fetchone()[0]
    total_vendors = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    total_contracts = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
    print("=== FINAL GT TOTALS ===")
    print(f"Total cases: {total_cases}")
    print(f"Total GT vendors: {total_vendors}")
    print(f"Total GT contracts: {total_contracts}")
    conn.close()


if __name__ == "__main__":
    main()
