"""
ARIA Cases 721-723: March 19 2026 investigation session.

Cases:
  721: FARMACOS DINSA - IMSS Medical Supplies 567M (78 DA + 390M DA 2021 P6)
  722: COMERCIALIZADORA EL SARDINERO - DIF Estado Mexico Food Baskets 601M (3x SB=1 P6)
  723: MARIO ERNESTO MONTALVO HERNANDEZ - Persona Fisica Quintana Roo Cleaning/Security 319M (P3)

Run from backend/ directory.
"""

# CASE-721: VID 19988 FARMACOS DINSA S.A DE C.V.
#   - 639.1M, 145 contracts, 70% DA, 1% SB, 2003-2025, salud.
#   - IMSS 96c 567.4M (DA=78, SB=1): 390M DA 2021 risk=0.20 "MATERIAL DE CURACIÓN"
#     (wound care / medical supply materials, 390M direct award at IMSS — single DA
#     contract nearly the size of a small federal ministry budget, no competitive process).
#     76.5M LP 2015 SB=0 (competitive) + 21M LP 2017 SB=0 + smaller contracts.
#     78 of 96 IMSS contracts = direct award (81% DA at IMSS).
#   - ISSSTE 15c 64M (DA=6, SB=0). SSISSSTE 7c 0.9M (DA=5).
#   - Medical supply company with 78 DA contracts at IMSS totaling 567.4M including a
#     390M DA 2021 for wound care materials — systematic threshold-splitting plus a
#     single massive direct award at IMSS. 70% DA across 145 contracts at federal health
#     sector. P6 IMSS medical supplies monopoly via DA saturation: sole-source medical
#     supply relationship at IMSS spanning 22 years (2003-2025), 78 DA contracts.

# CASE-722: VID 10918 COMERCIALIZADORA EL SARDINERO, S.A. DE C.V.
#   - 809.1M, 35 contracts, 31% DA, 34% SB, 2002-2025, salud.
#   - Sistema DIF Estado de México 5c 601.3M (DA=0, SB=4):
#     195M LP 2010 SB=1 risk=0.72 "Productos Alimenticios para Personas; Semillas,
#     Abarrotes y Alimentos Preparados para DIFEM" (food packages for DIF families)
#     153.9M LP 2009 SB=1 "Paquetes Integrados de Productos Alimenticios para Personas"
#     123.9M LP 2008 SB=1 "Productos alimenticios para personas; semillas, abarrotes"
#     — Three consecutive annual SB=1 LP contracts at DIF Estado de México 2008-2010,
#     all for food product packages for welfare beneficiaries.
#   - IMSS 3c 88.9M SB=0 (competitive). DIF Nuevo León 3c 42.3M SB=0.
#   - Food basket/nutrition supply intermediary capturing DIF Estado de México's food
#     assistance program with 3 consecutive uncontested LP contracts (473M) across
#     2008-2010. DIF food programs are one of Mexico's most corruption-prone procurement
#     categories. 3 consecutive SB=1 LP at DIF Estado de México risk=0.72 for food
#     baskets = P6 state DIF food program capture.

# CASE-723: VID 36253 MARIO ERNESTO MONTALVO HERNANDEZ (persona fisica)
#   - 319M, 242 contracts, 35% DA, 40% SB, 2010-2025, educacion.
#   - Q.Roo-Universidad de Quintana Roo (UQROO) 22c 75.1M (DA=2, SB=19): 19 of 22
#     UQROO contracts single-bid for cleaning/security services. 12M LP 2022 SB=1
#     "SERVICIO DE VIGILANCIA PARA LA UNIVERSIDAD DE QUINTANA ROO."
#   - ISSSTE 31c 74.1M (DA=15, SB=16): 16 SB=1 contracts at ISSSTE Quintana Roo.
#     15.1M LP 2024 SB=1 "SERVICIO DE LIMPIEZA E HIGIENE PARA EL ISSSTE EN QUINTANA ROO."
#     11.3M LP 2024 SB=1 "SERVICIO DE VIGILANCIA PARA EL ISSSTE EN QUINTANA ROO."
#   - Quintana Roo state 11c 49.1M (DA=4, SB=3). ECOSUR 25c 20.7M (DA=5, SB=5).
#     Servicios Salud Quintana Roo 1c 11.3M SB=1.
#   - An individual person (persona física) providing cleaning and security services
#     across multiple Quintana Roo institutions: 19 SB=1 at UQROO + 16 SB=1 at ISSSTE +
#     state government + research center. Systematic capture of Quintana Roo's
#     institutional cleaning/security market via repeated SB=1 wins as a natural person.
#     P3 persona física Quintana Roo cleaning+security intermediary: 319M, 40% SB,
#     across 5 institutions in one state, 2010-2025.

