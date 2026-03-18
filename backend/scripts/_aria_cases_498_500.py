"""
ARIA Cases 498-500: March 17 2026 investigation session.

Cases:
  498: TECHNOFOODS - ALIMENTACION PARA EL BIENESTAR DA Cartel (98M)
       No RFC, single DA at APB 2023, SEGALMEX ecosystem
  499: ACT AGROSERVICIOS - SEGALMEX Corn DA Cartel Member (80M)
       No RFC, SEGALMEX 80M DA 2022, Sinaloa corn acquisition
  500: PURP SA DE CV - SEGALMEX Corn DA Cartel Member (73M)
       No RFC, SEGALMEX 73M DA 2022, Sinaloa corn acquisition

Run from backend/ directory.
"""
import sys, sqlite3
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

SEGALMEX_CARTEL = (
    "Part of the SEGALMEX/DICONSA food distribution cartel. "
    "Core pattern: direct awards for Sinaloa white corn acquisition — "
    "the commodity at the center of the 2022-2023 Segalmex scandal. "
    "Co-vendors in same SEGALMEX corn DA network include: "
    "COMERCIALIZADORA COLUMBIA (confirmed_corrupt), "
    "AGRO SERVICIOS A PRODUCTORES DEL VALLE (GT), MERCANTA (GT), "
    "PRIMOS AND COUSINS (Case 476), MAISON DE CHANCE (Case 491), "
    "ACT AGROSERVICIOS (Case 499), PURP (Case 500). "
    "Each receives direct awards without competitive bidding for the same commodity."
)


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"Current max GT case ID: {max_id}")
    next_id = max_id + 1

    note_498 = (
        "Food supply cartel member at ALIMENTACION PARA EL BIENESTAR (APB). "
        "No RFC despite 98M MXN in a single direct award contract (2023). "
        "APB (formerly DICONSA) direct award for 'COMPRA PARA ATENDER "
        "REQUERIMIENTO DEL PROGRAMA ESPECIAL' — food for special program. "
        "Company name 'TECHNOFOODS' — non-descriptive name atypical for "
        "a rural food supply company; shell company indicators. "
        "Single large DA at APB with no RFC in 2023 matches the pattern "
        "of BECADEHU INDUSTRIES (Case 496) and MAISON DE CHANCE (Case 491): "
        "new companies with opaque names receiving direct awards in the "
        "AMLO-era food program infrastructure without competitive procurement. "
        "Classification: P3 Intermediary + APB/SEGALMEX food cartel member."
    )

    note_499 = (
        "SEGALMEX corn acquisition cartel member — Sinaloa white corn network. "
        "No RFC despite 80M MXN in a single direct award (2022). "
        "SEGALMEX (Seguridad Alimentaria Mexicana): 1 contract, 80M MXN DA. "
        "Contract content: 'Adquisicion de maiz blanco nacional, origen Sinaloa, "
        "Ciclo de cosecha' — white corn from Sinaloa harvest cycle. "
        "Sinaloa white corn from ACT AGROSERVICIOS via DA at SEGALMEX in 2022 "
        "places this vendor at the center of the documented SEGALMEX scandal. "
        "The Segalmex investigation found that intermediaries without proper "
        "registration (no RFC) received massive direct awards for corn acquisitions "
        "in Sinaloa — with documentation irregularities and non-existent deliveries. "
        "Company name 'ACT AGROSERVICIOS' — generic agro-services name consistent "
        "with shell intermediaries in the SEGALMEX network. "
        + SEGALMEX_CARTEL +
        "Classification: P3 Intermediary + SEGALMEX Sinaloa corn cartel member."
    )

    note_500 = (
        "SEGALMEX corn acquisition cartel member — Sinaloa white corn network. "
        "No RFC despite 73M MXN in a single direct award (2022). "
        "SEGALMEX: 1 contract, 73M MXN DA. "
        "Contract content: 'Adquisicion de maiz blanco nacional, origen Sinaloa, "
        "ciclo de cosecha' — same Sinaloa white corn acquisition as ACT AGROSERVICIOS (Case 499). "
        "Company name 'PURP SA de CV' — four-letter name with no descriptive content "
        "is a strong shell company indicator (registered for a single purpose). "
        "Same year (2022), same commodity (Sinaloa white corn), same institution (SEGALMEX), "
        "same procedure (DA) as Case 499 — these two companies are likely co-members "
        "of the Sinaloa corn distribution ring that systematically captured SEGALMEX "
        "corn procurement in 2022. "
        + SEGALMEX_CARTEL +
        "Classification: P3 Intermediary + SEGALMEX Sinaloa corn cartel member."
    )

    cases = [
        (0, [(302364, "TECHNOFOODS, SA DE CV", "high")],
         "TECHNOFOODS - APB/SEGALMEX Food Program DA Cartel",
         "procurement_fraud", "high", note_498, 98000000, 2023, 2023),
        (1, [(282774, "Act Agroservicios, S.A. de C.V.", "high")],
         "ACT AGROSERVICIOS - SEGALMEX Sinaloa Corn DA Cartel",
         "procurement_fraud", "high", note_499, 80000000, 2022, 2022),
        (2, [(281660, "Purp, S.A de C.V", "high")],
         "PURP SA DE CV - SEGALMEX Sinaloa Corn DA Cartel Member",
         "procurement_fraud", "high", note_500, 73000000, 2022, 2022),
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
        263800: (
            "FONDO INSTITUCIONAL DE FOMENTO REGIONAL PARA EL DESARROLLO CIENTIFICO "
            "(FORDECYT/FOINS): Government research funding instrument — "
            "not a private vendor. Single 110M contract at CINVESTAV 2020 for "
            "'APORTACION AL FOINS PARA EL ACCESOS A RECURSOS DE INFORMACION' — "
            "institutional grant/contribution for scientific information resources. "
            "This is an intergovernmental research funding mechanism under CONACYT. "
            "Government-to-research-institution transfer, not a private procurement."
        ),
        24506: (
            "SAINT-GOBAIN CANALIZACION MEXICO SA DE CV: Mexican subsidiary of "
            "Saint-Gobain (French multinational, revenues >44B EUR). "
            "Saint-Gobain Canalisation manufactures ductile iron pipes and fittings "
            "for water distribution networks — structural monopoly on specialized "
            "water main materials. Tabasco + Queretaro state water utilities, 103M 2006. "
            "DA/SB contracts are structural — Saint-Gobain pipes require SG installation "
            "support services. Legitimate multinational OEM relationship."
        ),
        314410: (
            "DARIO BENITO CONTRERAS SANCHEZ: Persona fisica (individual) INIFAP 80M 2025. "
            "Procedure: 'ADJUDICACION DIRECTA POR CONTRATACION CON CAMPESINOS O GRUPOS URBANOS' — "
            "legally exempt procurement from farmer groups under LAASSP Art. 41(j). "
            "INIFAP purchasing 'SERVICIO INTEGRAL DE ESTABLECIMIENTO Y MANEJO DE CULTIVO DE FRIJOL' "
            "(integrated bean crop management service) from an individual farmer — "
            "correct use of rural farmer exemption. Structural legitimate."
        ),
        280851: (
            "ASOCIACION DE AGRICULTORES DEL RIO MOCORITO: Farmer cooperative from "
            "Sinaloa (Mocorito is a Sinaloa municipality on the Mocorito River). "
            "SEGALMEX 77M DA 2022 for 'Adquisicion de maiz blanco nacional, origen Sinaloa' — "
            "a registered agricultural cooperative selling its Sinaloa white corn harvest "
            "to SEGALMEX. While the SEGALMEX program had corruption, purchasing directly "
            "from registered farmer associations is the program's intended mechanism. "
            "Farmer association origin + Sinaloa corn + correct procedure type "
            "suggests legitimate cooperative selling, not shell intermediary."
        ),
        279808: (
            "FUNDACION PRODUCE MORELOS AC: Agricultural technology transfer foundation. "
            "Fundaciones PRODUCE are state-level agricultural research and extension "
            "foundations established under SAGARPA/SADER framework — not-for-profit ACs. "
            "INIFAP 76M 2022 via 'CONVENIO DE CONCERTACION' (cooperation agreement) — "
            "formal research collaboration between national agricultural research institute "
            "and state agricultural foundation. This is a standard INIFAP partnership mechanism. "
            "Legitimate institutional cooperation, not vendor fraud."
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
        10306: (
            "CONSTRUCCIONES CAMINOS Y PAVIMENTOS FRAYBAR: No RFC. Single 118M SB at SCT 2002. "
            "Highway paving specialist (Structure A era). Similar to FABRICACION Y COLOCACION "
            "(Case 490) — single SB highway paving contract 2002. Borderline GT."
        ),
        96: (
            "ESTRUCTURAS Y PROYECTOS SA DE CV: No RFC. 114M at 3 API ports (Manzanillo 76M, "
            "Veracruz 18M, Mazatlan 14M) all SB 2002-2003. Cross-port construction capture. "
            "Investigate: port infrastructure specialist or bid-suppression ring across APIs?"
        ),
        290772: (
            "MRM CONSORCIO INDUSTRIAL ALIMENTICIO: No RFC. Single 108M SB at LICONSA 2022. "
            "Contract: palm oil (oleina de palma) for LICONSA milk program. "
            "LICONSA connection + SB. Similar to GRUPO OLEO-LAB. Investigate LICONSA palm "
            "oil supply relationships."
        ),
        310429: (
            "PRISHER DEL SURESTE SA DE CV: No RFC. 96M at SSA 2024 (SB=1, DA=2). "
            "Contract: medical equipment acquisition. Recent SSA medical equipment DA. "
            "Investigate: what medical equipment and is this legitimate SSA acquisition?"
        ),
        1205: (
            "ARRENDADORA DE EQUIPOS PARA INFRAESTRUCTURA: No RFC. 81M at CAPUFE + SCT 2002 "
            "both SB (Structure A era). Equipment leasing for highway infrastructure. "
            "Small amount — borderline GT."
        ),
        10052: (
            "CANALES Y TERRACERIAS DEL PACIFICO: No RFC. 75M at SCT 3c all SB 2002. "
            "Canal and earthworks for highway (SCT). Structure A era. "
            "3 SB at SCT 2002 — small but pattern-consistent with highway capture cluster."
        ),
        315297: (
            "FAB TEX SA DE CV: No RFC. Single 78M SB at SEGALMEX 2025. "
            "Contract: 'ADQUISICION DE COSTALES' (sacks/bags for grain storage). "
            "Packaging supplies for SEGALMEX food program. SEGALMEX SB packaging supplier. "
            "Investigate: is FAB TEX a legitimate packaging company?"
        ),
        312281: (
            "TRANSPORTES UNIDOS MOCHIS SA DE CV: No RFC. Single 60M SB at SEGALMEX 2024. "
            "'SERVICIO DE FLETE TERRESTRE DEL SERVICIO PUBLICO FEDERAL PARA SEGURIDAD ALIMENTARIA' — "
            "freight transport for food security program. 'Mochis' = Los Mochis (Sinaloa). "
            "Sinaloa transport company for SEGALMEX food program. Investigate."
        ),
        24493: (
            "ING JOSE ALEJANDRO HERNANDEZ OLIVOS: Persona fisica engineer. "
            "57M at Jalisco water commission (CEAS) 3c all SB 2006. "
            "Individual engineer winning 3 SB water infrastructure contracts. "
            "Investigate: what water infrastructure services?"
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
    print("\nDone. Cases 498-500 inserted.")


if __name__ == "__main__":
    run()
