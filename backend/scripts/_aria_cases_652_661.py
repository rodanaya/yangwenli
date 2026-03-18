"""
ARIA Cases 652-661: March 18 2026 investigation session.

Cases:
  652: ACTIDEA SA DE CV - SRE Events DA Capture 847M (90%DA 2012-2019)
  653: PENTAFONINT - SRE Call Center DA 555M (SRE 400M 100%DA)
  654: VH CONSTRUCCIONES - CINVESTAV Construction DA 686M (89%DA)
  655: FARMACEUTICA SURESTE - Veracruz Pharma Monopoly 967M (SB=1 risk=1.00)
  656: SITAH SOLUCIONES - SE+INAES Media Services 715M (SB=1 risk=1.00)
  657: CONSTRUIDEAS INNOVACION - SAT Construction 409M (94%SB)
  658: POWER SYSTEMS SERVICE - BANJERCITO Infrastructure 1.07B (risk=0.99)
  659: SURTIDOR ELECTRICO MONTERREY - IMSS Electrical Supply 535M
  660: CONSTRUCTORA GURRIA - SEDATU Construction 1.36B (89%SB)
  661: BEBIDAS PURIFICADAS - ISSSTE Hospital Water Supply 736M (92%DA)

Run from backend/ directory.
"""

# CASE-652: VID 73761 ACTIDEA SA DE CV
#   - 847.3M, 147 contracts, 90% DA, 7% SB, 2012-2019, gobernacion.
#   - SRE 241.7M (14 contracts, 100% DA): All direct awards for "Servicios de
#     logística y organización" and "Servicios integrales de administración" —
#     events/logistics captured via pure DA at the foreign ministry.
#   - SE (Secretaría de Economía) 105.1M (5c, 80%DA, 20%SB): additional events.
#   - Instituto Nacional del Emprendedor 103.4M (2c, 100%SB, risk=1.00): LP won
#     uncontested for "Servicios integrales de administración, organización..."
#   - P3 intermediary capturing SRE events/logistics budget via DA (241M across
#     14 contracts, 100% DA). Cross-institutional (SRE+SE+INAES) with 90% DA rate.
#     No competitive procedures at SRE — all direct awards for "eventos" services.

# CASE-653: VID 111685 PENTAFONINT SA DE CV
#   - 555.1M, 22 contracts, 73% DA, 27% SB, 2013-2020, trabajo.
#   - SRE 400.0M (2 contracts, 100% DA): 2016 DA "Servicio de atención telefónica
#     de información para orientación consular a mexicanos en el extranjero" and
#     2020 DA for same — telephone contact center for consular services. 400M in
#     just 2 DAs to SRE for call center services.
#   - STPS 53.6M (2c, 100%DA): Contact center for STPS.
#   - NAFIN 32.9M (1c, SB=1): LP contact center.
#   - P6 SRE call center DA capture: 400M in 2 consecutive DAs (2016+2020) for
#     consular telephone services without competitive bidding. STPS adds 53M DA.
#     Phone/contact center services captured across SRE and STPS via DA.

# CASE-654: VID 11948 VH CONSTRUCCIONES Y ASESORIA EN INGENIERIA SA DE CV
#   - 686.8M, 137 contracts, 61% DA, 38% SB, 2003-2025, educacion.
#   - CINVESTAV 193.9M (81 contracts, 89% DA, 10% SB): 81 construction contracts
#     at the Centro de Investigación y Estudios Avanzados del IPN — Mexico's premier
#     government research center. 89%DA for building works at a federal research center.
#   - IMSS-Patronato 205.0M (23c, 48%DA): Hospital/facilities construction at IMSS.
#   - GRO-Comisión Agua Potable 135M (5c, 100%SB): LP water infrastructure Guerrero.
#   - P3 CINVESTAV construction DA capture: 81 DA contracts at a single research
#     institution is structural single-vendor capture. CINVESTAV bypasses competitive
#     procedures for building works (lab construction, building rehab, facilities).

