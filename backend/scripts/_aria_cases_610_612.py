"""
ARIA Cases 610-612: March 17 2026 investigation session.

Cases:
  610: INGENIEROS CIVILES DE SONORA - CONAGUA Water Infrastructure Monopoly 1.675B 100%SB
  611: Q A STORE COM - FONACOT Shell Capture 184.5M 100%SB (same institution as ECL CASE-604)
  612: CONTRATISTA GENERAL DE AMERICA LATINA - Marina/Navy DA Capture 405M (2021-2022)

Run from backend/ directory.
"""

# CASE-610: VID 66278 INGENIEROS CIVILES DE SONORA (P6 institutional capture)
#   - 1,675.6M, 11 contracts, 0% DA (ALL competitive), 100% SB, 15 years, ambiente.
#   - ALL contracts at CONAGUA (Comisión Nacional del Agua):
#     398.9M LP 2025 (risk=1.00), 292.3M LP 2024 (risk=0.62), 247.4M LP 2022 (risk=0.11),
#     211.7M LP 2024 (risk=0.62). Total 1.675B via competitive licitaciones, ALL single-bid.
#   - Extraordinary pattern: a Sonora civil engineering firm that wins EVERY CONAGUA water
#     infrastructure bid without competition for 15 years. CONAGUA is Mexico's national water
#     commission with major construction/dam/irrigation programs. 100% SB rate in competitive
#     procedures at the same agency for a decade+ = systematic deterrence of competitors or
#     collusive arrangements.

# CASE-611: VID 200141 Q A STORE COM SA DE CV
#   - 184.5M, 2 contracts, 0% DA (competitive LP), 100% SB, 2 years, trabajo sector.
#   - Both contracts at FONACOT (Instituto del Fondo Nacional para el Consumo de los
#     Trabajadores): 169.9M LP 2018 + 14.7M LP 2017, both risk=0.29.
#   - P3 intermediary. FONACOT was already identified as a capture target in CASE-604
#     (ECL Global Group: TECNOLOGIA ECL won 361.5M DA at FONACOT 2016-2017). This is a
#     SECOND company hitting the same vulnerable institution via competitive LP single-bid
#     — consistent with a broader capture scheme at FONACOT. "QA Store Com" is not a
#     recognizable enterprise; no RFC; active 2 years only.

# CASE-612: VID 261138 CONTRATISTA GENERAL DE AMERICA LATINA SA DE CV
#   - 405.3M, 5 contracts, 20% DA, 60% SB, 3 years, defensa, RFC=MPA9502158X5.
#   - Main: 231.6M DA at Secretaria de Marina (Navy) 2022 (risk=0.29),
#     69M invite at Marina 2022 (risk=0.29), 60.4M LP at SCT 2021 (risk=0.18),
#     42.9M LP at SEDATU 2021 (risk=0.30).
#   - A general construction company (name suggests Latin American operations) wins a
#     231.6M direct award from Mexico's Navy in 2022. Marina is one of the most opaque
#     procurement institutions. P3 intermediary with 3-year window, predominantly Navy-focused.
#     RFC registered as "MPA9502158X5" — worth noting the unusual prefix (not standard MX).

# FPs (structural monopoly / public entities exempt from competition):
# 186230 AQUALIA INFRAESTRUCTURA (FCC/Aqualia Spanish water subsidiary, legitimate)
# 986 ACCENTURE SC (major global consulting firm, structural)
# 277569 PEMEX TRANSFORMACION INDUSTRIAL (PEMEX subsidiary, G2G exempt from competition)
# 25184 KPMG CARDENAS DOSAL SC (Big 4 accounting firm)
# 38710 AFIANZADORA ASERTA GRUPO FINANCIERO (regulated bond guarantee company)
# 111896 MANUFACTURAS KALTEX (major Mexican textile manufacturer, defense uniforms)

