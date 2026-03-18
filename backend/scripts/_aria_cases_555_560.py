"""
ARIA Cases 555-560: March 17 2026 investigation session.

Cases:
  555: EMPACADORA LA MERCED - SEGALMEX Food Fraud (628M)
       DA=92.7%, 55c 2014-2025, DICONSA+SEGALMEX; ordered 113.8M "shredded meat" not sold;
       identified in press as SEGALMEX fraud ecosystem participant
  556: ARKADIARIUM - SFP-Sanctioned Outsourcing Shell (528M)
       RFC ARK1907013D5, 7c 2023, SB=85.7%; SFP ban 2.5yr + 1.49M fine for false documents;
       INIFAP 286M + BANOBRAS 128M simulated auctions for "personal especializado"
  557: GRUPO VICENTE SUAREZ 73 - SEGALMEX Shell/Money Laundering (490M)
       FGR confirmed 3rd-level shell; 3c 2019-2020 DICONSA 100%DA; 140M dairy fraud;
       54 arrest warrants; Alejandro Puente Cordova + Movimiento Ciudadano connections
  558: PRODUCTORA AGRIMEX - DICONSA Missing Corn FGR Investigation (320M)
       RFC unknown; 5c 2016-2022 DICONSA 100%; FGR investigation opened; missing inventory
       reports; 40M paid without proof of stored corn; grain warehousing fraud
  559: ADMINISTRACIONES KASAI - CONADE IT Monopoly FGR/SFP Investigation (528M)
       RFC AKA131127GI0; 3c 2023-2025 CONADE 99.9% DA; FGR+SFP dual investigation;
       407M IT systems contract; CONADE services cut off in 2025 over payment disputes
  560: TRANSPORTES JUAN PABLO - LICONSA Conflict of Interest Missing Milk (317M)
       100% LICONSA; partners = relatives of LICONSA Guanajuato administrator;
       confirmed by Federal Comptroller; 2.5M liters missing 2010-2014 (187M collected,
       184M transferred)

Also: Add vendor 95347 (MEDI ACCESS SAPI duplicate) to existing case 191.

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

    note_555 = (
        "SEGALMEX food supply fraud — ordered products vendor doesn't sell, missing deliveries. "
        "55 contracts 2014-2025 at DICONSA (38c, 435M) + SEGALMEX (17c, 193M). Total 628M. "
        "DA=92.7% (51/55 direct award). 2014-2025. "
        "Contract content: food packaging and meat products for rural distribution programs. "
        "CRITICAL EVIDENCE: SEGALMEX/LICONSA ordered 113.8M pesos worth of 'shredded meat' "
        "(carne deshebrada) from Empacadora La Merced despite the company not selling this product. "
        "Company received 12.9M but only delivered 10.2M pesos worth of actual products — "
        "documented shortfall of ~2.7M in one verified audit instance. "
        "Identified in investigative press coverage as participant in the SEGALMEX fraud ecosystem. "
        "SEGALMEX is already Case 2 in ground truth; this vendor is a satellite supplier in the "
        "same criminal network, receiving DA contracts for products it does not actually supply. "
        "Classification: P6 SEGALMEX Food Supply Fraud."
    )

    note_556 = (
        "SFP-sanctioned outsourcing shell — false documents, simulated auctions. "
        "RFC: ARK1907013D5 (founded July 2019). 7 contracts in 2023 only, 528M MXN. "
        "SB=85.7% (6/7 single-bid licitaciones). All contracts for 'servicios de personal "
        "especializado' (outsourced staff) at federal agencies. "
        "Major contracts: INIFAP 286M + 25M, BANOBRAS 128M, CICESE 60M, BANCOMEXT 24M. "
        "CONFIRMED SANCTION: Secretaria de la Funcion Publica (SFP) sanctioned ARKADIARIUM with "
        "(1) 2.5-year ban from all federal public contracting, and "
        "(2) 1.49M MXN economic fine "
        "for submitting false documents in bidding processes and conducting simulated auctions. "
        "The SFP sanction is definitive documentary evidence of procurement fraud. "
        "Company appears one year in federal data (2023), wins 528M across 5 major institutions "
        "via single-bid procedures, then gets banned. Classic hit-and-run outsourcing shell. "
        "Classification: P2/P3 SFP-Sanctioned Outsourcing Shell — confirmed false documents."
    )

    note_557 = (
        "SEGALMEX third-level shell / money laundering — FGR confirmed, 54 arrest warrants. "
        "3 contracts 2019-2020 at DICONSA exclusively, 490M MXN. DA=100%. "
        "CONFIRMED by FGR (Fiscalia General de la Republica): Grupo Vicente Suarez 73 SA de CV "
        "was a third-level shell company in the SEGALMEX criminal organization. "
        "Used 'at least a dozen microenterprises and personal bank accounts' to disperse funds "
        "from simulated dairy product sales. LICONSA paid 140M+ pesos for dairy processing "
        "services — SEGALMEX never received the products. "
        "Behind the company: Alejandro Puente Cordova, with connections to Movimiento Ciudadano "
        "political party. FGR issued 54 arrest warrants in the broader SEGALMEX investigation "
        "of which this company is a documented node. "
        "Extraordinary evidence: this is among the most conclusively documented fraud cases in "
        "this investigation — federal prosecutor confirms shell company status, money laundering, "
        "and simulated transactions. "
        "Classification: P2 SEGALMEX Confirmed Money Laundering Shell."
    )

    note_558 = (
        "DICONSA grain warehouse fraud — FGR investigation, missing corn, no inventory reports. "
        "5 contracts 2016-2022 at DICONSA exclusively, 320M MXN. DA=80%. "
        "Contract content: 'deposito mercantil' — grain storage and custody services at "
        "Totalco (Veracruz), Atlacomulco (Estado de Mexico), and San Cristobal (Chiapas). "
        "CONFIRMED by FGR investigation: auditors found most documentation proving grain storage "
        "was missing. The company did not submit required weekly inventory reports to DICONSA. "
        "Despite having no proof of where the corn was actually stored, DICONSA paid approximately "
        "40M MXN under the contract. Resulted in missing tons of corn and documented losses over "
        "90M pesos. "
        "Pattern: secure grain custody contract via DA → don't submit inventory reports → "
        "collect payment without actually storing the grain → corn disappears. "
        "FGR opened criminal investigation. "
        "Classification: P6 DICONSA Missing Corn Warehouse Fraud."
    )

    note_559 = (
        "CONADE IT monopoly — FGR and SFP dual investigation, internet cut off. "
        "RFC: AKA131127GI0 (founded November 2013). 3 contracts 2023-2025 at CONADE "
        "(Comision Nacional de Cultura Fisica y Deporte), 528M MXN. DA=66.7%. "
        "Primary contract: 407M MXN direct award for IT systems and cloud infrastructure at CONADE. "
        "Additional 119-139M contract for January-June 2025 extension. "
        "CONFIRMED INVESTIGATIONS: (1) FGR (Fiscalia General de la Republica) opened criminal "
        "investigation for irregularities in the CONADE IT contract. "
        "(2) SFP (Secretaria de la Funcion Publica) launched parallel administrative investigation. "
        "(3) In 2025, CONADE's telephone and internet services were suspended due to unpaid bills "
        "— suggesting the IT vendor did not actually deliver functioning services despite "
        "receiving 407M in payments. "
        "Dual FGR/SFP investigation of a single IT contract at a sports commission is among the "
        "strongest confirmation signals available short of a conviction. "
        "Classification: P6 CONADE IT Monopoly — FGR/SFP Confirmed."
    )

    note_560 = (
        "LICONSA milk transport conflict of interest — official family ties, 2.5M liters missing. "
        "33 contracts 2014-2025 at LICONSA exclusively, 317M MXN. DA=48.5%. "
        "Contract content: 'recoleccion y transporte de leche fresca' — fresh milk collection "
        "and transport from farms to LICONSA processing plants in Guanajuato. "
        "CONFIRMED BY FEDERAL COMPTROLLER (SFP) and LICONSA's Internal Control Office: "
        "the company's partners were identified as direct relatives of the LICONSA Guanajuato "
        "regional administrator — a textbook procurement conflict of interest. "
        "FINANCIAL FRAUD: During 2010-2014, the company claimed to collect 187 million liters "
        "of fresh milk but only 184 million liters were actually transferred to LICONSA facilities "
        "— 2.5 million liters unaccounted for (presumed stolen or sold to other buyers). "
        "Documented in investigative journalism piece 'Transa con Liconsa' "
        "(contralacorrupcion.mx). "
        "LICONSA is already confirmed in the SEGALMEX ecosystem. This case adds the conflict "
        "of interest and disappearing milk documentation to the LICONSA fraud picture. "
        "Classification: P6 LICONSA Conflict of Interest — Official Family Ties + Missing Milk."
    )

    cases = [
        (0, [(131410, "EMPACADORA LA MERCED SA DE CV", "high")],
         "EMPACADORA LA MERCED - SEGALMEX Food Fraud (628M)",
         "procurement_fraud", "high", note_555, 628000000, 2014, 2025),
        (1, [(291636, "ARKADIARIUM SA DE CV", "high")],
         "ARKADIARIUM - SFP-Sanctioned Outsourcing Shell (528M)",
         "procurement_fraud", "confirmed_corrupt", note_556, 528000000, 2023, 2023),
        (2, [(240796, "GRUPO VICENTE SUAREZ 73 SA DE CV", "high")],
         "GRUPO VICENTE SUAREZ 73 - SEGALMEX Money Laundering Shell",
         "procurement_fraud", "confirmed_corrupt", note_557, 490000000, 2019, 2020),
        (3, [(173733, "PRODUCTORA AGRIMEX SPR DE RL", "high")],
         "PRODUCTORA AGRIMEX - DICONSA Missing Corn FGR Investigation",
         "procurement_fraud", "confirmed_corrupt", note_558, 320000000, 2016, 2022),
        (4, [(291504, "ADMINISTRACIONES KASAI SA DE CV", "high")],
         "ADMINISTRACIONES KASAI - CONADE IT Monopoly FGR/SFP Investigation",
         "procurement_fraud", "confirmed_corrupt", note_559, 528000000, 2023, 2025),
        (5, [(136158, "TRANSPORTES JUAN PABLO SA DE CV", "high")],
         "TRANSPORTES JUAN PABLO - LICONSA COI Family Ties + Missing Milk",
         "procurement_fraud", "confirmed_corrupt", note_560, 317000000, 2014, 2025),
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

    # ── Add vendor 95347 to existing case 191 (MEDI ACCESS duplicate) ─────────
    # Case 191 uses integer case_id format (old-style)
    existing_case = conn.execute(
        "SELECT id, case_id, case_name FROM ground_truth_cases WHERE id=191"
    ).fetchone()
    if existing_case:
        old_case_id = existing_case[1]  # 'MEDI_ACCESS_SAE_CONTRATOS_OPACOS_100DA_2013'
        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?,?,?,?,?)
        """, (old_case_id, 95347, "MEDI ACCESS, S.A.P.I. DE C.V.", "high", "aria_investigation"))
        # Tag contracts
        c_rows = conn.execute("SELECT id FROM contracts WHERE vendor_id=95347").fetchall()
        for row in c_rows:
            conn.execute(
                "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                (old_case_id, row[0])
            )
        conn.execute("""
            UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
            WHERE vendor_id=95347
        """, (f"GT Case 191 (duplicate vendor): {existing_case[2][:80]}",))
        n2 = len(c_rows)
        print(f"Added vendor 95347 to case 191 ({existing_case[2][:50]}) — tagged {n2} contracts")
    else:
        print("WARNING: Case 191 not found!")

    # ── False positives ────────────────────────────────────────────────────────
    structural_fps = {
        28575: (
            "ESPECIFICOS STENDHAL SA DE CV: Legitimate Mexican pharmaceutical manufacturer founded "
            "1974 (51+ years). Part of Grupo Arfeldt (11 subsidiaries, operations in 8 countries). "
            "Specializes in HIV/antiretroviral medications (efavirenz, emtricitabina, tenofovir, "
            "abacavir). Received CETIFARMA transparency award 2010 and CONCAMIN ethics award 2012. "
            "IDB Invest (Inter-American Development Bank) has invested in the company. "
            "145 contracts 2006-2025 across 22 distinct health institutions (IMSS, CENSIDA, SSA, "
            "INSABI, INER, etc.). 867.9M total. 63.5% DA typical for patented ARV medications "
            "(sole-source by patent/technical specification). Broad institutional diversity (22 "
            "institutions) and competitive wins confirm legitimate pharmaceutical operations. "
            "Anti-corruption awards and development bank investment confirm good governance. "
            "Legitimate established pharmaceutical manufacturer — structural patent monopoly."
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
        83473: (
            "MEDICA SANTA CARMEN S DE RL DE CV: 3.04B MXN, 125c 2010-2025, 96% at IMSS, "
            "DA=63.2%, SB=16.8%. Specializes in outsourced hemodialysis services at IMSS. "
            "Has real website and provides actual patient services. Web research reveals history "
            "of irregularities: lost a bid due to inadequate clinic installations (warehouse near "
            "high-voltage towers), then had contracts re-awarded after replacement company caused "
            "patient deaths. Genuine company providing real services, but IMSS hemodialysis "
            "outsourcing is a documented captured segment. 3B+ over 15 years warrants review."
        ),
        267775: (
            "MATERIALES Y ALMACENES SALE SA DE CV: RFC MAS1802217C9 (founded Feb 2018). "
            "Single 1.3B contract 2020 at Sinaloa municipal government for pump equipment "
            "installation, awarded via single-bid licitacion. A 2-year-old company winning a "
            "1.3B single-bid municipal infrastructure contract in Sinaloa is highly suspicious. "
            "Sinaloa procurement has documented transparency problems. Only 1 contract ever. "
            "No EFOS/SFP flags. Needs RFC verification and municipal procurement audit."
        ),
        257897: (
            "RIMISA MEDICAL SA DE CV: RFC RIM180720CL3 (founded July 2018). 625M, 105c "
            "2020-2025, DA=86.7%, 90.5% at IMSS. Medical supplies (osteosynthesis, endoprosthesis). "
            "New company (2018) that rapidly scaled to 625M at IMSS with very high DA. Website "
            "exists. Matches IMSS medical device capture ring pattern but no EFOS/SFP flags. "
            "Young company + high DA concentration + rapid scaling = suspicious profile."
        ),
        289445: (
            "ARSA ASESORIA INTEGRAL PROFESIONAL S DE RL DE CV: RFC AIP900419FI1 (founded 1990). "
            "486M, 4c 2022-2024, DA=100%. Older company. 245M single DA for IMSS cloud migration, "
            "139M for IPICYT DRP infrastructure. IT cloud/DR contracts can legitimately require DA "
            "due to platform lock-in, but 486M in DA IT contracts from a relatively unknown company "
            "is concerning. No EFOS/SFP flags. Needs deeper investigation of IMSS IT procurement."
        ),
        306167: (
            "EHECATL SISTEMAS Y TECNOLOGIA DE MEXICO SA DE CV: RFC EST130411ET5 (founded 2013). "
            "Single 189M DA contract 2024 at Instituto de Salud del Estado de Mexico (ISEM) for "
            "IT infrastructure. Zero prior procurement history. No web presence found. A company "
            "with no prior federal contracting winning a single 189M DA from a state health "
            "institute is suspicious. Needs investigation of the ISEM procurement and RFC owner."
        ),
        303814: (
            "AMGLOBAL INGENIERIA Y CONSTRUCCION SA DE CV: RFC AIC150521UL8 (founded 2015). "
            "Single 255M single-bid contract 2024 at CONAGUA for canal construction. Single-bid "
            "infrastructure at CONAGUA fits the CONAGUA ghost contractor pattern (14 confirmed GT "
            "cases). 9-year-old company reduces shell concern but CONAGUA single-bid is high-risk. "
            "Needs investigation of the specific hydraulic project and competing bidders."
        ),
        280853: (
            "UNION AGRICOLA REGIONAL DE SINALOA SA DE CV: 105.4M, 2c 2022-2024, DA=100% at "
            "SEGALMEX. Agricultural cooperative purchasing Sinaloa corn for government programs. "
            "SEGALMEX corn purchase via agricultural unions is the normal mechanism for the rural "
            "support program. P2 ghost flag may be inappropriate for a cooperative. However, "
            "SEGALMEX ecosystem is deeply corrupt, and this cooperative may be an intermediary. "
            "Needs investigation of whether corn deliveries were actually made."
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

    for offset in range(6):
        case_str = f"CASE-{next_id + offset}"
        row = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()
        if not row:
            continue
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {row[0][:65]} | {n_v}v | {n_c}c")

    # Verify case 191 update
    n191_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id='MEDI_ACCESS_SAE_CONTRATOS_OPACOS_100DA_2013'").fetchone()[0]
    n191_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id='MEDI_ACCESS_SAE_CONTRATOS_OPACOS_100DA_2013'").fetchone()[0]
    print(f"  Case 191 (MEDI ACCESS): {n191_v}v | {n191_c}c")

    conn.close()
    print("\nDone. Cases 555-560 inserted + vendor 95347 added to case 191.")


if __name__ == "__main__":
    run()
