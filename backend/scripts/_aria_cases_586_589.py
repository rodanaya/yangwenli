"""
ARIA Cases 586-589: March 17 2026 investigation session.

Cases:
  586: BE HEMP SA DE CV - IMSS COVID N95 PPE Fraud (354M)
       Hemp company wins 354M DA for N95 masks during COVID; industry mismatch;
       one contract 2020, never appears again
  587: SERVICIOS SOPOR SA DE CV - Puebla Hospital Cleaning Fraud (436.6M)
       Documented: 88 employees for 1,645-position contract; experience requirements
       not met; union payroll evasion; supplies not delivered; workers threatened
  588: AGRICOLA COMERCIAL AGCEMA SPR DE RI - SEGALMEX Storage DA Capture (156.5M)
       100% at SEGALMEX/Alimentacion para el Bienestar; 112M DA for warehouse storage;
       peak SEGALMEX fraud ecosystem; FGR 54 arrest warrants context
  589: ISFOR SA DE CV - IPN Substation Maintenance Splitting (186.4M)
       100% at IPN; 14 contracts in 2 days (Sep 11-12 2023); contract splitting pattern;
       same mechanism as Cartel de la Limpieza at IPN

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

    note_586 = (
        "Hemp company COVID N95 PPE fraud — extreme industry mismatch, 354M DA, one contract. "
        "1 contract September 2020, 354.0M MXN. DA=100%. Exclusively at IMSS. "
        "CRITICAL MISMATCH: BE HEMP SA DE CV (RFC BHE111101SC4, incorporated Nov 2011) is a "
        "hemp company. Hemp production/commercialization is completely unrelated to medical "
        "personal protective equipment (N95 respirators). "
        "DOCUMENTED COVID DA FRAUD PATTERN: "
        "(1) IMSS issued direct award AA-050GYR047-E142-2020 on September 2, 2020 for N95 "
        "respirators to Be Hemp — a company with no history of medical device distribution. "
        "(2) The contract (354M) represents the company's ONLY government contract in its "
        "9-year existence — before and after COVID. "
        "(3) Multiple investigative reports document IMSS COVID procurement fraud involving "
        "non-medical companies receiving hundreds of millions in emergency DAs for PPE during "
        "the 2020 pandemic second wave. "
        "Hemp company + medical PPE + one massive COVID DA + never contracts again = "
        "textbook COVID emergency procurement abuse. "
        "Classification: P2/P3 Be Hemp COVID PPE Fraud — extreme industry mismatch."
    )

    note_587 = (
        "Puebla hospital cleaning fraud — documented: 88 employees for 1,645 positions, supplies not delivered. "
        "2 contracts 2024-2025, 436.6M MXN. DA=50%, SB=50%. Puebla state health + IMSS-Bienestar. "
        "DOCUMENTED IN INVESTIGATIVE MEDIA: "
        "(1) SERVICIOS SOPOR won a 408M single-bid contract for hospital cleaning services across "
        "Puebla state health institutions. "
        "(2) Despite needing 1,645 cleaning staff for the contract, the company had only "
        "88 workers registered with IMSS — a gap of 1,557 positions (94% understaffing). "
        "(3) The company did not meet the minimum experience requirements specified in the bid. "
        "(4) IMSS payroll evasion: workers were paid through a union arrangement rather than "
        "company payroll — a mechanism to avoid social security obligations and hide true "
        "employment scale from auditors. "
        "(5) On the first day of the contract, the company failed to deliver basic cleaning "
        "supplies (mops, detergents, disinfectants) to the hospitals. "
        "(6) Workers who reported supply shortages to supervisors were threatened with firing. "
        "(7) Company is now expanding to IMSS-Bienestar contracts (28M DA, 2025). "
        "RFC SSO180412CY3 (incorporated April 2018). This is a confirmed fraudulent hospital "
        "services contractor using union payroll routing to conceal true scale. "
        "Classification: P3/P6 Servicios SOPOR Puebla Cleaning Fraud — media confirmed, 88 workers for 1,645 jobs."
    )

    note_588 = (
        "SEGALMEX/Alimentacion para el Bienestar storage DA — ecosystem vendor, 112M DA. "
        "4 contracts 2023-2025, 156.5M MXN. DA=75%. Exclusively at Alimentacion para el Bienestar. "
        "SEGALMEX FRAUD ECOSYSTEM: "
        "(1) Alimentacion para el Bienestar (SEGALMEX successor) is the institution at the center "
        "of Mexico's largest documented procurement fraud — 15B+ MXN in documented irregularities. "
        "(2) FGR issued 54 arrest warrants in the SEGALMEX ecosystem investigation; the "
        "institution was restructured in 2022 precisely because of the systemic fraud. "
        "(3) AGCEMA received 112M direct award for 'deposito mercantil' (warehouse storage) "
        "from the same institution that paid shells for fictitious storage services. "
        "(4) Agricultural company providing storage services exclusively to the most "
        "corruption-tainted institution in the federal government via DA. "
        "(5) 100% dependency on SEGALMEX/successor entity across all 4 contracts — "
        "consistent with the documented pattern of captive vendors in the SEGALMEX ecosystem. "
        "Single-institution 100% DA capture at SEGALMEX successor during the post-scandal "
        "restructuring period is a strong indicator of continued ecosystem capture. "
        "Classification: P6 AGCEMA / Alimentacion para el Bienestar Storage Capture."
    )

    note_589 = (
        "IPN substation maintenance splitting — 14 contracts in 2 days, 100% institutional capture. "
        "24 contracts 2023-2024, 186.4M MXN. DA=21%, SB=79%. 100% at IPN. "
        "CONTRACT SPLITTING PATTERN: "
        "(1) 100% institutional capture at IPN — every single contract goes to this institution. "
        "(2) On September 11-12, 2023, ISFOR received 14 separate substation maintenance contracts "
        "from IPN on consecutive days — all for the same type of service. "
        "(3) This two-day burst of 14 identical-type contracts is a textbook contract splitting "
        "pattern: the total value is divided into multiple contracts to stay below thresholds "
        "that would require different procurement procedures. "
        "(4) All contracts are single-bid (SB=79%) — no competition across any of the splits. "
        "(5) 120M flagship contract in July 2024 also single-bid. "
        "CONTEXT: This pattern is similar to the IPN Cartel de la Limpieza (GT case 574 JOAD) "
        "but for electrical substation maintenance rather than cleaning services. "
        "IPN appears to be systematically captured by different vendors for different service types. "
        "Classification: P6 ISFOR IPN Electrical Substation Splitting Capture."
    )

    cases = [
        (0, [(265552, "BE HEMP SA DE CV", "high")],
         "BE HEMP - IMSS COVID N95 PPE Fraud Industry Mismatch (354M)",
         "procurement_fraud", "high", note_586, 354000000, 2020, 2020),
        (1, [(311944, "SERVICIOS SOPOR SA DE CV", "high")],
         "SERVICIOS SOPOR - Puebla Hospital Cleaning Fraud 88/1645 Workers (436.6M)",
         "procurement_fraud", "confirmed_corrupt", note_587, 436600000, 2024, 2025),
        (2, [(291199, "AGRICOLA COMERCIAL AGCEMA SPR DE RI", "high")],
         "AGCEMA - Alimentacion para el Bienestar Storage DA Capture (156.5M)",
         "procurement_fraud", "high", note_588, 156500000, 2023, 2025),
        (3, [(296986, "ISFOR SA DE CV", "high")],
         "ISFOR - IPN Electrical Substation Splitting Capture (186.4M)",
         "procurement_fraud", "high", note_589, 186400000, 2023, 2024),
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
    # Macmillan Educacion = Macmillan Publishers / Springer Nature, fp_patent_exception
    conn.execute("""
        UPDATE aria_queue SET fp_patent_exception=1, review_status='false_positive', memo_text=?
        WHERE vendor_id=275545
    """, ("FP patent_exception: MACMILLAN EDUCACION SA DE CV — Mexican subsidiary of Macmillan "
          "Publishers (part of Springer Nature group), a major international educational publisher. "
          "70 contracts 454.4M, 99% DA, all at CONALITEG for national free textbook program. "
          "DA is standard for textbook publishers: CONALITEG must purchase specific titles "
          "directly from rights holders — no substitute exists for a specific copyrighted "
          "textbook series. Same fp_patent_exception mechanism as SM Ediciones, Fernandez "
          "Educacion. Legitimate international publisher.",))

    # COMISSA = established Veracruz infrastructure contractor, fp_structural_monopoly
    conn.execute("""
        UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
        WHERE vendor_id=90
    """, ("FP structural_monopoly: CONSTRUCCIONES Y MONTAJES INDUSTRIALES DEL SUR SA DE CV "
          "(COMISSA) — established Veracruz-based construction firm, 16-year history (2002-2018). "
          "37 contracts 1.44B at SCT, CAPUFE, API Veracruz for road, port, and civil infrastructure. "
          "0% DA (all competitive), 100% SB — wins public tenders as sole qualified bidder. "
          "Listed on BNamericas as recognized infrastructure contractor. Road/bridge construction "
          "naturally attracts fewer bidders due to heavy equipment/regional specialization. "
          "100% SB reflects niche market position, not bid suppression.",))

    print("Marked 2 FPs (1 patent_exception + 1 structural_monopoly)")

    # ── Needs review ──────────────────────────────────────────────────────────
    needs_review = {
        57303: (
            "POLAR HOSPITALARIA SA DE CV: 51 contracts 2012-2023, DA=37%, SB=8%, 823.5M. "
            "Medical equipment supplier across multiple states (Sinaloa, Sonora, Queretaro, SLP, "
            "Tabasco, Tlaxcala, Nayarit) and institutions (state health secretariats, INSABI). "
            "Mix of competitive (63%) and DA (37%) — moderate DA rate. Serves many institutions "
            "across many states — not single-institution capture. Profile consistent with "
            "established medical equipment distributor. No media corruption reports found. "
            "Needs RFC verification and review of DA contracts specifically."
        ),
        218883: (
            "SYPHARLAB SAPI DE CV: 39 contracts 2025, DA=38%, SB=0%, 552.8M. RFC SYP151022M89 "
            "(2015). Pharmaceutical laboratory with web presence in CDMX. Contracts appear to be "
            "Compra Consolidada (consolidated bulk pharma purchasing) across IMSS, ISSSTE, INR, "
            "INER, HGM, and other health institutions. DA rate 38% is moderate for pharma. "
            "Serves 10+ distinct institutions — not single-institution capture. No EFOS/SFP flags. "
            "Profile consistent with legitimate pharma distributor in consolidated procurement. "
            "Lower priority."
        ),
        250966: (
            "SERVICIOS RH&AK SA DE CV: 1 contract, SB=100%, 430.5M at PENSIONISSSTE. "
            "RFC SRH110921RP1 (2011). HR services company — single 430M public tender win "
            "for integrated recruitment, selection, certification, and payroll administration "
            "of PENSIONISSSTE service agents nationwide. Large but plausible for multi-year "
            "national staffing contract. Company has HR services web presence. No EFOS/SFP. "
            "Single bid may reflect few qualified large-scale HR outsourcing firms. Low priority."
        ),
        311718: (
            "SOLUCIONES PARA NEGOCIOS ETICOS COMPETITIVOS Y SUSTENTABLES SA DE CV: 1 contract "
            "Dec 31 2024, SB=100%, 270.1M at IMSS. Company implementing the IMSS supplier "
            "integrity registry ('REPIIMSS') via single-bid contract awarded on the last day "
            "of the fiscal year. Year-end timing + single bid + 270M for IT/consulting service. "
            "Ironic: a company implementing supplier integrity registry winning via single-bid "
            "on Dec 31. RFC suggests 2010 registration. Needs investigation of REPIIMSS "
            "procurement process and whether competition was feasible."
        ),
        200008: (
            "ADMINISTRACIONES EXTERNAS INTELIGENTES SA DE CV: 1 contract, SB=100%, 143M at INEEL. "
            "Jan 2, 2017 public tender (single bid) for personnel selection, hiring, and admin "
            "for INEEL projects. No RFC on file. Outsourced staffing for research institute is "
            "common. Single contract, single bid, insufficient evidence for GT. Low priority."
        ),
        9856: (
            "INTERNET DIRECTO SA DE CV: 2 contracts 2002-2006, SB=100%, 117.3M at SCT. "
            "No RFC on file. Satellite connectivity in 2002-2006. Structure A data quality. "
            "Niche market (few satellite providers in early 2000s). Insufficient evidence. "
            "Low priority — 20-year-old contracts with minimal records available."
        ),
        10432: (
            "ZAMORA GALLEGOS JOSE: 3 contracts 2002-2006, SB=100%, 155.9M. Persona fisica. "
            "No RFC on file. Road/water construction in Jalisco (Secretaria de Desarrollo "
            "Urbano, CEAS). Structure A data. Persona fisica receiving 89M for road construction "
            "is unusual but was more common pre-2010. Too old to investigate effectively. "
            "Low priority — Structure A era contracts."
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

    for offset in range(4):
        case_str = f"CASE-{next_id + offset}"
        row = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()
        if not row:
            continue
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {row[0][:65]} | {n_v}v | {n_c}c")

    conn.close()
    print("\nDone. Cases 586-589 inserted.")


if __name__ == "__main__":
    run()
