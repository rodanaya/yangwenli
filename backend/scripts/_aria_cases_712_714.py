"""
ARIA Cases 712-714: March 19 2026 investigation session.

Cases:
  712: 3W EDUCACION SC - SEGOB 461M DA Ghost (P2 2015)
  713: DEL CARMEN CARRETERAS Y PUENTES - Puebla Transit+Road 550M SB=1 (P3 2018)
  714: AGROGEN - SAGARPA Fertilizer 415M SB=1 + Diconsa DA + PEMEX 875M (P6)

Run from backend/ directory.
"""

# CASE-712: VID 162045 3W EDUCACION SC
#   - 460.7M, 1 contract, 100% DA, 0% SB, 2015, gobernacion.
#   - SEGOB 460.7M DA 2015 risk=0.37 "Contratación de un Servicio de renovación
#     y ampliación de la capacidad operativa" — Interior Ministry paying 461M via
#     direct award to a social cooperative (SC) named "3W Educacion" for vague
#     "operational capacity renewal and expansion" services. A single 461M DA
#     contract at SEGOB (federal Interior Ministry) is highly irregular. The
#     vendor name ("3W Educacion SC") does not match Interior Ministry's operational
#     needs. The "capacidad operativa" description is opaque — consistent with
#     ghost company DA absorption at SEGOB. P2 ghost: 1 contract, 100% DA,
#     single large opaque payment at federal Interior Ministry in 2015.

# CASE-713: VID 169031 DEL CARMEN CARRETERAS Y PUENTES SA DE CV
#   - 550.0M, 2 contracts, 0% DA, 100% SB, 2018, infraestructura.
#   - Puebla-Secretaría de Administración 386M LP 2018 SB=1 risk=0.38
#     "PROYECTO DE TRANSPORTE MASIVO DE LA CUENCA NORTE SUR DE LA ZONA
#     METROPOLITANA DE PUEBLA" (Puebla metropolitan mass transit corridor,
#     uncontested).
#   - Puebla-Finanzas y Administración 164M LP 2018 SB=1 risk=0.38
#     "CARRETERA PUEBLA-AMOZOC, INCORPORACIÓN Y LIBRAMIENTOS" (Puebla-Amozoc
#     highway extension, uncontested).
#   - Both contracts at Puebla state government in 2018, both LP SB=1. A single
#     construction company capturing Puebla state's two largest 2018 infrastructure
#     projects — the metropolitan mass transit corridor (386M) and the Puebla-Amozoc
#     highway (164M) — both uncontested. P3 Puebla state infrastructure intermediary:
#     two LP SB=1 contracts 550M in single year at state administration.

# CASE-714: VID 9239 AGROGEN S.A DE C.V.
#   - 874.6M, 378 contracts, 49% DA, 38% SB, 2003-2023, agricultura.
#   - SAGARPA/SADER 415.3M (6c, DA=0, SB=5): 415M LP 2019 SB=1 risk=0.65
#     "Adquisición de Fertilizante Químico Sulfato de Amonio" (chemical ammonium
#     sulfate fertilizer, massive uncontested 2019 SAGARPA purchase).
#   - Diconsa 170.1M (358c, DA=358): 358 direct award contracts at Diconsa
#     for what appears to be agricultural/food supply channel distribution.
#   - PEMEX Gas y Petroquímica Básica 143.8M (5c, DA=0, SB=5).
#   - PEMEX Refinación 121.3M (6c, DA=0, SB=6).
#   - Cross-sector agriculture+energy pattern: SAGARPA fertilizer 415M SB=1 +
#     Diconsa 358 DA + PEMEX gas/refining SB=1 contracts at the same company.
#     AGROGEN is nominally an agricultural input company, but PEMEX SB=1 wins
#     indicate cross-sector capture beyond their agricultural core. The 358 DA
#     at Diconsa (state food distribution) plus 415M SAGARPA LP SB=1 (2019) +
#     PEMEX LP SB=1 contracts = P6 multi-institution agriculture+energy capture.

