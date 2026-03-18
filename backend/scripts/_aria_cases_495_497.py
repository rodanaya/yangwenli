"""
ARIA Cases 495-497: March 17 2026 investigation session.

Cases:
  495: AGUAS RECUPERADAS - CONAGUA Water Recovery Monopoly (160M)
       No RFC, 4 contracts ALL single-bid at CONAGUA, 2016-2018 — CONAGUA cartel member
  496: BECADEHU INDUSTRIES - ALIMENTACION PARA EL BIENESTAR Food DA Cartel (156M)
       No RFC, 8 contracts ALL direct award at APB, 2024 — SEGALMEX ecosystem
  497: SERVICIOS INTEGRALES CARREGIN - DICONSA Food Distribution Cartel (147M)
       No RFC, 31 contracts 29 direct award at DICONSA, 2020-2021 — SEGALMEX ecosystem

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
    "MOLIENDAS TIZAYUCA (Case 473), CONTROL DE EROSION (Case 474), GEBAUDE (Case 475), "
    "AGUAS RECUPERADAS (Case 495). "
    "Each firm monopolizes a hydraulic sub-niche at CONAGUA through market allocation."
)

SEGALMEX_CARTEL = (
    "Part of the SEGALMEX/DICONSA food distribution cartel: "
    "COMERCIALIZADORA COLUMBIA (confirmed_corrupt), "
    "AGRO SERVICIOS A PRODUCTORES DEL VALLE (GT), "
    "ALMACENES Y SERVICIOS SANTAROSA (GT), "
    "AGRICOLA TERRO CULTIVOS (GT), AGRO TECNOLOGIAS DE JALISCO (GT), "
    "MERCANTA (GT), PRIMOS AND COUSINS (Case 476), MAISON DE CHANCE (Case 491), "
    "BECADEHU INDUSTRIES (Case 496), SERVICIOS INTEGRALES CARREGIN (Case 497). "
    "All win through direct awards at DICONSA/SEGALMEX/APB food program agencies."
)


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"Current max GT case ID: {max_id}")
    next_id = max_id + 1

    note_495 = (
        "CONAGUA hydraulic infrastructure capture — water recovery and treatment. "
        "No RFC despite 160M MXN across 4 contracts (2016-2018). "
        "ALL 4 contracts at CONAGUA — 100% agency concentration. "
        "ALL 4 contracts single-bid — 100% SB rate. "
        "Company name 'Aguas Recuperadas' (recovered water/wastewater treatment) "
        "indicates a wastewater/water reuse specialist — "
        "a distinct hydraulic sub-niche within CONAGUA procurement. "
        + CONAGUA_CARTEL +
        "Classification: P6 CONAGUA Institutional Capture + CONAGUA cartel member."
    )

    note_496 = (
        "Food supply cartel member embedded in the ALIMENTACION PARA EL BIENESTAR program. "
        "No RFC despite 156M MXN across 8 contracts (2024). "
        "ALL 8 contracts are direct awards at ALIMENTACION PARA EL BIENESTAR (APB) — "
        "the successor to DICONSA under AMLO's food sovereignty program. "
        "Contract content: 'SERVICIO INTEGRAL PARA EL SUMINISTRO DE FRIJOL, CRIBADO, "
        "PULIDO' (integrated supply of beans, sieving, polishing) — "
        "agricultural commodity processing for rural food distribution. "
        "Company name 'BECADEHU INDUSTRIES' — non-descriptive name inconsistent with "
        "a Mexican agricultural commodity processor; possible shell company. "
        "8 direct awards to a single vendor at APB with no RFC in a single year (2024) "
        "is consistent with the SEGALMEX/DICONSA cartel pattern: "
        "new companies inserted into food programs through DA without competition. "
        + SEGALMEX_CARTEL +
        "Classification: P3 Intermediary + SEGALMEX/APB food cartel member."
    )

    note_497 = (
        "Food distribution cartel member at DICONSA — rural food program intermediary. "
        "No RFC despite 147M MXN across 31 contracts (2020-2021). "
        "DICONSA: 31 contracts — 29 direct award (94% DA rate), 1 SB. "
        "ALL contracts for 'COMPRA PARA ATENDER REQUERIMIENTOS DEL PROGRAMA DE ABASTO RURAL' "
        "(purchase to meet rural supply program requirements). "
        "31 contracts over 2 years at DICONSA all through direct awards "
        "with no RFC is characteristic of the SEGALMEX cartel pattern: "
        "shell/intermediary companies winning systematic DA food procurement "
        "without competitive bidding. "
        "The 94% DA rate at a single food distribution agency over 2 years "
        "indicates a vendor with preferred insider access to DICONSA procurement. "
        + SEGALMEX_CARTEL +
        "Classification: P3 Intermediary + DICONSA food distribution cartel member."
    )

    cases = [
        (0, [(177614, "AGUAS RECUPERADAS S.A. DE C.V", "high")],
         "AGUAS RECUPERADAS - CONAGUA Water Recovery Monopoly",
         "procurement_fraud", "high", note_495, 160000000, 2016, 2018),
        (1, [(304391, "BECADEHU INDUSTRIES SA DE CV", "high")],
         "BECADEHU INDUSTRIES - APB/SEGALMEX Food DA Cartel Member",
         "procurement_fraud", "high", note_496, 156000000, 2024, 2024),
        (2, [(256991, "SERVICIOS INTEGRALES CARREGIN, S.A. DE C.V.", "high")],
         "SERVICIOS INTEGRALES CARREGIN - DICONSA Food Distribution Cartel",
         "procurement_fraud", "high", note_497, 147000000, 2020, 2021),
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
        74657: (
            "INTEGRADORA LATINOAMERICANA DE INFRAESTRUCTURA CONSTRUCTIVA S.A.P.I. DE C.V.: "
            "PPP/infrastructure investment vehicle — 'S.A.P.I. de C.V.' designation "
            "(Sociedad Anonima Promotora de Inversion) is a legal structure specifically "
            "designed for PPP and infrastructure investment projects in Mexico. "
            "Single 3598M SCT contract 2012 — consistent with a highway or rail PPP "
            "concession SPV created for a specific federal infrastructure project. "
            "SAPI + single large SCT contract = standard PPP vehicle."
        ),
        313151: (
            "AGRONEGOCIOS HINOJOSA SA DE CV: Special legal exemption procurement. "
            "Single 145M INIFAP direct award 2025 using 'ADJUDICACION DIRECTA POR "
            "CONTRATACION CON CAMPESINOS O GRUPOS URBANOS' procedure — "
            "this is a legally recognized exemption under LAASSP Art. 41(j) allowing "
            "direct purchase from farmer cooperatives and rural groups. "
            "INIFAP (agricultural research institute) buying 4,500 tons of agricultural "
            "commodities directly from farmer groups is the intended use of this exemption. "
            "Structural legitimate procedure — not fraud."
        ),
    }
    for vid, note in structural_fps.items():
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (f"FP: {note}", vid))
    print(f"Marked {len(structural_fps)} structural FPs")

    # ── Needs review ──────────────────────────────────────────────────────────
    needs_review = {
        257323: (
            "CONSORCIO CONSTRUCTIVO DYCHER: No RFC. Single 3429M SB at Nuevo Leon state 2020. "
            "Contract: 'Construccion de cortina presa La Libertad de 1,950 m de longitud' — "
            "dam construction (1.95km dam wall) in Nuevo Leon. "
            "Major specialized dam construction — few qualified bidders may be legitimate. "
            "Investigate: was this a competitive process? Who are the other specialized dam "
            "builders in Mexico? Is Dycher a known dam construction company?"
        ),
        274271: (
            "CONSTRUCTORA PUENTE MANANTIAL: No RFC. Single 990M SB at SICT 2021. "
            "Contract: 'CONSTRUCCION DEL VIADUCTO ATIRANTADO MANANTIAL' — cable-stayed viaduct. "
            "Company named after its main project ('Puente Manantial' = Manantial Bridge) — "
            "could be an SPV created specifically for this project. "
            "Investigate: is this a legitimate specialized bridge contractor or project SPV?"
        ),
        299761: (
            "PYCSUR SA DE CV: No RFC. Single 724M DA at IPN Patronato 2023. "
            "Contract: construction of IPN professional university building. "
            "Procedure: 'ADJUDICACION DIRECTA POR LICITACIONES PUBLICAS DESIERTAS' "
            "(DA because previous public tenders received no bids). "
            "University construction DA after deserted tenders could be legitimate "
            "(specialized construction, tight timeline) or orchestrated (specifications "
            "designed to scare off other bidders). Investigate."
        ),
        306868: (
            "GREMIAL CONSTRUCCIONES: No RFC. Single 656M SB at BANOBRAS 2024. "
            "Contract: highway pavement structural rehabilitation km 186+000 al 194+000. "
            "BANOBRAS (national public works bank) financing highway rehabilitation. "
            "Single SB for road paving at BANOBRAS is suspicious but plausible "
            "for a specialized paving company in a specific corridor. Investigate."
        ),
        292038: (
            "BRICK CONTRATISTAS: No RFC. Single 400M SB at SEDATU 2023. "
            "Contract: 'CONSTRUCCION DE PARQUE LINEAL EN RIO GRIJALVA, MARGEN DERECHO' — "
            "linear park along Grijalva river (likely Tabasco/Chiapas). "
            "SEDATU park construction SB 2023. Investigate location and contractor background."
        ),
        80841: (
            "PROMOTORIAS LOMAR: No RFC. Single 185M at Puebla CONCYTEP (science council) 2011. "
            "Procedure: 'Invitacion a Cuando Menos 3 Personas' (invitation to at least 3). "
            "185M for a state science council via invitation procedure is suspicious. "
            "Investigate contract content and relationship with CONCYTEP."
        ),
        307140: (
            "GRUPO OLEO-LAB: No RFC. 183M at LICONSA 2024-2025 (2 SB). "
            "Contracts: palm oil (oleina de palma) supply for LICONSA milk program. "
            "LICONSA connection + SB pattern. Investigate supplier background and "
            "whether palm oil SB at LICONSA is systematic."
        ),
        56473: (
            "TRALOGIC DE PUEBLA: No RFC. 142M at SLP-DIF (4c SB) + DIF Estatal (2c SB) 2010. "
            "All contracts 2010, all at DIF (family assistance). 5/6 SB rate. "
            "Transport/logistics for social programs at DIF. Investigate contract content."
        ),
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

    for offset in range(3):
        case_str = f"CASE-{next_id + offset}"
        row = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()
        if not row:
            continue
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {row[0][:65]} | {n_v} vendors | {n_c} contracts")

    conn.close()
    print("\nDone. Cases 495-497 inserted.")


if __name__ == "__main__":
    run()
