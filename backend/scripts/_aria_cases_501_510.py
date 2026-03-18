"""
ARIA Cases 501-510: March 17 2026 investigation session.

Cases:
  501: CONTRISSA ASFALTOS - Coahuila/SCT/CAPUFE Asphalt Monopoly (1933M)
       No RFC, 66c SB=65 (98%), Coahuila 823M + SCT 633M + CAPUFE 288M, 2002-2014
  502: MATERIALES Y CONSTRUCCIONES VILLA DE AGUAYO - Tamaulipas Construction (1350M)
       No RFC, 28c ALL SB, Tamaulipas state 702M + SCT 436M, 2002-2010
  503: FARMACIA DE GENERICOS - Veracruz SSA + IMSS Pharma Capture (1072M)
       No RFC, Veracruz SSA 860M (SB) + IMSS 119M 297c (287 DA), 2006-2025
  504: CBH+ ESPECIALISTAS EN INNOVACION MEDICA - IMSS Anesthesia Capture (1418M)
       No RFC, IMSS 1409M 34c anesthesia services 2023-2025
  505: ADMINISTRADORA DE EQUIPOS MEDICOS - IMSS Medical Equipment Capture (1004M)
       No RFC, IMSS 1004M 62c DA=28 minimally invasive procedures, 2013-2025
  506: INDDCAMA - IMSS/INSABI Medical Diagnostics Capture (757M)
       No RFC, IMSS 365M DA=4 + INSABI 309M + ISSSTE 71M DA=3, 2020-2025
  507: GRAMILPA - DICONSA Long-Term Food DA Monopoly (1172M)
       No RFC, DICONSA 1135M 49c DA=47 + APB 26M, 2014-2025
  508: D M MEXICANA - DICONSA Massive DA Food Monopoly (1194M)
       No RFC, DICONSA 1068M 199c DA=192 + LICONSA 126M DA, 2010-2022
  509: GRUPO DRAKIR - DICONSA/CONAFE 100% DA Food Cartel (636M)
       No RFC, DICONSA 589M 40c ALL DA + CONAFE 47M DA, 2014-2015
  510: COMERCIALIZADORA PENINSULA MAYAB - IMSS Hospitality/Events Capture (516M)
       No RFC, IMSS 516M event management + hospitality 5c DA=3, 2024-2025

Run from backend/ directory.
"""
import sys, sqlite3
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

