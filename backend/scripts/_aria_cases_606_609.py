"""
ARIA Cases 606-609: March 17 2026 investigation session.

Cases:
  606: CONSTRUCTORA Y ARRENDADORA DE LA COSTA DE MICHOACAN - ASIPONA Manzanillo Port Monopoly (295M 82%SB)
  607: GRUPO EMPRESARIAL GRECOPA - Bienestar Welfare Ministry Capture 144.8M DA (2018)
  608: AQUASEO - Cross-Institution Water/Cleaning Shell 564M P3 (FGR+SAT+Culture)
  609: INFRAESTRUCTURA Y EDIFICACION DEL SURESTE - Yucatan Port Authority Capture 248M 81%SB

Run from backend/ directory.
"""

# CASE-606: VID 60977 CONSTRUCTORA Y ARRENDADORA DE LA COSTA DE MICHOACAN SA DE CV
#   - 295M, 17 contracts, 18% DA, 82% SB, 14 years, infraestructura.
#   - All major contracts at ASIPONA Manzanillo: 128.2M LP 2019, 52.6M LP 2020, 36M LP 2021,
#     17.9M LP 2016 at ASIPONA Lazaro Cardenas (also Michoacan coast).
#   - A construction/leasing company from Michoacan exclusively winning port authority contracts
#     via competitive licitaciones publicas with 82% single-bid rate. ASIPONA Manzanillo/
#     Lazaro Cardenas are Mexico's Pacific coast ports and major smuggling/cartel-connected
#     infrastructure points. Single-bid monopoly at competitive procedures = bid rotation or
#     deliberate deterrence of competitors.

# CASE-607: VID 219239 GRUPO EMPRESARIAL GRECOPA SA DE CV
#   - 145.9M, 3 contracts, 100% DA, 3 years, P3 intermediary, salud.
#   - Main: 144.8M DA at Secretaria de Bienestar 2018 (risk=0.45). RFC=GEG1406061S6 (2014).
#   - Company incorporated 2014, wins single 144.8M direct award from Bienestar 2018, then
#     moves to small IMSS awards. Bienestar (welfare ministry) was subject to major procurement
#     irregularities during AMLO era. A 144.8M DA without competition at welfare ministry
#     is a textbook capture pattern.

# CASE-608: VID 267280 AQUASEO SA DE CV
#   - 564.6M, 26 contracts, P3 intermediary, 19% DA, 58% SB, 5 years, RFC=AQU1711135L4.
#   - Water/sanitation company winning contracts across unrelated institutions:
#     94.8M LP 2025 at FGR (prosecutor's office), 74.7M invite 2024 at SAT (tax authority,
#     risk=0.76), 63.9M DA at IMSS affiliate 2025, 61.8M invite 2022 at Cultura.
#   - Industry mismatch: water company winning justice, tax, cultural, and health contracts.
#     P3 intermediary routing contracts through diverse institutions. RFC registered 2017,
#     active only 5 years with 564M from very different government sectors.

# CASE-609: VID 51693 INFRAESTRUCTURA Y EDIFICACION DEL SURESTE SA DE CV
#   - 248.3M, 16 contracts, 19% DA, 81% SB, 12 years, infraestructura.
#   - Contracts at CONAPESCA (76.4M LP 2014), Yucatan SOP (38.7M LP 2012), ASIPONA Progreso
#     (22M + 20.4M + 15.9M LP 2014-2015). Yucatan-based infrastructure firm monopolizing
#     both Yucatan state works and federal port authority (Progreso) contracts via 81% single-
#     bid competitive procedures. CONAPESCA and ASIPONA Progreso serve the Gulf coast fishing
#     and port sector where cartel-connected contractors have been documented.

# FPs (structural monopolies):
# 33797 AXA SEGUROS (major insurance multinational)
# 229 EULEN DE SEGURIDAD PRIVADA (major Spanish security services firm)
# 354 CICOVISA (large medical supplies, 24 years, 9% SB = competitive)
# 10751 HEALTHCARE SYSTEMS DE MEXICO (large medical equipment, 24 years, 12% SB)
# 5723 INSTRUMENTOS Y ACCESORIOS AUTOMATIZADOS (IMSS supplier, 1548 contracts, 2% SB)
# 40856 LANDSTEINER DIAGNOSTICO (major diagnostics firm, 0% SB = all competitive)
# 2132 REDPACK (major courier/delivery company)
# 29761 MILENIO MOTORS (authorized vehicle dealer for defensa)