# CASE-655: VID 46263 COMERCIALIZADORA FARMACEUTICA DEL SURESTE
#   - 967.4M, 57 contracts, 61% DA, 16% SB, 2010-2025, salud.
#   - Veracruz state 457.8M (6c, 100% SB): State government medication supply via LP
#     with zero competition.
#   - Universidad Veracruzana 279.6M (2c, 100%SB): 2024 LP SB=1 risk=1.00
#     "Suministro de medicamentos para los derechohabientes" + 2025 LP SB=1 risk=0.68.
#   - VER-UV 171.6M (3c, 67%DA): Additional UV contracts.
#   - A Veracruz pharmaceutical distributor monopolizing medication supply to Veracruz
#     state government and the Universidad Veracruzana (which runs medical school
#     hospitals) via LP procedures with zero competition. UV 2024 SB=1 risk=1.00.
#     P6 Veracruz pharmaceutical regional monopoly.

# CASE-656: VID 208503 SITAH SOLUCIONES INTELIGENTES CON TALENTO HUMANO S DE RL DE CV
#   - 715.7M, 13 contracts, 38% DA, 62% SB, 2017-2020, hacienda.
#   - SE 191.5M (1c, SB=1, risk=0.27): "Servicios especializados con terceros para
#     difusión" — media/promotion services LP won uncontested 2018.
#   - INAES 129.6M (1c, SB=1, risk=1.00): "Contratación de servicios especializados
#     con terceros para difusión" LP 2018 SB=1 risk=1.00 at the National Institute
#     of Social Economy.
#   - CEAV (Atención a Víctimas) 85.0M (3c).
#   - ProMéxico 31.2M SB=1, CONAVI 27.6M SB=1.
#   - P3 media/difusión services intermediary: SE+INAES+CEAV+ProMéxico+CONAVI all
#     captured via LP won uncontested. INAES 129M LP SB=1 risk=1.00 in 2018 is the
#     core red flag. Cross-institutional difusión services monopoly.

# CASE-657: VID 99083 CONSTRUIDEAS INNOVACION Y DESARROLLO
#   - 409.4M, 16 contracts, 6% DA, 94% SB, 2010-2024, hacienda.
#   - SAT 143.3M (7 contracts, 0%DA, 100%SB): 7 consecutive SAT construction
#     contracts all won uncontested via LP — building remodeling, infrastructure.
#   - CDMX-TSJ 77.2M (1c, SB=1): Tribunal Superior renovation.
#   - TELECOMM 54.4M (1c, DA, risk=0.56): Maintenance via DA.
#   - FGR 19.1M (1c, SB=1): FGR building rehabilitation.
#   - P6 SAT construction LP monopoly: 7 SAT contracts all won without competition.
#     SAT should run competitive tenders for building works but this vendor won
#     every SAT construction contract in the period uncontested. 94%SB overall.

# CASE-658: VID 11621 POWER SYSTEMS SERVICE SA DE CV
#   - 1,077.9M, 213 contracts, 38% DA, 34% SB, energia.
#   - BANJERCITO 734.2M (40c, 25%DA, 48%SB): Electrical/power systems maintenance
#     at the Banco Nacional del Ejército. 2023 LP SB=1 risk=0.99 174.9M "Contratación
#     del servicio preventivo/correctivo al equipamiento de generación eléctrica".
#     2018 LP SB=1 88.4M + 2019 LP SB=1 83.5M — consecutive uncontested LP wins.
#   - CAPUFE 167.7M (22c, 14%DA, 86%SB): Highway infrastructure maintenance.
#   - P6 BANJERCITO power/electrical infrastructure capture: 734M at the army bank's
#     facilities across 40 contracts. The 2023 LP SB=1 risk=0.99 for 174M is the
#     clearest signal. Consecutive uncontested LP wins for military bank electrical
#     systems across multiple years.