DICONSA_CARTEL = (
    "Part of the DICONSA/SEGALMEX/APB long-term food distribution cartel: "
    "COMERCIALIZADORA COLUMBIA (confirmed_corrupt), DM MEXICANA (Case 508), "
    "GRAMILPA (Case 507), GRUPO DRAKIR (Case 509), "
    "BECADEHU INDUSTRIES (Case 496), SERVICIOS INTEGRALES CARREGIN (Case 497), "
    "INDUSTRIAS CAMPO FRESCO (Case 514). "
    "These companies systematically receive direct awards at DICONSA/APB "
    "without competitive bidding over multiple years."
)


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"Current max GT case ID: {max_id}")
    next_id = max_id + 1

    note_501 = (
        "Multi-level asphalt and highway construction institutional capture. "
        "No RFC despite 1,933M MXN across 66 contracts (2002-2014). "
        "65 of 66 contracts single-bid — 98% SB rate across 3 institutions. "
        "Coahuila state public works: 16 contracts, 823M MXN — all SB (2002-2014). "
        "SCT federal: 28 contracts, 633M MXN — all SB (2002-2012). "
        "CAPUFE toll roads: 10 contracts, 288M MXN — all SB (2005-2010). "
        "Pattern: A single asphalt company capturing state highway construction, "
        "federal highway construction, and toll road maintenance simultaneously "
        "at 98% SB rate over 12 years indicates systematic bid suppression across "
        "multiple levels of government in Coahuila and federal agencies. "
        "Coahuila during this period (2002-2014) had documented cartel infiltration "
        "of state public works procurement. "
        "Classification: P6 Coahuila/SCT/CAPUFE Asphalt Institutional Capture."
    )

    note_502 = (
        "Tamaulipas state construction monopoly extending to SCT federal contracts. "
        "No RFC despite 1,350M MXN across 28 contracts (2002-2010). "
        "ALL 28 contracts single-bid — 100% SB rate. "
        "Tamaulipas SEDUE: 1 contract, 262M MXN SB (2003). "
        "Tamaulipas state public works: 7 contracts, 440M MXN — all SB. "
        "SCT federal: 18 contracts, 436M MXN — all SB. "
        "Combined: 1,138M MXN in Tamaulipas-related construction at 100% SB. "
        "Pattern: Simultaneous capture of Tamaulipas state public works and "
        "federal SCT contracts in the same region without any competitive bids "
        "over 8 years. Tamaulipas during 2002-2010 had documented Gulf cartel "
        "infiltration of state procurement and construction contracts. "
        "The 100% SB rate across 28 contracts is statistically impossible without "
        "systematic bid suppression or cartel-level coordination. "
        "Classification: P6 Tamaulipas/SCT Construction Institutional Capture."
    )

    note_503 = (
        "Pharmaceutical capture across Veracruz SSA and IMSS. "
        "No RFC despite 1,072M MXN across 364 contracts (2006-2025). "
        "Veracruz SSA: 1 contract, 500M MXN single-bid (2010) — massive single SB contract. "
        "Servicios de Salud de Veracruz (SSVSA): 5 contracts, 360M MXN — all SB (2010). "
        "IMSS: 297 contracts, 119M MXN — DA=287 (97% direct award rate at IMSS). "
        "Pattern: Dual strategy — winning large SB contracts at Veracruz state health "
        "while simultaneously accumulating 297 small DA contracts at IMSS. "
        "A generic pharmacy winning 860M at Veracruz SSA without competition "
        "and 119M at IMSS through 97% direct awards over 19 years with no RFC "
        "is consistent with a medical intermediary with cultivated relationships "
        "at both state and federal health institutions. "
        "Classification: P3 Medical Intermediary — Veracruz SSA + IMSS pharma capture."
    )

    note_504 = (
        "IMSS anesthesia medical services institutional capture — 2023-2025. "
        "No RFC despite 1,418M MXN across 41 contracts (2023-2025). "
        "IMSS: 34 contracts, 1,409M MXN — medical anesthesia services. "
        "Contract content: 'SERVICIO MEDICO INTEGRAL PARA ANESTESIA 2023-2025' — "
        "integrated anesthesia services at IMSS facilities nationwide. "
        "1.4B MXN in anesthesia services in just 2 years at IMSS with no RFC "
        "is highly anomalous. Anesthesia is a specialized medical service that "
        "requires licensed anesthesiologists — 'CBH+ Especialistas en Innovacion Medica' "
        "appears to be a medical services intermediary subcontracting anesthesiologists. "
        "Medical services intermediaries capture IMSS contracts by winning comprehensive "
        "service agreements and then subcontracting actual medical personnel, "
        "extracting intermediary rents while providing no unique clinical value. "
        "34 contracts in 2 years at IMSS suggests multiple facility contracts awarded "
        "simultaneously — a pattern of rapid institutional capture. "
        "Classification: P3 Medical Intermediary — IMSS anesthesia services capture."
    )

    note_505 = (
        "IMSS medical equipment services institutional capture — 12-year operation. "
        "No RFC despite 1,004M MXN across 62 contracts (2013-2025). "
        "IMSS: 61 contracts, 1,004M MXN (SB=10, DA=28). "
        "Contract content: 'SERVICIO MEDICO INTEGRAL PARA PROCEDIMIENTOS DE MINIMA INVASION' "
        "(integrated medical service for minimally invasive procedures). "
        "Minimally invasive procedures (laparoscopy, endoscopy) require specialized "
        "equipment — this company appears to lease/administer surgical equipment "
        "to IMSS facilities. 62 contracts at IMSS over 12 years with no RFC "
        "and 28 direct awards suggests a vendor deeply embedded in IMSS procurement "
        "with insider access to equipment specification processes. "
        "The company name 'Administradora de Equipos Medicos' (Medical Equipment Manager) "
        "is descriptive of an intermediary that manages rather than manufactures equipment. "
        "Classification: P3 Medical Equipment Intermediary — IMSS procedural capture."
    )

    note_506 = (
        "Medical diagnostics and equipment capture across IMSS, INSABI, and ISSSTE. "
        "No RFC despite 757M MXN across 41 contracts (2020-2025). "
        "IMSS: 4 contracts, 365M MXN — DA=4 (100% direct award). "
        "INSABI: 2 contracts, 309M MXN — large LP contracts. "
        "ISSSTE: 6 contracts, 71M MXN — DA=3. "
        "Contract content: 'COMPRA CONSOLIDADA DE MED (77 CLAVES) Y MC (230 CLAVES) 2025-2026' "
        "(consolidated purchase of 77 medication codes + 230 medical supply codes) at IMSS — 364M. "
        "And: 'ADQUISICION DE BIENES DE EQUIPO MEDICO, EQUIPO DE LABORATORIO' at INSABI — 309M. "
        "Company name 'INDDCAMA Deteccion y Diagnostico Especializado en Salud' — "
        "specialized health detection and diagnosis. "
        "Two different large public health institutions awarding 757M with 100% IMSS DA "
        "and no RFC registration is consistent with a connected medical intermediary "
        "that emerged post-COVID (2020) and rapidly captured institutional procurement. "
        "Classification: P3 Medical Intermediary — IMSS/INSABI diagnostics and meds capture."
    )

    note_507 = (
        "DICONSA long-term food distribution direct award monopoly — 11 years. "
        "No RFC despite 1,172M MXN across 55 contracts (2014-2025). "
        "DICONSA: 49 contracts, 1,135M MXN — DA=47 (96% direct award rate). "
        "ALIMENTACION PARA EL BIENESTAR (APB): 5 contracts, 26M MXN. "
        "SEGALMEX: 1 contract, 11M MXN. "
        "11-year continuous relationship with DICONSA/APB through predominantly "
        "direct awards is characteristic of captured procurement in the food "
        "distribution system — the same ecosystem documented in the Segalmex scandal. "
        "A vendor winning 96% of DICONSA contracts through DA over 11 years "
        "with no RFC has structural insider access to DICONSA procurement processes. "
        + DICONSA_CARTEL +
        "Classification: P3 Intermediary + DICONSA/APB food distribution DA monopoly."
    )

    note_508 = (
        "DICONSA massive direct award food distribution monopoly — 12 years. "
        "No RFC despite 1,194M MXN across 200 contracts (2010-2022). "
        "DICONSA: 199 contracts, 1,068M MXN — DA=192 (97% direct award rate). "
        "LICONSA: 1 contract, 126M MXN DA. "
        "200 contracts at DICONSA + LICONSA with 96.5% DA rate over 12 years "
        "represents one of the most systematic direct award capture patterns in "
        "the food distribution ecosystem. The volume (200 contracts) indicates "
        "this vendor had essentially exclusive access to DICONSA DA procurement "
        "in a specific region or product category for over a decade. "
        "No RFC despite 1.2B in government food contracts is a critical red flag. "
        + DICONSA_CARTEL +
        "Classification: P3 Intermediary + DICONSA massive DA food monopoly."
    )

    note_509 = (
        "DICONSA and CONAFE all-DA food distribution cartel — concentrated 2-year operation. "
        "No RFC despite 636M MXN across 42 contracts (2014-2015). "
        "DICONSA: 40 contracts, 589M MXN — DA=40 (100% direct award). "
        "CONAFE (rural education council): 2 contracts, 47M MXN — DA=2. "
        "42 contracts — all direct awards — across food and education agencies in 2 years. "
        "100% DA at both institutions with no RFC and 636M scale in just 2 years "
        "indicates rapid insertion into multiple government food/social program supply chains. "
        "The CONAFE connection (school food programs) alongside DICONSA rural stores "
        "suggests the company targeted institutions that serve vulnerable rural populations "
        "through the opaque DA mechanisms of Mexico's social program supply chain. "
        + DICONSA_CARTEL +
        "Classification: P3 Intermediary + DICONSA/CONAFE food distribution DA cartel."
    )

    note_510 = (
        "IMSS hospitality and event management institutional capture — 2024-2025. "
        "No RFC despite 516M MXN across 5 contracts (2024-2025). "
        "IMSS: 5 contracts, 516M MXN (SB=0, DA=3). "
        "Contract content: "
        "'ADMINISTRACION Y EJECUCION DE TODAS LAS ACTIVIDADES Y EVENTOS, QUE...' "
        "(administration and execution of all activities and events) — 258M MXN 2025. "
        "'ATENDER LA NECESIDAD DEL SERVICIO DE HOSPEDAJE, ALIMENTACION Y TR...' "
        "(hospitality, food and transport services) — 128M MXN 2024. "
        "A company from the Yucatan Peninsula (Peninsula del Mayab = Yucatan/Campeche/QRoo) "
        "winning 516M at IMSS for event management and hospitality services through "
        "3 direct awards in 2 years is highly anomalous. "
        "IMSS hospitality/events spending at this scale should require competitive bidding. "
        "258M for 'all activities and events' at IMSS lacks specificity — "
        "opaque contract descriptions for large DA at health institutions are a known "
        "capture vector (allowing corrupt billing for services never delivered). "
        "No RFC for a hospitality company operating at 516M scale nationally. "
        "Classification: P6 IMSS Hospitality/Events Institutional Capture."
    )

    cases = [
        (0, [(1158, "CONTRISSA ASFALTOS, S.A. DE C.V.", "high")],
         "CONTRISSA ASFALTOS - Coahuila/SCT/CAPUFE Highway Asphalt Monopoly",
         "procurement_fraud", "high", note_501, 1933000000, 2002, 2014),
        (1, [(10179, "MATERIALES Y CONSTRUCCIONES VILLA DE AGUAYO, S.A. DE C.V.", "high")],
         "MATERIALES VILLA DE AGUAYO - Tamaulipas/SCT Construction Monopoly",
         "procurement_fraud", "high", note_502, 1350000000, 2002, 2010),
        (2, [(28760, "FARMACIA DE GENERICOS, S.A. DE C.V.", "high")],
         "FARMACIA DE GENERICOS - Veracruz SSA + IMSS Pharma Capture",
         "procurement_fraud", "high", note_503, 1072000000, 2006, 2025),
        (3, [(300156, "CBH+ ESPECIALISTAS EN INNOVACION MEDICA SA DE CV", "high")],
         "CBH+ ESPECIALISTAS - IMSS Anesthesia Services Capture",
         "procurement_fraud", "high", note_504, 1418000000, 2023, 2025),
        (4, [(119432, "ADMINISTRADORA DE EQUIPOS MEDICOS SA DE CV", "high")],
         "ADMINISTRADORA DE EQUIPOS MEDICOS - IMSS Procedural Capture",
         "procurement_fraud", "high", note_505, 1004000000, 2013, 2025),
        (5, [(259277, "INDDCAMA DETECCION Y DIAGNOSTICO ESPECIALIZADO EN SALUD, S.A. DE C.V.", "high")],
         "INDDCAMA - IMSS/INSABI Medical Diagnostics Capture",
         "procurement_fraud", "high", note_506, 757000000, 2020, 2025),
        (6, [(129617, "GRAMILPA, S.A. DE C.V.", "high")],
         "GRAMILPA - DICONSA/APB Long-Term Food DA Monopoly",
         "procurement_fraud", "high", note_507, 1172000000, 2014, 2025),
        (7, [(47661, "D M MEXICANA SA DE CV", "high")],
         "D M MEXICANA - DICONSA Massive DA Food Distribution Monopoly",
         "procurement_fraud", "high", note_508, 1194000000, 2010, 2022),
        (8, [(126256, "GRUPO DRAKIR SA DE CV", "high")],
         "GRUPO DRAKIR - DICONSA/CONAFE 100% DA Food Cartel",
         "procurement_fraud", "high", note_509, 636000000, 2014, 2015),
        (9, [(305423, "COMERCIALIZADORA DE LA PENINSULA DEL MAYAB SA DE CV", "high")],
         "COMERCIALIZADORA PENINSULA MAYAB - IMSS Events/Hospitality Capture",
         "procurement_fraud", "high", note_510, 516000000, 2024, 2025),
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

    # ── Needs review ──────────────────────────────────────────────────────────
    needs_review = {
        28637: (
            "EDS DE MEXICO SA DE CV: SAT 1163M (885M + 278M) via Licitacion Publica 2006. "
            "EDS (Electronic Data Systems) was a US IT services multinational (acquired by HP 2008). "
            "SAT (tax authority) IT services contract — large-scale IT infrastructure for SAT systems. "
            "Investigate: Is this the legitimate EDS IT multinational? If yes, structural FP."
        ),
        176963: (
            "ASPEN MEXICO S DE RL DE CV: IMSS 621M + INSABI 109M + HRAEO 53M, 116c DA=53, 2016-2021. "
            "Aspen Pharmacare is a South African pharmaceutical multinational with branded generics. "
            "46% DA rate at IMSS over 5 years with LP for initial tenders is mixed. "
            "Investigate: What products and is 46% DA justified for branded/patent generics?"
        ),
        318049: (
            "OPERA MARITIMA SA DE CV: IMIPAS 416M 1c SB 2025. "
            "'Servicios especializados para IMIPAS' — fisheries research institute maritime services. "
            "416M for maritime specialized services at fisheries research is unusual. "
            "Investigate: what specific maritime services? Vessel charter? Research equipment?"
        ),
        3332: (
            "MINERIA Y BARRENACION SA DE CV: SCT 437M 5c SB + CONAGUA 3M, 6c all SB, 2002-2006. "
            "Mining and drilling for highway construction (SCT). All 6 SB. "
            "Specialized tunnel boring/quarrying niche could have few qualified bidders. "
            "Investigate: contract types (tunnel? quarry?) and geographic concentration."
        ),
        169358: (
            "EPM MEDIOS SA DE CV: IFT (telecom regulator) 489M 4c all SB, 2015-2020. "
            "'EPM Medios' at IFT — media/communications company at telecom regulator. "
            "4 SB contracts 489M at IFT over 5 years. Investigate contract content: "
            "what media services does a telecom regulator procure at 489M scale?"
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

    for offset in range(10):
        case_str = f"CASE-{next_id + offset}"
        row = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()
        if not row:
            continue
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {row[0][:65]} | {n_v}v | {n_c}c")

    conn.close()
    print("\nDone. Cases 501-510 inserted.")


if __name__ == "__main__":
    run()
