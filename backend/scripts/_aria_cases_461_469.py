"""
ARIA Cases 461-469: March 17 2026 investigation session.

Cases:
  461: JUAN MANUEL ARZALUZ VELAZQUEZ - Villa de Allende Municipal Capture (3.4B)
       Persona física, 3.44B SB at single tiny municipality, all uncontested
  462: DISTRIBUIDORA DE MEDICAMENTOS ZUERA - Q.Roo State Health Pharma Shell (261M)
       No RFC, 261M SB at Q.Roo state health then disappeared
  463: ELECTRICA POTOSINA - IMSS Electrical Capture (321M)
       No RFC, 313M SB + 7 more SB, 100% at IMSS 2006-2010
  464: NAVIERA ARMAMEX - INAPESCA Research Vessel Monopoly (1654M)
       No RFC, 1127M SB at INAPESCA, research vessel management services
  465: DECORACION Y MUEBLES - Hidalgo State Education Capture (358M)
       No RFC, 357M SB at Sistema de Educacion Publica de Hidalgo 2003
  466: PAVIMENTOS DE LA LAGUNA - Tamaulipas State Highway Monopoly (4067M)
       No RFC, 3274M SB at Tamaulipas + 536M SCT + 225M Chihuahua state
  467: GRUPO INDUSTRIAL RUBIO - SCT/SICT Bridge Construction Monopoly (4368M)
       No RFC, 100 contracts 96% SB, SCT+SICT+BANOBRAS+CONAGUA
  468: COET TUBERIAS - CONAGUA Water Pipeline Capture (669M)
       No RFC, 20 CONAGUA contracts 87% SB, 2012-2022
  469: GRUPO HIDALGUENSE - Hidalgo Bachilleres Institutional Capture (609M)
       No RFC, 535M at Hidalgo Colegio de Bachilleres

Also: FP markings (ACCESOS HOLOGRAFICOS passport security, FREYSSINET bridge specialist,
      POYRY engineering consulting)
      needs_review: AZERTIA, SISTEMAS Y COMPUTADORES, TOKA INTERNACIONAL, PROMEX EXTINTORES

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

    # ── Cases as (id_offset, vendor_ids, case_name, case_type, confidence, notes, fraud_mxn, yr1, yr2)
    cases = [
        (
            0,  # 461
            [(138470, "JUAN MANUEL ARZALUZ VELAZQUEZ", "high")],
            "JUAN MANUEL ARZALUZ VELAZQUEZ - Villa de Allende Municipal Capture",
            "procurement_fraud",
            "high",
            (
                "Extreme municipal-level institutional capture by a single individual (persona fisica). "
                "No RFC despite 3,488M MXN across 20 contracts (2014-2018). "
                "Dominant single contract: 3,443.9M MXN in a Licitacion Publica at "
                "Presidencia Municipal de Villa de Allende, Estado de Mexico in 2015 — "
                "100% single-bid, zero competing vendors. "
                "Villa de Allende is a small municipality in Estado de Mexico with approximately "
                "50,000 inhabitants. Its entire annual municipal budget is well under 1B MXN. "
                "A single construction contract of 3.44B = ~200M USD to one individual "
                "represents a complete capture of municipal public works. "
                "All remaining 19 contracts (2014-2018) are also single-bid at Villa de Allende "
                "except for 1 at Donato Guerra municipality. "
                "A persona fisica (individual contractor) receiving 3.5B in construction contracts "
                "at a small municipality without competition is structurally impossible without "
                "insider collusion with municipal officials. "
                "Estado de Mexico under multiple governors has documented municipal procurement "
                "fraud patterns. "
                "Classification: P6 Municipal Institutional Capture + P1 Monopoly by persona fisica."
            ),
            3_488_000_000,
            2014, 2018,
        ),
        (
            1,  # 462
            [(774, "DISTRIBUIDORA DE MEDICAMENTOS ZUERA SA DE CV", "high")],
            "DISTRIBUIDORA DE MEDICAMENTOS ZUERA - Q.Roo State Health Pharma Shell",
            "ghost_company",
            "high",
            (
                "Ghost/shell company pattern at Quintana Roo state health system. "
                "No RFC despite 278.8M MXN across 7 contracts. "
                "Pattern: minimal activity 2002-2003 at minor federal agencies (1M total), "
                "then 10-year dormancy, then sudden 261M single-bid contract in 2015 at "
                "Q ROO-Secretaria de Salud (Quintana Roo state health). "
                "The 261M SB contract scores risk=1.000 — maximum model score. "
                "Followed by 17.5M direct award at Gobierno del Estado de Quintana Roo in 2020. "
                "No competing bidders on the 261M contract. "
                "Pattern matches the shell company revival model: dormant company activated "
                "specifically to capture a large state health contract, then used again 5 years later. "
                "Quintana Roo state health procurement has documented corruption (Q.Roo CAPA Case 442, "
                "Q.Roo education Case 448 in same state). Multiple sectors captured in Q.Roo. "
                "Classification: P2 Ghost Company — pharma distributor shell activated for state "
                "health institutional capture."
            ),
            260_000_000,
            2015, 2020,
        ),
        (
            2,  # 463
            [(26825, "ELECTRICA POTOSINA SA DE CV", "high")],
            "ELECTRICA POTOSINA - IMSS Electrical Infrastructure Capture",
            "procurement_fraud",
            "high",
            (
                "Institutional capture at IMSS (Instituto Mexicano del Seguro Social) — electrical sector. "
                "No RFC despite 321M MXN across 9 contracts (2006-2010). "
                "Dominant contract: 313.3M MXN single-bid at IMSS in 2008 — risk score 1.000. "
                "8 of 9 contracts are single-bid at IMSS, 1 LP (competitive). "
                "100% institution concentration at IMSS — never served any other agency. "
                "Pattern: company name 'Electrica Potosina' (suggesting San Luis Potosi) "
                "winning the entirety of IMSS electrical infrastructure contracts as single bidder. "
                "The 313M single-bid contract in 2008 represents 97% of total lifetime value. "
                "Zero co-bidders across 5 years of IMSS contracting. "
                "IMSS electrical installation contracts (substations, wiring, equipment) "
                "should attract multiple regional electrical contractors — "
                "100% SB indicates either specification tailoring or bid suppression. "
                "Classification: P6 Institutional Capture at IMSS electrical sector."
            ),
            321_000_000,
            2006, 2010,
        ),
        (
            3,  # 464
            [(8486, "NAVIERA ARMAMEX SA DE CV", "high")],
            "NAVIERA ARMAMEX - INAPESCA Research Vessel Services Monopoly",
            "procurement_fraud",
            "high",
            (
                "Institutional capture at Instituto Nacional de Pesca y Acuacultura (INAPESCA). "
                "No RFC despite 1,654M MXN across 13 contracts. "
                "INAPESCA concentration: 5 contracts totaling 1,127M MXN (2016-2022), "
                "92.3% of INAPESCA contracts are single-bid. "
                "Contract descriptions: 'Servicios Especializados para la Administracion, "
                "Operacion y Mantenimiento del Buque de Investigacion' — research vessel management. "
                "INAPESCA operates the Mexican fishing research fleet. "
                "The contracts cover 2016-2022 across 3 multi-year service agreements: "
                "261.6M (2016), 80.1M+352.8M+28.4M (2019), 404.5M (2022). "
                "Research vessel management is a competitive market globally — no technical reason "
                "for 100% single-bid concentration at a single vendor over 6 years. "
                "Historical PEMEX contracts (267M 2002-2008, all SB) suggest a long-running "
                "relationship with government maritime/petroleum operations. "
                "Combined pattern: 20yr career of 100% single-bid maritime contracts "
                "across INAPESCA + PEMEX with no RFC. "
                "Classification: P6 INAPESCA Institutional Capture in research vessel services."
            ),
            1_127_000_000,
            2016, 2022,
        ),
        (
            4,  # 465
            [(11004, "DECORACION Y MUEBLES SA DE CV", "high")],
            "DECORACION Y MUEBLES - Hidalgo State Education Capture",
            "procurement_fraud",
            "high",
            (
                "Institutional capture at Sistema de Educacion Publica de Hidalgo (SEPH) — "
                "state education furniture/decoration procurement. "
                "No RFC despite 358M MXN across 13 contracts. "
                "Dominant contract: 356.8M MXN single-bid at SEPH in 2003 (risk=0.966). "
                "A furniture and decoration company winning 357M as single bidder at a state "
                "education system represents near-total capture of school furniture budget. "
                "13 contracts concentrated at Hidalgo state institutions (SEPH + DIF Hidalgo + "
                "Secretaria de Finanzas Hidalgo) — never served federal agencies after initial period. "
                "Pattern: Hidalgo state institutional capture — DECORACION Y MUEBLES is the "
                "second such case in Hidalgo state (GRUPO HIDALGUENSE captures Colegio de "
                "Bachilleres, Case 469). "
                "Educational furniture procurement for state school systems should attract "
                "multiple regional suppliers. Single-bid for 357M suggests specification "
                "tailoring or direct collusion with state education officials. "
                "Classification: P6 Hidalgo State Education Institutional Capture."
            ),
            356_800_000,
            2002, 2003,
        ),
        (
            5,  # 466
            [(9547, "PAVIMENTOS DE LA LAGUNA SA DE CV", "high")],
            "PAVIMENTOS DE LA LAGUNA - Tamaulipas/SCT Highway Monopoly",
            "procurement_fraud",
            "high",
            (
                "Multi-institution highway construction monopoly spanning state and federal agencies. "
                "No RFC despite 4,067M MXN across 17 contracts (2002-2018). "
                "Dominant contract: 3,274M MXN single-bid at SECODUE Tamaulipas state "
                "(Secretaria de Obras Publicas, Desarrollo Urbano y Ecologia del Estado de Tamaulipas) in 2009. "
                "Institution breakdown: Tamaulipas state 3274M (1 contract, SB), "
                "SCT federal 536M (7 contracts, all SB), "
                "Chihuahua state public works 225M (7 contracts, all SB). "
                "Both Tamaulipas and Chihuahua have well-documented state-level procurement "
                "corruption during 2006-2018 (Cesar Duarte Jaquez convicted of embezzlement "
                "in Chihuahua; Tamaulipas cartel interference in public works). "
                "A regional paving company (name suggests 'Laguna' area: Durango/Coahuila region) "
                "winning 100% of competitive tenders across 3 state/federal jurisdictions "
                "with zero competing bidders, and no RFC, over 16 years. "
                "The 3.27B SB at Tamaulipas state in 2009 alone is extraordinary — "
                "a single road paving contract worth ~260M USD to a single bidder. "
                "Classification: P1 Monopoly + P6 Multi-State Capture (Tamaulipas/Chihuahua/SCT)."
            ),
            4_067_000_000,
            2002, 2018,
        ),
        (
            6,  # 467
            [(7228, "GRUPO INDUSTRIAL RUBIO SA DE CV", "high")],
            "GRUPO INDUSTRIAL RUBIO - SCT/SICT Federal Bridge Construction Monopoly",
            "procurement_fraud",
            "high",
            (
                "Federal highway and bridge construction monopoly at SCT/SICT (Secretaria de "
                "Comunicaciones y Transportes / successor Secretaria de Infraestructura). "
                "No RFC despite 4,368M MXN across 100 contracts (2005-2025). "
                "96% single-bid rate — 96 of 100 contracts won without competition. "
                "Institution breakdown: SCT 1,756M (45 SB contracts 2005-2016), "
                "SICT 798M + 771M (bridges and highway modernization 2021-2025), "
                "BANOBRAS 291M (bridge construction), CAPUFE 128M. "
                "Contract types: major bridge construction (Quintin Arauz bridge 412M, "
                "El Zacatal bridge reconstruction Campeche 352M, Santa Maria Colotepec 291M), "
                "highway modernization (7.0-12.0m crown widening 447M), "
                "CONAGUA access vialidades 116M. "
                "100 contracts across 20 years with 96% SB for specialized bridge/highway work "
                "at the same federal agency is impossible without systematic spec-tailoring. "
                "Major bridge construction is competitive — multiple firms (ICA, GIA+A, TRADECO) "
                "operate in this space. Zero co-bidders despite being technically complex projects. "
                "Pattern mirrors TRANSPORTACIONES TAMAULIPECOS (Case 444) and GRUPO CONSTRUCTOR "
                "DIAMANTE (Case 443) — long-running SCT/SICT monopolies. "
                "Classification: P1 Monopoly + P6 SCT/SICT Institutional Capture in bridges."
            ),
            4_368_000_000,
            2005, 2025,
        ),
        (
            7,  # 468
            [(94014, "CONSULTORIA EN OBRAS ESTRUCTURALES DE TUBERIAS SA DE CV", "high")],
            "COET TUBERIAS - CONAGUA Water Pipeline Institutional Capture",
            "procurement_fraud",
            "high",
            (
                "Institutional capture at CONAGUA (Comision Nacional del Agua) — water pipeline "
                "and hydraulic infrastructure. "
                "No RFC despite 669M MXN across 23 contracts (2012-2023). "
                "20 of 23 contracts at CONAGUA (656M, 87% SB). "
                "Pattern: specialized water/pipeline engineering firm winning CONAGUA contracts "
                "with 87% single-bid rate over 11 years with zero RFC. "
                "Fits the CONAGUA water construction cluster pattern documented in: "
                "PAJEME (GT), PEREZ Y GIL (GT Case 439), URISA (GT Case 441), "
                "OZONE ECOLOGICAL (GT Case 449), INGENIERIA SANITARIA (GT Case 450). "
                "Each firm carves out a domain at CONAGUA with near-100% SB rates — "
                "collectively constituting a market allocation cartel at CONAGUA hydraulics. "
                "COET TUBERIAS specializes in tuberia (pipeline) structural works: "
                "a niche within the broader CONAGUA construction space, "
                "suggesting contract specs are written around specific pipeline engineering firms. "
                "Classification: P6 CONAGUA Institutional Capture + suspected CONAGUA cartel member."
            ),
            656_000_000,
            2012, 2022,
        ),
        (
            8,  # 469
            [(13731, "GRUPO HIDALGUENSE DE DESARROLLO SA DE CV", "high")],
            "GRUPO HIDALGUENSE DE DESARROLLO - Hidalgo Bachilleres Institutional Capture",
            "procurement_fraud",
            "high",
            (
                "Institutional capture at Colegio de Bachilleres del Estado de Hidalgo (COBACH). "
                "No RFC despite 609M MXN across 66 contracts (2010-2024). "
                "535M concentrated at COBACH Hidalgo — 6 SB contracts 2010-2016 "
                "totaling 535M, plus additional contracts 2023-2024 at elevated risk scores (1.000). "
                "COBACH Hidalgo institutional concentration: 87.8% of lifetime vendor value. "
                "Pattern: single contractor capturing Hidalgo's community college system construction "
                "budget through single-bid public tenders. "
                "Hidalgo state has multiple documented procurement capture cases — "
                "DECORACION Y MUEBLES (Case 465) captured SEPH education furniture, "
                "now GRUPO HIDALGUENSE captures COBACH school construction. "
                "The 535M across 6 contracts is a mid-range capture pattern "
                "for a state-level secondary education institution. "
                "Additional 2023-2024 contracts at risk=1.000 suggest ongoing capture. "
                "Classification: P6 Hidalgo State Bachilleres Institutional Capture."
            ),
            535_000_000,
            2010, 2024,
        ),
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
        9315: (
            "ACCESOS HOLOGRAFICOS: Sole domestic supplier of polycarbonate pre-printed passport pages "
            "for the Mexican passport system (SHCP/SRE). Passport security components (polycarbonate "
            "biometric data pages) require specialized security printing equipment and international "
            "certifications (ICAO Doc 9303). Very few firms globally can manufacture these — "
            "structural monopoly by technical and security requirements. 1053M DA at SHCP for "
            "passport pages 2021-2023 is legitimate single-source procurement."
        ),
        1095: (
            "FREYSSINET DE MEXICO: Mexican subsidiary of Freyssinet International (French civil "
            "engineering, Vinci Group). World leader in prestressed concrete, cable-stayed bridges, "
            "foundation reinforcement. Technical monopoly for specific bridge types requiring "
            "Freyssinet post-tensioning systems — many contracts require their proprietary technology. "
            "4.0B at CAPUFE+SCT across 136 contracts 2002-2024. Legitimate specialized engineering. "
            "Freyssinet has operated in Mexico for 40+ years."
        ),
        92203: (
            "POYRY MEXICO: Mexican subsidiary of Poyry PLC (Finnish engineering/consulting, now Afry). "
            "Multinational engineering consultant specializing in water, energy, industrial projects. "
            "Single 156M CONAGUA DA contract in 2010 for engineering consulting — legitimate "
            "specialized international engineering consultancy. No pattern of irregular procurement."
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
        27325: (
            "AZERTIA TECNOLOGIAS DE LA INFORMACION MEXICO: 473M, 382M SAT IT contract 2011 (LP). "
            "Azertia was Spanish IT multinational (Indra subsidiary). SAT IT systems require "
            "specialized tax technology. No RFC but Spanish subsidiary. Investigate SAT contract scope."
        ),
        2330: (
            "SISTEMAS Y COMPUTADORES DE GESTION: 297M, 51 contracts. SHCP 163M SB 2002 + ISSSTE 34M SB 2003. "
            "No RFC. IT procurement at Hacienda in early COMPRANET era. Old data structure A/B "
            "limits RFC coverage. Elevated risk but may reflect early IT procurement patterns."
        ),
        201045: (
            "TOKA INTERNACIONAL SAPI: 297M, 268M DA at Guardia Nacional 2019. "
            "Note: Different from TOKA IT Monopoly (Case 12 in GT). This is a separate company "
            "with 11 contracts across Guardia Nacional, Banco del Bienestar, CNEGySR, EDUCAL. "
            "Guardia Nacional 268M DA for unspecified services is moderately suspicious."
        ),
        14980: (
            "PROMEX EXTINTORES: 441 contracts, 546M, fire extinguisher/safety equipment. "
            "No RFC. 25 years across SEP, SEMARNAT, GN, IPN, AEFCM, IMSS. "
            "Highly dispersed (many institutions). Fire safety equipment requires certification "
            "but multiple suppliers exist. 56% DA + 33% SB. No extreme concentration. "
            "Possible legitimate specialized supplier but scale without RFC warrants review."
        ),
        26825: (
            "ELECTRICA POTOSINA: Already added to GT Case 463 (IMSS electrical capture). "
            "Skip in future scans."
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
        print(f"  {case_str}: {row[0][:65]} | {n_v} vendors | {n_c} contracts")

    conn.close()
    print("\nDone. Cases 461-469 inserted.")


if __name__ == "__main__":
    run()
