"""
ARIA Cases 472-476: March 17 2026 investigation session.

Cases:
  472: CONSTRUCTORA Y ARRENDADORA ARCOS - CONAGUA Water Cartel Member (461M)
  473: MOLIENDAS TIZAYUCA - CONAGUA Hydraulic Monopoly (738M)
  474: CONTROL DE EROSION - CONAGUA River/Flood Control Capture (1982M)
  475: GEBAUDE - CONAGUA Construction Monopoly (421M)
  476: PRIMOS AND COUSINS - SEGALMEX/DICONSA Food Distribution Cartel Member (515M)

Run from backend/ directory.
"""
import sys, sqlite3
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

CONAGUA_CARTEL = (
    "Part of the CONAGUA hydraulic construction cartel: PAJEME (GT), PEREZ Y GIL (Case 439), "
    "URISA (Case 441), OZONE (Case 449), INGENIERIA SANITARIA (Case 450), "
    "COET TUBERIAS (Case 468), ARTEKK (Case 470), ARCOS (Case 472), "
    "MOLIENDAS TIZAYUCA (Case 473), CONTROL DE EROSION (Case 474), GEBAUDE (Case 475). "
    "Each firm monopolizes a hydraulic sub-niche at CONAGUA through market allocation."
)


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"Current max GT case ID: {max_id}")
    next_id = max_id + 1

    note_472 = (
        "Institutional capture at CONAGUA - water infrastructure construction. "
        "No RFC despite 461M MXN across 13 contracts. "
        "9 CONAGUA contracts totaling 446M (97% concentration), ALL single-bid. "
        "3 additional SB contracts at Jalisco state water commission + Jalisco rural development. "
        "100% SB rate across all 13 contracts (2002-2009). "
        "ARCOS specializes in water infrastructure construction/leasing "
        "('Constructora y Arrendadora' = construction and equipment leasing). "
        + CONAGUA_CARTEL +
        "Classification: P6 CONAGUA Institutional Capture + CONAGUA cartel member."
    )

    note_473 = (
        "Institutional capture at CONAGUA - hydraulic infrastructure in Hidalgo state area. "
        "No RFC despite 738M MXN across 13 contracts (2003-2025). "
        "ALL 13 contracts at CONAGUA: 12 SB + 1 DA = 92.3% single-bid rate. "
        "Company name 'Moliendas Tizayuca' (Tizayuca = Hidalgo city near CONAGUA's "
        "Tula River watershed) - regional hydraulic infrastructure firm. "
        "22-year relationship with CONAGUA exclusively (2003-2025) at 92% SB "
        "is impossible without systematic bid suppression. "
        + CONAGUA_CARTEL +
        "Classification: P6 CONAGUA Institutional Capture + CONAGUA cartel member."
    )

    note_474 = (
        "Major institutional capture at CONAGUA - river channel management, flood control, "
        "and hydraulic infrastructure. "
        "No RFC despite 1,982M MXN across 90 contracts (2002-2025). "
        "CONAGUA: 44 contracts, 1,325M (32 SB + 12 DA). "
        "Veracruz state water commission: 19 contracts, 343M (16 SB + 3 DA). "
        "Combined: 1,668M at water agencies, 73% single-bid. "
        "Contract types: bordo (levee) construction, river channel rectification, "
        "canal revestimiento (lining), erosion control. "
        "Active as recently as 2025 - 23-year continuous relationship. "
        + CONAGUA_CARTEL +
        "Classification: P6 CONAGUA Institutional Capture + CONAGUA cartel member."
    )

    note_475 = (
        "Institutional capture at CONAGUA - hydraulic and water infrastructure construction. "
        "No RFC despite 421M MXN across 6 contracts (2012-2024). "
        "ALL 6 contracts at CONAGUA: 5 SB + 1 DA. 83.3% single-bid rate. "
        "Company name 'Gebaude' (German: 'building/structure') - unusual foreign-language "
        "name for a Mexican infrastructure company suggests possible front company. "
        + CONAGUA_CARTEL +
        "Classification: P6 CONAGUA Institutional Capture + CONAGUA cartel member."
    )

    note_476 = (
        "Food distribution cartel member embedded in the SEGALMEX/DICONSA corruption ecosystem. "
        "No RFC despite 515M MXN across 9 contracts (2013-2023). "
        "All 9 contracts are direct awards (100% DA) at food distribution agencies: "
        "DICONSA (215M, 7 contracts 2013-2015), "
        "SEGALMEX (185M, maiz blanco nacional acquisition 2022), "
        "ALIMENTACION PARA EL BIENESTAR (112M, corn logistics 2023). "
        "Contract content: corn acquisition (maiz blanco nacional) and corn logistics - "
        "the same commodity category as the Segalmex scandal. "
        "Co-bidder network includes 6+ confirmed or pending GT vendors: "
        "COMERCIALIZADORA COLUMBIA (confirmed_corrupt), "
        "AGRO SERVICIOS A PRODUCTORES DEL VALLE (GT), "
        "ALMACENES Y SERVICIOS SANTAROSA (GT), "
        "AGRICOLA TERRO CULTIVOS (GT), "
        "AGRO TECNOLOGIAS DE JALISCO (GT), "
        "MERCANTA (GT). "
        "Classification: P3 Intermediary + SEGALMEX food cartel member."
    )

    cases = [
        (0, [(3339, "CONSTRUCTORA Y ARRENDADORA ARCOS SA DE CV", "high")],
         "CONSTRUCTORA Y ARRENDADORA ARCOS - CONAGUA Water Infrastructure Cartel",
         "procurement_fraud", "high", note_472, 446000000, 2002, 2009),
        (1, [(12611, "MOLIENDAS TIZAYUCA SA DE CV", "high")],
         "MOLIENDAS TIZAYUCA - CONAGUA Hydraulic Monopoly",
         "procurement_fraud", "high", note_473, 738000000, 2003, 2025),
        (2, [(49, "CONTROL DE EROSION SA DE CV", "high")],
         "CONTROL DE EROSION - CONAGUA River Management Capture",
         "procurement_fraud", "high", note_474, 1982000000, 2002, 2025),
        (3, [(58563, "GEBAUDE SA DE CV", "high")],
         "GEBAUDE - CONAGUA Construction Monopoly",
         "procurement_fraud", "high", note_475, 421000000, 2012, 2024),
        (4, [(105801, "PRIMOS AND COUSINS SA DE CV", "high")],
         "PRIMOS AND COUSINS - SEGALMEX/DICONSA Food Distribution Cartel Member",
         "procurement_fraud", "high", note_476, 515000000, 2013, 2023),
    ]

    for (offset, vendors, cname, ctype, conf, notes, fraud, yr1, yr2) in cases:
        case_id_int = next_id + offset
        case_id_str = f"CASE-{case_id_int}"
        conn.execute("""
            INSERT OR REPLACE INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
            VALUES (?,?,?,?,?,?,?,?,?)
        """, (case_id_int, case_id_str, cname, ctype, conf, notes, fraud, yr1, yr2))
        print(f"Inserted case {case_id_int}: {cname[:60]}")

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
            """, (f"GT Case {case_id_int}: {cname[:80]}", vid))
            n = conn.execute("SELECT COUNT(*) FROM contracts WHERE vendor_id=?", (vid,)).fetchone()[0]
            print(f"  Tagged {n} contracts for vendor {vid} ({vname[:50]})")

    # ── False positives ────────────────────────────────────────────────────────
    structural_fps = {
        230516: ("APP TAMAULIPAS SAPI: PPP highway concession SPV for Tamaulipas route. "
                 "Single 4478M SCT contract 2018 - APP + SAPI + single route = standard PPP SPV."),
        237401: ("CONSORCIO CARRETERO CAMPECHE-MERIDA SAPI: PPP highway concession SPV. "
                 "Single 4390M SCT contract 2018 - SAPI + route name = standard PPP vehicle."),
        31249: ("OPERADORA DE HOSPITALES ANGELES: Mexico's largest private hospital chain (Grupo Angeles). "
                "NAFINSA 683M likely hospital service concessions or public-private managed care. "
                "Legitimate major private health system, not a shell company."),
    }
    for vid, note in structural_fps.items():
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (f"FP: {note}", vid))
    print(f"Marked {len(structural_fps)} structural FPs")

    # ── Needs review ──────────────────────────────────────────────────────────
    needs_review = {
        228366: ("THOMASANT GROUP: RFC present. 344M Michoacan state health 2018 (4 contracts not SB). "
                 "53M Yucatan state (2 SB). Medical company state health. Investigate Michoacan relationship."),
        126208: ("DRAGADOS PAKAL DE CHIAPAS: No RFC. 401M - CONAGUA 266M + CFE 75M + CONAPESCA 60M. "
                 "CONAPESCA dredging cartel adjacent (Case 446). Investigate dredging contracts."),
        4761: ("EXPRAB CO: No RFC. 913M at CONAFOR (858M, 52 contracts 2005-2024) + SEMARNAT. "
               "Forestry/reforestation specialist. 26.9% SB moderate. Borderline legitimate."),
        218406: ("IMAGO CENTRO DE INTELIGENCIA DE NEGOCIOS: RFC present. CAPUFE 435M (3 DA 2020-2021). "
                 "SEGALMEX 85M. IT consulting. CAPUFE 435M in direct awards is suspicious."),
        73238: ("LA LATINOAMERICANA SEGUROS: No RFC. 1338M insurance. CONADE 694M (3 SB). "
                "Insurance market structural but SB on insurance at CONADE warrants investigation."),
        27911: ("CONSULTORES PARA LA INVESTIGACION APLICADA: No RFC. 681M at CONAFOR (605M, 22c). "
                "Environmental consulting at CONAFOR. Similar to EXPRAB pattern."),
        225418: ("CONCRETOS SAN CAYETANO: RFC present. 330M SB at CONAGUA 2021. Only 3 contracts. "
                 "CONAGUA SB pattern but limited data. Monitor for additional contracts."),
    }
    for vid, memo in needs_review.items():
        conn.execute("""
            UPDATE aria_queue SET review_status='needs_review', memo_text=?
            WHERE vendor_id=? AND in_ground_truth=0
        """, (memo, vid))
    print(f"Marked {len(needs_review)} needs_review")

    conn.commit()
    print("\nCommitted.")

    # ── Verification ──────────────────────────────────────────────────────────
    print("\n--- VERIFICATION ---")
    new_max = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    total_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    total_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
    print(f"Max case ID: {new_max} | GT vendors: {total_v} | GT contracts: {total_c}")

    for offset in range(5):
        case_str = f"CASE-{next_id + offset}"
        row = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()
        if not row:
            continue
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {row[0][:65]} | {n_v} vendors | {n_c} contracts")

    conn.close()
    print("\nDone. Cases 472-476 inserted.")


if __name__ == "__main__":
    run()
