"""
ARIA Cases 705-707: March 19 2026 investigation session.

Cases:
  705: RAUL BARRERA GARCIA - Persona Fisica Water Pipeline SAPAS 549M (SB=1 risk=1.00 P3)
  706: ACCIONES GRUPO DE ORO - Multi-Institution Construction 533M (API+AICM+Morelia SB=1 P6)
  707: GLUCK CHEMISTRY - IMSS Cleaning Supplies 1.3B (2255 DA threshold-splitting P6)

Run from backend/ directory.
"""

# CASE-705: VID 78114 RAUL BARRERA GARCIA (persona fisica)
#   - 621.7M, 17 contracts, 0% DA, 82% SB, 2010-2022, infraestructura.
#   - SAPAS (Sistema de Agua Potable y Alcantarillado de Sonora) 549.2M (1c, DA=0, SB=1):
#     548.8M LP 2010 SB=1 risk=1.00 "Linea de Conduccion del Pozo Otomi al Tanque
#     Elevado Brisas de [Sonora]" — a major water pipeline construction project in
#     Sonora, won single-bid by a persona fisica (individual person), risk=1.00.
#   - Querétaro-Secretaría de Desarrollo Urbano y Obras Públicas 52.6M (12c, DA=4, SB=8):
#     community development + road rehabilitation projects.
#   - GTO-Presidencia Municipal San Miguel de Allende 18.8M (DA=1, SB=1). CEA Querétaro 1M.
#   - An individual person (persona física) — not a company — winning a 549M competitive
#     LP construction contract single-bid for Sonora's water pipeline (risk=1.00). A
#     natural person cannot typically execute 549M infrastructure as a prime contractor —
#     this is a classic P3 frontperson arrangement where an individual acts as a conduit
#     for a larger operation (shell, intermediary, or connected contractor). P3 persona
#     física infrastructure intermediary: SAPAS 549M SB=1 risk=1.00 at Sonora water utility.

# CASE-706: VID 79174 ACCIONES GRUPO DE ORO, S.A. DE C.V.
#   - 532.7M, 30 contracts, 7% DA, 63% SB, 2010-2020, infraestructura.
#   - API Lázaro Cárdenas 156M (3c, DA=0, SB=3): 112M LP 2016 SB=1 risk=0.25
#     "DESARROLLO DEL PROYECTO EJECUTIVO, CONSTRUCCIÓN, EQUIPAMIENTO" (port development).
#   - AICM (Aeropuerto Internacional Ciudad de México) 140M (2c, DA=1, SB=1): 140M LP
#     2012 SB=1 "Construcción de oficinas administrativas Api y centro de negocios"
#     (administrative offices, uncontested).
#   - H. Ayuntamiento de Morelia 104M (1c, DA=0, SB=1): LP 2010 SB=1 "Proyecto Integral
#     Llave en Mano de la Vialidad Metropolitana" (turnkey metropolitan road).
#   - SCT 72M (10c, DA=4, SB=6): road modernization + connectivity projects.
#   - Construction company winning AICM (Mexico City airport), API Lázaro Cárdenas port,
#     Morelia metropolitan road, and SCT federal roads — all via LP SB=1 across different
#     institutions and states. 19 of 30 contracts single-bid. P6 multi-institution
#     construction capture: federal port + airport + metro road all uncontested.

# CASE-707: VID 126468 GLUCK CHEMISTRY S DE RL DE CV
#   - 1,322.8M, 2,652 contracts, 85% DA, 1% SB, 2003-2025, salud.
#   - IMSS 2,601c 1,309M (DA=2,255, SB=14): 422.2M LP 2021 SB=0 risk=0.16
#     "GRUPO 350 ARTÍCULOS Y QUÍMICOS DE ASEO PARA" (cleaning articles and chemicals
#     for IMSS units) + 97M LP 2023 SB=0 risk=0.67 + 81M LP 2015. Plus 2,255 direct
#     award contracts for cleaning supplies across IMSS units.
#   - Hospital General de México 14c 6M (DA=7). SEDENA 4c 3M (DA=1). ISSSTE 5c 1M.
#   - Cleaning chemicals company capturing IMSS's cleaning supply procurement via
#     2,255 direct award contracts (systematic threshold-splitting to remain under DA
#     thresholds) plus large competitive LP wins. 85% DA across 2,652 contracts at
#     IMSS = sustained sole-source cleaning supply relationship at all major IMSS
#     units nationwide. P6 IMSS cleaning chemicals/supplies monopoly via DA saturation.

