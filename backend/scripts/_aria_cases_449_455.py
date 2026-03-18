"""
ARIA Cases 449-455: March 17 2026 investigation session.

Cases:
  449: OZONE ECOLOGICAL EQUIPMENTS - CONAGUA Water Infrastructure Capture (2.08B)
       93.8% SB, 15/16 CONAGUA, force majeure abuse, no RFC, zero co-bidders
  450: ING. SISTEMAS SANITARIOS Y AMBIENTALES - Multi-State Water Monopoly (1.85B)
       95.1% SB, 12 water agencies, no RFC, zero co-bidders
  451: IMPULSORA DE DESARROLLO INTEGRAL - Infrastructure Duarte-Era Capture (5.44B)
       90.7% SB, 53 SB contracts Veracruz 2012 (Duarte era), no RFC
  452: DISTRIBUIDORA YAAB - Ghost Company Emergency DA Cleaning ISEM (359M)
       Founded April 2022, 250M force majeure DA within 2yr at state health
  453: DOMINUS MESSICO - Coahuila State Food Distribution Shell (612M)
       Founded 2016, 611.6M food via opaque procedure at Coahuila state govt
  454: CORPORACION SAIXA - IMSS Pharma 2-Year Explosion (970M)
       150 contracts in 2 years 2021-2022, 730M IMSS, avg risk 0.985
  455: SOLUCIONES MILITARES Y TACTICAS SUPERIOR - SEDENA Ghost Weapons Vendor (1.46B)
       Founded Nov 2021, 1.43B weapons contract at SEDENA Dec 2022 (1yr old)

Also: FP markings for PPP concessions, voucher company, Veolia subsidiary, VISE.

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

    cases = [
        # (id_offset, vendor_id, vendor_name, case_name, case_type, confidence, notes, fraud_mxn, yr_start, yr_end)
        (0, 137218, "OZONE ECOLOGICAL EQUIPMENTS SA DE CV",
         "OZONE ECOLOGICAL EQUIPMENTS - CONAGUA Water Infrastructure Capture",
         "procurement_fraud", "high",
         ("Extreme institutional capture at CONAGUA with force majeure abuse. "
          "No RFC despite 2.08B MXN across 16 contracts (2014-2024). "
          "93.8% single-bid rate; 15 of 16 contracts at CONAGUA (the other at IMSS). "
          "Zero co-bidders across all 16 procedures. "
          "Explosive growth: 2.6M (2014) → 254M (2017) → 954M (2024). "
          "Two recent contracts used 'ADJUDICACION DIRECTA POR CASO FORTUITO O FUERZA MAYOR': "
          "815.5M potabilization plant and 137.9M dock construction — force majeure abuse "
          "to bypass competitive bidding for massive infrastructure works. "
          "Company description claims 'ecological equipment' yet wins water infrastructure "
          "construction and potabilization plant contracts through single-bid licitaciones "
          "without any competing vendor ever appearing. "
          "Variant name VID=32076 'OZONE ECOLOGICA EQUIPMENT' has 3 earlier contracts (2007-2010, 4.9M). "
          "Pattern: CONAGUA single-institution capture + force majeure DA abuse for large contracts."),
         2_078_000_000, 2014, 2024),

        (1, 13665, "INGENIERIA DE SISTEMAS SANITARIOS Y AMBIENTALES SA DE CV",
         "INGENIERIA SISTEMAS SANITARIOS - Multi-State Water Infrastructure Monopoly",
         "procurement_fraud", "high",
         ("Multi-state water and sanitation infrastructure monopoly spanning 6+ states. "
          "No RFC despite 1.85B MXN across 41 contracts (2003-2021). "
          "95.1% single-bid rate across 12 water/sanitation agencies. "
          "Zero co-bidders identified across all 41 procedures. "
          "Dominant vendor at Servicios de Agua y Drenaje de Monterrey (555.7M, 19 contracts). "
          "Additional concentrations: Veracruz state water (281M SB), Chihuahua water (271M SB), "
          "Aguascalientes water, Sonora water, Coahuila water. "
          "Services: potabilization, pumping stations, dredging, flocculation systems — "
          "specialized water treatment with nationwide reach. "
          "18-year operation with zero co-bidders across 12 independent state agencies suggests "
          "systematic specification tailoring to exclude competitors, or coordinated bid suppression. "
          "95.1% SB in a specialized sector across multiple independent clients is statistically "
          "impossible without coordination or specification manipulation."),
         1_852_000_000, 2003, 2021),

        (2, 1085, "IMPULSORA DE DESARROLLO INTEGRAL SA DE CV",
         "IMPULSORA DE DESARROLLO INTEGRAL - Infrastructure Capture + Duarte-Era Veracruz",
         "procurement_fraud", "high",
         ("Multi-institution infrastructure capture spanning federal and state agencies. "
          "No RFC despite 5.44B MXN across 107 contracts (2002-2024). "
          "90.7% single-bid rate; zero co-bidders identified. "
          "Primary institutions: SCT 1.35B (17 contracts, 100% SB), SICT 724M, "
          "IMP (Instituto Mexicano del Petroleo) 591M (petrochemical plants), "
          "PEMEX 519M, Puerto Lazaro Cardenas 440M, CAPUFE 381M, Veracruz state 368M. "
          "Key red flag: 53 contracts in Veracruz state in 2012 alone (all single-bid), "
          "during the Javier Duarte governorship (2010-2016). Duarte was later arrested and "
          "convicted of corruption and embezzlement of 1.5B MXN. Impulsora was a major "
          "beneficiary of Duarte-era state procurement, receiving the single largest "
          "concentration of Veracruz public works contracts during this period. "
          "Post-Duarte, the vendor shifted to federal agencies (SCT, SICT, IMP, PEMEX). "
          "Classification: P6 Institutional Capture across multiple agencies + P1 Monopoly."),
         5_440_000_000, 2002, 2024),

        (3, 294282, "DISTRIBUIDORA YAAB SA DE CV",
         "DISTRIBUIDORA YAAB - Ghost Company Emergency DA Cleaning ISEM",
         "ghost_company", "high",
         ("Ghost company pattern at ISEM (Instituto de Salud del Estado de Mexico). "
          "RFC DYA2204277X2 = founded April 27, 2022 — barely 2 years before largest contract. "
          "250.6M cleaning contract at ISEM via 'ADJUDICACION DIRECTA POR CASO FORTUITO O "
          "FUERZA MAYOR' — a cleaning contract declared as a health emergency requiring DA bypass. "
          "Also: 105.7M cleaning at Secretaria de Salud via invitation (single bid), "
          "and 2.8M paint acquisition at Colegio de Bachilleres (industry mismatch). "
          "Shell indicators: (1) Founded April 2022, (2) Largest contract within 2 years, "
          "(3) Emergency DA for routine cleaning services (not an emergency), "
          "(4) Industry mismatch (distributor → painting → cleaning), "
          "(5) 70% direct award rate, (6) ISEM state health = weaker oversight than federal. "
          "Pattern: Ghost/shell company created to absorb emergency DA cleaning contracts "
          "at state health institutions, consistent with IMSS/ISEM cleaning contractor fraud."),
         359_000_000, 2022, 2024),

        (4, 274853, "DOMINUS MESSICO SA DE CV",
         "DOMINUS MESSICO - Coahuila State Food Distribution Shell",
         "ghost_company", "high",
         ("Shell company receiving massive food distribution contracts at Coahuila state government. "
          "RFC DME160811JU2 = founded August 2016. "
          "2 contracts totaling 611.6M MXN at Coahuila state government "
          "via 'OTRAS CONTRATACIONES' — an opaque procedure category that bypasses standard "
          "competitive processes. 'Other contracting' mechanisms are frequently abused for "
          "non-competitive awards. "
          "A company named 'Dominus Messico' (grammatically unusual portmanteau) receiving "
          "600M+ in food distribution via non-standard procurement at a single state government "
          "is consistent with state-level ghost contractor fraud. "
          "Coahuila state has documented procurement irregularities in food/social programs. "
          "Scale (611M) is disproportionate for a newly formed company using non-standard "
          "contracting mechanisms."),
         611_600_000, 2016, 2020),

        (5, 266577, "CORPORACION SAIXA SA DE CV",
         "CORPORACION SAIXA - IMSS Pharma 2-Year Explosion",
         "procurement_fraud", "high",
         ("Explosive pharmaceutical vendor with extreme risk scores at IMSS and INSABI. "
          "150 contracts in just 2 years (2021-2022): 730M at IMSS + 129M at INSABI. "
          "Average risk score 0.985 — among the highest in the queue. "
          "RFC SCO030331AH6 present (founded March 2003) but the company had minimal "
          "procurement history before 2021 and then exploded to 970M in 2 years. "
          "Pattern: sudden vendor activation for large pharmaceutical purchases at IMSS "
          "during the INSABI transition period (2020-2022 IMSS-BIENESTAR restructuring), "
          "when emergency medicine procurement bypassed standard controls. "
          "The INSABI period is known for procurement fraud: emergency DA purchases of "
          "medicines at inflated prices through intermediaries. "
          "150 contracts in 2 years at 730M IMSS concentration = pharmaceutical intermediary "
          "capture at a single institution."),
         970_000_000, 2021, 2022),

        (6, 287412, "SOLUCIONES MILITARES Y TACTICAS SUPERIOR SA DE CV",
         "SOLUCIONES MILITARES Y TACTICAS SUPERIOR - SEDENA Ghost Weapons Vendor",
         "ghost_company", "high",
         ("Ghost defense contractor receiving 1.43B MXN in weapons contracts at SEDENA "
          "(Secretaria de la Defensa Nacional). "
          "RFC SMT2111241K6 = founded November 24, 2021 — only 1 year old when receiving "
          "a 1.43B contract in December 2022. "
          "Contract: 'Adquisicion de armamento no letal y agentes quimicos' "
          "(acquisition of less-lethal armament and chemical agents) at SEDENA. "
          "A company incorporated in November 2021 winning a 1.43B weapons contract at "
          "SEDENA in December 2022 — just 13 months after incorporation — is a severe red flag. "
          "Defense procurement requires extensive certifications, security clearances, and "
          "vendor vetting that cannot be completed in 13 months. "
          "Defense contracts are typically awarded to established, vetted suppliers. "
          "The name 'Soluciones Militares y Tacticas Superior' appears designed to sound "
          "established and qualified. "
          "Pattern: Ghost/shell company created to absorb a specific SEDENA defense contract "
          "through insider connections bypassing standard security vetting."),
         1_430_000_000, 2022, 2022),
    ]

    inserted = []
    for offset, vid, vname, cname, ctype, conf, notes, fraud, yr_start, yr_end in cases:
        case_id = next_id + offset
        case_str = f"CASE-{case_id}"
        conn.execute("""
            INSERT OR REPLACE INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
            VALUES (?,?,?,?,?,?,?,?,?)
        """, (case_id, case_str, cname, ctype, conf, notes, fraud, yr_start, yr_end))

        conn.execute("""
            INSERT OR IGNORE INTO ground_truth_vendors
            (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
            VALUES (?,?,?,?,?)
        """, (case_str, vid, vname, conf, "aria_investigation"))

        rows = conn.execute("SELECT id FROM contracts WHERE vendor_id=?", (vid,)).fetchall()
        for row in rows:
            conn.execute("INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                         (case_str, row[0]))

        short_memo = f"GT Case {case_id}: {cname[:60]}. {ctype}."
        conn.execute("""
            UPDATE aria_queue SET in_ground_truth=1, review_status='needs_review', memo_text=?
            WHERE vendor_id=?
        """, (short_memo, vid))

        print(f"Inserted case {case_id}: {cname[:60]} | {len(rows)} contracts")
        inserted.append(case_str)

    # ── False positives ───────────────────────────────────────────────────────
    structural_fps = {
        221110: "VISE SA DE CV: Legitimate large construction company (CPV810615PP5, founded 1981, 44yr history, has RFC). Established Mexican road/infrastructure firm. High SB reflects mega-project scale specialization, not bid rigging.",
        196929: "CARRETERAS DE COAHUILA SAPI: PPP highway concession vehicle. Single APP concession contract (procedure prefix 'APP-'). Asociacion Publico-Privada — single-bid by design. 4.4B.",
        196909: "AUTOVIA PIRAMIDES SAPI: PPP highway concession vehicle. Single APP concession contract. Standard PPP infrastructure SPV. 3.9B.",
        23565: "DEGREMONT SA DE CV: Mexican subsidiary of Degremont (Suez/Veolia Water — French multinational). World-class water treatment engineering. Legitimate specialized provider for large potabilization projects.",
        9860: "PRESTACIONES MULTIVALE: Meal/service voucher company. Oligopolistic voucher market (Edenred, Sodexo, Efectivale, Multivale). Structural market, limited provider count by regulation.",
    }
    for vid, note in structural_fps.items():
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (f"FP: {note}", vid))

    print(f"\nMarked {len(structural_fps)} structural FPs")

    # ── Needs review ──────────────────────────────────────────────────────────
    needs_review = {
        24: "DRAGAMEX SA DE CV: 3.3B, 100% SB, 70 contracts, 17 institutions, port dredging 2002-2016. Specialized marine dredging (limited providers in Mexico). Possible structural monopoly or cartel. Investigate.",
        102421: "IGSA MEDICAL SA DE CV: 3.1B hemodialysis services at IMSS/ISSSTE. 42.8% DA, 9 institutions. Could be legitimate specialized medical (dialysis requires certification) or IMSS capture.",
        10303: "GLUYAS CONSTRUCCIONES SA DE CV: 3.7B, 100% SB, 48 contracts, 11 institutions, roads. No RFC, zero co-bidders. Pattern similar to GT construction cases but 21yr history + 11 institutions complicates.",
        4635: "PEGO SA DE CV: 4.7B pharma distributor, 514 contracts, 60 institutions, 23yr. Low SB (5.6%). Large but diverse — 60 institutions suggests legitimate large distributor. 3.9B IMSS concentration warrants review.",
        44401: "AB ALIMENTOS SA DE CV: 1.04B, DIF food programs in Sonora and Zacatecas, 55% SB. No RFC. 20 contracts 2011-2015. Could be legitimate DIF food supplier or state-level capture.",
        3727: "VIAJES MEXICO AMIGO SA DE CV: 920M, 80% DA, education sector travel. Government travel agency with high DA rate at SEP/education. Possible capture of government travel services.",
        73857: "PHARMATH DE MEXICO SA DE CV: 1.6B, pharma sector, avg risk 0.694. Needs institution breakdown to determine if legitimate or IMSS intermediary.",
        246318: "SOLUCIONES EN LIDERAZGO FARMACEUTICO SA DE CV: 1.28B, pharma, avg risk 0.747. Similar to SAIXA pattern. Investigate contract dates and institution concentration.",
        99601: "SERVICIOS ADMINISTRADOS BSS SA DE CV: 1.6B, ambiente sector. Needs investigation — environmental services monopoly pattern possible.",
        1516: "BIODIST SA DE CV: 8.0B medical diagnostics (blood bank, lab tests), 1118 contracts, 57 institutions. Extremely large scale. 3B at IMSS alone. Not clearly corrupt but requires institution-specific review.",
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

    for case_str in inserted:
        n_v = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors WHERE case_id=?", (case_str,)).fetchone()[0]
        n_c = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (case_str,)).fetchone()[0]
        name = conn.execute("SELECT case_name FROM ground_truth_cases WHERE case_id=?", (case_str,)).fetchone()[0]
        print(f"  {case_str}: {name[:65]} | {n_v} vendors | {n_c} contracts")

    conn.close()
    print("\nDone. Cases 449-455 inserted.")


if __name__ == "__main__":
    run()