# FPs (structural / legitimate operators):
# 43403 UNAM (Universidad Nacional Autónoma de México) — Mexico's national public
#   university. IMSS 267M + ISSSTE 117M (laboratory and diagnostic services
#   provided by university medical school/hospitals to social security agencies).
#   Government-to-government inter-entity contract: university providing specialized
#   medical services to federal health insurers. 100% DA is standard for public
#   university inter-institutional agreements. Structural government entity.

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA journal_mode=WAL")

    next_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] + 1
    print(f"Current max GT case ID: {next_id - 1}")

    note_712 = (
        "3W EDUCACION SC — P2 Ghost SEGOB Interior Ministry DA: 460.7M, "
        "100% DA, 1 contract, 2015. SEGOB 460.7M DA 2015 risk=0.37 "
        "'Contratacion de un Servicio de renovacion y ampliacion de la "
        "capacidad operativa' (opaque 'operational capacity' services at "
        "federal Interior Ministry). Social cooperative (SC) named '3W "
        "Educacion' receiving 461M single DA from SEGOB for vague services. "
        "Vendor name does not match Interior Ministry operations. 1 contract, "
        "100% DA, 461M at SEGOB in 2015 = ghost company DA absorption. "
        "P2 ghost: single large opaque payment at federal Interior Ministry."
    )

    note_713 = (
        "DEL CARMEN CARRETERAS Y PUENTES SA DE CV — P3 Puebla state "
        "infrastructure capture: 550M, 100% SB, 2 contracts, 2018. "
        "Puebla-Secretaria de Administracion 386M LP 2018 SB=1 risk=0.38 "
        "'PROYECTO DE TRANSPORTE MASIVO DE LA CUENCA NORTE SUR DE LA ZONA "
        "METROPOLITANA DE PUEBLA' (Puebla metro mass transit, uncontested). "
        "Puebla-Finanzas y Administracion 164M LP 2018 SB=1 risk=0.38 "
        "'CARRETERA PUEBLA-AMOZOC, INCORPORACION Y LIBRAMIENTOS' (highway, "
        "uncontested). Both at Puebla state 2018, both LP SB=1. Single "
        "construction firm capturing Puebla's two largest 2018 infrastructure "
        "projects (metro transit + highway) both uncontested. P3 Puebla "
        "state infrastructure: 550M SB=1 in single year at state admin."
    )

    note_714 = (
        "AGROGEN SA DE CV — P6 multi-institution agriculture+energy capture: "
        "874.6M, 49% DA, 378 contracts, 2003-2023. SAGARPA/SADER 415.3M (6c "
        "SB=5): 415M LP 2019 SB=1 risk=0.65 'Adquisicion de Fertilizante "
        "Quimico Sulfato de Amonio' (ammonium sulfate fertilizer, uncontested). "
        "Diconsa 170.1M (358c DA=358): 358 DA contracts at state food "
        "distribution network. PEMEX Gas y Petroquimica 143.8M (5c SB=5). "
        "PEMEX Refinacion 121.3M (6c SB=6). Agriculture company with "
        "SAGARPA 415M SB=1 + Diconsa 358 DA + PEMEX SB=1 across gas/refining "
        "divisions. Cross-sector agriculture+energy capture with DA saturation "
        "at food distribution. P6 multi-institution: SAGARPA+Diconsa+PEMEX."
    )

    cases = [
        (0, [(162045, "3W EDUCACION SC", "high")],
         "3W EDUCACION SC - SEGOB 461M DA Ghost (P2 2015)",
         "procurement_fraud", "high", note_712, 460700000, 2015, 2015),

        (1, [(169031, "DEL CARMEN CARRETERAS Y PUENTES SA DE CV", "high")],
         "DEL CARMEN CARRETERAS - Puebla Metro Transit+Road 550M SB=1 (P3 2018)",
         "procurement_fraud", "high", note_713, 550000000, 2018, 2018),

        (2, [(9239, "AGROGEN S.A DE C.V.", "high")],
         "AGROGEN - SAGARPA Fertilizer 415M SB=1 + Diconsa DA + PEMEX (P6)",
         "procurement_fraud", "high", note_714, 874600000, 2003, 2023),
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
        43403,    # UNAM (national public university — government inter-entity medical/lab services to IMSS/ISSSTE)
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
        472,      # SERVICIO PAN AMERICANO DE PROTECCION (2845M cash transport: Banco Bienestar+BANSEFI+CAPUFE — licensed armored car oligopoly)
        43929,    # ESTUDIOS CHURUBUSCO AZTECA (599M advertising/media at Diconsa+SEGOB, mixed SB)
        40970,    # RODI PACIFICO (367M IMSS medical equipment, 287M competitive risk=1.00)
        4965,     # CONTROL TECNICO Y REPRESENTACIONES (1096M 3707c salud DA — needs verify)
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
    print(f"\nDone. Cases 712-714 inserted.")


if __name__ == "__main__":
    run()
