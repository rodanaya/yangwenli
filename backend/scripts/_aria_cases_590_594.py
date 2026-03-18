"""
ARIA Cases 590-594: March 17 2026 investigation session.

Cases:
  590: VILCORP S DE RL DE CV - IMSS COVID DA Emergency Supplies (350M)
       Small company, single 350M COVID DA at IMSS June 2020 (material de curacion);
       contract ref explicitly mentions SARS-COV-2; never contracts again
  591: OUT MOVEMENT AND LOGISTICS - Diconsa/CONAFE Intermediary (183M)
       Founded 2017, first contract 2021; 120M DA to Diconsa (SEGALMEX ecosystem);
       mixed goods (grocery/pharma/hardware) + bean processing + CONAFE cleaning kits
  592: INFORMATION MANAGEMENT SOLUTIONS SC - LICONSA IT Services DA (142M)
       3 DA contracts 2018 at LICONSA (confirmed Segalmex entity); 74.5M + 52.8M + 14.9M;
       IT development and unified telephony; small SC getting outsized LICONSA DAs
  593: CONSTRUCTORA GORDILLO - Campeche Infrastructure Capture (2.83B)
       91 contracts 2002-2021 at SCT/state/ASA in Campeche; 97% SB (vs 83.9% sector norm);
       20-year regional dominance; regional infrastructure capture
  594: AUTO LINEAS JUAN MANON - LICONSA Milk Transport Capture (689M)
       21 contracts 2011-2025; 100% at LICONSA; same pattern as cases 230/233/512/523/560;
       14 years single-institution concentration in Segalmex-linked paraestatal

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

    note_590 = (
        "IMSS COVID emergency DA abuse — small company, 350M for medical supplies, one contract. "
        "1 contract June 29, 2020, 350.0M MXN. DA=100%. Exclusively at IMSS. "
        "COVID EMERGENCY ABUSE PATTERN: "
        "(1) VILCORP S DE RL DE CV (RFC VIL061207LT5) received a single direct award "
        "of 350M MXN from IMSS on June 29, 2020 for 'material de curacion' (medical supplies). "
        "(2) The contract reference (AA-050GYR047-E186-2020) explicitly mentions SARS-COV-2, "
        "confirming this was awarded under COVID emergency procurement authority. "
        "(3) VILCORP is classified as 'Pequena' (small company) — receiving a 350M contract "
        "for emergency medical supplies is inconsistent with small business capacity. "
        "(4) The company has ZERO other government contracts before or after this award — "
        "it appears in the procurement system exclusively for this one COVID DA. "
        "This pattern is identical to multiple documented IMSS COVID procurement fraud cases: "
        "small/unknown company receives outsized emergency DA for medical supplies under the "
        "SARS-COV-2 justification, then disappears from procurement records. "
        "Classification: P2/P3 VILCORP IMSS COVID Emergency Procurement Fraud."
    )

    note_591 = (
        "Diconsa/CONAFE logistics intermediary — SEGALMEX ecosystem, mixed goods, 183M. "
        "6 contracts 2021-2025, 183.0M MXN. DA=50%, SB=50%. "
        "RFC OML171122AV7 — incorporated November 2017, first contract 2021. "
        "SEGALMEX ECOSYSTEM PATTERN: "
        "(1) The company operates primarily as a Diconsa supplier with 120M in DA contracts "
        "for a diverse mix of goods: groceries, pharmacy products, hardware, stationery, "
        "bean processing services, and packaging materials. "
        "(2) Diconsa (part of the Segalmex ecosystem) is the same institution where "
        "FGR issued 54 arrest warrants for procurement fraud. MCCI documented that suppliers "
        "paid 3% commissions to shell companies for guaranteed contracts during this period. "
        "(3) A logistics company providing such a wide variety of unrelated goods "
        "(groceries + pharmacy + hardware + bean processing) is a P3 intermediary pattern — "
        "the company aggregates diverse procurement needs and likely uses subcontractors. "
        "(4) The CONAFE contracts (cleaning kits via licitacion) provide some evidence of "
        "real operational capacity, but the Diconsa DA concentration is the concern. "
        "New company + Segalmex ecosystem institution + mixed goods DA + P3 pattern = "
        "SEGALMEX-adjacent intermediary capture. "
        "Classification: P3 Out Movement / Diconsa Intermediary — SEGALMEX ecosystem."
    )

    note_592 = (
        "LICONSA IT services DA capture — 3 contracts, 142M, exclusively at confirmed fraud entity. "
        "5 contracts total, 143.9M MXN. DA=80%. Primarily LICONSA (3 DA contracts). "
        "LICONSA FRAUD CONTEXT: "
        "(1) Three direct award contracts to a small sociedad civil (SC) from LICONSA "
        "totaling 142M MXN in 2018: 74.5M + 52.8M + 14.9M. "
        "(2) Services: 'SISTEMA DE ADMINISTRACION' (management system development), "
        "'TELEFONIA UNIFICADA' (unified telephony), and related IT services. "
        "(3) LICONSA is a confirmed Segalmex fraud entity with documented procurement "
        "corruption. DA IT contracts to a small SC during the lead-up period (2018, "
        "before the peak 2019-2023 fraud) is consistent with the Segalmex pattern of "
        "directing contracts to captive suppliers via direct awards. "
        "(4) The remaining contracts: a tiny 130K DA at ProMexico and a 1.5M competitive "
        "award at FIRA — LICONSA represents 99% of this vendor's procurement value. "
        "Small SC + 80% DA + 100% LICONSA concentration + LICONSA fraud context = "
        "Segalmex ecosystem captive IT vendor. "
        "Classification: P6 Information Management Solutions / LICONSA IT DA Capture."
    )

    note_593 = (
        "Campeche infrastructure 20-year monopoly — 97% SB across 91 contracts at SCT/state/ASA. "
        "91 contracts 2002-2021, 2,832.5M MXN. DA=3%, SB=97%. "
        "REGIONAL CAPTURE PATTERN: "
        "(1) Constructora Gordillo has dominated Campeche road, port, and civil infrastructure "
        "contracting for 20 years across 12 institutions: SCT (41c, 1.7B), Campeche state "
        "agencies (29c, 420M), ASA airports (7c, 200M), CAPUFE, and others. "
        "(2) The 97% single-bid rate across 91 competitive licitaciones (not DA) is "
        "13 percentage points above the 83.9% infrastructure sector baseline — sustained "
        "over 20 years, which is the critical anomaly. "
        "(3) Winning 97% of open competitive tenders without rivals across 91 bids over "
        "two decades strongly suggests systematic bid suppression or competitor exclusion "
        "in Campeche state infrastructure procurement. "
        "(4) Campeche infrastructure procurement during this period overlaps with documented "
        "PRI-era procurement capture patterns in southeastern states. "
        "(5) 2.83B over 20 years at one regional construction company = one of the largest "
        "regional infrastructure monopoly cases in the ARIA queue. "
        "Classification: P1/P6 Constructora Gordillo Campeche Infrastructure Monopoly."
    )

    note_594 = (
        "LICONSA milk transport capture — 14 years, 689M, part of documented SEGALMEX ring. "
        "21 contracts 2011-2025, 689.2M MXN. DA=33%, SB=0%. 100% at LICONSA. "
        "LICONSA TRANSPORT RING: "
        "(1) Auto Lineas Juan Mañon has provided milk transportation and distribution "
        "services exclusively to LICONSA for 14 consecutive years (2011-2025). "
        "(2) This vendor is part of the documented LICONSA transport ecosystem where "
        "multiple peer companies have already been confirmed as fraud cases: "
        "Transliquidos (case 230), Alfonso Nava transport persona fisica (case 233), "
        "Mercedes Linares transport (case 512), Grupo Fros (case 523), "
        "and Transportes Juan Pablo (case 560 — LICONSA conflict of interest, relatives). "
        "(3) The broader pattern: LICONSA milk transport was systematically captured by "
        "a network of captive transport companies, several with documented family ties "
        "to LICONSA administrators, missing milk reports, and Segalmex-era fraud. "
        "(4) 100% single-institution concentration at LICONSA over 14 years = "
        "textbook P6 institutional capture in a confirmed fraud ecosystem. "
        "Classification: P6 Auto Lineas Juan Mañon / LICONSA Transport Ring."
    )

    cases = [
        (0, [(265582, "VILCORP S DE RL DE CV", "high")],
         "VILCORP - IMSS COVID Emergency DA Medical Supplies (350M)",
         "procurement_fraud", "high", note_590, 350000000, 2020, 2020),
        (1, [(277199, "OUT MOVEMENT AND LOGISTICS SA DE CV", "high")],
         "OUT MOVEMENT - Diconsa SEGALMEX Intermediary Mixed Goods (183M)",
         "procurement_fraud", "high", note_591, 183000000, 2021, 2025),
        (2, [(145866, "INFORMATION MANAGEMENT SOLUTIONS SC", "high")],
         "INFO MGMT SOLUTIONS - LICONSA IT Services DA Capture (142M)",
         "procurement_fraud", "high", note_592, 142000000, 2018, 2018),
        (3, [(438, "CONSTRUCTORA GORDILLO SA DE CV", "high")],
         "CONSTRUCTORA GORDILLO - Campeche Infrastructure Monopoly 97%SB (2.83B)",
         "procurement_fraud", "high", note_593, 2832000000, 2002, 2021),
        (4, [(68238, "AUTO LINEAS JUAN MANON SA DE CV", "high")],
         "AUTO LINEAS JUAN MANON - LICONSA Milk Transport Ring (689M)",
         "procurement_fraud", "high", note_594, 689000000, 2011, 2025),
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
    # Guardiola Siller = data error (99.995M for UPS unit worth 5-20K)
    conn.execute("""
        UPDATE aria_queue SET fp_data_error=1, review_status='false_positive', memo_text=?
        WHERE vendor_id=105407
    """, ("FP data_error: MARCO ANTONIO GUARDIOLA SILLER — persona fisica at CINVESTAV-IPN. "
          "8 routine maintenance contracts (125K-95K MXN) plus one 99.995M contract on "
          "Dec 31 2013 for 'UPS para rack 2.4 KVA' (rack UPS unit). A 2.4 KVA rack UPS "
          "costs 5,000-20,000 MXN, not 99.995M. This is a decimal error — correct amount "
          "is 99,995 MXN (99.995K). Same magnitude as all other vendor contracts. "
          "Data artifact inflates vendor total to 100M.",))

    # Young & Rubicam = WPP global advertising agency, fp_structural_monopoly
    conn.execute("""
        UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
        WHERE vendor_id=12876
    """, ("FP structural_monopoly: YOUNG AND RUBICAM S DE RL DE CV — Mexican subsidiary of "
          "Y&R Brands (WPP Group, world's largest advertising company). 5 contracts 744.9M "
          "for Mexico tourism promotion campaigns (SECTUR/CPTM) in US/Canada markets. "
          "Global advertising agency at tourism promotion institution — same structure as "
          "Starcom/Publicis and Havas/Vivendi (already flagged FP). AOR framework: government "
          "selects one agency per campaign cycle, explaining single-source concentration. "
          "International multinational, legitimate advertising market position.",))

    print("Marked 2 FPs (1 data_error + 1 structural_monopoly)")

    # ── Needs review ──────────────────────────────────────────────────────────
    needs_review = {
        11827: (
            "INGENIERIA SANITARIA MEXICANA SA DE CV: 12 contracts 2003-2008, DA=0%, SB=100%, "
            "335.8M across 8 state water commissions. Specialist in potabilizadoras (drinking "
            "water plants) and wastewater treatment construction. Won 100% of competitive "
            "licitaciones as sole bidder -- but specialization in design-build water treatment "
            "plants limits competitor pool. Multiple institutions across 6 years. No EFOS/SFP. "
            "Low suspicion. Legitimate water treatment engineering niche."
        ),
        38868: (
            "VALLE VIAJES Y MARATHONES SA DE CV: 42 contracts 2009-2016, DA=52%, SB=38%, 140.9M. "
            "Travel agency providing air ticket services to 13 government institutions (CONACYT, "
            "research institutes). Sector classified as 'tecnologia' due to CONACYT institutional "
            "mapping -- actually provides standard travel services. 7-year track record across "
            "13 institutions. Normal contract mix for travel agency. IPS driven by price "
            "volatility (travel costs vary by destination). Not suspicious."
        ),
        295715: (
            "GLOBAL MEXICANA DE INFRAESTRUCTURA SAPI DE CV: 1 contract 2023, SB=100%, 369.5M "
            "at Instituto Nacional de Cardiologia for hospital construction via licitacion publica. "
            "SAPI (investment vehicle) for infrastructure, 18 years old (RFC GMI0502243C4). "
            "Single large public works contract, won open competitive bid. One contract "
            "insufficient to establish fraud pattern. Low suspicion."
        ),
        30192: (
            "INGENIERIA MEXICANA DEL SURESTE SA DE CV: 30 contracts 2007-2025, DA=13%, SB=87%, "
            "323M at CONAGUA (93% concentration) in SE Mexico (Tabasco, Oaxaca). Hydraulic "
            "infrastructure specialist. 87% SB only slightly above 83.9% infrastructure sector "
            "norm. 18-year track record across multiple CONAGUA regional offices. Geographic "
            "specialization in Tabasco flood control plausible. Low suspicion."
        ),
        218706: (
            "IMPREGRAFICA DIGITAL SA DE CV: 28 contracts 2018-2025, DA=61%, SB=14%, 274.1M. "
            "Printing company supplying CONALITEG (109M), CONAFE (128M), Talleres Graficos (20M), "
            "Impresora Progreso (17M). Part of textbook/educational materials printing ecosystem. "
            "RFC IDI130207M58 (2013). Not in existing CONALITEG GT case 249. DA rate elevated "
            "but some DA volume comes from G2G supply chain (Talleres Graficos, Progreso). "
            "Needs review for potential addition to CONALITEG ecosystem case."
        ),
        1400: (
            "FEDERAL QUIMICA SA DE CV: 69 contracts 2002-2023, DA=59%, SB=12%, 162.3M across "
            "9 institutions. Core: operating laboratory at CONAGUA's Planta Potabilizadora "
            "'Los Berros' (Cutzamala system, Mexico City main water supply). 21-year relationship "
            "with recurring multi-year lab service contracts. DA reflects specialized instrumentation "
            "for critical infrastructure lab (few alternatives). Legitimate specialized vendor "
            "for CONAGUA critical water system. Low suspicion."
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
    print("\nDone. Cases 590-594 inserted.")


if __name__ == "__main__":
    run()