# FPs (structural / legitimate operators):
# 42873 NALCO DE MEXICO — Nalco/Ecolab (major US water treatment chemical company).
#   CFE 1,188M (84c, DA=50, SB=34): 1,000M LP 2017 SB=1 "INHIBIDORES QUIMICOS PARA
#   SISTEMAS DE ENFRIAMIENTO" (cooling system inhibitors for CFE power plants). Nalco
#   holds significant global market share in industrial cooling water chemicals.
#   Specialized technical products with few qualified suppliers globally. Structural
#   international chemical supplier.
# 5283 EMC COMPUTER SYSTEMS MEXICO SA DE CV — Dell EMC (major US data storage company).
#   SAT 1,639M (3c): 796M competitive + 715M DA + 128M SB for data storage/backup
#   services at the tax authority. EMC/Dell is a global enterprise storage provider.
#   Data storage infrastructure for SAT appropriately sourced from a global technology
#   company. Structural international IT supplier.

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA journal_mode=WAL")

    next_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] + 1
    print(f"Current max GT case ID: {next_id - 1}")

    note_705 = (
        "RAUL BARRERA GARCIA (persona fisica) — P3 SAPAS Sonora water pipeline "
        "frontperson: 621.7M, 82% SB, 17 contracts. SAPAS (Sistema de Agua "
        "Potable y Alcantarillado de Sonora) 548.8M LP 2010 SB=1 risk=1.00 "
        "'Linea de Conduccion del Pozo Otomi al Tanque Elevado Brisas de' — "
        "major water pipeline construction by an individual person (persona fisica), "
        "uncontested, risk=1.00. Queretaro state 52.6M (12c DA=4 SB=8). "
        "A natural person cannot execute 549M water infrastructure as prime "
        "contractor — classic P3 frontperson: individual as conduit for connected "
        "construction operation. SAPAS 549M SB=1 risk=1.00 persona fisica capture."
    )

    note_706 = (
        "ACCIONES GRUPO DE ORO SA DE CV — P6 multi-institution construction "
        "monopoly: 532.7M, 63% SB, 30 contracts, 2010-2020. API Lazaro Cardenas "
        "156M (3c SB=3): 112M LP 2016 SB=1 'DESARROLLO PROYECTO EJECUTIVO "
        "CONSTRUCCION EQUIPAMIENTO' (port development). AICM 140M (2c SB=1): "
        "140M LP 2012 SB=1 'Construccion de oficinas administrativas Api y centro "
        "de negocios' (Mexico City airport admin offices, uncontested). H. "
        "Ayuntamiento Morelia 104M LP 2010 SB=1 'Proyecto Integral Llave en Mano "
        "Vialidad Metropolitana' (turnkey metro road). SCT 72M SB=6. Construction "
        "firm winning AICM (airport) + API Lazaro Cardenas (port) + Morelia metro "
        "road + SCT all SB=1. P6 cross-institution construction: federal port + "
        "airport + metro infrastructure all uncontested."
    )

    note_707 = (
        "GLUCK CHEMISTRY S DE RL DE CV — P6 IMSS cleaning supplies monopoly via "
        "DA saturation: 1,322.8M, 85% DA, 2,652 contracts, 2003-2025. IMSS 2,601c "
        "1,309M (DA=2,255 SB=14): 422.2M LP 2021 SB=0 'GRUPO 350 ARTICULOS Y "
        "QUIMICOS DE ASEO PARA' + 97M LP 2023 SB=0 risk=0.67 + 81M LP 2015. "
        "2,255 direct award contracts at IMSS for cleaning articles and chemicals "
        "= systematic threshold-splitting to circumvent competitive bidding for "
        "cleaning supplies across all IMSS units. 85% DA across 2,652 contracts. "
        "P6 IMSS cleaning chemicals monopoly: sole-source DA supply to federal "
        "health insurer's nationwide cleaning operations over 22 years."
    )

    cases = [
        (0, [(78114, "RAUL BARRERA GARCIA", "high")],
         "RAUL BARRERA GARCIA - Persona Fisica SAPAS Water Pipeline 549M (SB=1 risk=1.00 P3)",
         "procurement_fraud", "high", note_705, 621700000, 2010, 2022),

        (1, [(79174, "ACCIONES GRUPO DE ORO, S.A. DE C.V.", "high")],
         "ACCIONES GRUPO DE ORO - Multi-Institution Construction 533M (API+AICM+Morelia P6)",
         "procurement_fraud", "high", note_706, 532700000, 2010, 2020),

        (2, [(126468, "Gluck Chemistry S de RL de CV", "high")],
         "GLUCK CHEMISTRY - IMSS Cleaning Supplies 1.3B (2255 DA threshold-split P6)",
         "procurement_fraud", "high", note_707, 1322800000, 2003, 2025),
    ]

    for (offset, vendors, cname, ctype, conf, notes, fraud, yr1, yr2) in cases:
        case_id_int = next_id + offset
        case_id_str = f"CASE-{case_id_int}"
        conn.execute("""
            INSERT OR REPLACE INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
            VALUES (?,?,?,?,?,?,?,?,?)
        """, (case_id_int, case_id_str, cname, ctype, conf, notes, fraud, yr1, yr2))
        print(f"Inserted case {case_id_int}: {cname[:65]}")

        for (vid, vname, strength) in vendors:
            conn.execute("""
                INSERT OR IGNORE INTO ground_truth_vendors
                (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
                VALUES (?,?,?,?,?)
            """, (case_id_str, vid, vname, strength, "aria_investigation"))
            rows = conn.execute("SELECT id FROM contracts WHERE vendor_id=?", (vid,)).fetchall()
            for row in rows:
                conn.execute(
                    "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                    (case_id_str, row[0])
                )
            conn.execute("""
                UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
                WHERE vendor_id=?
            """, (notes[:500], vid))
            n_contracts = len(rows)
            print(f"  Tagged {n_contracts} contracts for vendor {vid} ({vname[:55]})")

    conn.commit()

    # FPs
    fp_structural = [
        42873,    # NALCO DE MEXICO (Ecolab/Nalco — global industrial water treatment chemicals, CFE 1B SB=1 specialized)
        5283,     # EMC COMPUTER SYSTEMS MEXICO (Dell EMC — global enterprise data storage, SAT 1.6B IT infrastructure)
    ]
    for vid in fp_structural:
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='fp_excluded'
            WHERE vendor_id=?
        """, (vid,))
    conn.commit()
    print(f"Marked {len(fp_structural)} FPs (structural_monopoly)")

    # Needs review
    needs_review = [
        63271,    # TANQUES ALMACENAMIENTOS (2604M single DA Durango municipal water — data verify)
        100187,   # CM INGENIERIA Y ASESORIA (795M gas maintenance SB=1 CENAGAS, specialized)
        135772,   # CONSTRUCTORA CHARGER (381M hospital+road SB=1, 244M Gea González hospital 2024)
        172527,   # TRANSPORTES RUGA (248M waste/maintenance AICM+IMSS, small amounts)
        770,      # GRUPO SARI (350M SENASICA incinerators biosafety, specialized)
        218595,   # INDHR (152M state Puebla+CDMX construction, borderline)
        6108,     # CONSTRUCTORA DHAP (2471M CFE+IMSS+CDMX, ambulances+vehicles industry mismatch)
    ]
    for vid in needs_review:
        conn.execute("""
            UPDATE aria_queue SET review_status='needs_review'
            WHERE vendor_id=? AND review_status='pending'
        """, (vid,))
    conn.commit()
    print(f"Marked {len(needs_review)} needs_review")

    # Verify
    print("\n--- VERIFICATION ---")
    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    n_vendors = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    n_contracts = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
    print(f"Max case ID: {max_id} | GT vendors: {n_vendors} | GT contracts: {n_contracts}")
    for row in conn.execute(
        "SELECT gtc.id, gtc.case_id, gtc.case_name, COUNT(DISTINCT gtv.vendor_id), COUNT(gcon.contract_id) "
        "FROM ground_truth_cases gtc "
        "LEFT JOIN ground_truth_vendors gtv ON gtc.case_id=gtv.case_id "
        "LEFT JOIN ground_truth_contracts gcon ON gtc.case_id=gcon.case_id "
        f"WHERE gtc.id >= {next_id} "
        "GROUP BY gtc.id"
    ).fetchall():
        print(f"  {row[1]}: {row[2][:65]} | {row[3]}v | {row[4]}c")

    conn.close()
    print(f"\nDone. Cases 705-707 inserted.")


if __name__ == "__main__":
    run()
