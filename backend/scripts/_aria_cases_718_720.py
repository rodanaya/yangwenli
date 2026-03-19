"""
ARIA Cases 718-720: March 19 2026 investigation session.

Cases:
  718: LA RED CORPORATIVO - SSa IT Infrastructure 573M (5x Annual SB=1) + IMSS 119M (P6)
  719: COMERCIALIZADORA INFINITO MC - SADER+RAN+SENASICA Cleaning 335M (new 2022 vendor 68%SB P3)
  720: SISTEMAS AVANZADOS EN COMPUTACION - PEMEX 218M SB=14 + CAPUFE+INEGI+SSPC 425M (P6)

Run from backend/ directory.
"""

# CASE-718: VID 12424 LA RED CORPORATIVO, S.A. DE C.V.
#   - 901.1M, 140 contracts, 16% DA, 24% SB, 2003-2025, salud.
#   - Secretaría de Salud (SSa) 573.1M (5c, DA=0, SB=5):
#     124M LP 2025 SB=1 risk=1.00 "SERVICIO INTEGRAL DE INFRAESTRUCTURA TECNOLÓGICA"
#     123M LP 2024 SB=1 risk=1.00 "SERVICIO INTEGRAL DE INFRAESTRUCTURA TECNOLÓGICA"
#     111.9M LP 2021 SB=1 risk=0.56 "SERVICO INTEGRAL DE INFRAESTRUCTURA TECNOLÓGICA"
#     107.3M LP 2023 SB=1 risk=1.00 "SERVICIO INTEGRAL DE INFRAESTRUCTURA TECNOLÓGICA"
#     106.9M LP 2022 SB=1 risk=0.58 "SERVICIO INTEGRAL DE INFRAESTRUCTURA TECNOLÓGICA"
#     — Five consecutive annual SB=1 contracts 2021-2025, same title each year, all
#     competitive procedures with zero competing bidders, escalating from 107M to 124M.
#   - IMSS 119.6M (2c, SB=1): 119.3M LP 2024 SB=1 risk=1.00 "ADQUISICIÓN DE UNIDADES
#     DE ENERGÍA ININTERRUMPIDA PARA UNIDADES MÉDICO" (UPS systems for IMSS medical units).
#   - Tren Maya FONATUR 43.8M LP 2022 SB=1 "ARRENDAMIENTO DE EQUIPOS DE CÓMPUTO PERSONAL"
#   - COMESA (Compañía Mexicana de Exploraciones) 22.5M LP 2021 SB=1 (computing rental).
#   - IT infrastructure services company capturing SSa with 5 identical annual SB=1 contracts
#     (2021-2025, 107-124M each) + IMSS 119.3M SB=1 UPS systems + Tren Maya + COMESA.
#     P6 cross-institution IT infrastructure monopoly: SSa annual renewal capture (573M,
#     5 consecutive years all SB=1) + IMSS (119M SB=1) + federal infrastructure programs.

# CASE-719: VID 284855 COMERCIALIZADORA INFINITO MC SA DE CV
#   - 335.1M, 196 contracts, 16% DA, 68% SB, 2022-2025, infraestructura.
#   - SADER (Secretaría de Agricultura) 45c 99.8M (DA=7, SB=38): 38 of 45 SADER
#     cleaning contracts single-bid. 11.4M LP 2024 SB=1 "SERVICIO INTEGRAL DE LIMPIEZA
#     PARA LA SECRETARÍA DE AGRICULTURA".
#   - RAN (Registro Agrario Nacional) 50c 35.4M (DA=1, SB=49): 49 of 50 RAN contracts
#     single-bid — near-total monopoly on cleaning services at land registry.
#   - SENASICA 2c 36.4M SB=1: 35.6M LP 2025 SB=1 "CONTRATO MARCO SERVICIO INTEGRAL
#     LIMPIEZA OFICINAS SENASICA 2025".
#   - ASA 28c 22.6M SB=2. Gea González hospital 9M SB=1.
#   - Very new company (founded 2022, active only 4 years), already with 196 contracts
#     totaling 335M across agriculture and health institutions, 68% single-bid. 49 of 50
#     RAN cleaning contracts uncontested + 38 of 45 SADER uncontested = extreme SB capture
#     at agriculture sector agencies. P3 new-vendor cleaning services intermediary:
#     SADER+RAN+SENASICA cleaning monopoly in 4 years via repeated SB=1 wins.

