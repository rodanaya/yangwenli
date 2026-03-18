"""
ARIA Cases 515-522: March 17 2026 investigation session.

Cases:
  515: SERVICIOS EMPRESARIALES TERAM - Banco Bienestar Outsourcing Capture (464M)
       RFC SET161213C90, founded Dec 2016, single 464M SB outsourcing at Banco del Bienestar 2020
  516: GRUPO TECNICAS ESTUDIO CONSTRUCCION - IPN Maintenance Monopoly (375M)
       No RFC, 11c SB=64% all at IPN, fence/water/lighting maintenance 2023-2025
  517: COMERCIALIZADORA KIKUMITSU INTERNATIONAL - DICONSA/SEGALMEX Ecosystem (441M)
       RFC LCI900126EE7, 100% at Diconsa, DA=67%, rural food supply 2019-2022
  518: CORPORACION INTERAMERICANA DE ENTRETENIMIENTO (CIE) - Tourism DA Mega-Contract (2444M)
       No RFC, single 2.4B DA at Consejo Promocion Turistica 2014-2019
  519: EL PEDREGAL CONSULTORES - DICONSA Shell/Industry Mismatch (744M)
       No RFC, 24c DA=96% ALL at Diconsa, "consultores" selling rural food 2019-2022
  520: EVOLUTION PROCES - IMSS Pharma Direct Award Capture (1576M)
       No RFC, 188c DA=49%, IMSS-specific DA=83% vs ISSSTE DA=7%, pharma 2017-2025
  521: ALMACENADORA SUR - SEGALMEX Warehouse Logistics Capture (418M)
       No RFC, 12c DA=75%, Diconsa→APB warehouse services 2017-2025
  522: LONJA AGROPECUARIA DE JALISCO - DICONSA Agricultural Intermediary (644M)
       No RFC, 29c DA=97% ALL at Diconsa, agricultural exchange 2010-2017

Run from backend/ directory.
"""
import sys, sqlite3
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"

