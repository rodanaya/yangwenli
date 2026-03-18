"""
ARIA Cases 628-631: March 18 2026 investigation session.

Cases:
  628: COMERCIALIZADORA MUNRRO - ISSSTE Prison Uniforms 1B DA risk=1.00 (2005-2025)
  629: NRGP SERVICIOS EMPRESARIALES - FONACOT Outsourcing DA 214M P3 (2015-2017)
  630: LAPI SA DE CV - Cross-Institutional Clinical Labs 608M (IMSS DA + FGR SB risk=1.00)
  631: PROTECCION Y ALARMAS PRIVADAS - Multi-Institutional Security 2.2B (CFE+IMSS+Ports)

Run from backend/ directory.
"""

# CASE-628: VID 20908 COMERCIALIZADORA MUNRRO SA DE CV
#   - 999.7M, 187 contracts, 30% DA, 4% SB, 2005-2025, salud/gobernacion.
#   - ISSSTE 572.3M (5 contracts): 194.1M LP 2022 SB=0 risk=0.79 "VESTUARIO Y UNIFORMES
#     PARA PERSONAL DE BENEFICIO CEFERESO" + 162.4M DA 2024 risk=1.00 "ADQUISICION
#     CONSOLIDADA DE VESTUARIO, UNIFORMES, CALZADO" + 132.6M LP 2025 risk=0.81.
#   - IMSS 109.1M, Luz y Fuerza 91.1M (SB=3), OADPRS 35.8M.
#   - Uniforms/clothing supplier winning three large ISSSTE contracts in recent years
#     (2022, 2024, 2025) for prison staff clothing (CEFERESO, OADPRS penitentiary system).
#     ISSSTE is the social security institute for government workers — procuring prison
#     uniforms via ISSSTE for OADPRS (Órgano Administrativo Desconcentrado Prevención y
#     Readaptación Social). The 162.4M DA 2024 risk=1.00 + 194.1M LP 2022 risk=0.79 +
#     132.6M LP 2025 risk=0.81 at the same institution for the same category = P6 capture.

# CASE-629: VID 171660 NRGP SERVICIOS EMPRESARIALES INTEGRALES SA DE CV
#   - 266.6M, 4 contracts, 50% DA, 50% SB, 2015-2022, trabajo.
#   - FONACOT 214.6M (2 contracts): 165.2M DA 2017 "SERVICIO DE OUTSOURCING PARA APOYAR
#     LA OPERACION DE CREDIFONACOT" + 49.3M DA 2015 "SERVICIO DE OUTSOURCING PARA APOYAR
#     LA OPERACION DE OTOFONACOT". CONACYT 26.7M LP 2022 SB=1. CONAHCYT 25.4M LP 2021 SB=1.
#   - P3 intermediary at FONACOT — the third entity identified capturing FONACOT outsourcing:
#     CASE-604: ECL Global/Tecnología ECL (361.5M DA 2016-2017 FONACOT),
#     CASE-611: Q A Store Com (184.5M LP 2017-2018 FONACOT single-bid).
#     NRGP adds 214.6M DA in 2015-2017 for personnel outsourcing at CREDIFONACOT/OTOFONACOT
#     (credit and savings programs). Three companies simultaneously or sequentially
#     capturing FONACOT = institutional capture at the workers' consumer fund.

# CASE-630: VID 4946 LAPI SA DE CV
#   - 608.8M, 195 contracts, 50% DA, 28% SB, 2002-2025, salud.
#   - IMSS-SAMI 218.1M (8c, DA=7): "SERVICIO MEDICO SUBROGADO DE LABORATORIO CLINICO 2025"
#     71.5M DA 2025 + 45.3M DA 2024 + 38.6M DA 2023.
#   - FGR 95.4M (SB=6): 48.8M LP 2025 SB=1 risk=1.00 "SERVICIO DE ANALISIS CLINICOS Y
#     DE GABINETE" + 38.2M LP 2022 SB=1.
#   - SEDENA 75.5M LP 2025 SB=0, PGR 50.8M SB=8, ASA 32.1M DA+SB.
#   - Clinical laboratory services company with 23-year track record across IMSS (DA
#     concentration), FGR/PGR (single-bid competitive), SEDENA, and airports. The FGR
#     48.8M LP 2025 SB=1 risk=1.00 on clinical analysis captures the pattern: law
#     enforcement agency laboratory services going uncontested. P3 intermediary routing
#     clinical lab contracts across diverse federal institutions.