# Needs review: 2275, 35993, 66904, 5664, 4477, 12345, 749, 47264, 153067,
#               1664, 17672, 5806, 149754, 22255, 42971, 103017, 118180

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA journal_mode=WAL")

    next_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] + 1
    print(f"Current max GT case ID: {next_id - 1}")

    note_610 = (
        "INGENIEROS CIVILES DE SONORA — P6 CONAGUA monopoly: 1.675B, 11 contracts, 0% DA, "
        "100% single-bid rate via competitive licitaciones publicas, 15 years. All contracts "
        "at CONAGUA: 398.9M LP 2025 (risk=1.00), 292.3M LP 2024 (risk=0.62), 247.4M LP 2022, "
        "211.7M LP 2024. Sonora engineering firm wins every CONAGUA water infrastructure "
        "competition uncontested for 15 years. CONAGUA manages dams, irrigation, and water "
        "treatment infrastructure nationwide. Systematic 100% SB at single federal agency = "
        "bid deterrence or collusion with procurement officials."
    )

    note_611 = (
        "Q A STORE COM SA DE CV — P3 intermediary FONACOT capture: 184.5M, 2 contracts, "
        "0% DA, 100% SB. Both at FONACOT (worker consumer credit institute): 169.9M LP 2018, "
        "14.7M LP 2017. FONACOT was already targeted by ECL Global Group (CASE-604: TECNOLOGIA "
        "ECL won 361.5M DA 2016-2017 at FONACOT). This second company hitting the same "
        "institution via competitive single-bid procedures in overlapping years (2017-2018) "
        "suggests a multi-entity capture scheme. 'QA Store Com' is not a recognizable vendor; "
        "no RFC; 2 years active only."
    )

    note_612 = (
        "CONTRATISTA GENERAL DE AMERICA LATINA (RFC MPA9502158X5) — Marina/Navy DA capture: "
        "231.6M DA at Secretaria de Marina 2022 (risk=0.29), 69M invite Marina 2022, 60.4M "
        "LP SCT 2021, 42.9M LP SEDATU 2021. Total 405.3M over 3 years. P3 intermediary. "
        "The 231.6M DA from Mexico's Navy without competition is the core red flag — Marina "
        "is one of the least transparent procurement institutions. Company appears 2020-2022 "
        "then drops off. Latin American general contractor winning Navy and infrastructure "
        "contracts suggests a politically-connected intermediary."
    )

    cases = [
        (0, [(66278, "INGENIEROS CIVILES DE SONORA", "high")],
         "INGENIEROS CIVILES SONORA - CONAGUA Water Monopoly 1.675B (0%DA 100%SB 15yrs)",
         "procurement_fraud", "high", note_610, 1675600000, 2011, 2025),

        (1, [(200141, "Q A STORE COM SA DE CV", "high")],
         "QA STORE COM - FONACOT Shell Capture 184.5M 100%SB (2017-2018)",
         "ghost_company", "high", note_611, 184500000, 2017, 2018),

        (2, [(261138, "CONTRATISTA GENERAL DE AMERICA LATINA SA DE CV", "high")],
         "CONTRATISTA GRAL AMERICA LATINA - Marina DA Capture 405M (2021-2022)",
         "procurement_fraud", "high", note_612, 405300000, 2021, 2022),
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
        186230,   # AQUALIA INFRAESTRUCTURA (FCC/Aqualia Spanish subsidiary, legitimate)
        986,      # ACCENTURE SC (major global consulting, legitimate)
        277569,   # PEMEX TRANSFORMACION INDUSTRIAL (PEMEX subsidiary, G2G exempt)
        25184,    # KPMG CARDENAS DOSAL SC (Big 4 accounting)
        38710,    # AFIANZADORA ASERTA GRUPO FINANCIERO (regulated financial)
        111896,   # MANUFACTURAS KALTEX (major Mexican textile, defense uniforms)
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
        2275,     # CORP ASESORIA PROTECCION SEGURIDAD (3.5B salud, but 2003 Structure A data)
        35993,    # ELECTRONICA Y COMUNICACIONES (654M energia 43%DA)
        66904,    # CONSTRUCTORA JILSA (436M infra 71%SB 7yrs)
        5664,     # JARDINERIA 2000 (1.3B educacion/environment)
        4477,     # HEMOST (1.25B salud, medical products)
        12345,    # DIGITAL DATA (982M hacienda IT 38%DA)
        749,      # SERVISEG (2.43B infraestructura security)
        47264,    # SERVICIO Y VENTA INSUMOS MEDICOS ESPECIALIZADOS (2.7B salud)
        153067,   # COMERCIALIZADORA VMCAS (P6 defensa 94M)
        1664,     # TRANSPORTADORA NACIONAL (434M hacienda 43%DA)
        17672,    # HS SOLUCIONES Y SISTEMAS INTEGRALES (384M salud 19%DA)
        5806,     # COMERCIALIZADORA DAMAG (P6 salud 214M 21yrs)
        149754,   # COMERCIALIZADORA CATO (86M ambiente 57%DA)
        22255,    # COMPUTADORAS TOLUCA (121M educacion IT)
        42971,    # ELECTROPURA (241M salud water 80%DA)
        103017,   # PLANES Y PROYECTOS INDUSTRIALES (61M infra 75%SB)
        118180,   # CLOTHES & MORE IS (302M defensa 75%SB)
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
    print(f"\nDone. Cases 610-612 inserted.")


if __name__ == "__main__":
    run()
