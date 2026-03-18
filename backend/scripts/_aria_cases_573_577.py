"""
ARIA Cases 573-577: March 17 2026 investigation session.

Cases:
  573: SANTEK HEALTH SA DE CV - False Document Network (382.7M)
       RFC Aug 2021; linked to Farmaceutica Medikamenta (Joan Christian Carmona Baron);
       ASE Chihuahua confirmed false docs; Morelos non-delivery; rapid multi-institution expansion
  574: JOAD LIMPIEZA Y SERVICIOS - IPN Cartel de la Limpieza (911.1M)
       SFP investigation 203M+ patrimonial damage; bid simulation; unpaid workers;
       documented as part of Jose Juan Reyes Dominguez cleaning cartel
  575: INNOVACIONES HOSPITALARIAS DE MEXICO - SFP Sanction False Documentation (915M)
       SFP disqualified + 936K fine for false tax compliance docs; IMSS/SEDENA/hospitals;
       owner Rodrigo Contreras Aguilar linked to IMSS provider corruption
  576: FINAL TEST - CINVESTAV/CENAM Lab Equipment Overpricing (235.7M)
       Generic company name, no RFC; power supply billed 58.1M; RIGOL oscilloscopes 19.9M;
       83% DA at federal research institutions; 100-1000x market price overpricing
  577: CENTRO AGROPECUARIO CASA AGRO - Sembrando Vida DA Concentration (132M)
       132M in one day (3 same-day DAs Sept 17 2019); Sembrando Vida program with
       400M+ ASF-documented irregularities; payments without documentary evidence

Run from backend/ directory.
"""
import sys, sqlite3
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"Current max GT case ID: {max_id}")
    next_id = max_id + 1

    note_573 = (
        "Santek Health false document network — ASE Chihuahua confirmed, Morelos non-delivery. "
        "11 contracts 2022-2025, 382.7M MXN. DA=55%, SB=27%. "
        "RFC SHE210823II0 — company incorporated August 2021, government contracts began Dec 2022. "
        "DOCUMENTED FRAUD: "
        "(1) ASE Chihuahua (state oversight) confirmed the company won bids using false documentation "
        "in 2022 — submitting fabricated certificates or credentials to meet bid requirements. "
        "(2) Linked to Joan Christian Carmona Baron and the Farmaceutica Medikamenta network — "
        "a documented ring of medical supply companies using shared personnel and front structures. "
        "(3) Morelos state government under Cuauhtemoc Blanco paid millions for medicines and "
        "medical services that were NEVER delivered — textbook advance-payment fraud. "
        "SCALE PATTERN: Company went from zero contracts (2021) to 382.7M across IMSS, ISSSTE, "
        "SEDENA, and Morelos state within 3 years — rapid expansion inconsistent with a newly "
        "incorporated company without established supply chains. "
        "Classification: P2/P3 Santek Health False Document Network — state audit confirmed."
    )

    note_574 = (
        "IPN Cartel de la Limpieza — SFP investigation 203M+, bid simulation, unpaid workers. "
        "218 contracts 2013-2025, 911.1M MXN. DA=43%, SB=33%. Concentrated at IPN. "
        "DOCUMENTED BY SFP AND MEDIA: "
        "(1) JOAD Limpieza y Servicios is part of the documented 'Cartel de la Limpieza' at IPN, "
        "linked to Jose Juan Reyes Dominguez. The ring includes JOAD, Aseo Privado Institucional, "
        "and Tecno Limpieza — companies that simulate competition in bidding to monopolize "
        "cleaning service contracts at IPN. "
        "(2) SFP opened formal investigation June 2021 for patrimonial damage of 203M+ pesos. "
        "(3) IPN's Internal Comptroller (OIC) flagged documentation noncompliance in a 300M+ "
        "peso contract award. "
        "(4) Workers at IPN publicly protested unpaid wages — the company was not paying its "
        "cleaning staff despite receiving full government payment. "
        "Labor exploitation + bid simulation + SFP investigation = multi-layered fraud. "
        "Classification: P6/P1 IPN Cartel de la Limpieza — SFP investigation confirmed."
    )

    note_575 = (
        "Innovaciones Hospitalarias SFP-sanctioned false documentation — IMSS/SEDENA/hospitals. "
        "70 contracts 2013-2024, 915M MXN. DA=49%, SB=26%. "
        "CONFIRMED BY SFP: "
        "(1) SFP formally sanctioned and disqualified Innovaciones Hospitalarias de Mexico for "
        "submitting false tax compliance documentation (CSF/RFC certificates) in government "
        "bidding processes — part of a coordinated SFP action against 8 health sector companies. "
        "(2) SFP imposed 936K peso fine plus a 2-year disqualification from public contracting. "
        "(3) Owner Rodrigo Contreras Aguilar is identified in multiple media outlets as part "
        "of a broader IMSS provider corruption pattern involving falsified compliance certificates. "
        "(4) A federal court reversed the disqualification in May 2024 on procedural grounds — "
        "but the original SFP finding of false documentation remains the documented fact. "
        "915M across IMSS (444M), Hospital del Bajio (178M), and SEDENA (165M). "
        "The SFP formal sanction, confirmed false documentation, and media-documented owner "
        "connections make this a confirmed corruption case. "
        "Classification: P3/P6 Innovaciones Hospitalarias — SFP disqualification, false docs."
    )

    note_576 = (
        "FINAL TEST CINVESTAV/CENAM lab equipment overpricing — 83% DA, no RFC, 100-1000x pricing. "
        "53 contracts 2010-2024, 235.7M MXN. DA=83%. Concentrated at CINVESTAV and CENAM. "
        "EXTREME PRICE ANOMALIES: "
        "(1) 'FUENTE DE PODER' (power supply) billed at 58.1M MXN — industrial power supplies "
        "typically cost 5,000-500,000 MXN. This is 100-10,000x normal market price. "
        "(2) 'FUENTE DE MEDICION Y VOLTAJE' billed at 63.3M MXN — similar extreme overpricing. "
        "(3) 'RIGOL' brand (a Chinese test equipment maker) oscilloscopes and instruments "
        "billed at 19.9M MXN — Rigol equipment retails for 3,000-50,000 MXN. "
        "(4) ELGAR power supply maintenance billed at 40.5M MXN — maintenance contracts "
        "for such equipment are typically 50,000-500,000 MXN. "
        "IDENTITY RED FLAGS: "
        "(5) Company named 'FINAL TEST' — a generic, non-descriptive name. "
        "(6) No RFC on file — anonymous entity receiving 235.7M in direct awards. "
        "Pattern: anonymous company + no RFC + 83% DA + 100-1000x overpricing at federal "
        "research institutions = systematic fraud with likely institutional complicity. "
        "Classification: P3 FINAL TEST CINVESTAV/CENAM Extreme Overpricing."
    )

    note_577 = (
        "Sembrando Vida direct award concentration — 132M in one day, ASF-documented program fraud. "
        "5 contracts 2019-2020, 132.4M MXN. DA=100%. Secretaria de Bienestar. "
        "SAME-DAY DA PATTERN: "
        "(1) Three direct award contracts on September 17, 2019 totaling 132M: "
        "45M + 66.8M + 20.2M — all awarded to Casa Agro in a single day. "
        "(2) The contracts are for agricultural supplies under the Sembrando Vida program. "
        "ASF AUDIT FINDINGS: "
        "(3) ASF documented over 400M+ in irregularities in Sembrando Vida 2019 operations — "
        "payments made without documentary evidence, undelivered supplies, lack of supervision. "
        "(4) Multiple investigative journalism outlets (CONNECTAS, Animal Politico) documented "
        "systemic opacity and concentrated supplier relationships in the Sembrando Vida program. "
        "MECHANISM: Bienestar program direct awards bypassed competitive procurement for "
        "rural agricultural supplies, creating direct channels for concentrated spending to "
        "specific vendors without competitive oversight or delivery verification. "
        "Classification: P2/P6 Casa Agro Sembrando Vida DA Concentration — ASF documented."
    )

    cases = [
        (0, [(289162, "SANTEK HEALTH SA DE CV", "high")],
         "SANTEK HEALTH - False Document Network / Medikamenta Ring (382.7M)",
         "procurement_fraud", "confirmed_corrupt", note_573, 382700000, 2022, 2025),
        (1, [(152260, "JOAD LIMPIEZA Y SERVICIOS SA DE CV", "high")],
         "JOAD LIMPIEZA - IPN Cartel de la Limpieza SFP Investigation (911.1M)",
         "procurement_fraud", "confirmed_corrupt", note_574, 911100000, 2013, 2025),
        (2, [(102423, "INNOVACIONES HOSPITALARIAS DE MEXICO SA DE CV", "high")],
         "INNOVACIONES HOSPITALARIAS - SFP Disqualified False Docs (915M)",
         "procurement_fraud", "confirmed_corrupt", note_575, 915000000, 2013, 2024),
        (3, [(43614, "FINAL TEST", "high")],
         "FINAL TEST - CINVESTAV/CENAM Lab Equipment Extreme Overpricing (235.7M)",
         "procurement_fraud", "high", note_576, 220000000, 2010, 2024),
        (4, [(246299, "CENTRO AGROPECUARIO CASA AGRO SA DE CV", "high")],
         "CASA AGRO - Sembrando Vida Single-Day DA Concentration (132M)",
         "procurement_fraud", "high", note_577, 132000000, 2019, 2020),
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
    # Aventis Pasteur = Sanofi Pasteur, major global vaccine multinational
    conn.execute("""
        UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
        WHERE vendor_id=5861
    """, ("FP structural_monopoly: AVENTIS PASTEUR SA — former name of Sanofi Pasteur, the vaccines "
          "division of Sanofi-Aventis Group (major global pharmaceutical multinational). 6 contracts "
          "444.8M, 0% DA, 0% SB — all competitive procedures. Vaccine procurement is structurally "
          "concentrated due to WHO pre-qualification requirements and production scale. Legitimate "
          "global vaccine supplier to the Mexican government. High risk score reflects structural "
          "market concentration, not corruption.",))

    # Policia Bancaria e Industrial = Mexico City government police force, not a vendor
    conn.execute("""
        UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
        WHERE vendor_id=250683
    """, ("FP structural_monopoly: POLICIA BANCARIA E INDUSTRIAL DE LA CIUDAD DE MEXICO — "
          "public security force operated by Mexico City's Secretaria de Seguridad Ciudadana. "
          "Government entity, not a private vendor. 100% SB is expected: as a public police force "
          "it has no private-sector competitors. Institutions contract PBI directly as G2G service. "
          "15 contracts 303.9M for security at IPN, IPAB, Banco del Bienestar — all legitimate.",))

    # INCMNSZ = National Institute of Health, federal public institution
    conn.execute("""
        UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
        WHERE vendor_id=145387
    """, ("FP structural_monopoly: INSTITUTO NACIONAL DE CIENCIAS MEDICAS Y NUTRICION SALVADOR "
          "ZUBIRAN — one of Mexico's 12 National Institutes of Health (federal public institution). "
          "Appears as vendor providing specialized laboratory services (HIV viral load, CD4 counts) "
          "to INSABI/IMSS-Bienestar. As the national reference laboratory for HIV diagnostics, "
          "it is structurally the only qualified provider for these specialized tests. 15 contracts "
          "702.1M for clinical laboratory services — legitimate G2G specialized testing.",))

    # Escoda = specialized heritage restoration firm, INAH contracts
    conn.execute("""
        UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
        WHERE vendor_id=45931
    """, ("FP structural_monopoly: ESCODA TECNICAS DE ARQUITECTURA MONUMENTAL SA DE CV — "
          "specialized heritage restoration firm working almost exclusively with INAH on monument "
          "restoration (Catedral Metropolitana, Santa Prisca Taxco, ex-convento Acolman, Becan). "
          "68 contracts 481.5M over 14 years. High SB rate (59%) reflects extremely narrow market "
          "of INAH-qualified heritage restoration specialists — structural specialization, not "
          "bid suppression. Contract descriptions confirm genuine architectural heritage work.",))

    # SYNNEX = TD SYNNEX, major international IT distributor
    conn.execute("""
        UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
        WHERE vendor_id=44429
    """, ("FP structural_monopoly: SYNNEX DE MEXICO SA DE CV — subsidiary of TD SYNNEX "
          "(NYSE: SNX), one of the world's largest technology distributors ($60B+ annual revenue). "
          "39 contracts 1,291.7M including 577.5M for 250,000 digital TVs (SCT 2015), 238M for "
          "80,000 laptops (SEP 2013), 209.8M for tablets (SEP 2014) — large government technology "
          "programs via competitive procurement. DA rate only 18%. International IT distributor "
          "with legitimate government technology procurement at scale. Not corrupt.",))

    print("Marked 5 FPs (all structural_monopoly)")

    # ── Needs review ──────────────────────────────────────────────────────────
    needs_review = {
        18459: (
            "HALCON INTERNACIONAL DE PROYECTOS ECOLOGICOS SA DE CV: 14 contracts 2005-2010, "
            "SB=100%, DA=0%, 157.7M. Water treatment plant construction concentrated at "
            "Comision del Agua del Estado de Mexico (10c, 126.4M). Structure A data — "
            "100% SB is common artifact in 2002-2010 data (0.1% RFC coverage). Company has "
            "legitimate web presence showing water treatment operations in Mexico and Bolivia. "
            "No corruption media coverage. Structure A artifact likely explains SB rate. "
            "Lower priority — needs RFC verification and comparison with other CAEM contractors."
        ),
        1403: (
            "MANDUJANO CONSULTORES SC: 29 contracts 2002-2012, DA=0%, SB=76%, 715.8M. "
            "Outsourcing/staffing for government research institutions (CIATEQ, CIATEC, CIDESI, "
            "SAE, BANSEFI). All Structure A/B data — SB rate may be data quality artifact. "
            "Provides legitimate personnel administration services (recruiting, payroll). "
            "Largest contracts: 191M at Fideicomiso Programa de Mejoramiento (2006), 157M at "
            "BANSEFI (2008). No media corruption coverage. Pre-2012 outsourcing era model. "
            "Lower priority — high SB likely structural or data artifact."
        ),
        53783: (
            "ALFONSO MORAN AGUILAR: 9 contracts 2012-2018, DA=11%, SB=44%, 552.6M. "
            "ANOMALY: Single 540.8M single-bid licitacion publica from Durango SRNMA 2012, "
            "title just 'Adquisiciones' — vague description for a half-billion peso public bid. "
            "Remaining 8 contracts total only 11.9M (plants, trees, construction). "
            "Persona fisica receiving 540M in a public bid is extremely unusual. "
            "PRIORITY: Verify if the 540.8M contract is a decimal error (should be 5.4M?) "
            "or genuine — if confirmed, reclassify as GT (persona fisica institutional capture). "
            "Check Durango SRNMA procurement records for this contract."
        ),
        238809: (
            "LATINOAMERICANA AGUA Y MEDIO AMBIENTE SA DE CV: 15 contracts, DA=20%, SB=80%, "
            "561.9M. Water and environmental infrastructure (hydraulic engineering, water "
            "treatment plants). Based in Queretaro, legitimate web presence, registered in "
            "Jalisco procurement. Operates in specialized niche (water treatment infrastructure) "
            "where few qualified competitors exist — SB rate may reflect market structure. "
            "No corruption media coverage. Needs investigation of whether the SB wins are "
            "geographic/technical monopoly or bid suppression."
        ),
        306026: (
            "ELECTRONICS FOR MEDICINE SA DE CV: 2 contracts, DA=50%, SB=50%, 126.9M. "
            "RFC EFM950213MF7 (incorporated 1995). Main contract: 126.7M single-bid for "
            "'servicio de laboratorio por prueba realizada' at Secretaria de Salud Guerrero. "
            "Too few contracts to establish pattern. Name suggests medical electronics. "
            "Outsourced clinical laboratory at state health secretariat could be legitimate. "
            "Insufficient evidence to classify. Lower priority."
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

    for offset in range(5):
        case_str = f"CASE-{next_id + offset}"
        row = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()
        if not row:
            continue
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {row[0][:65]} | {n_v}v | {n_c}c")

    conn.close()
    print("\nDone. Cases 573-577 inserted.")


if __name__ == "__main__":
    run()