# FPs (structural / legitimate operators):
# 19497 GRUPO GASTRONÓMICO GÁLVEZ SA DE CV — hospital food service. INR 248.8M +
#   INCMNSZ 182.5M + Hospital Juárez 161.7M + SSa 148.7M + IMSS 145.3M = 1.38B.
#   Hospital patient/resident catering is a genuine specialized market (daily diets for
#   thousands of patients at specific caloric/nutritional specifications). Large-scale
#   institutional food service has legitimate concentration. Structural hospital
#   food service operator serving Mexico City's major federal hospitals.
# 43585 IGSA SA DE CV — energy engineering services. CFE 270.6M (SB=19) + AIFA
#   162.3M SB=3 + SEDENA 129.8M SB=4. Cogeneration plant operations at AIFA (new airport),
#   CFE electrical engineering, and SEDENA infrastructure. Specialized energy
#   engineering (cogeneration, plant O&M) is a legitimate low-competition market.
#   Structural energy engineering services operator.

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA journal_mode=WAL")

    next_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] + 1
    print(f"Current max GT case ID: {next_id - 1}")

    note_721 = (
        "FARMACOS DINSA SA DE CV — P6 IMSS medical supplies DA saturation: "
        "639.1M, 70% DA, 145 contracts, 2003-2025. IMSS 96c 567.4M (DA=78 SB=1): "
        "390M DA 2021 risk=0.20 'MATERIAL DE CURACION' (wound care materials, "
        "390M direct award at IMSS, single non-competitive 2021) + 76.5M LP 2015 "
        "SB=0 + 21M LP 2017. 78 of 96 IMSS contracts = DA (81% DA at IMSS). "
        "ISSSTE 15c 64M (DA=6). Medical supply company with 78 DA contracts at "
        "IMSS including 390M DA 2021 for wound care = systematic threshold-splitting "
        "+ massive DA. 70% DA across 145c at health sector 2003-2025. P6 IMSS "
        "medical supplies DA monopoly: sole-source 22-year supply relationship, "
        "78 DA contracts, including 390M single DA 2021."
    )

    note_722 = (
        "COMERCIALIZADORA EL SARDINERO SA DE CV — P6 DIF Estado de Mexico food "
        "program capture: 809.1M, 34% SB, 35 contracts, 2002-2025. DIF Estado de "
        "Mexico 5c 601.3M (DA=0 SB=4): 195M LP 2010 SB=1 risk=0.72 'Productos "
        "Alimenticios para Personas Semillas Abarrotes Alimentos Preparados para "
        "DIFEM' (food packages for DIF families, uncontested) + 153.9M LP 2009 SB=1 "
        "'Paquetes Integrados de Productos Alimenticios' + 123.9M LP 2008 SB=1 "
        "'Productos alimenticios semillas abarrotes'. 3 consecutive annual SB=1 LP "
        "at DIF Estado de Mexico 2008-2010 totaling 473M. IMSS 3c 88.9M SB=0. "
        "Food basket intermediary capturing DIF Estado de Mexico welfare food "
        "program: 3 uncontested LP 2008-2010 (195+154+124M). DIF food programs "
        "= corruption-prone category. P6 state DIF food program monopoly."
    )

    note_723 = (
        "MARIO ERNESTO MONTALVO HERNANDEZ (persona fisica) — P3 Quintana Roo "
        "cleaning+security monopoly: 319M, 40% SB, 242 contracts, 2010-2025. "
        "UQROO (Universidad de Quintana Roo) 22c 75.1M (DA=2 SB=19): 19 of 22 "
        "UQROO contracts SB=1, 12M LP 2022 SB=1 'SERVICIO DE VIGILANCIA PARA LA "
        "UNIVERSIDAD DE QUINTANA ROO'. ISSSTE 31c 74.1M (DA=15 SB=16): 15.1M LP "
        "2024 SB=1 'SERVICIO DE LIMPIEZA E HIGIENE PARA EL ISSSTE EN QUINTANA ROO' "
        "+ 11.3M LP 2024 SB=1 vigilancia. Quintana Roo state 11c 49.1M (SB=3). "
        "ECOSUR 25c 20.7M SB=5. Individual person providing cleaning+security across "
        "UQROO (19 SB=1) + ISSSTE QRoo (16 SB=1) + state + research center. "
        "P3 persona fisica Quintana Roo cleaning/security capture: 319M, 5 "
        "institutions, 40% SB, 2010-2025."
    )

    cases = [
        (0, [(19988, "FARMACOS DINSA S.A DE C.V.", "high")],
         "FARMACOS DINSA - IMSS Medical Supplies 567M (78 DA + 390M DA 2021 P6)",
         "procurement_fraud", "high", note_721, 639100000, 2003, 2025),

        (1, [(10918, "COMERCIALIZADORA EL SARDINERO, S.A. DE C.V.", "high")],
         "EL SARDINERO - DIF Estado Mexico Food Baskets 601M (3x SB=1 2008-2010 P6)",
         "procurement_fraud", "high", note_722, 809100000, 2002, 2025),

        (2, [(36253, "MARIO ERNESTO MONTALVO HERNANDEZ", "high")],
         "MONTALVO HERNANDEZ - Persona Fisica Q.Roo Cleaning+Security 319M (40%SB P3)",
         "procurement_fraud", "high", note_723, 319000000, 2010, 2025),
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
        19497,    # GRUPO GASTRONOMICO GALVEZ (hospital food/diet service, structural specialized market)
        43585,    # IGSA SA DE CV (energy engineering: cogeneration at AIFA, CFE, SEDENA structural)
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
        185771,   # EOS LIMPIEZA (300M 69% SB CAPUFE+Prodecon+ININ cleaning — borderline)
        17235,    # PLAN SEGURO (715.4M insurance 29% SB salud — insurance at health sector)
        83003,    # TELECOMUNICACIONES MODERNAS (331.6M 56% SB hacienda 18 contracts)
        262869,   # BLACK ECCO TI (444.9M 46% SB hacienda IT company)
        3857,     # SOFILAB (691.7M 48% DA 0% SB salud — no SB but high DA at health)
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
    print(f"\nDone. Cases 721-723 inserted.")


if __name__ == "__main__":
    run()