# CASE-720: VID 47779 SISTEMAS AVANZADOS EN COMPUTACION DE MEXICO SA DE CV
#   - 425.0M, 88 contracts, 53% DA, 34% SB, 2010-2025, energia.
#   - PEMEX Corporativo 19c 218.6M (DA=4, SB=14): 97.5M LP 2012 SB=1 risk=0.22
#     "Mantto. preventivo y correctivo a equipos auxiliares de centros comput" (computing
#     center maintenance, PEMEX HQ, uncontested) + 93.7M LP 2012 SB=1 "Mantto. aires
#     acondicionados para las areas del corporativo" (PEMEX HQ air conditioning, uncontested).
#     44.9M LP 2022 SB=1 risk=1.00 "Sistema de Encaps..." (PEMEX encapsulation system).
#   - CAPUFE 4c 78.9M (DA=2, SB=2): toll road computing/maintenance.
#   - INEGI 8c 71.6M (SB=4): statistical agency computing/infrastructure.
#   - SSPC 3c 32.9M SB=3. CFE 5c 9.6M (DA=2, SB=3).
#   - IT/computing maintenance company with 14 SB=1 contracts at PEMEX Corporativo (218.6M)
#     including two 2012 contracts: 97.5M computer center maintenance + 93.7M HQ air
#     conditioning — both uncontested at PEMEX headquarters. Plus CAPUFE (78.9M SB=2),
#     INEGI (71.6M SB=4), SSPC (32.9M SB=3). P6 multi-institution IT/facility maintenance:
#     PEMEX + CAPUFE + INEGI + SSPC all SB=1, 425M total.

