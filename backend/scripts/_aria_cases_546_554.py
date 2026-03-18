"""
ARIA Cases 546-554: March 17 2026 investigation session.

Cases:
  546: CELLEX MEDICAMENTOS - IMSS Pharma Capture Ring (108.7M)
       RFC CME200722RVA, new shell 2020, DA=96.4% at IMSS, 94M single DA via
       UC Vanessa Gabriela Ortega Pineda (also awards to FARMACEUTICOS MAYPO, MED EVOLUTION)
  547: JOVA GRANEROS - SEGALMEX/DICONSA Corn Custody Capture (133.2M)
       DA=100%, 14 contracts 2015-2025, "guardia y custodia de maiz en Sinaloa"
       exclusive to SEGALMEX/DICONSA via annual sole-source contracts
  548: GRUPO EMPRENDEDOR DE MAQUILAS - Alimentacion Bienestar Shell (117M)
       2 contracts only, DA=100%, SEGALMEX successor, name mismatch (maquilas ≠ food)
  549: GRUPO CARFI - SEGALMEX Freight Capture (138.6M)
       2 contracts, DA=100% at SEGALMEX, same UC as LEASE AND FLEET (Joel Arreguin Casillas)
       117.6M single DA for grain freight
  550: RAFAEL MARIO GOMEZ BARBA - Hospital Equipment Persona Fisica DA (127.9M)
       Individual (born 1993), single 127.9M DA at SSA for hospital equipment in Rioverde, 2024
  551: SHATIGEAG CORP - Year-End Prison Shell (102.6M)
       RFC SCO191031, single contract Dec 27 2023, 102.6M DA prison modernization Morelos
       federal subsidy transfer mechanism
  552: GIB SA DE CV - IPN Electrical Substation Monopoly (137.2M)
       137M single-bid on 72-partida omnibus licitacion at IPN, DA=83.3%
       UC Jose Alonso Garcia Salazar
  553: GRUMEDY-D - Oaxaca Health Single-Bid Capture (148M)
       SB=50%, 131.8M single-bid licitacion at Servicios de Salud Oaxaca, 2007-2008
  554: SUMINISTROS CONCRETORA - Q.Roo Water Commission Monopoly (125M)
       SB=100% all 6 contracts, all at CAPA Quintana Roo water utility, 2010-2015

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

    note_546 = (
        "IMSS pharma capture ring — new shell, 96% DA, 94M single award. "
        "RFC: CME200722RVA (founded July 2020). 28 contracts at IMSS (99.7% of value), 108.7M. "
        "DA=96.4% (27/28 direct award). 2022-2024 only — short window. "
        "Largest contract: 94M MXN single direct award for medicines at IMSS regional unit "
        "'Vanessa Gabriela Ortega Pineda'. This UC also awards 100% DA to other suspicious "
        "vendors: FARMACEUTICOS MAYPO (100% DA), MED EVOLUTION (100% DA), PHARMA MANAGEMENT "
        "(100% DA) — indicating a network of shell pharma vendors clustered around one "
        "procurement official. Company created 2020, absent from procurement data before 2022. "
        "Name 'Cellex Medicamentos' has no established pharmaceutical identity. "
        "The 94M single DA contract represents 86.4% of total value — extreme concentration. "
        "Pattern: new company → quickly wins massive single DA via captured official. "
        "Part of the IMSS pharma capture ring documented in cases 179-207."
    )

    note_547 = (
        "SEGALMEX/DICONSA corn custody capture — 100% DA, 10-year sole-source. "
        "14 contracts at SEGALMEX (13c, 77M) and DICONSA (1c, 56M), 133.2M total. "
        "DA=100% across all contracts. 2015-2025 (10-year exclusive relationship). "
        "Contract content: 'Servicio integral de guardia y custodia de maiz en Sinaloa' — "
        "corn storage and custody services in Sinaloa. Same service awarded year after year "
        "without competition. SEGALMEX is a confirmed corruption case (Case 2 in GT). "
        "DICONSA was absorbed into Alimentacion para el Bienestar. "
        "A decade of annual DA contracts for the same custody service at two scandal-ridden "
        "food distribution institutions in Sinaloa is a textbook capture pattern. "
        "No evidence of competitive procurement at any point in 10 years. "
        "Classification: P6 SEGALMEX/DICONSA Corn Custody Capture."
    )

    note_548 = (
        "Alimentacion para el Bienestar shell — 2 contracts, 100% DA, name mismatch. "
        "Only 2 contracts (103M + 14M), both direct awards at 'Alimentacion para el Bienestar' "
        "(successor to SEGALMEX/DICONSA after 2021 scandal). Total 117M MXN. "
        "DA=100%. 2023-2024 only — new vendor appearing post-SEGALMEX scandal. "
        "CRITICAL: Company name 'Grupo Emprendedor de Maquilas' means assembly/manufacturing — "
        "no relation to food distribution or rural supply programs. "
        "Contract content: 'programa de abasto rural' — rural food supply. "
        "A maquila company supplying a federal food program via sole-source DA is a "
        "classic industry mismatch + capture indicator. "
        "Pattern: SEGALMEX scandal → institution renamed → new shells appear at successor entity. "
        "Classification: P3 SEGALMEX Successor Intermediary Shell."
    )

    note_549 = (
        "SEGALMEX grain freight capture — same UC as LEASE AND FLEET. "
        "2 contracts, both DA=100% at SEGALMEX. Total 138.6M. "
        "Primary contract: 117.6M single direct award in 2022 for 'flete terrestre del "
        "servicio publico federal' (public freight/trucking). "
        "CRITICAL LINK: UC 'Joel Arreguin Casillas' awarded both this contract AND the "
        "LEASE AND FLEET 180M single-bid contract for forklift leasing at SEGALMEX. "
        "A single procurement official distributing 300M+ to two different transport vendors "
        "via DA/SB at a scandal-ridden institution is a strong capture network signal. "
        "Short span (2022-2023), single institution, 100% DA. "
        "SEGALMEX is already in ground truth as Case 2. This vendor is a satellite in the "
        "SEGALMEX procurement fraud network operating through UC Arreguin Casillas. "
        "Classification: P6 SEGALMEX Freight Capture."
    )

    note_550 = (
        "Persona fisica receiving 128M DA for hospital equipment — extreme anomaly. "
        "RFC: GOBR930825IM9 (born August 1993, approximately 31 years old). "
        "Single contract: 127.9M MXN direct award from Secretaria de Salud (SSA) "
        "for 'Equipamiento del Hospital de Rioverde' (San Luis Potosi), 2024. "
        "EXTREME RED FLAGS: (1) Individual person (not company) receiving 128M contract. "
        "(2) Zero procurement history before or after this contract. "
        "(3) No legal entity — hospital equipment suppliers require registered companies. "
        "(4) Hospital equipment procurement of this scale always involves specialized companies. "
        "A 31-year-old individual with no track record receiving a 128M sole-source contract "
        "to equip an entire public hospital is almost certainly a front/intermediary arrangement. "
        "The individual likely receives the payment and subcontracts (or invoices) actual work "
        "to unknown subcontractors. This is a documented pattern in SSA state-level procurement. "
        "Classification: P3 SSA Persona Fisica Hospital Equipment Intermediary."
    )

    note_551 = (
        "Year-end prison shell — December 27 DA, single contract, federal subsidy mechanism. "
        "RFC: SCO191031 7YA (founded October 2019). Single contract ever: 102.6M MXN "
        "direct award on 2023-12-27 (4 business days before year end). "
        "Contract: 'Modernizacion del inmueble (CIF3) de la Coordinacion del Sistema "
        "Penitenciario del Estado de Morelos' — prison facility modernization. "
        "Procurement mechanism: 'Convenio de coordinacion de transferencia de recursos "
        "federales con caracter de subsidio' — federal-to-state subsidy transfer, a mechanism "
        "frequently used to bypass federal procurement rules. "
        "Company name 'SHATIGEAG CORP' is unusual, has no obvious business meaning, minimal "
        "web presence. 4-year gap between founding (2019) and single contract (2023). "
        "December 27 procurement date + federal subsidy transfer + 102M single-shot DA + "
        "no prior procurement history = classic year-end budget dump through a shell company. "
        "Classification: P2 Year-End Prison Shell — federal subsidy transfer mechanism."
    )

    note_552 = (
        "IPN electrical substation monopoly — 137M single-bid on 72-partida bundled contract. "
        "6 contracts at IPN (137.2M, 97%) plus 2 minor contracts elsewhere. "
        "DA=83.3% (5/6 DA). 2018-2022. "
        "CRITICAL: 137.2M contract was a licitacion (formal competitive procedure) BUT received "
        "only a single bid. The contract covered 72 partidas (line items) for maintenance of all "
        "IPN electrical substations and emergency generators — deliberately bundled into one "
        "omnibus contract that effectively excluded potential competitors. "
        "Exclusive UC: 'Jose Alonso Garcia Salazar' awarded all 4 IPN contracts (139M total). "
        "Structuring a massive maintenance contract to cover all 72 substations in one bid "
        "is a documented anti-competitive strategy — single massive scope deters competition. "
        "The formal licitacion provides cover while the bundling ensures no real competition. "
        "Classification: P6/P1 IPN Electrical Capture — monopolistic contract bundling."
    )

    note_553 = (
        "Oaxaca health single-bid capture — 131.8M licitacion with no competition. "
        "No RFC on file. 4 contracts 2007-2008 at Oaxaca health institutions, 148M total. "
        "SB=50% (2 of 4 contracts). DA=0% — all contracts formally structured as licitaciones, "
        "but 2 of the largest (including the 131.8M contract) had zero competing bidders. "
        "Single institution: Servicios de Salud de Oaxaca. "
        "A 131.8M single-bid licitacion at a state health system is a documented pattern "
        "of competition manipulation — the formal procedure is used as cover while potential "
        "competitors are discouraged or excluded. "
        "Short window (2007-2008 only), no RFC, no corporate identity traceable. "
        "Structure A data (2007) limits RFC availability, but the single-bid capture pattern "
        "in a state health system is clear. "
        "Classification: P1 Oaxaca Health Single-Bid Capture."
    )

    note_554 = (
        "Quintana Roo water commission monopoly — 100% single-bid, 5-year sole-source. "
        "6 contracts at CAPA Quintana Roo (Comision de Agua Potable y Alcantarillado), "
        "125M total, 2010-2015. SB=100% — every single licitacion had zero competitors. "
        "No RFC on file. Name 'Suministros Concretora' (concrete/construction supplies) "
        "consistent with water infrastructure work. "
        "UC 'Edgar Gutierrez Mena' approved 2 contracts totaling 40.8M. "
        "Five years of uninterrupted single-bid wins at a single water utility — 100% "
        "single-bid rate across 6 contracts — is statistically impossible under normal "
        "market conditions. In a functioning market, at least some bids attract competition. "
        "This pattern indicates either active exclusion of potential competitors from "
        "the CAPA bidding process, or deliberate structuring of bids to match only this vendor. "
        "Classification: P6/P1 CAPA Quintana Roo Water Commission Monopoly."
    )

    cases = [
        (0, [(288860, "CELLEX MEDICAMENTOS S DE RL DE CV", "high")],
         "CELLEX MEDICAMENTOS - IMSS Pharma Capture Ring (108.7M)",
         "procurement_fraud", "high", note_546, 108700000, 2022, 2024),
        (1, [(157028, "JOVA GRANEROS SA DE CV", "high")],
         "JOVA GRANEROS - SEGALMEX/DICONSA Corn Custody Capture",
         "procurement_fraud", "high", note_547, 133200000, 2015, 2025),
        (2, [(295589, "GRUPO EMPRENDEDOR DE MAQUILAS SA DE CV", "high")],
         "GRUPO EMPRENDEDOR DE MAQUILAS - Alimentacion Bienestar Shell",
         "procurement_fraud", "high", note_548, 117000000, 2023, 2024),
        (3, [(284303, "GRUPO CARFI SA DE CV", "high")],
         "GRUPO CARFI - SEGALMEX Freight Capture",
         "procurement_fraud", "high", note_549, 138600000, 2022, 2023),
        (4, [(295755, "RAFAEL MARIO GOMEZ BARBA", "high")],
         "RAFAEL MARIO GOMEZ BARBA - SSA Hospital Equipment Persona Fisica",
         "procurement_fraud", "high", note_550, 127900000, 2024, 2024),
        (5, [(301787, "SHATIGEAG CORP SA DE CV", "high")],
         "SHATIGEAG CORP - Year-End Prison Shell (102.6M)",
         "procurement_fraud", "high", note_551, 102600000, 2023, 2023),
        (6, [(226282, "GIB SA DE CV", "high")],
         "GIB SA DE CV - IPN Electrical Substation Monopoly (137.2M)",
         "procurement_fraud", "high", note_552, 137200000, 2018, 2022),
        (7, [(33465, "GRUMEDY-D SA DE CV", "high")],
         "GRUMEDY-D - Oaxaca Health Single-Bid Capture (148M)",
         "procurement_fraud", "high", note_553, 148000000, 2007, 2008),
        (8, [(87915, "SUMINISTROS CONCRETORA SA DE CV", "high")],
         "SUMINISTROS CONCRETORA - CAPA Quintana Roo Water Commission Monopoly",
         "procurement_fraud", "high", note_554, 125000000, 2010, 2015),
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
        228692: (
            "SERVICIOS MUBARQUI S DE RL DE CV: Specialized technical service provider for "
            "SENASICA's sterile insect release (SIR) program. Aerial release of sterile flies "
            "(screwworm, Mediterranean fruit fly) along Mexico-Guatemala border. One of very few "
            "companies worldwide with capacity for this niche biological pest control service. "
            "5 contracts 2018-2025 at SENASICA, 229.5M MXN. 80% DA is structurally justified by "
            "specialized nature. 2024 licitacion with single bid confirms limited supplier market. "
            "Legitimate specialized biological pest control operator — structural technical monopoly."
        ),
        95898: (
            "MASTELLONE HNOS SA: Argentine dairy multinational (brand 'La Serenisima'), founded "
            "1929, ~$1.3B annual revenue, Argentina's largest dairy company. Exports milk powder "
            "to Mexico and other Latin American countries. 5 contracts 2010-2015 at LICONSA for "
            "milk powder import, 417.7M MXN. 100% DA reflects LICONSA's standard import "
            "procurement pattern for bulk international dairy commodities. Same pattern as other "
            "international dairy suppliers already classified FP: Fonterra (NZ), Peñasanta (Spain), "
            "Land O'Lakes (US) in GT cases 195-218. Legitimate multinational dairy exporter."
        ),
        262395: (
            "SERUM INSTITUTE INC (SERUM INSTITUTE OF INDIA PVT LTD): World's largest vaccine "
            "manufacturer by doses produced (>30% of global vaccine supply, 1.5B+ doses/year). "
            "Founded 1966, Pune, India, Adar Poonawalla family. Official bilateral agreement with "
            "BIRMEX (Mexico's national vaccine laboratory) for childhood vaccine supply and "
            "technology transfer, supported by Mexican and Indian governments. 4 contracts 2020-2023 "
            "via BIRMEX for essential childhood vaccines: BCG, Triple Viral, DPT, Hepatitis B, "
            "Tetanus-Diphtheria. 3,419.9M MXN total. 100% DA justified by WHO-prequalified "
            "manufacturers being limited globally (3-5 per vaccine type). "
            "Legitimate sole-source international vaccine supplier — structural monopoly."
        ),
        248144: (
            "PRODUCTOS MAVER SA DE CV (Laboratorios Maver de Mexico): Legitimate Mexican "
            "pharmaceutical company founded 1969 (56 years), headquartered in Tlaquepaque Jalisco, "
            "1,001-5,000 employees, specializing in branded generic medicines. 161 contracts "
            "2019-2025, 1,672.4M MXN. Only 25.5% DA rate — majority competitive. Diversified "
            "across 15+ institutions (IMSS, ISSSTE, INSABI, multiple hospitals). Wins large "
            "consolidated licitaciones across multiple health institutions. Low single-bid rate. "
            "High risk score driven by total value/concentration, not procurement irregularities. "
            "Legitimate established pharmaceutical manufacturer."
        ),
        256573: (
            "LABORATORIO KEMEX SA: Argentine pharmaceutical company specializing in oncology "
            "medications (injectable, lyophilized, solid forms), 173 employees, exports 65-70% of "
            "production to 12+ Latin American countries including Mexico. 9 contracts, 135M MXN, "
            "all in 2020 (COVID year). Supplies oncology drugs including vincristine through both "
            "consolidated SHCP licitaciones and direct awards for urgent oncology needs. Mixed DA "
            "rate (55.6%) explained by limited oncology drug manufacturers globally and COVID-era "
            "supply chain constraints. Diversified across 5 UCs at different institutions. "
            "Legitimate specialized oncology pharmaceutical manufacturer."
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
        260001: (
            "LEASE AND FLEET SOLUTIONS SA DE CV: Vehicle/equipment leasing company. "
            "4 contracts, 349M, 2020-2025. Mixed signals: "
            "(1) 180M single-bid licitacion 2020 at SEGALMEX for forklift leasing, awarded by "
            "UC 'Joel Arreguin Casillas' — same UC who awarded GRUPO CARFI 117.6M DA at SEGALMEX. "
            "Vendor connection: both GRUPO CARFI and LEASE AND FLEET cluster around Arreguin Casillas. "
            "(2) However, also has 149M licitacion 2025 at SADER (Secretaria de Agricultura) "
            "for vehicle leasing — NOT single-bid, suggests genuine market capability. "
            "(3) Diversified across 4 institutions including LICONSA and Gobierno de Puebla. "
            "The SEGALMEX contract is suspicious (SB at scandal-ridden institution, same UC), "
            "but overall portfolio shows real business. Needs RFC check and deeper UC analysis."
        ),
        300285: (
            "QUEEN ARM MANUFACTURAS S DE RL DE CV: 3 contracts, 100.8M, agricultura sector, P3. "
            "Very low contract count — needs deeper investigation. Small contract base makes "
            "classification difficult. Investigate: what is manufactured? For what institution?"
        ),
        279525: (
            "GRUPO ANGIO GDL SA DE CV: 3 contracts, 113.4M, educacion sector, P3. "
            "DA=0%, SB=0% — the risk score is driven by something other than DA/SB. "
            "Needs deeper investigation: what is the nature of the contracts? "
            "Name suggests cardiovascular/angiography medical company in a Guadalajara context."
        ),
        221724: (
            "VACE INVESTMENT ADVISORS SC: 1 contract, 144.3M, SB=100%, tecnologia. "
            "Investment advisors in technology sector with single 144M contract. "
            "Needs investigation: what is an investment advisory firm supplying to federal IT?"
        ),
        10138: (
            "PROMOTORA DE INFRAESTRUCTURA VERACRUZANA SA: 5 contracts, 357.3M, SB=100%, "
            "infraestructura. All 5 contracts single-bid in Veracruz infrastructure. "
            "Potentially GT but needs RFC, year range, and institution data confirmation."
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

    for offset in range(9):
        case_str = f"CASE-{next_id + offset}"
        row = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()
        if not row:
            continue
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {row[0][:65]} | {n_v}v | {n_c}c")

    conn.close()
    print("\nDone. Cases 546-554 inserted.")


if __name__ == "__main__":
    run()
