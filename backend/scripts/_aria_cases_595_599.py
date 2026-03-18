"""
ARIA Cases 595-599: March 17 2026 investigation session.

Cases:
  595: IMPRESORES EN OFFSET Y SERIGRAFIA - Bienestar Printing Monopoly (2.48B)
       100% SB, 5+ consecutive years 2020-2025, same contract type repeated annually,
       88% of value at Secretaria de Bienestar social program printing
  596: IMAGEN DE INMUEBLES - ISSSTE Cleaning Monopoly 2015-2016 (1.45B)
       779M + 671.5M SB at ISSSTE for cleaning services, 76% single institution
  597: EXCELENCIA EN EVENTOS GASTRONOMICOS - Ghost/Mismatch Cleaning Company (1.18B)
       Gastronomy events company wins 923M SB hospital cleaning at INPER + airports, disappeared 2007
  598: LACANDONIA OPERADORA DE VIAJES - QRoo Education 752M SB (Roberto Borge Era)
       Travel agency wins 752M SB for "food and lodging" at QRoo education secretariat,
       Roberto Borge convicted for corruption, 94% of vendor value in one contract
  599: JOBAMEX SEGURIDAD PRIVADA - ISSSTE Security Monopoly 659.8M SB (1c=97%)
       Single 659.8M SB contract at ISSSTE 2013 = 97% of vendor's total value

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

    note_595 = (
        "Secretaria de Bienestar printing monopoly — 5+ consecutive years, all single-bid, 2.48B. "
        "108 contracts 2007-2025, 2,799M MXN. DA=26%, SB=24% overall but Bienestar contracts 100% SB. "
        "BIENESTAR PRINTING CAPTURE PATTERN: "
        "(1) IMPRESORES EN OFFSET Y SERIGRAFIA wins the annual Bienestar social program printing contract "
        "every single year 2020-2025: 381.6M SB (2020), 416.1M SB (2021), 496.4M SB (2022), "
        "417.3M SB (2023), 170.6M SB (2024), 429.5M SB (2025). "
        "(2) All 6 consecutive annual contracts are SINGLE BID — no other printer competed in 6 years. "
        "(3) 2,477.6M MXN (88% of vendor's lifetime value) concentrated at Secretaria de Bienestar "
        "for identical printing service: 'SERVICIO DE IMPRESION PARA LA PROMOCION Y OPERACION DE...' "
        "(social program promotional materials). "
        "(4) Contract values spike to 496M in 2022 then drop to 170M in 2024 but jump again to 429M "
        "in 2025 — oscillation consistent with multi-year program cycle rather than competitive market. "
        "(5) Before 2020: scattered contracts at IMSS (184M, 29 contracts), IEP, Tren Maya — "
        "then sudden Bienestar capture 2020-2025. "
        "(6) No RFC on file; entity marked as individual (possible SC cooperative structure). "
        "Annual single-bid capture of the flagship AMLO government social program printing for 6 years "
        "without competition is a textbook P1/P6 institutional monopoly pattern. "
        "Classification: P1/P6 Impresores Bienestar Printing Monopoly — consecutive SB capture."
    )

    note_596 = (
        "ISSSTE cleaning monopoly 2015-2016 — 779M + 671.5M SB, 76% single institution. "
        "73 contracts 2003-2019, 1,916M MXN. DA=36%, SB=44%. "
        "ISSSTE CLEANING CAPTURE: "
        "(1) Two massive consecutive single-bid cleaning contracts at ISSSTE: "
        "779M SB 'SERVICIO DE LIMPIEZA' (2016) and 671.5M SB 'SERVICIO DE LIMPIEZA' (2015). "
        "Combined: 1,450.5M MXN from ISSSTE alone (76% of lifetime vendor value). "
        "(2) ISSSTE is the social security institution for federal government workers — "
        "its cleaning contracts have documented corruption patterns: overpriced services, "
        "ghost employees, union payroll evasion (consistent with documented ISSSTE vendor capture). "
        "(3) Before ISSSTE dominance: small contracts at SCT (131M, 4c), SRE (99M DA), INPeri (52M). "
        "(4) Company name: IMAGEN DE INMUEBLES — property image company. Core business is "
        "building image/aesthetics, not specialized hospital/government cleaning. "
        "(5) After 2019: no new contracts — disappeared after ISSSTE relationship ended. "
        "(6) 17-year activity window with two anomalous years (2015-2016) capturing 76% of total. "
        "Pattern consistent with P6 institutional capture at ISSSTE during EPN administration. "
        "Classification: P6 Imagen de Inmuebles ISSSTE Cleaning Capture (1.45B SB)."
    )

    note_597 = (
        "Gastronomy events company winning hospital/airport cleaning, 923M SB at INPER, disappeared 2007. "
        "11 contracts 2005-2007, 1,181M MXN. DA=0%, SB=91%. 3-year activity only. "
        "GHOST/MISMATCH PATTERN: "
        "(1) EXTREME INDUSTRY MISMATCH: 'EXCELENCIA EN EVENTOS GASTRONOMICOS' (Excellence in "
        "Gastronomic Events) is registered as an events/catering company. Its entire revenue "
        "comes from CLEANING SERVICES — hospitals, airports, tax offices. "
        "(2) Flagship contract: 923.1M SB at Instituto Nacional de Perinatología Isidro Espinosa "
        "de los Reyes (INPER) for 'servicio de limpieza' in 2007. A perinatal hospital's "
        "cleaning contract won single-bid by a gastronomy events company. "
        "(3) AEROPUERTO INTERNACIONAL DE LA CIUDAD DE MEXICO: 93.3M SB (2007) + 43.3M SB (2006) "
        "= 136.6M for airport cleaning — also single-bid. "
        "(4) SAT (tax authority): 75.9M SB for cleaning 2007. "
        "(5) ISSSTE: 12.5M SB + 11.5M SB for cleaning at work centers. "
        "(6) ALL 11 contracts are single-bid — zero competition across 3 years. "
        "(7) Total: 1.18B MXN in 3 years, then COMPANY DISAPPEARS entirely. "
        "A gastronomy company winning 923M at a federal hospital + airport + tax authority cleaning "
        "via exclusive single-bid awards then vanishing = textbook ghost company pattern. "
        "Classification: P2/P6 Excelencia Gastronomicos Ghost Cleaning Company — industry mismatch, "
        "multi-institution SB capture, disappears after 3 years."
    )

    note_598 = (
        "Lacandonia Operadora de Viajes — 752M SB food/lodging QRoo education (Borge era). "
        "61 contracts 2010-2016, 805M MXN. DA=56%, SB=43%. "
        "QUINTANA ROO EDUCATION FRAUD CONTEXT: "
        "(1) 94% OF VENDOR'S VALUE IN ONE CONTRACT: 752.6M SB at Q ROO-Servicios Educativos de "
        "Quintana Roo for 'Alimentacion y Hospedaje en el Estado de Quintana Roo' in 2014. "
        "(2) A TRAVEL AGENCY wins 752M for food and lodging at the state education secretariat "
        "of Quintana Roo — extreme scope mismatch for an operadora de viajes. "
        "(3) ROBERTO BORGE CONTEXT: Roberto Borge Angulo, Governor of Quintana Roo 2011-2016, "
        "was arrested in 2017 and sentenced to 11 years for money laundering and abuse of power. "
        "His administration systematically looted state education funds and social programs. "
        "The 2014 contract falls squarely within the Borge administration's most active period. "
        "(4) Q ROO-Servicios Educativos de Quintana Roo was identified in multiple investigations "
        "as a channel for Borge-era embezzlement through opaque service contracts. "
        "(5) After this single 752M contract, Lacandonia continues with only small travel agency "
        "contracts at CONAGUA (17M), IMSS (14M), water technology institute (12M) — "
        "all legitimate small-scale. The 752M is an extreme outlier. "
        "A Cancun travel agency funneling 752M in a single SB 'food and lodging' contract "
        "through the Borge administration's education entity = documented QRoo fraud ecosystem. "
        "Classification: P2/P6 Lacandonia QRoo Education Fraud — Roberto Borge era, travel agency "
        "front for 752M education fund embezzlement."
    )

    note_599 = (
        "ISSSTE security monopoly — 659.8M SB in one contract = 97% of vendor total. "
        "51 contracts 2008-2018, 690M MXN. DA=55%, SB=35%. "
        "ISSSTE SECURITY CAPTURE: "
        "(1) ONE CONTRACT IS 97% OF ALL REVENUE: 659.8M SB at ISSSTE for 'servicio de vigilancia' "
        "in 2013. All other 50 contracts combined total only 30.4M. "
        "(2) Single-bid for a 659.8M security contract at ISSSTE — no competition. Private security "
        "at this scale should attract multiple qualified bidders. "
        "(3) ISSSTE security services have documented corruption patterns: ghost guards, "
        "wage theft, substandard service delivery while charging full rates. "
        "(4) After the 659.8M contract: company continues with only tiny 1-6M contracts at "
        "ISSSTE, SAT, SCT, IMSS, COLEGIO GUERRERO — no more large contracts. "
        "The disappearance of large contracts after 2013 suggests the captive relationship "
        "ended (possibly procurement officer change or audit). "
        "(5) High DA rate (55%) across the remaining small contracts. "
        "A security company winning a single 659.8M SB contract representing 97% of its "
        "business lifetime at ISSSTE — with no repeat large contract thereafter — "
        "is consistent with P6 single-institution capture during a specific administration period. "
        "Classification: P6 Jobamex ISSSTE Security Monopoly — 659.8M SB 2013, single-event capture."
    )

    cases = [
        (0, [(31833, "IMPRESORES EN OFFSET Y SERIGRAFIA SC DE RL DE CV", "high")],
         "IMPRESORES OFFSET - Secretaria de Bienestar Printing Monopoly 2020-2025 (2.48B SB)",
         "procurement_fraud", "high", note_595, 2477600000, 2020, 2025),
        (1, [(12412, "IMAGEN DE INMUEBLES S.A. DE C.V.", "high")],
         "IMAGEN DE INMUEBLES - ISSSTE Cleaning Monopoly 2015-2016 (1.45B SB)",
         "procurement_fraud", "high", note_596, 1450500000, 2015, 2016),
        (2, [(17326, "EXCELENCIA EN EVENTOS GASTRONOMICOS, S.A. DE C.V.", "high")],
         "EXCELENCIA GASTRONOMICOS - Ghost Cleaning Company INPER+Airport+SAT (1.18B)",
         "procurement_fraud", "high", note_597, 1180517195, 2005, 2007),
        (3, [(46363, "Lacandonia Operadora de Viajes S.A. de C.V.", "high")],
         "LACANDONIA - QRoo Education Food/Lodging 752M SB Roberto Borge Era",
         "procurement_fraud", "high", note_598, 752600000, 2014, 2014),
        (4, [(38250, "JOBAMEX SEGURIDAD PRIVADA, S.A. DE C.V.", "high")],
         "JOBAMEX - ISSSTE Security Monopoly 659.8M SB (97% Single Contract)",
         "procurement_fraud", "high", note_599, 659800000, 2013, 2013),
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
        43890: (
            "FP structural_monopoly: AXA SEGUROS — Mexican subsidiary of AXA S.A. (France), "
            "one of the world's largest insurance groups. 379 contracts 3.7B at CAPUFE (road user insurance), "
            "SEDENA, SRE, FONATUR, universities. Competitive bidder for government property/life/vehicle "
            "insurance. AXA is among Mexico's top 5 insurers by premium volume. "
            "Diverse institutions, legitimate insurance services."
        ),
        12091: (
            "FP structural_monopoly: SEGUROS INBURSA S.A. GRUPO FINANCIERO INBURSA — "
            "insurance company of Grupo Financiero Inbursa (Carlos Slim). 76 contracts 1.3B at CFE (716M), "
            "CAPUFE ports, ISSSTE, BANJERCITO. Provides property/infrastructure insurance for "
            "government-owned energy and transport assets. Legitimate major insurer."
        ),
        10852: (
            "FP structural_monopoly: ASEGURADORA HIDALGO S.A. — historical Mexican insurance company, "
            "1 contract 1.19B 2002 at STPS for 'Poliza de accidentes personales' (workers accident insurance). "
            "Aseguradora Hidalgo was a legitimate licensed insurer (later restructured/absorbed). "
            "Structure A data era, single contract for mandatory workers accident coverage. "
            "No corruption evidence."
        ),
        58855: (
            "FP structural_monopoly: MCKINSEY & COMPANY INC. MEXICO — Mexican operations of McKinsey & Co., "
            "the world's premier management consulting firm. 20 contracts 816M at PEMEX PEP (330M DA), "
            "Pronósticos (107M DA), SEP (96M DA), Secretaria de Economia, ASA. "
            "Strategic consulting DAs are standard for specialized management advisory — "
            "McKinsey expertise is not substitutable via competitive tender. Legitimate global firm."
        ),
        1742: (
            "FP structural_monopoly: QUALITAS COMPANIA DE SEGUROS S.A.B. DE C.V. — "
            "Mexico's largest vehicle insurance company (publicly traded on BMV:Q since 2012). "
            "66 contracts 1.1B at CAPUFE (road user insurance 689M), PEMEX, CFE, state governments. "
            "Vehicle fleet and road user insurance for government entities. Competitive market leader "
            "in auto insurance. Fully legitimate publicly traded insurer."
        ),
        27544: (
            "FP structural_monopoly: SERVICIOS INTEGRALES GSM S DE R.L. DE C.V. — "
            "specialized oil/gas/geothermal well drilling and completion services contractor. "
            "3 contracts 5.1B at PEMEX PEP (4.49B, 2006 well drilling) and CFE (584M geothermal 2014/2016). "
            "Drilling services require specialized equipment and certification — few operators qualify. "
            "Oil drilling procurement often results in single-bid due to equipment specificity. "
            "Legitimate specialized energy infrastructure contractor."
        ),
        813: (
            "FP structural_monopoly: SEPSA S.A. DE C.V. — SEPSA (Servicio de Proteccion y Seguridad) "
            "is a licensed armored vehicle/values transport company. 111 contracts 901M at BANJERCITO (628M), "
            "SITHISSSTE (186M), CAPUFE (58M), LICONSA. Values transport is a regulated specialized service "
            "requiring CNBV/federal licensing with strict security requirements. "
            "SEPSA is one of Mexico's established values transport operators. Legitimate."
        ),
        49253: (
            "FP structural_monopoly: SEGUROS SURA SA DE CV — Mexican subsidiary of Suramericana S.A. "
            "(SURA), one of Latin America's largest insurance groups (Colombia, NYSE:PFGRUPSURAMR). "
            "313 contracts 1.27B at CONAFOR (190M), DICONSA (166M), LICONSA (123M), BANOBRAS, ISSFAM. "
            "Insurance services for government assets, forest insurance (CONAFOR), institutional property. "
            "Legitimate major international insurer, fully regulated."
        ),
        8127: (
            "FP structural_monopoly: AEROSERVICIOS ESPECIALIZADOS S.A. DE C.V. — "
            "specialized helicopter charter aviation company for oil platform operations. "
            "12 contracts 3.2B+ at PEMEX PEP (3.05B helicopter transport for offshore platforms) "
            "and CFE (175M for geothermal/transmission line access). Helicopter aviation for offshore "
            "oil operations is a hyper-specialized market with very few certified operators in Mexico. "
            "PEMEX offshore logistics requires dedicated aviation contractors. Legitimate specialized operator."
        ),
    }
    for vid, note in structural_fps.items():
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
            WHERE vendor_id=?
        """, (note, vid))

    # Compucentro + Detroit Diesel + Camiones Especiales + Dimension Data
    conn.execute("""
        UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
        WHERE vendor_id=217
    """, ("FP structural_monopoly: COMPUCENTRO S.A. DE C.V. — established computer hardware/IT "
          "distributor, 23-year track record (2002-2024), 98 contracts 1.04B at IMSS (725M national "
          "computer program 2022), INEEL, SENASICA, FONATUR. Primarily competitive procurement. "
          "Legitimate multi-institution IT equipment distributor.",))

    conn.execute("""
        UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
        WHERE vendor_id=54210
    """, ("FP structural_monopoly: DETROIT DIESEL ALLISON DE MEXICO S. de R.L. de C.V. — "
          "authorized Freightliner/Detroit Diesel truck dealer in Mexico. 49 contracts 542M at SEDENA "
          "(360M Freightliner military trucks via DA), DICONSA (61M), CFE (34M). DAs for Freightliner "
          "trucks are standard sole-source procurement for brand-specific vehicles/parts. "
          "Legitimate authorized vehicle dealer.",))

    conn.execute("""
        UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
        WHERE vendor_id=15679
    """, ("FP structural_monopoly: CAMIONES ESPECIALES S.A. DE C.V. — truck/commercial vehicle dealer. "
          "20 contracts 407M at SEDESOL (195M vehicle procurement), DICONSA (120M), PEMEX (75M tanker trucks). "
          "Diverse government clients, competitive procurement. Legitimate commercial vehicle dealer "
          "providing specialized vehicles (tanker trucks, delivery vehicles) for social programs.",))

    conn.execute("""
        UPDATE aria_queue SET fp_structural_monopoly=1, review_status='false_positive', memo_text=?
        WHERE vendor_id=94179
    """, ("FP structural_monopoly: DIMENSION DATA COMMERCE CENTRE MEXICO SA DE CV — "
          "Mexican subsidiary of Dimension Data (now NTT Ltd), South African/global IT services company. "
          "11 contracts 391M at CISEN (220M IT infrastructure), IFT (164M managed IT services). "
          "Intelligence and telecom regulator IT infrastructure is legitimately procured from "
          "specialized global IT firms via DA. NTT/Dimension Data is a recognized government IT provider. "
          "Legitimate global IT services subsidiary.",))

    print(f"Marked {len(structural_fps) + 4} FPs (all structural_monopoly)")

    # ── Needs review ──────────────────────────────────────────────────────────
    needs_review = {
        13949: (
            "PRODUCTOS SEREL S.A. DE C.V.: 269 contracts 2003-2025, 4.8B MXN. DA=34%, SB=32%. "
            "Food/catering services at IMSS-Bienestar (528M), IMSS (408M), Hospital Juárez (386M), "
            "CONADE (353M), ISEM (311M). Diverse institutions across 23 years. "
            "Hospital meal services is a legitimate multi-institution operation. "
            "DA=34% is moderate for catering. No EFOS/SFP/media hits. Low priority."
        ),
        11799: (
            "ACCESORIOS Y SUMINISTROS INFORMATICOS S.C.: 35 contracts 2003-2006, 2.79B. "
            "ONE OUTLIER: 2,757.6M CP at SEP 2005 for 'SERVICIO PARA PONER A DISPOSICION DE ESTA "
            "SECRETARIA' — 99% of total value. Other contracts tiny (2-6M). "
            "Structure A/B era data. The 2.76B contract may be the Fox-era SEP IT outsourcing program "
            "(which had documented issues). Insufficient data to classify without original documentation."
        ),
        4363: (
            "POLIETILENOS DEL SUR SA DE CV: 282 contracts 2002-2025, 3.73B. SB=8%, DA=21%. "
            "ONE OUTLIER: 3,373.5M SB at SAGARPA 2007 for 'Bolsas de Polietileno Negra' = 90% of value. "
            "Other contracts: LICONSA canastillas (147M), postal supplies (96M), CONAFOR (24M). "
            "The 3.37B plastic bags contract at agriculture ministry 2007 is suspicious but may be "
            "a legitimate large reforestation/agricultural program. Structure B era. Insufficient evidence."
        ),
        13010: (
            "CONSTRUCCIONES Y SERVICIOS DEL NORESTE SA DE CV: 30 contracts 2003-2024, 1.71B. "
            "DA=10%, SB=90%. CONAGUA 72% (1.23B across 5c). Specialized regional water/hydraulic "
            "contractor for Monterrey/NL area (SADM, NL government, CONAGUA). 90% SB for specialized "
            "water infrastructure is plausible for niche regional operator. No media/SFP hits."
        ),
        31116: (
            "SUMINISTROS PROMOCIONES Y SUPERVISION DE OBRAS SA DE CV: 21 contracts 2007-2025, 1.58B. "
            "DA=24%, SB=71%. Hospital construction at IMSS-Bienestar (787M, 2024 DA) and ISSSTE (658M, 2025). "
            "Active recent contracts suggest ongoing viable contractor. Diverse (Quintana Roo, Progreso port). "
            "Hospital construction with large DAs warrants investigation but insufficient standalone GT."
        ),
        19314: (
            "PALO FIERRO CONSTRUCCIONES SA DE CV: 27 contracts 2005-2010, 1.55B. DA=0%, SB=100%. "
            "ONE OUTLIER: 1,392.6M SB at Universidad de Sonora 2010 for lab facility = 90% of value. "
            "Sonora regional contractor active only 2005-2010. The UNISON lab contract (90% of value, "
            "single bid) is suspicious but is Structure B era data from a state university. "
            "Insufficient evidence without more institutional context."
        ),
        35911: (
            "TORDEC SA DE CV: 26 contracts 2008-2025, 1.68B. DA=19%, SB=69%. CONAGUA 58% (969M, 2c). "
            "Civil/hydraulic infrastructure across Puebla, NL, Estado de Mexico. 724.7M DA at CONAGUA "
            "2025 for Agua Prieta aqueduct construction. Diverse multi-state contractor, relatively "
            "recent activity. No media hits. Needs investigation of CONAGUA DA process."
        ),
        21091: (
            "PROYECTOS Y CONSTRUCCIONES VIRGO SA DE CV: 51 contracts 2005-2025, 1.32B. DA=8%, SB=92%. "
            "Road/canal/water construction across Sonora, SCT, SADER, CONAGUA, Marina. 21-year track "
            "record, diverse clients, 92% SB across many institutions. Plausible established contractor "
            "winning technical bids as sole qualified bidder in niche regional markets."
        ),
        660: (
            "VIAJES KOKAI SA DE CV: 204 contracts 2002-2021, 1.2B. DA=54%, SB=42%. "
            "Travel agency for government air travel: CFE (228M), SRE (202M), SEDENA (144M), NAFINSA. "
            "54% DA rate for travel agency is high — government air travel should be competitively tendered. "
            "Diverse institutions, 20-year track record. No RFC. Needs investigation of DA justifications."
        ),
        69896: (
            "DESARROLLOS DE TI: 49 contracts 2010-2025, 916M. DA=8%, SB=24%. "
            "ONE OUTLIER: 735.1M CP at IMSS 2024 for national computer equipment acquisition program. "
            "Other contracts are small (5-82M). The 2024 IMSS program is a large national IT procurement. "
            "Diverse clients (CAPUFE, CIATEQ, INEE, FGR). Registered as individual. Low priority."
        ),
        1320: (
            "PROFESIONALES EN MANTENIMIENTO Y LIMPIEZA SA DE CV: 272 contracts 2002-2025, 2B. "
            "DA=24%, SB=35%. IMSS-Bienestar (1.03B recent, 2025), ISSSTE (158M), INAH (107M), IPN. "
            "Professional cleaning company with 24-year track record, recently winning large "
            "IMSS-Bienestar hospital cleaning contracts. Diverse institutions. No EFOS/SFP. "
            "The 859.9M 2025 IMSS-Bienestar contract warrants monitoring."
        ),
        117798: (
            "HERPAY SA DE CV: 16 contracts 2013-2024, 1.4B (as reported). DA=31%, SB=44%. "
            "Military uniforms/equipment: Guardia Nacional (579M), SEDENA (474M), state security. "
            "Clothing/uniform supplier for defense sector. 12-year track record. "
            "No EFOS/SFP hits. Defense sector procurement has structural characteristics. Low priority."
        ),
        19665: (
            "GVICOA SA DE CV: 128 contracts 2005-2025, 1B. DA=53%, SB=15%. "
            "IMSS ophthalmology services (655M, 99c) and SEDENA medical supplies (288M DA). "
            "Specialized ophthalmology/dialysis services at IMSS 'centros de excelencia'. "
            "53% DA at IMSS over 21 years is concerning. Needs RFC verification and DA justification review."
        ),
        108584: (
            "CAMIONES REPUESTOS Y ACCESORIOS SA DE CV: 21 contracts 2013-2025, 758M. DA=33%, SB=24%. "
            "Truck/vehicle dealer: DICONSA (428M, 3c), SEDENA (201M), Marina (81M), CFE. "
            "DICONSA vehicle procurement supplier. Diverse government clients, plausible vehicle dealer. "
            "No EFOS/SFP. Low priority."
        ),
        105072: (
            "ALMACENADORA KAVE SA DE CV: 141 contracts 2013-2024, 1.19B. DA=27%, SB=65%. "
            "Fuel/diesel distribution: IMSS (518M, 45c), SEDENA (232M, 11c), CONAGUA (129M). "
            "Fuel supply to hospitals, military, water authority. Diverse clients, commodity service. "
            "No EFOS/SFP. Fuel distribution is a legitimate commodity service with moderate risk profile."
        ),
        157175: (
            "SEA DESARROLLO DE INFRAESTRUCTURA SA DE CV: 23 contracts 2015-2025, 675M. DA=26%, SB=70%. "
            "Estado de Mexico Finanzas (303M), IMSS (122M), Zacatecas, Hidalgo, FGR. "
            "Multi-state infrastructure: hospitals, solar energy, maintenance. 11-year track record. "
            "Diverse institutions. No EFOS/SFP. No specific corruption evidence."
        ),
        52127: (
            "CASILDA CONSTRUCCIONES SA DE CV: 35 contracts 2010-2023, 665M. DA=34%, SB=46%. "
            "ONE OUTLIER: 475.3M SB at IMSS-Bienestar for hospital replacement 2023 (71% of value). "
            "Plus Nayarit state construction (82M). Small Nayarit regional contractor "
            "winning large federal hospital construction contract as single bid. "
            "Warrants investigation of the IMSS-Bienestar hospital tender process."
        ),
        166285: (
            "GRUPO DAXME SA DE CV: 1 contract 2015, 645.8M at Secretaria de Bienestar for "
            "'ADQUISICION DISTRIBUCION E INSTALACION DE SISTEMAS PARA...'. SAME VALUE AS BPG INGENIERIA "
            "(VID 124009) same institution same year — possible joint procurement or co-vendor on same "
            "procedure. 2015 Bienestar technology distribution program (tablets/solar?). "
            "Insufficient standalone evidence. Low priority."
        ),
        124009: (
            "BPG INGENIERIA SA DE CV: 2 contracts 2013-2015, 647M. DA=50%, SB=0%. "
            "Same 645.8M Bienestar contract as GRUPO DAXME (VID 166285) — possible co-vendor or "
            "joint award. P3 intermediary pattern flagged. 1.1M DA at CONAGUA (minor). "
            "Needs investigation of 2015 Bienestar technology procurement to determine if "
            "these are duplicate entries or co-vendors in same large program."
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
    print("\nDone. Cases 595-599 inserted.")


if __name__ == "__main__":
    run()