# Needs review: 500, 6944, 55664, 6735, 23898, 4441, 2112, 988, 106774, 14786, 4030,
#               51744, 68930, 46049, 895, 182, 9280, 12922, 207478, 5279, 18823, 46845

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA journal_mode=WAL")

    next_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] + 1
    print(f"Current max GT case ID: {next_id - 1}")

    note_606 = (
        "CONSTRUCTORA Y ARRENDADORA DE LA COSTA DE MICHOACAN wins port authority contracts "
        "with 82% single-bid rate: 128.2M LP 2019, 52.6M LP 2020, 36M LP 2021 at ASIPONA "
        "Manzanillo; 17.9M LP 2016 at ASIPONA Lazaro Cardenas. Total 295M, 14 years, 17 "
        "contracts. Michoacan-based contractor monopolizing Pacific port infrastructure via "
        "competitive licitaciones with no rival bids. Manzanillo and Lazaro Cardenas are "
        "Mexico's top Pacific ports with documented cartel-connected contractor activity."
    )

    note_607 = (
        "GRUPO EMPRESARIAL GRECOPA (RFC GEG1406061S6, incorporated 2014) wins single 144.8M "
        "direct award from Secretaria de Bienestar (welfare ministry) in 2018 — 99% of its "
        "lifetime revenue from one DA contract. P3 intermediary pattern. Company then appears "
        "at IMSS with tiny contracts (1M). Bienestar suffered multiple documented procurement "
        "irregularities during 2018-2024. A company with no prior government track record "
        "winning a 145M direct award at a major welfare ministry is high-risk."
    )

    note_608 = (
        "AQUASEO SA DE CV (RFC AQU1711135L4, incorporated 2017) — P3 intermediary wins 564.6M "
        "from FGR (94.8M LP 2025), SAT (74.7M invite 2024, risk=0.76), IMSS affiliate (63.9M "
        "DA 2025), Secretaria de Cultura (61.8M invite 2022). Water/sanitation company winning "
        "justice, tax, cultural, and health sector contracts = massive industry mismatch. "
        "New company (2017) with 58% single-bid rate accumulating 564M across disconnected "
        "institutions in just 5 years. Classic intermediary routing contracts across sectors."
    )

    note_609 = (
        "INFRAESTRUCTURA Y EDIFICACION DEL SURESTE — Yucatan infrastructure firm with 81% "
        "single-bid rate at port authorities: CONAPESCA 76.4M LP 2014, Yucatan SOP 38.7M LP "
        "2012, ASIPONA Progreso 22M+20.4M LP 2014-2015, ASIPONA Progreso 15.9M 2015. "
        "Total 248.3M, 16 contracts, 12 years. Monopolizes both Yucatan state public works "
        "and federal port authority (Progreso, Gulf coast) via single-bid competitive "
        "procedures. CONAPESCA and Gulf port sectors known for procurement irregularities."
    )

    cases = [
        (0, [(60977, "CONSTRUCTORA Y ARRENDADORA DE LA COSTA DE MICHOACAN SA DE CV", "high")],
         "CONSTRUCTORA COSTA MICHOACAN - ASIPONA Manzanillo Port Monopoly 295M (82% SB)",
         "procurement_fraud", "high", note_606, 295000000, 2011, 2024),

        (1, [(219239, "GRUPO EMPRESARIAL GRECOPA SA DE CV", "high")],
         "GRUPO GRECOPA - Bienestar Welfare Ministry DA Capture 144.8M (2018)",
         "procurement_fraud", "high", note_607, 144800000, 2018, 2020),

        (2, [(267280, "AQUASEO SA DE CV", "high")],
         "AQUASEO - Cross-Institution Shell P3 564M (FGR+SAT+Cultura+IMSS 2022-2025)",
         "procurement_fraud", "high", note_608, 564600000, 2022, 2025),

        (3, [(51693, "INFRAESTRUCTURA Y EDIFICACION DEL SURESTE SA DE CV", "high")],
         "INFRAESTRUCTURA SURESTE - Yucatan Port Authority Capture 248M (81% SB)",
         "procurement_fraud", "high", note_609, 248300000, 2012, 2023),
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
        33797,    # AXA SEGUROS (major insurance multinational)
        229,      # EULEN DE SEGURIDAD PRIVADA (major Spanish security services)
        354,      # CICOVISA (large medical supplies, 24 years, 9% SB)
        10751,    # HEALTHCARE SYSTEMS DE MEXICO (medical equipment, 24yr, 12% SB)
        5723,     # INSTRUMENTOS Y ACCESORIOS AUTOMATIZADOS (IMSS supplier, 1548 contracts, 2% SB)
        40856,    # LANDSTEINER DIAGNOSTICO (major diagnostics, 0% SB)
        2132,     # REDPACK (major courier)
        29761,    # MILENIO MOTORS (authorized vehicle dealer, defensa)
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
        500,      # RETO INDUSTRIAL (3B spread across many institutions)
        6944,     # ROSEFY TURISMO (1.3B possibly data error at Diconsa 2005)
        55664,    # MANATIE PROD (environ company winning SEP 374M)
        6735,     # LIMPIDUS (205M cleaning at TELECOMM 2003, Structure A data)
        23898,    # MAC TONER AUDIO Y VIDEO (391M energia)
        4441,     # IL DIAGNOSTICS (261M salud 21yrs)
        2112,     # GRUPO IURANCHA (331M ambiente 70%SB)
        988,      # COMERCIAL PAPELERA DE VICTORIA (422M salud 45%DA)
        106774,   # NUBAJ Y NUBAJ CONSULTING (236M ISSSTE LP, low risk)
        14786,    # OFISTORE (1B ISSSTE/IMSS office supplies, 0% DA)
        4030,     # INGENIERIA MEXICANA DIV ARQUITECT (63M 100%SB, old data)
        51744,    # MEJORAMIENTO INTEGRAL ASISTIDO (218M infra 67%DA)
        68930,    # DISTRIBUCIONES Y PROYECTOS (677M gobernacion)
        46049,    # Operadora de Mantenimiento y Limpieza (80M energia)
        895,      # BODEGA DE LLANTAS LA VIGA (858M infraestructura 24yr)
        182,      # PAPELERA GENERAL (319M salud 4%DA)
        9280,     # COMERCIALIZADORA PROMOTODO (244M infraestructura)
        12922,    # ELECTROPURA (61M salud water delivery)
        207478,   # MANUFACTURAS SERKA CONTINENTALES (153M salud 3%DA)
        5279,     # INTELLEGO SC (147M tecnologia)
        18823,    # ESCAPE AUDIO (156M gobernacion)
        46845,    # COMERCIALIZADORA DE SEGURIDAD PRIVADA (311M salud 40%DA)
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
    print(f"\nDone. Cases 606-609 inserted.")


if __name__ == "__main__":
    run()
