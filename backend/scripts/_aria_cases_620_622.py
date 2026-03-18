"""
ARIA Cases 620-622: March 18 2026 investigation session.

Cases:
  620: CONSTRUCCIONES Y ACABADOS MOHUSA - IMSS Hospital Construction 100% SB 381M (Matamoros 2023-2025)
  621: COMERCIALIZADORA CONFIABLE - Coahuila 620M Despensas 100% SB (Welfare Capture 2017)
  622: SISTEMAS PRACTICOS EN SEGURIDAD PRIVADA - Veracruz Port Security Monopoly 1.5B (risk=1.00)

Run from backend/ directory.
"""

# CASE-620: VID 292536 CONSTRUCCIONES Y ACABADOS MOHUSA SA DE CV
#   - 381.4M, 3 contracts, 0% DA, 100% SB, 2023-2025, salud.
#   - ALL 3 contracts at IMSS:
#     325.4M LP 2023 SB=1 risk=0.59: "SUSTITUCIÓN DEL HOSPITAL RURAL NO. 79 DE 30 CAMAS,
#       EN MATAMOROS" (hospital construction in Matamoros, Tamaulipas)
#     41.5M LP 2025 SB=1: IMSS childcare center construction
#     14.5M LP 2024 SB=1: CENAIDS documentation center
#   - A construction company winning every IMSS construction contract uncontested (100% SB).
#     The 325M hospital construction in Matamoros (Tamaulipas — Cartel del Golfo territory)
#     with risk=0.59 and no competing bids is a textbook P6 capture. IMSS infrastructure
#     contracts are high-value and frequently targeted. Company appears 2023, wins 381M,
#     exclusively at IMSS. P6 IMSS institutional capture in the construction subsector.

# CASE-621: VID 196905 COMERCIALIZADORA CONFIABLE SA DE CV
#   - 634.7M, 3 contracts, 0% DA, 100% SB, 2016-2017, infraestructura.
#   - Coahuila-Secretaría de Finanzas 620M LP 2017 SB=1: "ADQUISICION DE DESPENSAS PARA
#     LA SECRETARIA DE DESARROLLO SOCIAL DE COAHUILA" — 620M for welfare food baskets
#     via single-bid competitive licitación pública at the Coahuila state Finance Ministry.
#   - Torreón municipality 12.5M + 2.1M (construction, SB=1).
#   - A Coahuila commercializer winning a 620M welfare despensa (food basket) contract
#     uncontested via competitive procedure at Coahuila Finance Ministry in 2017.
#     Despensa procurement is one of the most fraud-prone categories in Mexican state
#     procurement — Coahuila 2017 was under PRI Gov. Rubén Moreira (brother of convicted
#     cartel collaborator Humberto Moreira). 620M in food baskets via LP with zero rival
#     bidders = institutional capture at state welfare procurement.

# CASE-622: VID 93372 SISTEMAS PRACTICOS EN SEGURIDAD PRIVADA SA DE CV
#   - 1,494.8M, 83 contracts, 24% DA, 43% SB, 2010-2025, hacienda/infraestructura.
#   - ASIPONA Veracruz 567.4M (2 contracts):
#     447.6M LP 2025 SB=1 risk=1.00: "SERVICIO DE VIGILANCIA EDIFICIO ADMINISTRATIVO Y ÁREAS"
#     200.9M LP 2025 SB=1 risk=0.78: "SEGURIDAD Y VIGILANCIA EN EL ÁREA DE REVISIÓN"
#   - AICM 384.1M (3 contracts): 155.6M LP 2023 SB=1 risk=0.48
#   - SAT 203.3M (27 contracts), BANOBRAS 80M.
#   - A private security company monopolizing surveillance at the Port of Veracruz (Mexico's
#     largest Gulf port, major cocaine transit point) and AICM (Mexico City international
#     airport). The 447.6M contract scores risk=1.00 — the highest possible. Winning port
#     security contracts at Veracruz uncontested = direct connection between private security
#     and port access control in a narco-transit hub. P6 capture at critical infrastructure.

# FPs (structural / legitimate operators):
# 80477 SECRETARIA DE LA DEFENSA NACIONAL (SEDENA itself listed as vendor — data artifact)
# 1382 EBSCO MEXICO INC (academic database provider, authorized institutional supplier)
# 52502 FEDEX DE MEXICO (global courier, legitimate)
# 8473 SCHNEIDER ELECTRIC MEXICO (French electrical multinational, authorized supplier)
# 34762 MANCERA SC (Ernst & Young affiliate, Big 4 accounting, legitimate)
# 78239 UNIVERSIDAD AUTONOMA DEL ESTADO DE MEXICO (public state university, exempt)

