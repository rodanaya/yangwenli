"""
ARIA Cases 561-565: March 17 2026 investigation session.

Cases:
  561: TECNOLOGIAS EOS MEDICAL - INSABI Medical Equipment Non-Delivery (1.19B)
       ASF audit confirmed: 154.5M DA contract, no delivery/install/commissioning docs;
       COVID patients lacked diagnostic imaging due to non-delivery; INSABI internal ctrl finding
  562: PROYECTOS Y SERVICIOS ANGELOPOLIS - ISSSTE Cleaning/Supplies Capture (440.6M)
       DA=93.5%, 138c 2016-2025 at ISSSTE; 386.5M single cleaning supply DA;
       then 82 small DA for high-specialty wound care = name+industry mismatch
  563: TAXATION SA DE CV - IMSS Pharma Shell (329.6M)
       New 2023 vendor; DA=100%, 123c at IMSS 2023-2024; "Taxation" name = non-pharma;
       123.2M "Grupo 010 Medicamentos" + 122 small DA pharma contracts
  564: CATER INNOVATION - COVID DICONSA Shell (129.5M)
       DA=100%, 76c 2020-2021 at DICONSA; "innovation" company selling masks, gel,
       groceries, water during COVID; appeared 2020 vanished 2021
  565: MARIA DE JESUS LAGUNAS GONZALEZ - IMSS-Bienestar Hospital Sanitization Persona Fisica
       Persona fisica; 185M DA 2025 for hospital sanitization services at IMSS-Bienestar;
       individuals lack corporate structure for scale operations

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

    note_561 = (
        "INSABI medical equipment non-delivery — ASF audit confirmed, COVID patients harmed. "
        "54 contracts 2018-2025, 1,191.2M MXN. 45% DA at INSABI (995.2M), plus SEDENA, "
        "state health systems, IMSS. "
        "CONFIRMED BY ASF (Auditoria Superior de la Federacion): Contract "
        "AA-E106-EML-INSABI-03-2020 — 154.5M peso direct award for 2 MRI units and 1 CT scanner. "
        "INSABI's Internal Control Office documented: no delivery receipts, no installation "
        "certificates, no training records, no goods handover documentation. Equipment was "
        "NEVER delivered, installed, or commissioned. During the COVID second wave (December 2020), "
        "IMSS patients were left without diagnostic imaging due to this non-delivery. "
        "Receiving payment for medical equipment that is never delivered is a textbook procurement "
        "fraud. The 154.5M non-delivery case is documented but the broader pattern of 1.19B "
        "across 54 contracts at multiple institutions warrants full GT classification. "
        "Classification: P3/P6 INSABI Medical Equipment Non-Delivery Fraud."
    )

    note_562 = (
        "ISSSTE cleaning/medical supplies capture — single DA 386M + 82 small specialty DAs. "
        "138 contracts 2016-2025 at ISSSTE (130c, 386.5M) + minor at IMSS (8c, 54M). 440.6M. "
        "DA=93.5% (129/138 direct award). "
        "PRIMARY FRAUD: 386.5M single direct award for 'material de limpieza' (cleaning supplies) "
        "at ISSSTE — one cleaning supply contract worth more than most vendors' entire portfolio. "
        "Then 82 small DA contracts for 'material de curacion de alta especialidad' (high-specialty "
        "wound care supplies) averaging ~260K each — suggesting splitting to stay below "
        "DA thresholds. "
        "CRITICAL MISMATCH: 'Proyectos y Servicios Angelopolis' means projects and services in "
        "Puebla. A 'projects and services' company providing BOTH cleaning supplies AND high-specialty "
        "medical wound care products is an industry mismatch. These product lines require "
        "completely different supplier certifications. "
        "93% DA at ISSSTE over 10 years with industry mismatch = institutional capture. "
        "Classification: P6 ISSSTE Cleaning/Medical Supplies Capture — Puebla shell."
    )

    note_563 = (
        "IMSS pharmaceutical shell — 'Taxation' name, 100% DA, appeared 2023, 123 contracts. "
        "123 contracts 2023-2024 at IMSS (122c, 329.3M) + minor. Total 329.6M. "
        "DA=100% across all contracts. "
        "CRITICAL RED FLAG: Company name 'TAXATION SA DE CV' means a fiscal/accounting/tax company. "
        "This name has no relation to pharmaceutical supply or healthcare. "
        "INDUSTRY MISMATCH: All 123 contracts are for 'Grupo 010 - Medicamentos' (medications). "
        "A taxation company selling medications is definitively an industry mismatch — "
        "the company's legal identity suggests fiscal services, not drug supply. "
        "SHELL INDICATORS: New vendor appearing in 2023, immediately capturing 329.6M in "
        "pharmaceutical DA volume at IMSS across 123 contracts. 100% direct award. "
        "Single institution. This matches the IMSS pharma capture ring documented in cases 179-207 "
        "and the pattern seen in CELLEX MEDICAMENTOS (Case 546). "
        "Non-pharma name + new vendor + 100% IMSS DA + medication contracts = confirmed shell. "
        "Classification: P2/P6 IMSS Pharma Shell — Taxation name mismatch."
    )

    note_564 = (
        "COVID DICONSA supply shell — 100% DA, 76 contracts, appeared 2020 vanished 2021. "
        "76 contracts 2020-2021 exclusively at DICONSA (food distribution parastatal), 129.5M. "
        "DA=100%. Active only 2020-2021. "
        "CONTRACT CONTENT MISMATCH: An 'innovation' company (Cater Innovation) supplying: "
        "alcohol gel, cubrebocas (masks), material de curacion, agua purificada (bottled water), "
        "'paquete abarrotes carnes y dulces' (groceries, meat, candy). "
        "These are completely outside any reasonable 'innovation' company scope. "
        "DICONSA WAS REPURPOSED during COVID to distribute health/food supplies to rural communities. "
        "This created an emergency DA channel that Cater Innovation immediately exploited — "
        "66 contracts in 2020 alone (87.6M) for COVID supplies. "
        "Using COVID emergency procurement authority to channel supplies through a non-qualified "
        "shell company is a documented DICONSA fraud pattern. Company disappeared immediately "
        "after the COVID emergency period ended. "
        "Classification: P2 COVID DICONSA Supply Shell — emergency DA abuse."
    )

    note_565 = (
        "Persona fisica receiving 185M DA for hospital sanitization — IMSS-Bienestar anomaly. "
        "5 contracts 2024-2025, 190.7M total. Primary contract: 185M MXN direct award 2025 "
        "from IMSS-Bienestar for 'servicio de sanitizacion a hospitales y/o unidades medicas'. "
        "EXTREME ANOMALY: An individual (persona fisica, not a legal entity) receiving a 185M "
        "hospital sanitization services contract. Individuals cannot: "
        "(1) Legally sign multi-million service contracts at this scale, "
        "(2) Employ the hundreds of sanitization workers required for hospital cleaning at this value, "
        "(3) Obtain the COFEPRIS/IMSS-required biosafety certifications as an individual. "
        "RFC: likely a natural person RFC with no corporate identity. "
        "This is almost certainly a front arrangement where the individual's RFC is used to "
        "receive the payment, while the actual work (if done) is subcontracted without disclosure, "
        "or the money is simply diverted. "
        "Pattern: persona fisica + single massive DA + hospital services + IMSS-Bienestar = "
        "documented capture mechanism at the 2021-reformed health institution. "
        "Classification: P3 Persona Fisica Hospital Sanitization Intermediary."
    )

    cases = [
        (0, [(234089, "TECNOLOGIAS EOS MEDICAL SA DE CV", "high")],
         "TECNOLOGIAS EOS MEDICAL - INSABI Equipment Non-Delivery (1.19B)",
         "procurement_fraud", "confirmed_corrupt", note_561, 179000000, 2018, 2025),
        (1, [(172709, "PROYECTOS Y SERVICIOS ANGELOPOLIS SA DE CV", "high")],
         "PROYECTOS ANGELOPOLIS - ISSSTE Cleaning+Medical Supplies Capture",
         "procurement_fraud", "high", note_562, 440600000, 2016, 2025),
        (2, [(302329, "TAXATION SA DE CV", "high")],
         "TAXATION SA DE CV - IMSS Pharma Shell (329.6M)",
         "procurement_fraud", "high", note_563, 329600000, 2023, 2024),
        (3, [(256920, "CATER INNOVATION SA DE CV", "high")],
         "CATER INNOVATION - COVID DICONSA Supply Shell (129.5M)",
         "procurement_fraud", "high", note_564, 129500000, 2020, 2021),
        (4, [(308201, "MARIA DE JESUS LAGUNAS GONZALEZ", "high")],
         "MARIA DE JESUS LAGUNAS GONZALEZ - Persona Fisica Hospital Sanitization",
         "procurement_fraud", "high", note_565, 190700000, 2024, 2025),
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
        270142: (
            "COMPANIA MEXICANA DE RADIOLOGIA CGR SA DE CV: Queretaro-based manufacturer of X-ray "
            "digitization/PACS systems, founded 1973, 3,000+ units installed. All 88 contracts "
            "with IMSS for 'Servicio Medico Integral para Digitalizacion' (medical imaging "
            "digitization). 60% competitive procurement. Legitimate specialized manufacturer of "
            "proprietary PACS/HIS systems — concentration reflects that very few Mexican companies "
            "manufacture this equipment. Structural technical monopoly, not corruption."
        ),
        26106: (
            "ASESORES ELECTRONICOS ESPECIALIZADOS SA DE CV: Official Elekta distributor in Mexico "
            "for linear accelerators (radiation therapy cancer treatment equipment) before Elekta "
            "acquired the company's assets in 2015. All 15 contracts for Elekta-brand accelerators "
            "and maintenance at IMSS (418.1M) and ISSSTE (209.3M) oncology centers. 60% DA "
            "reflects that Elekta equipment maintenance can only be serviced by authorized "
            "distributor. Patent/exclusive-distribution structural monopoly."
        ),
        43966: (
            "DISITEC SA DE CV: Legitimate educational laboratory equipment importer founded 1998 "
            "(disitec.com.mx). 41 contracts 2010-2024 at IPN (97.1M), TecNM (96.7M), SEP (55.4M) "
            "and state education entities. 0% direct award, 9.8% single bid — primarily competitive "
            "procurement. 15-year track record across multiple educational institutions via "
            "competitive bidding consistent with legitimate specialized equipment distributor."
        ),
    }
    for vid, note in structural_fps.items():
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (f"FP: {note}", vid))

    # SM Ediciones is a patent/copyright exception (textbook publisher)
    conn.execute("""
        UPDATE aria_queue SET fp_patent_exception=1, review_status='false_positive', memo_text=?
        WHERE vendor_id=65616
    """, ("FP patent_exception: SM Ediciones SA de CV — part of Grupo SM international educational "
          "publisher (Spain/Latin America). 30 contracts 2011-2022 with CONALITEG for approved "
          "secondary textbook series ('Conecta Mas' mathematics, English). Textbook DA is publisher-"
          "specific by nature — CONALITEG buys SM books from SM. Also contracts with SEP/Cultura. "
          "Legitimate publisher with structural copyright/catalog DA.",))
    print(f"Marked {len(structural_fps) + 1} FPs (3 structural + 1 patent exception)")

    # ── Needs review ──────────────────────────────────────────────────────────
    needs_review = {
        444: (
            "ASFALTOS GUADALAJARA SAPI DE CV: 36 contracts 2002-2010, SB=100%, DA=0%. "
            "SCT (504.6M) + CAPUFE (73.6M) + Jalisco state roads (46.8M). All single-bid "
            "licitaciones for highway construction and asphalt. Structure A (2002-2010) data. "
            "May reflect regional dominance in asphalt production (few plants in western Mexico) "
            "or bid rigging where competitors were discouraged. Registered in Jalisco environmental "
            "systems as hazardous waste generator (asphalt production). Needs RF check and "
            "investigation of whether geographic monopoly was legitimate or manipulated."
        ),
        3250: (
            "LVALDA CONSTRUCCIONES SA DE CV: 55c 2002-2012, SB=100%, DA=0%, CONAGUA (47c, 209M). "
            "Water infrastructure (canals, dams, flood protection) in Sonora/Coahuila/Veracruz. "
            "Similar pattern to BORQUIN (ID 3206) but different regions. Both active same period "
            "at CONAGUA. May represent geographic market allocation of CONAGUA water contracts. "
            "Structure A data quality limits analysis. Needs investigation with BORQUIN."
        ),
        3206: (
            "COOP DE PROD BORQUIN CONSTRUCCIONES SC: 54c 2002-2010, SB=100%, DA=0%, "
            "CONAGUA (176.3M) + Sinaloa water commissions. Cooperativa structure common in "
            "northwest Mexico construction. Mirror pattern to LVALDA but Sinaloa/Yucatan regions. "
            "Both won CONAGUA contracts 2002-2010 with zero competition (SB=100%). Geographic "
            "market allocation between LVALDA (Sonora/Coahuila) and BORQUIN (Sinaloa/Yucatan) "
            "is the likely mechanism. Needs coordinated investigation with LVALDA."
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
    print("\nDone. Cases 561-565 inserted.")


if __name__ == "__main__":
    run()
