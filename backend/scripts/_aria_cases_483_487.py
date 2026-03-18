"""
ARIA Cases 483-487: March 17 2026 investigation session.

Cases:
  483: CONSTRUCTORA Y EDIFICADORA GIA A - Federal SSA Hospital Construction Capture (7625M)
       No RFC, SSA 6624M single SB (2009) + Chiapas 994M SB, hospital construction
  484: FINAMED - Veracruz State Health Pharmaceutical Capture (6381M)
       No RFC, single 6381M SB contract at Servicios de Salud de Veracruz (2009)
  485: HI-TEC MEDICAL - Medical Supplies Institutional Capture (6431M)
       No RFC, 60% DA across INCAN/HGM/Gea Gonzalez/IMSS, wound care + IV supplies
  486: LANDSTEINER PHARMA - IMSS Pharmaceutical Intermediary (5272M)
       No RFC, IMSS 3693M (134 DA) + ISSSTE 1165M, 17yr pharmaceutical distribution
  487: RAGAR - IMSS Medical Supply DA Capture (5098M)
       No RFC, IMSS 4496M (544c, 349 DA = 64%) + ISSSTE 545M, medications

Also: FP markings for energy multinationals, lottery tech, data errors, needs_review

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

    note_483 = (
        "Federal hospital construction institutional capture at SSA "
        "(Secretaria de Salud). "
        "No RFC despite 7,625M MXN across 3 contracts (2006-2009). "
        "SSA: 1 contract, 6,624M MXN — single-bid, 2009. "
        "Secretaria de Infraestructura del Estado de Chiapas: 1 contract, 994M MXN — SB, 2009. "
        "CAPFCE: 1 contract, 7M MXN — SB, 2006. "
        "All 3 contracts single-bid, 100% SB rate. "
        "Pattern: Construction company winning a single 6.6B hospital construction contract "
        "at the federal health secretariat without any competing bidder. "
        "The 2009 SSA contract (6.6B) represents an exceptionally large single-bid award "
        "at the federal health agency — consistent with the 2008-2012 hospital construction "
        "boom under IMSS/SSA expansion programs, where endemic bid-rigging was documented. "
        "Chiapas infrastructure 994M also 100% SB in the same year suggests coordinated "
        "state-federal capture. No RFC over this period is anomalous for a company of this scale. "
        "Classification: P6 SSA Federal Hospital Construction Institutional Capture."
    )

    note_484 = (
        "Veracruz state health pharmaceutical or medical institutional capture. "
        "No RFC despite 6,381M MXN in a single single-bid contract "
        "at Servicios de Salud de Veracruz (2009). "
        "Single largest single-vendor contract at a Mexican state health agency identified "
        "in this investigation session. "
        "Veracruz state health annual budget in 2009 was approximately 3-5B MXN total — "
        "a single 6.4B SB contract represents 125-200% of the annual agency budget, "
        "which is only possible for a multi-year framework contract or through fraudulent inflation. "
        "Company name 'FINAMED' does not clearly indicate pharmaceutical or construction capacity. "
        "Pattern: Single enormous SB contract at a state health agency with no RFC "
        "is consistent with procurement fraud during the 2006-2012 Veracruz state period "
        "where documented procurement irregularities were extensive. "
        "Classification: P6 Veracruz State Health Institutional Capture."
    )

    note_485 = (
        "Medical supplies institutional capture across federal health research hospitals. "
        "No RFC despite 6,431M MXN across 427+ contracts (2005-2025). "
        "Instituto Nacional de Cancerologia (INCAN): 106 contracts, 1,436M MXN (DA=70, SB=7). "
        "Hospital General Dr. Manuel Gea Gonzalez: 65 contracts, 823M MXN (DA=37). "
        "Hospital General de Mexico Dr. Eduardo Liceaga: 186 contracts, 642M MXN (DA=146). "
        "IMSS: 70 contracts, 574M MXN (DA=41). "
        "Contract content: 'ADQUISICION DE GRUPO I MATERIAL DE CURACION E INSUMOS MEDICOS' "
        "(wound care materials and medical supplies); "
        "'INSUMOS PARA TERAPIA DE FLUIDOS Y CLINICA DE CATETER' (IV fluids, catheters). "
        "Pattern: Single distributor supplying wound care, IV supplies, and catheters "
        "to Mexico's federal cancer institute, general hospitals, and IMSS "
        "with 60% direct award rate and no RFC over 20 years. "
        "DA concentration at specialized research hospitals (INCAN, HGM, Gea) is consistent "
        "with specification tailoring to favor incumbent supplier. "
        "Classification: P3 Medical Supply Intermediary — wound care and IV supplies "
        "across federal health research institutes."
    )

    note_486 = (
        "IMSS pharmaceutical intermediary embedded for 17 years without RFC. "
        "No RFC despite 5,272M MXN across 382+ contracts (2005-2022). "
        "IMSS: 331 contracts, 3,693M MXN (DA=134 = 40%, SB=0), 2005-2022. "
        "ISSSTE: 43 contracts, 1,165M MXN (DA=3, SB=2), 2006-2021. "
        "PEMEX: 5 contracts, 264M MXN (2011-2013). "
        "INSABI: 3 contracts, 48M MXN (2021). "
        "Contract content: 'MEDICAMENTOS' (pharmaceutical drugs). "
        "Pattern: Pharmaceutical distributor with no RFC winning IMSS drug contracts "
        "for 17 years — 40% DA rate at IMSS means 134 direct awards without competitive tender. "
        "Note: Landsteiner Scientific SA de CV (related entity of Landsteiner group) "
        "was already confirmed as GT vendor in Case 319. "
        "Landsteiner Pharma is a separate legal entity in the same pharmaceutical group "
        "operating on a parallel track within IMSS procurement. "
        "Classification: P3 Pharmaceutical Intermediary — IMSS medication capture."
    )

    note_487 = (
        "IMSS medication direct award capture — 349 direct awards at Mexico's largest "
        "public health insurer with no RFC. "
        "No RFC despite 5,098M MXN across 612+ contracts (2003-2024). "
        "IMSS: 544 contracts, 4,496M MXN (DA=349 = 64%, SB=6), 2003-2024. "
        "ISSSTE: 67 contracts, 545M MXN (DA=11, SB=0), 2003-2024. "
        "SEDENA: 3 contracts, 16M MXN (DA=1). "
        "Contract content: 'MEDICAMENTOS' (medications). "
        "Pattern: The 64% direct award rate at IMSS across 544 contracts over 21 years "
        "without RFC is the canonical medical procurement fraud signature. "
        "349 IMSS direct awards to a single company with no RFC over two decades "
        "indicates systematic circumvention of competitive tendering for pharmaceutical supply. "
        "Mirrors Medi Access (Case 291), Prodifarma (Case 318), and RAAM (Case 232) patterns "
        "as a member of the IMSS medical supply intermediary network. "
        "Classification: P3 Pharmaceutical Intermediary — IMSS medication DA capture."
    )

    cases = [
        (0, [(25327, "CONSTRUCTORA Y EDIFICADORA GIA A SA DE CV", "high")],
         "CONSTRUCTORA Y EDIFICADORA GIA A - SSA Federal Hospital Construction Capture",
         "procurement_fraud", "high", note_483, 7625000000, 2006, 2009),
        (1, [(42450, "FINAMED SA DE CV", "high")],
         "FINAMED - Veracruz State Health Institutional Capture",
         "procurement_fraud", "high", note_484, 6381000000, 2009, 2009),
        (2, [(5372, "HI-TEC MEDICAL SA DE CV", "high")],
         "HI-TEC MEDICAL - Medical Supplies Federal Hospital Capture",
         "procurement_fraud", "high", note_485, 6431000000, 2005, 2025),
        (3, [(20085, "LANDSTEINER PHARMA SA DE CV", "high")],
         "LANDSTEINER PHARMA - IMSS Pharmaceutical Intermediary",
         "procurement_fraud", "high", note_486, 5272000000, 2005, 2022),
        (4, [(13519, "RAGAR SA DE CV", "high")],
         "RAGAR - IMSS Medication Direct Award Capture",
         "procurement_fraud", "high", note_487, 5098000000, 2003, 2024),
    ]

    for (offset, vendors, cname, ctype, conf, notes, fraud, yr1, yr2) in cases:
        case_id_int = next_id + offset
        case_id_str = f"CASE-{case_id_int}"
        conn.execute("""
            INSERT OR REPLACE INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level, notes,
             estimated_fraud_mxn, year_start, year_end)
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

    # ── False positives — energy multinationals (remaining batch) ──────────────
    structural_fps = {
        7418: (
            "BAKER HUGHES DE MEXICO: Mexican subsidiary of Baker Hughes Company (NYSE: BKR, "
            "top-3 global oilfield services, ~$23B revenue). 8.3B at PEMEX — drilling fluids, "
            "completions, artificial lift, well services. Structural monopoly: only Schlumberger, "
            "Halliburton, Baker Hughes can deliver integrated oilfield services at PEMEX scale. "
            "89% SB reflects sole-source technical capability for Baker Hughes-specific systems. Legitimate."
        ),
        8095: (
            "NABORS PERFORACIONES DE MEXICO: Mexican subsidiary of Nabors Industries (NYSE: NBR), "
            "world's largest land drilling contractor. 8.2B PEMEX land drilling contracts. "
            "Structural: land drilling at scale is dominated by Nabors/Helmerich/Parker/Patterson-UTI. "
            "PEMEX land drilling contracts match Nabors' specialty. Legitimate."
        ),
        7456: (
            "SANDVIK DE MEXICO: Mexican subsidiary of Sandvik AB (Nasdaq Stockholm: SAND), "
            "Swedish industrial conglomerate. 8.2B — specialized mining and oil/gas drilling equipment "
            "(rock drilling tools, hard materials, cutting tools). Structural OEM: Sandvik tools are "
            "sole-sourced for Sandvik-specification drilling equipment. Legitimate."
        ),
        4462: (
            "GE SISTEMAS MEDICOS DE MEXICO: Mexican entity of GE Healthcare (part of General Electric, "
            "now independent NYSE: GEHC). 8.1B at IMSS/ISSSTE — CT scanners, MRI, X-ray, "
            "ultrasound, nuclear medicine equipment, and OEM maintenance/parts. "
            "77% DA rate reflects sole-source OEM maintenance contracts for GE-branded equipment. "
            "Structural OEM monopoly: only GE can supply GE medical imaging parts and service. Legitimate."
        ),
        39191: (
            "NUKEM INC: US-German nuclear fuel trading company (part of ORANO group). "
            "7.6B — nuclear fuel supply contracts to CFE for Laguna Verde nuclear power plant "
            "(Mexico's only nuclear facility, using GE BWR-5 reactors requiring specific fuel assemblies). "
            "Structural monopoly: nuclear fuel supply for specific reactor types is highly restricted "
            "to a handful of qualified suppliers (Westinghouse/FRAMATOME/TVEL/NUKEM). Legitimate."
        ),
        18407: (
            "ELECNOR SA: Spanish engineering and energy infrastructure company. "
            "7.4B at CFE — electrical grid infrastructure (transmission lines, substations). "
            "Structural: large electrical infrastructure construction has few qualified contractors; "
            "Elecnor is a major European electrical infrastructure company. Legitimate."
        ),
        22164: (
            "TECNICAS REUNIDAS SA: Spanish engineering company specializing in oil refinery and "
            "petrochemical plant construction (EPC contractor). 7.2B at PEMEX refining. "
            "Structural: oil refinery construction is dominated by a handful of global EPC contractors "
            "(Tecnicas Reunidas, Technip, KBR, Foster Wheeler). Legitimate."
        ),
        21557: (
            "MONCLOVA PIRINEOS GAS: Natural gas pipeline or distribution company. "
            "7.2B PEMEX/CFE gas contracts. "
            "Structural: natural gas infrastructure companies operate as regulated utilities "
            "with long-term exclusive concessions. Single-bid contracts reflect concession terms. Legitimate."
        ),
        117797: (
            "SECRETARIA DE LA DEFENSA NACIONAL (DIRECCION GENERAL): Government entity — SEDENA itself "
            "or a SEDENA industrial/production unit. 6.8B contracts with other government agencies. "
            "This is inter-institutional government contracting (fabrica de armas, SEDENA workshops, "
            "DIMEX clothing factory, etc.). Government-to-government contracting is not procurement fraud. "
            "Ente publico — classify as structural FP."
        ),
        82509: (
            "ABENER ENERGIA SA: Renewable energy subsidiary of Abengoa (Spanish). "
            "6.7B at CFE — solar thermal and wind energy plants under CFE concessions. "
            "Structural: large-scale renewable energy plants are developed by specialized EPC contractors "
            "under concession frameworks. Abengoa/Abener is a major global solar thermal developer. Legitimate."
        ),
        8298: (
            "ABENGOA MEXICO: Mexican subsidiary of Abengoa SA (Spanish engineering conglomerate). "
            "10.8B across CFE and other energy/infrastructure agencies. "
            "Structural: Abengoa specializes in energy infrastructure, water treatment, and IT systems "
            "at a scale requiring large specialized contractors. Despite Abengoa's 2016 bankruptcy "
            "in Spain (financial difficulties), their Mexican subsidiary operated legitimately under "
            "CFE concession agreements. Legitimate infrastructure contractor."
        ),
        15228: (
            "PRIDE DRILLING LLC: US offshore drilling company (now part of Transocean). "
            "6.2B PEMEX offshore drilling. "
            "Structural: offshore drilling rigs are highly specialized capital-intensive assets; "
            "Pride/Transocean is top-3 global offshore driller. Legitimate."
        ),
        27503: (
            "PRIDE INTERNACIONAL DE MEXICO: Mexican entity of Pride International (offshore drilling, "
            "now Transocean). 5.5B PEMEX drilling, 0% SB (all DA direct awards). "
            "Structural: specialized offshore drilling = structural monopoly. Legitimate."
        ),
        97484: (
            "TRAFIGURA BEHEER BV: Dutch multinational commodity trading company (top-3 global "
            "commodity trader with revenues >$300B). 5.9B energy commodity contracts with PEMEX. "
            "Structural: international crude oil and refined product trading for PEMEX is an "
            "oligopolistic market (Trafigura, Glencore, Vitol, Gunvor). Bilateral commodity "
            "trading contracts are inherently direct-negotiated. Legitimate."
        ),
        15428: (
            "PETROLEO BRASILEIRO MEXICO: Mexican subsidiary of Petrobras (Brazilian state oil company, "
            "NYSE: PBR). 5.9B — deepwater exploration and production JV contracts with PEMEX. "
            "Structural: Petrobras is the deepwater expertise leader (Santos Basin technology); "
            "PEMEX-Petrobras deepwater JVs are government-to-government strategic agreements. Legitimate."
        ),
        29816: (
            "ALSTOM MEXICANA: Mexican subsidiary of Alstom SA (French multinational, train and "
            "power generation equipment). 5.6B at CFE — power plant turbines, generators, "
            "hydroelectric equipment. Structural OEM: only Alstom can supply and maintain "
            "Alstom-branded power generation equipment. 75% DA reflects OEM parts and service. Legitimate."
        ),
        8147: (
            "MI DRILLING FLUIDS DE MEXICO: M-I SWACO, a Schlumberger subsidiary providing "
            "drilling fluids (mud) and wellbore solutions. 5.3B at PEMEX — oilfield drilling fluids. "
            "Structural: M-I SWACO is the global drilling fluids market leader; "
            "Schlumberger subsidiary embedded in PEMEX well operations. Legitimate."
        ),
        15519: (
            "MANTENIMIENTO MARINO DE MEXICO: Marine maintenance and support vessel company "
            "for PEMEX offshore operations. 8.6B, 100% SB at PEMEX E&P. "
            "Structural: specialized offshore maintenance vessels are chartered from a limited fleet "
            "of qualified operators. Sole-source for specific vessel type is expected. Legitimate."
        ),
        37392: (
            "GTECH PRINTING CORPORATION: Lottery management technology company (now IGT — "
            "International Game Technology, NYSE: IGT, global lottery market leader). "
            "7.7B at PRONOSTICOS PARA LA ASISTENCIA PUBLICA (2008) — lottery management system, "
            "instant ticket printing, terminal networks, and systems integration. "
            "Structural: national lottery management systems are provided by a handful of global "
            "providers (GTECH/IGT, Scientific Games, Camelot). PRONOSTICOS selected GTECH under "
            "a long-term exclusive lottery management concession. Legitimate monopoly."
        ),
    }
    for vid2, note in structural_fps.items():
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (f"FP: {note}", vid2))
    print(f"Marked {len(structural_fps)} structural FPs")

    # ── False positives — data errors ─────────────────────────────────────────
    data_err_fps = {
        282762: (
            "JYM INGENIEROS: Single 5,647M MXN contract at SNDIF (2022) described as "
            "'MANTENIMIENTO MENOR A INMUEBLES FORANEOS PROPIEDAD DEL SNDIF' "
            "(minor maintenance to SNDIF-owned rural facilities). "
            "5.6B for 'minor maintenance' at children's welfare agency is structurally impossible — "
            "SNDIF entire 2022 budget was ~12B (so this single maintenance contract would be 47%). "
            "This is almost certainly a decimal place error (likely 56.5M or 564M). "
            "Flag as data error — exclude from analytics."
        ),
    }
    for vid2, note in data_err_fps.items():
        conn.execute("""
            UPDATE aria_queue SET fp_data_error=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (f"FP: {note}", vid2))
    print(f"Marked {len(data_err_fps)} data error FPs")

    # ── Needs review ──────────────────────────────────────────────────────────
    needs_review = {
        4656: (
            "DISTRIBUIDORA INTER DE MEDIC Y EQ MEDICO: No RFC. 6.2B — IMSS 4631M (918c, DA=0, SB=12) "
            "+ ISSSTE 1404M (69c), 2002-2010 Structure A/B era. "
            "Medical equipment distributor with very low SB (1%) and zero DA at IMSS = "
            "mostly competed through open procedures. Pattern does NOT fit typical intermediary capture. "
            "Large scale with no RFC but competitive procurement process. Borderline — needs investigation."
        ),
        18461: (
            "EDEMTEC SA DE CV: No RFC. 6.6B — CFE 29 contracts (6606M, SB=27 DA=2, 2005-2017). "
            "93% SB rate at CFE over 12 years, including a single 3170M contract in 2016. "
            "No contract descriptions available. Electrical/engineering company at CFE. "
            "Extremely high SB at CFE over 12 years warrants investigation of procurement process."
        ),
        3881: (
            "ASEGURADORA HIDALGO: No RFC. 6.1B — IMSS 5903M (single contract, SB=0, DA=0, 2002). "
            "Insurance company with a single 5.9B IMSS contract in 2002 (Structure A era). "
            "Aseguradora Hidalgo is a real insurance company (now part of MetLife Mexico). "
            "A large insurance contract for IMSS employees/assets is plausible. "
            "Borderline — investigate contract nature (group life, property insurance, etc.)."
        ),
        15116: (
            "COMERCIALIZADORA COPAMEX: No RFC. 7.4B across gobernacion (77% DA). "
            "Copamex is one of Mexico's largest paper/packaging groups. "
            "Government paper supply at 77% DA rate. Could be legitimate paper supplier "
            "under framework agreements. Borderline — investigate DA justification."
        ),
        28192: (
            "OMEGA CONSTRUCCIONES INDUSTRIALES: No RFC. 7.5B across infraestructura. "
            "Construction company, 62% SB, 38% DA. Investigate institution breakdown "
            "and contract types before classification."
        ),
        34501: (
            "AILIA SA DE CV: No RFC. 5.3B energy sector, 100% SB. "
            "Investigate institution and contract types — appears to be energy infrastructure "
            "but company is unknown. High SB warrants investigation."
        ),
        27522: (
            "DEMAR INSTALADORA Y CONSTRUCTORA: No RFC. 5.3B energy sector, 100% SB. "
            "Installation and construction company. Investigate institution breakdown "
            "and whether this is PEMEX/CFE infrastructure capture."
        ),
        97486: (
            "AGB MATERIALS SA DE CV: No RFC. 5.4B energy sector, 0% SB (all DA). "
            "Energy/construction materials at PEMEX or CFE. Investigate contract scope."
        ),
        42839: (
            "IUSA MEDICION: No RFC. 6.1B energy sector, 30% SB, 28% DA. "
            "IUSA is a large Mexican industrial group (electrical equipment, metering). "
            "Energy meters for CFE distribution networks = structural near-monopoly in "
            "specialized metering market. Borderline — likely legitimate but verify."
        ),
    }
    for vid2, memo in needs_review.items():
        conn.execute("""
            UPDATE aria_queue SET review_status='needs_review', memo_text=?
            WHERE vendor_id=? AND in_ground_truth=0
        """, (memo, vid2))
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
        print(f"  {case_str}: {row[0][:65]} | {n_v} vendors | {n_c} contracts")

    conn.close()
    print("\nDone. Cases 483-487 inserted.")


if __name__ == "__main__":
    run()