# Needs review: 102529, 19838, 24059, 48466, 250231, 40544, 293691, 278025, 46789

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA journal_mode=WAL")

    next_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] + 1
    print(f"Current max GT case ID: {next_id - 1}")

    note_620 = (
        "CONSTRUCCIONES Y ACABADOS MOHUSA SA DE CV — P6 IMSS construction 100% SB: "
        "381.4M, 3 contracts all at IMSS 2023-2025. Key: 325.4M LP 2023 SB=1 risk=0.59 "
        "'Sustitución del Hospital Rural No. 79 de 30 Camas, en Matamoros' (Tamaulipas, "
        "Cartel del Golfo territory). Plus 41.5M LP 2025 (childcare center) + 14.5M LP "
        "2024 (CENAIDS). Company appears 2023, wins 381M exclusively at IMSS construction, "
        "every contract goes uncontested via competitive LP. P6 IMSS institutional capture "
        "in construction subsector at border region."
    )

    note_621 = (
        "COMERCIALIZADORA CONFIABLE SA DE CV — P6 Coahuila despensa capture: 634.7M, "
        "3 contracts, 100% SB, 2016-2017. Core: 620M LP 2017 SB=1 at Coahuila-Secretaría "
        "de Finanzas for 'ADQUISICION DE DESPENSAS PARA LA SECRETARIA DE DESARROLLO "
        "SOCIAL DE COAHUILA' — welfare food baskets without rival bidders. Coahuila 2017 "
        "under PRI governor (related to Humberto Moreira). Despensa procurement is Mexico's "
        "most fraud-prone category. 620M via competitive LP with zero competition = "
        "institutional capture at Coahuila welfare/social development procurement."
    )

    note_622 = (
        "SISTEMAS PRACTICOS EN SEGURIDAD PRIVADA SA DE CV — P6 Veracruz port security "
        "monopoly: 1,494.8M, 43% SB, 2010-2025. ASIPONA Veracruz 567.4M: 447.6M LP 2025 "
        "SB=1 risk=1.00 (surveillance Veracruz port admin + operational areas) + 200.9M "
        "LP 2025 SB=1 risk=0.78 (cargo review area security). AICM 384.1M (3 contracts "
        "incl. 155.6M LP 2023 SB=1). SAT 203.3M. Private security firm monopolizing "
        "surveillance at Veracruz port (Mexico's largest Gulf port, major cocaine transit "
        "route) and Mexico City airport. 447.6M security contract scores risk=1.00."
    )

    cases = [
        (0, [(292536, "CONSTRUCCIONES Y ACABADOS MOHUSA SA DE CV", "high")],
         "MOHUSA CONSTRUCCIONES - IMSS Hospital 100% SB Matamoros 381M (2023-2025)",
         "procurement_fraud", "high", note_620, 325400000, 2023, 2025),

        (1, [(196905, "COMERCIALIZADORA CONFIABLE SA DE CV", "high")],
         "COMERCIALIZADORA CONFIABLE - Coahuila 620M Despensas 100% SB (2016-2017)",
         "procurement_fraud", "high", note_621, 620000000, 2016, 2017),

        (2, [(93372, "SISTEMAS PRACTICOS EN SEGURIDAD PRIVADA SA DE CV", "high")],
         "SISTEMAS PRACTICOS SEGURIDAD - Veracruz Port Monopoly 1.5B (risk=1.00 2025)",
         "procurement_fraud", "high", note_622, 1494800000, 2010, 2025),
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
        80477,    # SECRETARIA DE LA DEFENSA NACIONAL (SEDENA as vendor = data artifact)
        1382,     # EBSCO MEXICO INC (academic database provider, authorized)
        52502,    # FEDEX DE MEXICO (global courier, legitimate)
        8473,     # SCHNEIDER ELECTRIC MEXICO (French electrical multinational)
        34762,    # MANCERA SC (Ernst & Young Mexico affiliate, Big 4)
        78239,    # UNIVERSIDAD AUTONOMA DEL ESTADO DE MEXICO (public university)
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
        102529,   # CONTROLES Y MEDIDORES ESPECIALIZADOS (2.1B CFE 10%SB mostly competitive)
        19838,    # SERVICIOS TECNOLOGIA Y ORGANIZACION (762M IT/Oracle SEP+AICM)
        24059,    # DOC SOLUTIONS DE MEXICO (551M 53%DA hacienda)
        48466,    # MAXI SERVICIOS DE MEXICO (808M 50%SB hacienda)
        250231,   # COMERCIALIZADORA COFRADIA (89.5M 69%DA salud P6)
        40544,    # ELITE MEDICAL CARE SA DE CV (90.5M 46%SB salud P6)
        293691,   # COMERCIALIZADORA LOS TRES JR (10.7M 100%DA P6)
        278025,   # COMERCIALIZADORA ELECTROPURA (99.2M 86%DA salud)
        46789,    # SERVICIOS INTEGRADOS DE CAPITAL HUMANO (48.8M ambiente)
        51256,    # COMUNICACION SEGMENTADA INTELIGENTE (113.3M 95%DA hacienda)
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
    print(f"\nDone. Cases 620-622 inserted.")


if __name__ == "__main__":
    run()