# CASE-659: VID 31498 SURTIDOR ELECTRICO DE MONTERREY SA DE CV
#   - 535.9M, 40 contracts, 50% DA, 32% SB, 2010-2025, salud.
#   - IMSS 533.1M (32c, 56%DA, 34%SB): 2017 LP SB=1 457.5M "Suministro e instalación"
#     of electrical equipment + 2025 LP SB=1 risk=1.00 12.5M + 2024 LP SB=1 risk=1.00
#     11.2M. An electrical equipment supply/installation vendor monopolizing IMSS
#     procurement across Monterrey/Mexico at 533M.
#   - P6 IMSS electrical supply monopoly: The 2017 457.5M uncontested LP for IMSS
#     electrical systems is the anchor contract. Followed by continued uncontested
#     LP wins in 2024-2025 at risk=1.00. Consistent single-bid pattern at IMSS.

# CASE-660: VID 11785 CONSTRUCTORA GURRIA Y ASOCIADOS SA DE CV
#   - 1,355.5M, 38 contracts, 34% DA, 89% SB, 2009-2023, infraestructura.
#   - SEDATU 866.5M (9c, 33%DA, 67%SB): Community infrastructure (polideportivos,
#     senderos, bardas perimetrales) via LP won uncontested. 2023 LP SB=1 risk=0.62
#     127.4M "Construcción de senderos y movilidad interior" for Sembrando Vida.
#   - Chiapas-SOP 155.9M (3c, 100%SB): State road/water construction uncontested.
#   - CONAGUA 62.3M (6c, 83%SB): Water infrastructure.
#   - P6 SEDATU/Chiapas construction regional monopoly: 1.36B across SEDATU federal
#     community programs and Chiapas state works, all uncontested. 89% SB rate across
#     38 contracts. Chiapas-based construction firm winning both federal SEDATU
#     Sembrando Vida projects and Chiapas state infrastructure uncontested.

# CASE-661: VID 197676 BEBIDAS PURIFICADAS S DE RL DE CV
#   - 736.4M, 407 contracts, 85% DA, 13% SB, 2017-2025, salud.
#   - ISSSTE 615.2M (37c, 92%DA, 5%SB): Hospital water supply via DA. Purified water
#     delivery to ISSSTE hospitals across Mexico. 92%DA with minimal competition.
#   - IMSS 53.1M (65c, 71%DA): IMSS hospital water via DA and LP (2020 LP SB=1 risk=1.00,
#     2021 LP SB=0 risk=1.00).
#   - SAT 10.6M (47c, 91%DA): Water at tax authority offices.
#   - P6 ISSSTE hospital water supply DA capture: 615M in 37 DA contracts to ISSSTE
#     for purified water. ISSSTE hospitals use one vendor exclusively for water supply
#     via DA without competitive bidding. The IMSS 2020 LP SB=1 risk=1.00 for water
#     shows the same vendor extends capture to IMSS.