# FPs (structural / legitimate operators):
# 132224 BIOSYSTEMS HLS SA DE CV — medical equipment at INSABI: 433.3M (23c, DA=6, SB=1).
#   179.3M LP 2023 SB=0 risk=1.0 "ADQ EQUIP MÉD EN ESTADOS" (competitive multi-state med
#   equipment). 66.4M LP 2023 SB=0 (competitive). 42.8M LP 2022 SB=0 (competitive). Most
#   are LP SB=0 (multiple bidders) = legitimate competition at INSABI. SB=0 dominance means
#   competitive. Structural medical equipment supplier to federal health fund.
# 258997 AUTOMOVILES CGE DE ZACATECAS SA DE CV — vehicle dealer. Marina 68.8M SB=0
#   (competitive), SGM 51.2M SB=1 pickup trucks, Zacatecas/Durango state 47M SB.
#   Automotive dealer selling government fleet vehicles across states. Mixed competitive
#   and regional monopoly for vehicle procurement. Structural vehicle procurement operator.
# 53468 GRUPO DIAGNOSTICO MEDICO PROA SA DE CV — lab services. IMSS 94c 366.1M
#   (SB=10): top contract 296.9M LP 2016 SB=0 (competitive, multiple lab service bidders).
#   The large contracts are SB=0 competitive. Structural clinical lab service provider.

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA journal_mode=WAL")

    next_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] + 1
    print(f"Current max GT case ID: {next_id - 1}")

    note_718 = (
        "LA RED CORPORATIVO SA DE CV — P6 SSa IT infrastructure annual capture: "
        "901.1M, 24% SB, 140 contracts, 2003-2025. SSa 573.1M (5c SB=5): 124M "
        "LP 2025 SB=1 risk=1.00 'SERVICIO INTEGRAL DE INFRAESTRUCTURA TECNOLOGICA' "
        "+ 123M LP 2024 SB=1 + 111.9M LP 2021 SB=1 + 107.3M LP 2023 SB=1 + "
        "106.9M LP 2022 SB=1 = 5 consecutive annual SB=1 contracts 2021-2025 at "
        "SSa, same title each year, escalating 107-124M. IMSS 119.3M LP 2024 SB=1 "
        "risk=1.00 'ADQUISICION DE UNIDADES DE ENERGIA ININTERRUMPIDA PARA UNIDADES "
        "MEDICO'. Tren Maya 43.8M SB=1 (computing rental). COMESA 22.5M SB=1. "
        "IT company capturing SSa with 5 identical annual uncontested IT contracts "
        "(573M) + IMSS (119M SB=1). P6 SSa annual IT infrastructure monopoly."
    )

    note_719 = (
        "COMERCIALIZADORA INFINITO MC SA DE CV — P3 new-vendor SADER+RAN+SENASICA "
        "cleaning services capture: 335.1M, 68% SB, 196 contracts, 2022-2025 only. "
        "SADER 45c 99.8M (DA=7 SB=38): 38 of 45 agriculture ministry contracts "
        "single-bid, 11.4M LP 2024 SB=1 'SERVICIO INTEGRAL DE LIMPIEZA PARA LA "
        "SECRETARIA DE AGRICULTURA'. RAN (Registro Agrario Nacional) 50c 35.4M "
        "(DA=1 SB=49): 49 of 50 land registry cleaning contracts uncontested "
        "(near-total monopoly). SENASICA 36.4M (2c SB=1): 35.6M LP 2025 SB=1 "
        "'CONTRATO MARCO SERVICIO INTEGRAL LIMPIEZA SENASICA 2025'. ASA 28c 22.6M. "
        "New company (debut 2022), already 196 contracts 335M, 68% SB across "
        "agriculture sector agencies. 49/50 RAN + 38/45 SADER SB=1 = extreme "
        "capture. P3 new-vendor cleaning intermediary in agriculture sector."
    )

    note_720 = (
        "SISTEMAS AVANZADOS EN COMPUTACION DE MEXICO SA DE CV — P6 multi-institution "
        "IT/facility maintenance: 425M, 53% DA, 34% SB, 88 contracts, 2010-2025. "
        "PEMEX Corporativo 19c 218.6M (DA=4 SB=14): 97.5M LP 2012 SB=1 'Mantto. "
        "preventivo y correctivo a equipos auxiliares de centros comput' (PEMEX HQ "
        "computing maintenance, uncontested) + 93.7M LP 2012 SB=1 'Mantto. aires "
        "acondicionados corporativo' (PEMEX HQ A/C, uncontested) + 44.9M LP 2022 "
        "SB=1 risk=1.00 'Sistema de Encaps'. CAPUFE 4c 78.9M (SB=2). INEGI 8c "
        "71.6M (SB=4). SSPC 3c 32.9M SB=3. CFE 5c 9.6M SB=3. IT company with "
        "14 SB=1 at PEMEX Corp (97.5M+93.7M 2012 both uncontested) + CAPUFE "
        "(78.9M SB=2) + INEGI (71.6M SB=4) + SSPC SB=3. P6 PEMEX+CAPUFE+INEGI "
        "computing+facility maintenance monopoly: multi-institution SB=1 capture."
    )

    cases = [
        (0, [(12424, "LA RED CORPORATIVO, S.A. DE C.V.", "high")],
         "LA RED CORPORATIVO - SSa IT Infrastructure 573M 5xSB=1 + IMSS 119M (P6)",
         "procurement_fraud", "high", note_718, 901100000, 2003, 2025),

        (1, [(284855, "COMERCIALIZADORA INFINITO MC SA DE CV", "high")],
         "COMERCIALIZADORA INFINITO MC - SADER+RAN Cleaning 335M (new 2022 68%SB P3)",
         "procurement_fraud", "high", note_719, 335100000, 2022, 2025),

        (2, [(47779, "SISTEMAS AVANZADOS EN COMPUTACION DE MEXICO SA DE CV", "high")],
         "SISTEMAS AVANZADOS COMPUTO - PEMEX 218M + CAPUFE+INEGI+SSPC 425M (P6)",
         "procurement_fraud", "high", note_720, 425000000, 2010, 2025),
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
        132224,   # BIOSYSTEMS HLS (INSABI competitive medical equipment LP SB=0, structural)
        258997,   # AUTOMOVILES CGE ZACATECAS (vehicle dealer, mixed competitive/regional)
        53468,    # GRUPO DIAGNOSTICO MEDICO PROA (IMSS lab services 296.9M competitive SB=0)
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
        483,      # GRUPO PAPELERO GUTIERREZ (1.5B paper/educational supply IEPSA+CONAFE, mixed)
        16363,    # MACRO CLIM (511M TELECOMM cleaning 2003 SB=0 competitive, sector mismatch)
        1282,     # EL CRISOL (307M 57% DA educacion, 1553 contracts)
        34017,    # ESTRATEGIAS EN TECNOLOGIA CORPORATIVA (378M IT educacion 24% SB)
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
    print(f"\nDone. Cases 718-720 inserted.")


if __name__ == "__main__":
    run()