# CASE-631: VID 591 PROTECCION Y ALARMAS PRIVADAS SA DE CV
#   - 2,218.2M, 306 contracts, 34% DA, 25% SB, 2002-2021, infraestructura.
#   - CFE 845.4M (11c, SB=6): 828.5M LP 2003 SB=1 risk=0.22 "Servicio de Vigilancia en
#     Instalaciones de la Sub-área de Control" (CFE substations surveillance).
#   - IMSS 637.3M (25c, DA=21, SB=3): 574M LP 2017 SB=0 risk=0.21 (multi-year contract).
#   - ASA Aeropuertos 248.8M (160c, DA=66): airport security operations.
#   - ASIPONA Veracruz 168M (3c, SB=2): 133.1M LP 2009 SB=1 + 44M LP 2019 SB=1 (port
#     security at Veracruz — same port as CASE-622 Sistemas Prácticos).
#   - Long-track security company monopolizing surveillance at CFE power infrastructure,
#     IMSS hospitals, Mexico City airport, and Veracruz port (multiple single-bid contracts
#     at the same port). Cross-institutional security surveillance capture over 20 years.
#     The 828.5M SB=1 CFE contract is the largest single uncontested security contract.

# FPs (structural / legitimate operators):
# 27302 PAROLI SOLUTIONS SA DE CV — IMSS cleaning products (artículos de aseo) via
#   competitive consolidated LP procedures (0 DA, 0 SB on top contracts), risk=0.12-0.21.
#   Legitimate consolidated supplier in IMSS's national cleaning supply chain. Not monopoly.
# 36535 COMERCIALIZADORA BALVE SA DE CV — 65.2M, 272 contracts, 13% SB, 2% DA,
#   infraestructura SCT. Small-value competitive road maintenance supplies. Structural.

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA journal_mode=WAL")

    next_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] + 1
    print(f"Current max GT case ID: {next_id - 1}")

    note_628 = (
        "COMERCIALIZADORA MUNRRO SA DE CV — P6 ISSSTE prison-system uniform capture: "
        "999.7M, 2005-2025. ISSSTE 572.3M (5 contracts): 194.1M LP 2022 risk=0.79 "
        "'Vestuario Uniformes Personal CEFERESO' + 162.4M DA 2024 risk=1.00 "
        "'Adquisicion Consolidada Vestuario/Uniformes/Calzado' + 132.6M LP 2025 "
        "risk=0.81. IMSS 109.1M, Luz y Fuerza 91.1M (SB=3), OADPRS 35.8M. "
        "Clothing supplier winning three consecutive ISSSTE contracts (2022-2025) "
        "for prison system (CEFERESO/OADPRS) staff uniforms with risk scores 0.79, "
        "1.00, 0.81 — including a 162.4M direct award at risk=1.00. P6 ISSSTE "
        "penitentiary procurement capture in the uniform/vestuario subsector."
    )

    note_629 = (
        "NRGP SERVICIOS EMPRESARIALES INTEGRALES SA DE CV — P3 FONACOT outsourcing "
        "DA intermediary: 266.6M, 4 contracts, 2015-2022. FONACOT 214.6M: 165.2M DA "
        "2017 'SERVICIO DE OUTSOURCING PARA APOYAR LA OPERACION DE CREDIFONACOT' + "
        "49.3M DA 2015 'SERVICIO DE OUTSOURCING PARA APOYAR LA OPERACION DE "
        "OTOFONACOT'. Third entity identified capturing FONACOT outsourcing (CASE-604: "
        "ECL 361.5M DA, CASE-611: QA Store 184.5M SB, NRGP: 214.6M DA). Three "
        "companies simultaneously/sequentially extracting outsourcing DAs from "
        "FONACOT = systematic institutional capture of the workers consumer fund."
    )

    note_630 = (
        "LAPI SA DE CV — P3 cross-institutional clinical laboratory capture: 608.8M, "
        "50% DA, 28% SB, 2002-2025. IMSS-SAMI 218.1M DA (laboratory subrogado 2023-2025: "
        "71.5M+45.3M+38.6M). FGR 95.4M SB: 48.8M LP 2025 SB=1 risk=1.00 + 38.2M LP 2022 "
        "SB=1 'Servicio de Analisis Clinicos y de Gabinete' (law enforcement clinical labs "
        "uncontested). SEDENA 75.5M LP 2025, PGR 50.8M SB, ASA 32.1M. Clinical lab "
        "company capturing IMSS via consecutive DAs and FGR/PGR via competitive single-bid "
        "across 23 years. FGR/PGR laboratory SB=1 risk=1.00 = law enforcement clinical "
        "analysis going uncontested. Cross-institutional lab services P3 intermediary."
    )

    note_631 = (
        "PROTECCION Y ALARMAS PRIVADAS SA DE CV — P6 multi-institutional security "
        "surveillance: 2,218.2M, 34% DA, 25% SB, 306 contracts, 2002-2021. CFE 845.4M "
        "(SB=6): 828.5M LP 2003 SB=1 'Vigilancia Instalaciones Sub-area Control' "
        "(CFE substation surveillance). IMSS 637.3M (DA=21, 574M LP 2017 multi-year). "
        "ASA 248.8M (160 contracts airport security DA). ASIPONA Veracruz 168M: 133.1M "
        "LP 2009 SB=1 + 44M LP 2019 SB=1 (same Veracruz port as CASE-622). Long-track "
        "security surveillance company monopolizing CFE power infrastructure, IMSS "
        "hospitals, Mexico City airport, and Veracruz port surveillance via single-bid "
        "competitive procedures. Cross-institutional security capture over 20 years."
    )

    cases = [
        (0, [(20908, "COMERCIALIZADORA MUNRRO SA DE CV", "high")],
         "MUNRRO - ISSSTE Prison Uniforms 1B DA risk=1.00 P6 (2022-2025)",
         "procurement_fraud", "high", note_628, 572300000, 2005, 2025),

        (1, [(171660, "NRGP SERVICIOS EMPRESARIALES INTEGRALES SA DE CV", "high")],
         "NRGP SERVICIOS - FONACOT Outsourcing DA 214M P3 (2015-2017)",
         "procurement_fraud", "high", note_629, 214600000, 2015, 2022),

        (2, [(4946, "LAPI SA DE CV", "high")],
         "LAPI - Cross-Institution Clinical Labs 608M (IMSS DA + FGR SB risk=1.00)",
         "procurement_fraud", "high", note_630, 608800000, 2002, 2025),

        (3, [(591, "PROTECCION Y ALARMAS PRIVADAS SA DE CV", "high")],
         "PROTECCION ALARMAS PRIVADAS - Security Surveillance 2.2B (CFE+IMSS+Veracruz)",
         "procurement_fraud", "high", note_631, 2218200000, 2002, 2021),
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
        27302,    # PAROLI SOLUTIONS (IMSS cleaning via competitive LP, 0 DA/SB, risk 0.12-0.21)
        36535,    # COMERCIALIZADORA BALVE (65.2M SCT 272 contracts small road supplies, 2%DA 13%SB)
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
        591,      # WAIT - already in GT CASE-631, skip
        78556,    # NETWORKING TECHNOLOGIES MEXICO (Marina 68.5M DA + research institutes, IT)
        160033,   # CIMA V (ISSSTE uniforms 269M DA+LP 2015-2020, moderate risk)
        24024,    # TRANSPORTES LOCK (282M SB 2008 at Hospital Gea for valores transport)
        7125,     # TECHNIDATA (250M IT scattered, 2002-2016)
        2564,     # QUALITA DE MEXICO (576M IT IMSS SB 2002-2006 old data)
        13350,    # VAMSA AGUASCALIENTES (246M vehicle DA state education)
        3002,     # ESPECIALISTAS EN MEDIOS (226M media monitoring, many small contracts)
        39854,    # PROMOTORA Y ORGANIZADORA EVENTOS (79.8M 78%DA hacienda)
        47465,    # ENSEÑANZA E INVESTIGACION SUPERIOR AC (57.4M energia)
    ]
    for vid in needs_review:
        if vid == 591:
            continue  # Already in GT
        conn.execute("""
            UPDATE aria_queue SET review_status='needs_review'
            WHERE vendor_id=? AND review_status='pending'
        """, (vid,))
    conn.commit()
    print(f"Marked {len(needs_review)-1} needs_review")

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
    print(f"\nDone. Cases 628-631 inserted.")


if __name__ == "__main__":
    run()