# FPs (structural / legitimate operators):
# 17574 ROCHER INGENIERIA SA DE CV — Engineering supervision/topographic studies
#   for CAPUFE+SCT+CONAGUA via 100%SB LP. Legitimate technical specialization:
#   geotechnical studies, construction supervision, hydrology. Low amounts per
#   contract (avg ~1.6M). Structural engineering consulting, not fraud.
# 50227 PRESTADORA DE SERVICIOS CORPORATIVOS GENERALES — PEMEX engineering
#   consulting (oil reservoir analysis, infrastructure projects) via LP SB=1.
#   PEMEX offshore/upstream consulting is structurally specialized (few qualified
#   firms). Risk=0.22 across all contracts. FP structural.
# 38732 NANO RECURSOS TECNOLOGICOS — IT systems for BANJERCITO (army bank core
#   banking system 234M) and SEDENA (36%SB LP). Military banking IT is a defense
#   sector specialization. Low risk (0.21). FP structural defense sector.
# 57299 ROSA MARIA ZEPEDA GARCIA — Persona física supplying school uniforms
#   (jumpers, faldas, pantalones) to Sonora state education via LP SB=1 (2010-2014).
#   Low risk (0.18-0.28). Structural Sonora state uniform supplier.

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA journal_mode=WAL")

    next_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] + 1
    print(f"Current max GT case ID: {next_id - 1}")

    note_652 = (
        "ACTIDEA SA DE CV — P3 SRE events/logistics DA capture: 847.3M, 90%DA, "
        "147 contracts, 2012-2019. SRE 241.7M (14c, 100%DA): pure direct awards "
        "for 'Servicios integrales de administración, organización y logística' — "
        "events and logistics at the foreign ministry without competitive bidding. "
        "SE 105.1M (5c, 80%DA). Instituto del Emprendedor 103.4M (2c, SB=1, "
        "risk=1.00). Events/logistics intermediary capturing SRE budget via DA "
        "across 14 contracts over 7 years. 90% DA rate overall = systematic "
        "avoidance of competition for federal government event services."
    )

    note_653 = (
        "PENTAFONINT SA DE CV — P6 SRE call center DA capture: 555.1M, 73%DA, "
        "22 contracts, 2013-2020. SRE 400.0M (2 DA contracts): 2016 DA 'Servicio "
        "de atención telefónica de información para orientación consular a mexicanos "
        "en el extranjero' + 2020 DA renewal — consular phone services for Mexicans "
        "abroad captured in 2 DAs. STPS 53.6M (2c, 100%DA). NAFIN 32.9M LP. "
        "400M in 2 DA contracts to SRE for telephone consular attention center = "
        "P6 SRE call center capture. No competitive procedure for multi-hundred "
        "million peso contact center services."
    )

    note_654 = (
        "VH CONSTRUCCIONES Y ASESORIA EN INGENIERIA SA DE CV — P3 CINVESTAV "
        "construction DA capture: 686.8M, 61%DA, 137 contracts, 2003-2025. "
        "CINVESTAV 193.9M (81 contracts, 89%DA, 10%SB): 81 building/infrastructure "
        "contracts at the Centro de Investigación y Estudios Avanzados del IPN — "
        "Mexico's premier public research center — with 89%DA. IMSS-Patronato "
        "205.0M (23c, 48%DA). GRO-Comisión Agua Potable 135M (5c, 100%SB). "
        "81 DA building contracts at a single federal research institution = "
        "systematic CINVESTAV construction budget capture via direct awards."
    )

    note_655 = (
        "COMERCIALIZADORA FARMACEUTICA DEL SURESTE — P6 Veracruz pharmaceutical "
        "regional monopoly: 967.4M, 61%DA, 57 contracts, 2010-2025. Veracruz "
        "state 457.8M (6c, 100%SB): state medication LP uncontested. Universidad "
        "Veracruzana 279.6M (2c, 100%SB): 2024 LP SB=1 risk=1.00 'Suministro de "
        "medicamentos para los derechohabientes' + 2025 LP SB=1 risk=0.68. "
        "VER-UV 171.6M (3c, 67%DA). Pharmaceutical distributor monopolizing "
        "medication supply to Veracruz state and UV medical school hospitals via "
        "LP with zero competition. UV 2024 SB=1 risk=1.00 = core red flag."
    )

    note_656 = (
        "SITAH SOLUCIONES INTELIGENTES CON TALENTO HUMANO — P3 cross-institutional "
        "media/difusión services: 715.7M, 38%DA, 62%SB, 13 contracts, 2017-2020. "
        "SE 191.5M (1c, SB=1, risk=0.27): LP uncontested 2018. INAES 129.6M "
        "(1c, SB=1, risk=1.00): LP 2018 'Contratación de servicios especializados "
        "con terceros para difusión' — core red flag. CEAV 85.0M (3c). ProMéxico "
        "31.2M SB=1, CONAVI 27.6M SB=1. SE+INAES+CEAV+ProMéxico+CONAVI all won "
        "uncontested. INAES 129M LP SB=1 risk=1.00 for media services = P3 "
        "cross-institutional media intermediary capture."
    )

    note_657 = (
        "CONSTRUIDEAS INNOVACION Y DESARROLLO — P6 SAT construction LP monopoly: "
        "409.4M, 6%DA, 94%SB, 16 contracts, 2010-2024. SAT 143.3M (7c, 0%DA, "
        "100%SB): 7 consecutive SAT building/remodeling LP contracts all won "
        "uncontested. CDMX-Tribunal Superior 77.2M (1c, SB=1). TELECOMM 54.4M "
        "(1c, DA, risk=0.56). FGR 19.1M (1c, SB=1). Construction firm winning "
        "every SAT building contract uncontested across 7 years via LP. 94%SB "
        "overall on 16 contracts. P6 SAT construction procurement capture."
    )

    note_658 = (
        "POWER SYSTEMS SERVICE SA DE CV — P6 BANJERCITO electrical infrastructure "
        "capture: 1,077.9M, 38%DA, 34%SB, 213 contracts. BANJERCITO 734.2M "
        "(40c, 25%DA, 48%SB): 2023 LP SB=1 risk=0.99 174.9M 'Servicio preventivo/"
        "correctivo al equipamiento de generación eléctrica' + 2018 LP SB=1 88.4M "
        "+ 2019 LP SB=1 83.5M (consecutive uncontested wins). CAPUFE 167.7M "
        "(22c, 86%SB). Electrical/power systems maintenance firm monopolizing "
        "BANJERCITO (army bank) infrastructure at 734M. 2023 LP SB=1 risk=0.99 "
        "for 174M is the critical signal. P6 BANJERCITO power systems capture."
    )

    note_659 = (
        "SURTIDOR ELECTRICO DE MONTERREY SA DE CV — P6 IMSS electrical supply "
        "monopoly: 535.9M, 50%DA, 32%SB, 40 contracts, 2010-2025. IMSS 533.1M "
        "(32c, 56%DA, 34%SB): 2017 LP SB=1 457.5M 'Suministro e instalación' "
        "electrical equipment (anchor contract) + 2025 LP SB=1 risk=1.00 12.5M "
        "+ 2024 LP SB=1 risk=1.00 11.2M. Electrical equipment supplier "
        "monopolizing IMSS procurement at 533M total. The 2017 457M uncontested "
        "LP + continued 2024-2025 uncontested wins at risk=1.00 = P6 IMSS "
        "electrical infrastructure capture."
    )

    note_660 = (
        "CONSTRUCTORA GURRIA Y ASOCIADOS SA DE CV — P6 SEDATU+Chiapas construction "
        "regional monopoly: 1,355.5M, 34%DA, 89%SB, 38 contracts, 2009-2023. "
        "SEDATU 866.5M (9c, 33%DA, 67%SB): community infrastructure for Sembrando "
        "Vida/Bienestar programs (polideportivos, senderos, bardas perimetrales) "
        "via LP won uncontested. 2023 LP SB=1 risk=0.62 'Construcción de senderos "
        "y movilidad interior en zonas de trabajo'. Chiapas-SOP 155.9M (3c, 100%SB). "
        "CONAGUA 62.3M (6c, 83%SB). Chiapas-based construction firm winning 89%SB "
        "across SEDATU federal community programs + Chiapas state infrastructure. "
        "1.36B total at 89%SB = P6 SEDATU regional construction monopoly."
    )

    note_661 = (
        "BEBIDAS PURIFICADAS S DE RL DE CV — P6 ISSSTE hospital water DA capture: "
        "736.4M, 85%DA, 407 contracts, 2017-2025. ISSSTE 615.2M (37c, 92%DA, 5%SB): "
        "purified water for ISSSTE hospitals via DA — 92%DA means near-exclusive DA "
        "delivery of hospital water. IMSS 53.1M (65c, 71%DA): including 2020 LP "
        "SB=1 risk=1.00 + 2021 LP SB=0 risk=1.00 for water. SAT 10.6M (47c, 91%DA). "
        "Single vendor capturing ISSSTE hospital water supply budget via DA across "
        "615M in 37 contracts. 407 total contracts at 85%DA = systematic DA avoidance "
        "of competition. P6 ISSSTE water supply institutional capture."
    )

    cases = [
        (0, [(73761, "ACTIDEA SA DE CV", "high")],
         "ACTIDEA - SRE Events/Logistics DA Capture 847M (90%DA 2012-2019)",
         "procurement_fraud", "high", note_652, 847300000, 2012, 2019),

        (1, [(111685, "PENTAFONINT SA DE CV", "high")],
         "PENTAFONINT - SRE Call Center DA 555M (SRE 400M 100%DA 2013-2020)",
         "procurement_fraud", "high", note_653, 555100000, 2013, 2020),

        (2, [(11948, "VH CONSTRUCCIONES Y ASESORIA EN INGENIERIA SA DE CV", "high")],
         "VH CONSTRUCCIONES - CINVESTAV Construction DA 686M (81 DAs 2003-2025)",
         "procurement_fraud", "high", note_654, 686800000, 2003, 2025),

        (3, [(46263, "COMERCIALIZADORA FARMACEUTICA DEL SURESTE", "high")],
         "FARMACEUTICA SURESTE - Veracruz Pharma Monopoly 967M (SB=1 risk=1.00)",
         "procurement_fraud", "high", note_655, 967400000, 2010, 2025),

        (4, [(208503, "SITAH SOLUCIONES INTELIGENTES CON TALENTO HUMANO S DE RL DE CV", "high")],
         "SITAH SOLUCIONES - SE+INAES Media Services 715M (SB=1 risk=1.00 2017-2020)",
         "procurement_fraud", "high", note_656, 715700000, 2017, 2020),

        (5, [(99083, "CONSTRUIDEAS INNOVACION Y DESARROLLO", "high")],
         "CONSTRUIDEAS - SAT Construction LP Monopoly 409M (94%SB 2010-2024)",
         "procurement_fraud", "high", note_657, 409400000, 2010, 2024),

        (6, [(11621, "POWER SYSTEMS SERVICE SA DE CV", "high")],
         "POWER SYSTEMS SERVICE - BANJERCITO Infrastructure 1.07B (SB=1 risk=0.99)",
         "procurement_fraud", "high", note_658, 1077900000, 2010, 2024),

        (7, [(31498, "SURTIDOR ELECTRICO DE MONTERREY SA DE CV", "high")],
         "SURTIDOR ELECTRICO - IMSS Electrical Supply 535M (2017 457M SB=1)",
         "procurement_fraud", "high", note_659, 535900000, 2010, 2025),

        (8, [(11785, "CONSTRUCTORA GURRIA Y ASOCIADOS SA DE CV", "high")],
         "CONSTRUCTORA GURRIA - SEDATU+Chiapas Construction 1.36B (89%SB)",
         "procurement_fraud", "high", note_660, 1355500000, 2009, 2023),

        (9, [(197676, "BEBIDAS PURIFICADAS S DE RL DE CV", "high")],
         "BEBIDAS PURIFICADAS - ISSSTE Hospital Water DA 736M (92%DA 2017-2025)",
         "procurement_fraud", "high", note_661, 736400000, 2017, 2025),
    ]

    for (offset, vendors, cname, ctype, conf, notes, fraud, yr1, yr2) in cases:
        case_id_int = next_id + offset
        case_id_str = f"CASE-{case_id_int}"
        conn.execute("""
            INSERT OR REPLACE INTO ground_truth_cases
            (id, case_id, case_name, case_type, confidence_level, notes, estimated_fraud_mxn, year_start, year_end)
            VALUES (?,?,?,?,?,?,?,?,?)
        """, (case_id_int, case_id_str, cname, ctype, conf, notes, fraud, yr1, yr2))
        print(f"Inserted case {case_id_int}: {cname[:65]}")

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
            """, (notes[:500], vid))
            n_contracts = len(rows)
            print(f"  Tagged {n_contracts} contracts for vendor {vid} ({vname[:55]})")

    conn.commit()

    # FPs
    fp_structural = [
        17574,    # ROCHER INGENIERIA (engineering supervision/topography, CAPUFE+SCT+CONAGUA, structural)
        50227,    # PRESTADORA SERVICIOS CORPORATIVOS (PEMEX upstream engineering consulting, structural)
        38732,    # NANO RECURSOS TECNOLOGICOS (BANJERCITO/SEDENA military bank IT, defense structural)
        57299,    # ROSA MARIA ZEPEDA GARCIA (persona física, school uniforms Sonora LP, structural)
    ]
    for vid in fp_structural:
        conn.execute("""
            UPDATE aria_queue SET fp_structural_monopoly=1, review_status='fp_excluded'
            WHERE vendor_id=?
        """, (vid,))
    conn.commit()
    print(f"Marked {len(fp_structural)} FPs (structural_monopoly)")

    # Needs review
    needs_review = [
        105410,   # TECARTD (SAT events 174M, low risk 0.21-0.25, dispersed agencies)
        112993,   # REPRESENTACIONES EXPOSICIONES MEXICO (events 205M, INPI 112M DA suspicious)
        45213,    # COMERCIALIZADORA TUNONI (DICONSA food 268 DAs, structural perishables)
        470,      # MICROVAR (printing dispersed 337M, one ISSSTE 2016 DA risk=1.00)
        54186,    # GRUPO MARMOL CONSTRUCCIONES (INAH restoration 237M 100%DA)
        42646,    # FOCUS ON SERVICES (tech/equipment rental 814M, dispersed)
        44151,    # ADMINISTRACION VIRTUAL LIMPIEZA (PROFECO 136 DAs cleaning, structural)
        1318,     # EXPERIENCIA EXCELENCIA SEGURIDAD (security dispersed IMSS+ISSSTE)
        176081,   # SUVEN SA DE CV (meal vouchers dispersed 2016-2018)
        248767,   # RIMEX INVERNADEROS (58M greenhouses 100%DA trabajo, small)
        12864,    # DESARROLLOS JURIDICOS INTEGRADOS (143M DA 83% gobernacion, legal services)
    ]
    for vid in needs_review:
        conn.execute("""
            UPDATE aria_queue SET review_status='needs_review'
            WHERE vendor_id=? AND review_status='pending'
        """, (vid,))
    conn.commit()
    print(f"Marked {len(needs_review)} needs_review")

    # Verify
    print("\n--- VERIFICATION ---")
    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    n_vendors = conn.execute("SELECT COUNT(*) FROM ground_truth_vendors").fetchone()[0]
    n_contracts = conn.execute("SELECT COUNT(*) FROM ground_truth_contracts").fetchone()[0]
    print(f"Max case ID: {max_id} | GT vendors: {n_vendors} | GT contracts: {n_contracts}")
    for row in conn.execute(
        "SELECT gtc.id, gtc.case_id, gtc.case_name, COUNT(DISTINCT gtv.vendor_id), COUNT(gcon.contract_id) "
        "FROM ground_truth_cases gtc "
        "LEFT JOIN ground_truth_vendors gtv ON gtc.case_id=gtv.case_id "
        "LEFT JOIN ground_truth_contracts gcon ON gtc.case_id=gcon.case_id "
        f"WHERE gtc.id >= {next_id} "
        "GROUP BY gtc.id"
    ).fetchall():
        print(f"  {row[1]}: {row[2][:65]} | {row[3]}v | {row[4]}c")

    conn.close()
    print(f"\nDone. Cases 652-661 inserted.")


if __name__ == "__main__":
    run()