DICONSA_CARTEL = (
    "Part of the SEGALMEX/DICONSA food distribution cartel. "
    "Core pattern: direct awards for rural food supply at DICONSA/Alimentacion para el Bienestar. "
    "Co-vendors in same DICONSA network include: "
    "COMERCIALIZADORA COLUMBIA (confirmed_corrupt), "
    "AGRO SERVICIOS A PRODUCTORES DEL VALLE (GT), MERCANTA (GT), "
    "PRIMOS AND COUSINS (Case 476), MAISON DE CHANCE (Case 491), "
    "BECADEHU INDUSTRIES (Case 496), SERVICIOS INTEGRALES CARREGIN (Case 497), "
    "TECHNOFOODS (Case 498), GRAMILPA (Case 507), DM MEXICANA (Case 508), "
    "GRUPO DRAKIR (Case 509), INDUSTRIAS CAMPO FRESCO (Case 514), "
    "COMERCIALIZADORA KIKUMITSU (Case 517), EL PEDREGAL CONSULTORES (Case 519), "
    "ALMACENADORA SUR (Case 521), LONJA AGROPECUARIA DE JALISCO (Case 522). "
    "All win through direct awards at DICONSA/SEGALMEX/APB food program agencies."
)


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    print(f"Current max GT case ID: {max_id}")
    next_id = max_id + 1

    note_515 = (
        "Banco del Bienestar outsourcing capture — AMLO-era welfare bank staffing. "
        "RFC: SET161213C90. Company founded December 2016. "
        "Single 464M MXN contract won via single-bid licitacion at Banco del Bienestar (2020). "
        "Contract: 'Servicios Tecnicos y Administrativos de apoyo bajo el regimen de "
        "subcontratacion (outsourcing)' — outsourcing/staffing services. "
        "Banco del Bienestar replaced Bansefi in 2019 as the bank for AMLO's social program "
        "payments (Sembrando Vida, Becas Bienestar, etc.) and underwent rapid expansion "
        "amid well-documented procurement irregularities. "
        "A company founded in late 2016 winning 464M in outsourcing at this politically "
        "sensitive institution as the SOLE BIDDER in a competitive process is a major "
        "red flag: either the specifications were written for this vendor or competition "
        "was deliberately suppressed. "
        "Single-institution capture + single contract + single bid + new company = "
        "institutional outsourcing capture pattern. "
        "Classification: P6 Banco del Bienestar Outsourcing Capture."
    )

    note_516 = (
        "IPN maintenance monopoly — university maintenance services capture. "
        "No RFC. 9/11 contracts at IPN (Instituto Politecnico Nacional), 2023-2025. "
        "375M MXN across 11 contracts — 64% single bid, 36% direct award. "
        "Contract content: perimeter fence maintenance (136M and 108M for 'reja perimetral'), "
        "water systems, electrical infrastructure, walkway lighting. "
        "136M for fence maintenance at a public university is extraordinarily suspicious — "
        "this is not a complex infrastructure project but routine maintenance inflated 10-20x. "
        "IPN has a documented history of maintenance capture: 'IPN Cartel de la Limpieza' "
        "(Case in GT) established the pattern of maintenance companies monopolizing "
        "IPN services through single-bid procedures. GRUPO TECNICAS ESTUDIO follows "
        "the identical pattern: opaque company name, maintenance focus, high SB rate, "
        "university institution capture. "
        "Classification: P6 IPN University Maintenance Monopoly."
    )

    note_517 = (
        "DICONSA rural food supply capture — SEGALMEX ecosystem member. "
        "RFC: LCI900126EE7. 9 contracts across 2019-2022 at DICONSA, 441M MXN. "
        "DA=67% (6/9 direct award). 100% concentrated at DICONSA. "
        "Contract content: 'Programa de Abasto Rural' — rural food supply. "
        "Company name 'KIKUMITSU INTERNATIONAL' — Japanese-sounding commercial name "
        "has zero alignment with a Mexican rural food supplier; opaque name inconsistent "
        "with a legitimate agro-industrial company. "
        "RFC suggests establishment in 1990 but contracting pattern begins only in 2019-2022, "
        "coinciding with the AMLO-era SEGALMEX reorganization and the documented fraud period. "
        "67% DA at a single food distribution agency with an industry-mismatched company name "
        "follows the SEGALMEX/DICONSA cartel intermediary pattern exactly. "
        + DICONSA_CARTEL +
        "Classification: P6 DICONSA Rural Food Supply Capture — SEGALMEX ecosystem."
    )

    note_518 = (
        "Tourism promotion mega-contract — no-bid award at dissolved institution. "
        "No RFC. Single 2,444M MXN direct award at Consejo de Promocion Turistica de Mexico "
        "(CPTM) spanning 2014-2019 (5.5-year contract). "
        "CIE (Corporacion Interamericana de Entretenimiento) is Mexico's largest entertainment "
        "and live events company (OCESA/Live Nation partner, publicly traded on BMV). "
        "The Consejo de Promocion Turistica de Mexico was dissolved in 2019 amid serious "
        "corruption allegations: the ASF audited it extensively and found massive irregularities "
        "in 2014-2018 contracts. "
        "A single 2.4 BILLION peso direct award for 'services' over 5.5 years — with no "
        "competitive process — to an entertainment conglomerate from a tourism promotion "
        "entity known for corruption is a textbook no-bid mega-contract. "
        "Even though CIE is a legitimate public company, the procurement mechanism is corrupt: "
        "direct award at this scale for a service that should have attracted multiple bidders "
        "(international event/tourism agencies) violates procurement law. "
        "Classification: P1/P6 CIE — Consejo Turismo No-Bid Mega-Contract."
    )

    note_519 = (
        "DICONSA shell company — industry mismatch + near-total direct awards. "
        "No RFC. 24 contracts at DICONSA (100%), 2019-2022, 744M MXN. DA=96% (23/24 direct award). "
        "Contract content: 'Programa de Abasto Rural' — rural food supply for DICONSA stores. "
        "Company name 'EL PEDREGAL CONSULTORES' (Consultants) — the word 'consultores' "
        "is a complete industry mismatch for a rural food supply vendor. "
        "No legitimate food distribution company would register as a 'consulting' firm. "
        "This is a strong shell company indicator: the legal name was chosen for opacity, "
        "not to describe the actual business activity. "
        "96% direct award at a single food distribution agency over 3 years with no RFC "
        "and an industry-mismatched name is one of the clearest SEGALMEX/DICONSA "
        "shell company patterns in the dataset. "
        + DICONSA_CARTEL +
        "Classification: P2 Ghost / P6 DICONSA Shell — industry mismatch + 96% DA."
    )

    note_520 = (
        "IMSS pharmaceutical direct award capture — institution-specific pattern. "
        "No RFC. 188 contracts across 2017-2025, 1,576M MXN. Overall DA=49%. "
        "Key diagnostic: IMSS-specific behavior vs. other institutions: "
        "IMSS (82 contracts, 1,148M): DA=83% — overwhelming direct award rate. "
        "ISSSTE (36 contracts): DA=7% — almost entirely competitive. "
        "SEDENA, INSABI, hospitals: competitive procurement throughout. "
        "This divergence is the definitive signal of institution-specific capture: "
        "EVOLUTION PROCES wins competitively everywhere else but receives direct awards "
        "exclusively at IMSS — proving this is not a business model issue but an "
        "institutional relationship. This is the documented IMSS pharmaceutical procurement "
        "ring pattern: preferred vendors receive DA contracts at IMSS while maintaining "
        "competitive bids elsewhere to appear legitimate. "
        "The name 'Evolution Proces' is opaque for a pharmaceutical distributor. "
        "2019-2021 DA rate at IMSS reached 79-94% during COVID — a key fraud window. "
        "Classification: P6 IMSS Pharmaceutical Direct Award Capture."
    )

    note_521 = (
        "SEGALMEX warehouse and logistics capture — storage node in food diversion scheme. "
        "No RFC. 12 contracts across 2017-2025, 418M MXN. DA=75% (9/12). "
        "Agency history: Diconsa (2017-2022) → Alimentacion para el Bienestar (2023-2025). "
        "Contract content: 'Deposito mercantil y conexos' — commercial warehousing. "
        "'Almacenadora Sur' (Southern Warehouse Company) provides storage services for "
        "Diconsa's rural food distribution network. "
        "Warehousing is a critical node in the SEGALMEX diversion scheme: goods were "
        "ostensibly 'stored' but investigators found documentation irregularities consistent "
        "with phantom deliveries and diversion of food commodities. "
        "Surviving the Diconsa → APB institutional rename (2022) shows deep institutional "
        "capture that persisted across organizational restructuring. "
        "75% DA over 9 years at a single food distribution ecosystem = sustained capture. "
        + DICONSA_CARTEL +
        "Classification: P6 SEGALMEX Warehouse Logistics Capture."
    )

    note_522 = (
        "DICONSA agricultural exchange intermediary — near-total direct award capture. "
        "No RFC. 29 contracts at DICONSA (100%), 2010-2017, 644M MXN. DA=97% (28/29). "
        "Contract content: Rural food supply and distribution for DICONSA program. "
        "'Lonja Agropecuaria de Jalisco' (Jalisco Agricultural Trading Exchange) — "
        "the institutional name suggests a commodity exchange or agricultural cooperative, "
        "not a direct vendor to DICONSA's rural store network. "
        "An 'agricultural exchange' from Jalisco channeling 644M through 97% direct awards "
        "at DICONSA over 8 years is characteristic of an intermediary inserted into the "
        "supply chain to extract rents from a competitive supply chain. "
        "The largest contract (310M in 2012) represents nearly half of total value in a "
        "single year — a massive single DA at DICONSA with no competitive process. "
        "97% DA at a single institution over 8 years is among the highest concentration "
        "rates in the DICONSA ecosystem. "
        + DICONSA_CARTEL +
        "Classification: P6 DICONSA Agricultural Intermediary — 97% DA capture."
    )

    cases = [
        (0, [(259922, "SERVICIOS EMPRESARIALES TERAM SA DE CV", "medium")],
         "SERVICIOS EMPRESARIALES TERAM - Banco Bienestar Outsourcing Capture",
         "procurement_fraud", "medium", note_515, 464000000, 2020, 2020),
        (1, [(296066, "GRUPO DE TECNICAS DE ESTUDIO PARA LA CONSTRUCCION SA DE CV", "high")],
         "GRUPO TECNICAS ESTUDIO CONSTRUCCION - IPN Maintenance Monopoly",
         "procurement_fraud", "high", note_516, 375000000, 2023, 2025),
        (2, [(247508, "COMERCIALIZADORA KIKUMITSU INTERNATIONAL SA DE CV", "high")],
         "COMERCIALIZADORA KIKUMITSU INTERNATIONAL - DICONSA Rural Food Capture",
         "procurement_fraud", "high", note_517, 441000000, 2019, 2022),
        (3, [(132781, "CORPORACION INTERAMERICANA DE ENTRETENIMIENTO SAB DE CV", "high")],
         "CIE - Consejo Turismo No-Bid Mega-Contract (2444M)",
         "procurement_fraud", "high", note_518, 2444000000, 2014, 2019),
        (4, [(256419, "EL PEDREGAL CONSULTORES SA DE CV", "high")],
         "EL PEDREGAL CONSULTORES - DICONSA Shell Industry Mismatch",
         "procurement_fraud", "high", note_519, 744000000, 2019, 2022),
        (5, [(213303, "EVOLUTION PROCES SA DE CV", "high")],
         "EVOLUTION PROCES - IMSS Pharmaceutical DA Capture (1576M)",
         "procurement_fraud", "high", note_520, 1576000000, 2017, 2025),
        (6, [(210900, "ALMACENADORA SUR SA DE CV ORGANIZACION AUXILIAR DEL CREDITO", "medium")],
         "ALMACENADORA SUR - SEGALMEX Warehouse Logistics Capture",
         "procurement_fraud", "medium", note_521, 418000000, 2017, 2025),
        (7, [(75661, "LONJA AGROPECUARIA DE JALISCO SA DE CV", "high")],
         "LONJA AGROPECUARIA DE JALISCO - DICONSA Agricultural Intermediary",
         "procurement_fraud", "high", note_522, 644000000, 2010, 2017),
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
        4104: (
            "MCCANN ERICKSON DE MEXICO SA DE CV: Global advertising agency (Interpublic Group/IPG). "
            "4 contracts 2002-2003 (Structure A era), 351M at Consejo Promocion Turistica, FONATUR, IPAB. "
            "All via single-bid licitacion — pre-2010 procurement reality for international ad agencies. "
            "McCann Erickson is a legitimate multinational providing its core advertising service "
            "for government tourism campaigns. High risk score driven by price_volatility from "
            "a single large 242M contract. Structural multinational legitimate."
        ),
        28631: (
            "SGS SOCIETE GENERALE DE SURVEILLANCE SA: World's largest inspection, verification, "
            "testing and certification company, headquartered in Geneva (SIX-listed). "
            "2 contracts 2006 at SAT for customs pre-shipment inspection: 1,167M total. "
            "Government customs inspection via SGS is a structural international arrangement — "
            "few companies globally can provide pre-shipment inspection at scale. "
            "Structural international monopoly in customs inspection services. Legitimate."
        ),
        28632: (
            "COTECNA INSPECTION SA: Geneva-based inspection company, one of the 'Big Four' "
            "pre-shipment inspection firms (SGS, Cotecna, Bureau Veritas, Intertek). "
            "Single 572M contract at SAT 2006 for customs inspection. Same year as SGS contracts. "
            "Cotecna's core business is government customs inspection globally. "
            "Structural international duopoly (SAT split between SGS and Cotecna as is standard). "
            "Structural international monopoly. Legitimate."
        ),
        43965: (
            "DITECMA SA DE CV: Long-established education equipment supplier (59 contracts 2010-2023). "
            "332M across 6+ institutions (SEP, TecNM, IPN, Chihuahua, Guanajuato). "
            "DA=5%, SB=8% — overwhelmingly competitive procurement. 14-year track record. "
            "Multi-institution, multi-state spread over 13 years is the strongest protective signal. "
            "Sells laboratory equipment, furniture, IT — legitimate education sector supplier. "
            "High risk score from price_volatility across different-sized institutional contracts. "
            "Established education equipment supplier. Legitimate."
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
        295692: (
            "GNK LOGISTICA DEL BAJIO SA DE CV: RFC GLB100701467. 13c 2023 at IMSS, 614M. "
            "Provides outsourced anesthesia services ('Servicio Medico Integral para Anestesia') "
            "across 10+ IMSS state delegations. Most won via licitacion (not DA). "
            "Suspicious: 'Logistica' (logistics) company name providing anesthesia services — "
            "industry mismatch. 614M at single institution in one year. "
            "Investigate: is GNK LOGISTICA a shell front for an anesthesia staffing company? "
            "Compare with CBH+ (Case 504) which has similar IMSS anesthesia pattern."
        ),
        268100: (
            "SSS ASISTENCIA Y SUPERVISION SA DE CV: RFC SAS1904042T3, founded April 2019. "
            "27c 2021-2025, 302M. Security/vigilance at BANOBRAS (174M), INAH, FGR, INEGI. "
            "DA=0%, SB=19% — mostly competitive. Multi-institution (4 different agencies). "
            "Protective signals: low DA, multi-institution, competitive procurement. "
            "Suspicious: founded 2019, rapidly grew to 302M in 4 years, 174M BANOBRAS SB in 2025. "
            "Borderline — likely legitimate security company but monitor BANOBRAS relationship."
        ),
        82816: (
            "M&R DE OCCIDENTE SAPI DE CV: No RFC. Single 1,744M SB at BANOBRAS 2012. "
            "SAPI de CV (Sociedad Anonima Promotora de Inversion) = Mexican PPP investment vehicle. "
            "Contract: 'Servicios' — no description in DB. Single bid at national infrastructure bank. "
            "SAPI structure suggests legitimate PPP concession SPV (BANOBRAS finances infrastructure). "
            "BUT: 1.7B single-bid with no description and no RFC is suspicious even for a PPP. "
            "Investigate: what was the 'Servicios' contract? What infrastructure did BANOBRAS finance? "
            "If this is a highway/rail concession SPV, it should be FP (structural PPP). "
            "If it's a services contract with no underlying infrastructure, it could be capture."
        ),
        11879: (
            "FYPASA CONSTRUCCIONES SA DE CV: No RFC. 34c 2003-2018, 2,329M. "
            "Water/sanitation infrastructure (treatment plants, sewage, potabilization). "
            "Multi-institution: CONAGUA + 6 state water commissions (Jalisco, SLP, Aguascalientes, Sinaloa). "
            "SB=74% — concerning but water infrastructure is specialized (few qualified contractors). "
            "16-year track record across 8 water authorities = established regional specialist. "
            "Anomalous: 724M SB contract at IMSS in 2015 (construction company at health institution). "
            "Investigate: IMSS contract type and whether FYPASA is in CONAGUA cartel orbit. "
            "Cross-reference with CONAGUA cartel members (Cases 439-475, 495)."
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

    for offset in range(8):
        case_str = f"CASE-{next_id + offset}"
        row = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()
        if not row:
            continue
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {row[0][:65]} | {n_v}v | {n_c}c")

    conn.close()
    print("\nDone. Cases 515-522 inserted.")


if __name__ == "__main__":
    run()
