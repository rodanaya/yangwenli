"""
ARIA Cases 636-643: March 18 2026 investigation session.

Cases:
  636: SERVICIOS INMOBILIARIOS IROA - AICM Airport Cleaning Monopoly 1.8B (SB=1 risk=1.00 2023)
  637: CONSTRUCTORA SAN SEBASTIAN - IMSS+AICM+SEDATU Construction 1.2B (88%SB)
  638: GRUPO VANGUARDIA - INFONAVIT+ISSSTE+Bienestar Call Center 1.5B (51%SB)
  639: PROVETECNIA - AICM Maintenance Monopoly 1.9B (66%DA)
  640: TECNOASFALTOS Y TERRACERIAS - SCT+CAPUFE Road Monopoly 1.9B (89%SB)
  641: OCRAM SEYER - ISSSTE+Multi-Institution Cleaning 2.1B (risk=1.00)
  642: ENSAYOS Y TAMIZAJES DE MEXICO - IMSS Metabolic Screening DA Capture 1.8B
  643: MULTIPRODUCTOS DE SEGURIDAD PRIVADA - Multi-Institution Security 1.1B

Run from backend/ directory.
"""

# CASE-636: VID 258446 SERVICIOS INMOBILIARIOS IROA SA DE CV
#   - 1,814.1M, 53 contracts, 19% DA, 51% SB, 2021-2025, agricultura (misclassified; actual=services).
#   - AICM 1,668.7M (8 contracts): 282.3M LP 2023 SB=1 risk=1.00 "SERVICIO DE LIMPIEZA GENERAL
#     EN LAS INSTALACIONES" + 252.8M LP 2023 SB=1 risk=1.00 (cleaning T1+T2+T3+T4 terminals) +
#     242.2M LP 2021 SB=1 + 206.8M LP 2021 SB=1 + 187.7M DA 2021 + 160.3M DA 2021.
#   - AEFCM 56.1M LP 2022 SB=1 (school cleaning).
#   - A cleaning services company monopolizing AICM (Mexico City international airport) cleaning
#     contracts. Two 2023 LP contracts at AICM score risk=1.00 — maximum score — while going
#     uncontested. AICM is Mexico's busiest airport and strategic national infrastructure.
#     ~1.67B concentrated at a single institution (AICM) with SB=1 on competitive procedures.
#     P6 single-institution capture at critical airport infrastructure.

# CASE-637: VID 61362 CONSTRUCTORA Y ARRENDADORA SAN SEBASTIAN SA DE CV
#   - 1,203M, 52 contracts, 8% DA, 88% SB, 2006-2024, infraestructura.
#   - IMSS 216.2M LP 2024 SB=1 risk=0.45 "REMODELACION UMF NO. 15 MONTERREY" + 71.2M LP 2022
#     SB=1 + 64.6M LP 2018 SB=1 + 14.5M LP SB=1.
#   - AICM 122.8M LP 2019 SB=1 + 61.9M LP 2019 SB=1 (airport vialidad rehabilitation + apron).
#   - SEDATU 71.4M LP 2021 SB=1 + 43.1M DA 2022 "OBRA PUBLICA CARMEN".
#   - SCT 52.2M LP 2018 SB=1 (highway km 8+000-11+900).
#   - Construction company winning IMSS hospital remodels (216M), AICM airport runways (185M),
#     SEDATU/territory ministry projects (114M), and SCT federal highways (52M) — all uncontested.
#     88% SB rate across IMSS, AICM, SEDATU, SCT. Classic P6 multi-institutional construction
#     monopoly across health, airport, social development, and federal roads.

# CASE-638: VID 148766 GRUPO VANGUARDIA EN INFORMACION Y CONOCIMIENTO SA DE CV
#   - 1,513.6M, 37 contracts, 41% DA, 51% SB, 2015-2022, trabajo.
#   - INFONAVIT 449M LP 2018 SB=1 "SERVICIO DE CENTRO DE CONTACTO" + 169.9M LP 2022 SB=1
#     risk=1.00 (call center housing/social programs). SRE 170.1M DA 2018 (consular centers).
#   - ISSSTE 133.8M LP 2015 SB=1 + 108.7M LP 2017 SB=1 (contact center programs).
#   - Bienestar 96.1M LP 2018 SB=1 + 61.5M DA 2015 (social programs call center).
#   - SALUD 89M DA 2020 risk=0.63 (IT infrastructure).
#   - Call center services company capturing INFONAVIT (housing fund), ISSSTE (government
#     workers health), Bienestar (social welfare), SRE (foreign ministry), and SALUD via
#     mix of single-bid LP and DA. INFONAVIT 449M SB=1 + 169.9M SB=1 risk=1.00 are core
#     red flags. P6 cross-institutional contact center monopoly.

# CASE-639: VID 49745 PROVETECNIA
#   - 1,863.6M, 68 contracts, 66% DA, 25% SB, 2010-2024, infraestructura.
#   - AICM 422.1M DA 2021 + 404.7M DA 2019 + 360M DA 2017 + 84.4M DA 2024 = 1,271.2M in
#     consecutive maintenance DAs. ANAM (customs airports) 204.4M DA 2022 risk=0.58
#     "Servicio de Espectroscopia para Identificacion de Sustancias".
#   - SAT 154.4M LP 2017 SB=1 "Servicio de equipamiento portatil para identificacion".
#   - Port ASIPONA 32.5M DA 2023. GN 22.4M DA 2022.
#   - Equipment maintenance/services company capturing AICM airport via 4 consecutive direct
#     awards 2017-2024 (360M+405M+422M+84M = 1.27B). AICM the dominant institution.
#     Plus ANAM customs airport spectroscopy, SAT portable equipment. Pattern: P3 intermediary
#     capturing AICM maintenance and security screening equipment contracts via DA.

# CASE-640: VID 1103 TECNOASFALTOS Y TERRACERIAS SA DE CV
#   - 1,916.3M, 49 contracts, 6% DA, 90% SB, 2002-2024, infraestructura.
#   - SCT 319.4M LP 2015 SB=1 + 232.7M LP 2012 SB=1 + 148.2M LP 2010 SB=1 (federal roads).
#   - CAPUFE (toll roads) 131.5M LP 2014 SB=1 + 74.2M LP 2006 SB=1 + 58.2M LP 2008 SB=1.
#   - Marina (Navy) 186M LP 2022 SB=1 "HABILITACION DE PATIOS ALMACENAJE" (pavement work).
#   - SICT 63.1M LP 2024 SB=1 risk=0.83 (CPT Sonora).
#   - Pavement/road construction company monopolizing SCT federal roads, CAPUFE toll roads,
#     and Marina/Navy infrastructure at 90% single-bid rate over 22 years. 49 contracts across
#     4 major infrastructure agencies all going uncontested. Classic P6 road infrastructure
#     monopoly — SCT+CAPUFE+Marina+SICT.

# CASE-641: VID 153410 OCRAM SEYER SA DE CV
#   - 2,114.2M, 154 contracts, 31% DA, 58% SB, 2021-2025, salud.
#   - ISSSTE 353.1M LP 2025 SB=0 risk=1.00 "SERVICIO ESPECIALIZADO DE ASEO, HIGIENE Y
#     DESINFECCION" + 218.3M DA 2025 risk=0.83 (same category).
#   - ISSSTEP Campeche 194.9M DA 2024 risk=1.00 "SERVICIO INTEGRAL DE LIMPIEZA" (state ISSSTE).
#   - BANOBRAS 70M LP 2025 SB=1 + SEGOB 53.1M LP 2025 SB=1 + HGM 42.3M LP 2022 SB=1.
#   - FGR 43.1M LP 2021 SB=0 + SHCP 39.7M LP 2021 SB=1.
#   - Cleaning company winning ISSSTE (353M + 218M), Campeche state ISSSTE (195M), BANOBRAS,
#     SEGOB, FGR, HGM, SHCP across 2021-2025. The 353M LP 2025 risk=1.00 + 194.9M DA 2024
#     risk=1.00 = maximum risk scores at ISSSTE system. P6 institutional cleaning capture
#     across federal social security, banking, government, and justice agencies.

# CASE-642: VID 177923 ENSAYOS Y TAMIZAJES DE MEXICO SA DE CV
#   - 1,800.2M, 603 contracts, 64% DA, 31% SB, 2016-2025, salud, P6.
#   - IMSS 262.9M DA 2023 risk=0.98 "SMI TMNA 2023-2025 DETECCION DE E." (metabolic newborn
#     screening) + regional IMSS DAs: 72.8M + 72.6M + 72.3M + more 2023 DAs = ~500M IMSS DA.
#   - CNEGSR 122.4M LP 2025 SB=1 "REACTIVOS PARA TAMIZ METABOLICO NEONATAL".
#   - ISSSTEP 110.5M LP 2025 SB=1 "SERVICIO PARA CONFIRMACION DE ERRORES INNATOS".
#   - ISSSTE 91.8M LP 2020 SB=1 "SERVICIO INTEGRAL DE TAMIZ METABOLICO AMPLIADO Y TIROIDEA".
#   - INSABI 122.4M LP 2022.
#   - Metabolic screening/tamiz neonatal services company capturing IMSS via consecutive DAs
#     (262.9M + 72.8M + 72.6M + 72.3M = ~480M 2023 DAs alone) plus CNEGSR, ISSSTEP, ISSSTE,
#     INSABI. Neonatal screening is a critical public health service. P6 capture of federal
#     newborn metabolic screening programs via DA dominance at IMSS and SB=1 at others.

# CASE-643: VID 20804 MULTIPRODUCTOS DE SEGURIDAD PRIVADA SA DE CV
#   - 1,107M, 73 contracts, 34% DA, 60% SB, 2002-2019, salud/gobernacion.
#   - SAE 269.6M LP 2011 SB=1 "SERVICIOS INTEGRALES DE VIGILANCIA" (government asset recovery).
#   - SENASICA 145.4M DA 2014 (plant/animal sanitation guard). CONALEP 64M LP 2017 SB=1.
#   - INR 48.7M DA 2016 + SE 44.2M LP 2016 SB=1 + FND 40.6M LP 2015 SB=1.
#   - FINANCIERA RURAL 37.6M LP 2009 SB=1 + multiple other institutions.
#   - Security/surveillance company winning across SAE, SENASICA, CONALEP, INR, SE, FND,
#     Financiera Rural — diverse federal agencies — via single-bid LP and DA. 60%SB across
#     73 contracts over 17 years. P6 cross-institutional private security capture across
#     financial, agricultural sanitation, education, and government asset agencies.

# FPs (structural / legitimate operators):
# 15197 GALAZ YAMAZAKI RUIZ URQUIZA SC (Deloitte Mexico — Big 4 accounting/consulting firm)
# 48675 AT&T COMERCIALIZACION MOVIL S DE RL DE CV (AT&T Mexico — US telecom multinational)
# 11101 ZURICH COMPAÑIA DE SEGUROS SA (Zurich Insurance Group — Swiss multinational insurer)
# 2527 RADIOMOVIL DIPSA SA DE CV (Telcel — Carlos Slim's major telecom, competitive market)
# 23175 DHL EXPRESS MEXICO SA DE CV (DHL — German multinational courier, authorized supplier)
# 42817 SERVICIO POSTAL MEXICANO (SEPOMEX — Mexican government post office, state entity)
# 139170 TOTAL PLAY TELECOMUNICACIONES SA DE CV (legitimate ISP, Ricardo Salinas, competitive)
# 28376 CONCESIONARIA UNIVERSIDAD POLITECNICA DE SAN LUIS (single 2006 PPP university contract)

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "RUBLI_NORMALIZED.db"


def run():
    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA journal_mode=WAL")

    next_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0] + 1
    print(f"Current max GT case ID: {next_id - 1}")

    note_636 = (
        "SERVICIOS INMOBILIARIOS IROA SA DE CV — P6 AICM airport cleaning monopoly: "
        "1,814.1M, 51% SB, 2021-2025. AICM 1,668.7M: 282.3M LP 2023 SB=1 risk=1.00 "
        "'Servicio de Limpieza General en las Instalaciones' (airport cleaning) + 252.8M "
        "LP 2023 SB=1 risk=1.00 (T1+T2+T3+T4 terminals) + 242.2M LP 2021 SB=1 + 206.8M "
        "LP 2021 SB=1 + 187.7M DA 2021 + 160.3M DA 2021. AEFCM 56.1M LP 2022 SB=1. "
        "~1.67B concentrated at AICM (Mexico's busiest airport) with SB=1 risk=1.00 on "
        "2023 competitive LPs. P6 single-institution cleaning capture at critical national "
        "airport infrastructure."
    )

    note_637 = (
        "CONSTRUCTORA Y ARRENDADORA SAN SEBASTIAN SA DE CV — P6 IMSS+AICM+SEDATU "
        "construction monopoly: 1,203M, 88% SB, 52 contracts, 2006-2024. IMSS 216.2M "
        "LP 2024 SB=1 risk=0.45 'Remodelacion UMF No. 15 Monterrey' + 71.2M LP 2022 "
        "SB=1 + 64.6M LP 2018 SB=1. AICM 122.8M LP 2019 SB=1 + 61.9M LP 2019 SB=1 "
        "(airport vialidad + apron rehabilitation). SEDATU 71.4M LP 2021 SB=1. SCT "
        "52.2M LP 2018 SB=1 (highway). 88% SB rate across IMSS hospitals, AICM airport, "
        "SEDATU federal territories, and SCT roads. P6 multi-institutional construction "
        "monopoly: health infrastructure + airport + federal territory + roads."
    )

    note_638 = (
        "GRUPO VANGUARDIA EN INFORMACION Y CONOCIMIENTO SA DE CV — P6 cross-institutional "
        "call center capture: 1,513.6M, 51% SB, 37 contracts, 2015-2022. INFONAVIT 449M "
        "LP 2018 SB=1 'SERVICIO DE CENTRO DE CONTACTO' + 169.9M LP 2022 SB=1 risk=1.00. "
        "ISSSTE 133.8M LP 2015 SB=1 + 108.7M LP 2017 SB=1 (contact center programs). "
        "SRE 170.1M DA 2018. Bienestar 96.1M LP 2018 SB=1 + 61.5M DA 2015. SALUD 89M "
        "DA 2020 risk=0.63. Call center services capturing INFONAVIT (housing fund), "
        "ISSSTE (government health), Bienestar (welfare), SRE, and Salud. INFONAVIT "
        "449M SB=1 + 169.9M SB=1 risk=1.00 = core red flags. P6 call center monopoly."
    )

    note_639 = (
        "PROVETECNIA — P3 AICM maintenance DA capture: 1,863.6M, 66% DA, 68 contracts, "
        "2010-2024. AICM 422.1M DA 2021 + 404.7M DA 2019 + 360M DA 2017 + 84.4M DA "
        "2024 = 1,271.2M in consecutive maintenance DAs at Mexico City airport. ANAM "
        "customs airports 204.4M DA 2022 risk=0.58 'Espectroscopia para Identificacion "
        "de Sustancias'. SAT 154.4M LP 2017 SB=1 portable security equipment. Port "
        "ASIPONA 32.5M DA 2023. Equipment maintenance/services firm receiving 4 consecutive "
        "AICM DAs 2017-2021 (360M+405M+422M=1.187B) without competition. P3 intermediary "
        "capturing AICM maintenance and security screening equipment via direct awards."
    )

    note_640 = (
        "TECNOASFALTOS Y TERRACERIAS SA DE CV — P6 SCT+CAPUFE road monopoly: 1,916.3M, "
        "90% SB, 49 contracts, 2002-2024. SCT 319.4M LP 2015 SB=1 + 232.7M LP 2012 "
        "SB=1 + 148.2M LP 2010 SB=1 (federal roads). CAPUFE (toll roads) 131.5M LP "
        "2014 SB=1 + 74.2M LP 2006 SB=1 + 58.2M LP 2008 SB=1. Marina 186M LP 2022 "
        "SB=1 (pavement works). SICT 63.1M LP 2024 SB=1 risk=0.83 (Sonora CPT). 49 "
        "contracts across SCT, CAPUFE, Marina, SICT all going uncontested at 90% SB "
        "rate over 22 years. P6 road infrastructure monopoly: federal roads + toll roads "
        "+ navy installations + regional infrastructure."
    )

    note_641 = (
        "OCRAM SEYER SA DE CV — P6 ISSSTE+multi-institution cleaning capture: 2,114.2M, "
        "58% SB, 2021-2025. ISSSTE 353.1M LP 2025 risk=1.00 'Servicio Especializado de "
        "Aseo, Higiene y Desinfeccion' + 218.3M DA 2025 risk=0.83. ISSSTEP Campeche "
        "194.9M DA 2024 risk=1.00 (state ISSSTE cleaning). BANOBRAS 70M LP 2025 SB=1 "
        "+ SEGOB 53.1M LP 2025 SB=1 + HGM 42.3M LP 2022 SB=1 + FGR 43.1M LP 2021 "
        "+ SHCP 39.7M LP 2021 SB=1. Cleaning company winning ISSSTE (571M) + Campeche "
        "ISSSTE (195M) + BANOBRAS + SEGOB + FGR + HGM + SHCP 2021-2025. Two contracts "
        "at max risk=1.00. P6 institutional cleaning capture across social security, "
        "banking, government, health, justice agencies."
    )

    note_642 = (
        "ENSAYOS Y TAMIZAJES DE MEXICO SA DE CV — P6 IMSS metabolic screening DA capture: "
        "1,800.2M, 64% DA, 603 contracts, 2016-2025, P6. IMSS 262.9M DA 2023 risk=0.98 "
        "'SMI TMNA 2023-2025 Deteccion Enfermedades' (neonatal metabolic screening) + "
        "regional IMSS DAs: 72.8M + 72.6M + 72.3M + additional 2023 DAs = ~480M IMSS DA "
        "in one year. CNEGSR 122.4M LP 2025 SB=1 'Reactivos Tamiz Metabolico Neonatal'. "
        "ISSSTEP 110.5M LP 2025 SB=1. ISSSTE 91.8M LP 2020 SB=1 'Tamiz Metabolico "
        "Ampliado'. INSABI 122.4M LP 2022. Metabolic/neonatal screening services capturing "
        "IMSS via consecutive DAs + SB=1 at CNEGSR, ISSSTEP, ISSSTE, INSABI. P6 federal "
        "newborn screening monopoly across IMSS, CNEGSR, ISSSTEP, ISSSTE, INSABI."
    )

    note_643 = (
        "MULTIPRODUCTOS DE SEGURIDAD PRIVADA SA DE CV — P6 cross-institutional security "
        "surveillance: 1,107M, 60% SB, 34% DA, 73 contracts, 2002-2019. SAE 269.6M LP "
        "2011 SB=1 'Servicios Integrales de Vigilancia' (government asset recovery agency). "
        "SENASICA 145.4M DA 2014. CONALEP 64M LP 2017 SB=1. INR 48.7M DA 2016. "
        "SE 44.2M LP 2016 SB=1. FND 40.6M LP 2015 SB=1. Financiera Rural 37.6M LP 2009 "
        "SB=1. Security company winning surveillance contracts across SAE (asset agency), "
        "SENASICA (agri-sanitation), CONALEP (technical schools), INR (rehabilitation), "
        "SE (economy ministry), FND (development bank) via SB=1 LP and DA. 60% SB across "
        "17 years at diverse federal institutions. P6 private security multi-institution capture."
    )

    cases = [
        (0, [(258446, "SERVICIOS INMOBILIARIOS IROA SA DE CV", "high")],
         "IROA SERVICIOS - AICM Airport Cleaning Monopoly 1.8B (SB=1 risk=1.00 2023)",
         "procurement_fraud", "high", note_636, 1814100000, 2021, 2025),

        (1, [(61362, "CONSTRUCTORA Y ARRENDADORA SAN SEBASTIAN SA DE CV", "high")],
         "SAN SEBASTIAN CONSTRUCTORA - IMSS+AICM+SEDATU Construction 1.2B (88%SB)",
         "procurement_fraud", "high", note_637, 1203000000, 2006, 2024),

        (2, [(148766, "GRUPO VANGUARDIA EN INFORMACION Y CONOCIMIENTO SA DE CV", "high")],
         "GRUPO VANGUARDIA - INFONAVIT+ISSSTE Call Center 1.5B (risk=1.00 2022)",
         "procurement_fraud", "high", note_638, 1513600000, 2015, 2022),

        (3, [(49745, "PROVETECNIA", "high")],
         "PROVETECNIA - AICM Maintenance DA Monopoly 1.9B (66%DA 2017-2024)",
         "procurement_fraud", "high", note_639, 1863600000, 2010, 2024),

        (4, [(1103, "TECNOASFALTOS Y TERRACERIAS SA DE CV", "high")],
         "TECNOASFALTOS - SCT+CAPUFE Road Infrastructure Monopoly 1.9B (90%SB)",
         "procurement_fraud", "high", note_640, 1916300000, 2002, 2024),

        (5, [(153410, "OCRAM SEYER SA DE CV", "high")],
         "OCRAM SEYER - ISSSTE+Multi-Institution Cleaning 2.1B (risk=1.00 2025)",
         "procurement_fraud", "high", note_641, 2114200000, 2021, 2025),

        (6, [(177923, "ENSAYOS Y TAMIZAJES DE MEXICO SA DE CV", "high")],
         "ENSAYOS TAMIZAJES - IMSS Neonatal Screening DA Capture 1.8B (P6 2016-2025)",
         "procurement_fraud", "high", note_642, 1800200000, 2016, 2025),

        (7, [(20804, "MULTIPRODUCTOS DE SEGURIDAD PRIVADA SA DE CV", "high")],
         "MULTIPRODUCTOS SEGURIDAD - Multi-Institution Security 1.1B (60%SB 2002-2019)",
         "procurement_fraud", "high", note_643, 1107000000, 2002, 2019),
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
        15197,    # GALAZ YAMAZAKI RUIZ URQUIZA SC (Deloitte Mexico — Big 4)
        48675,    # AT&T COMERCIALIZACION MOVIL (US telecom multinational)
        11101,    # ZURICH COMPAÑIA DE SEGUROS (Swiss insurance multinational)
        2527,     # RADIOMOVIL DIPSA (Telcel — major legitimate telecom)
        23175,    # DHL EXPRESS MEXICO (German multinational courier)
        42817,    # SERVICIO POSTAL MEXICANO (SEPOMEX — government post office)
        139170,   # TOTAL PLAY TELECOMUNICACIONES (legitimate ISP, competitive market)
        28376,    # CONCESIONARIA UNIVERSIDAD POLITECNICA (single 2006 PPP, not commercial)
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
        8128,     # HELISERVICIO CAMPECHE (3,827M PEMEX helicopter — specialty oligopoly)
        4272,     # GRUPO QUART (182M GDF 2002-2003 asphalt, Structure A old data)
        267064,   # JABER LIMPIEZA (274M cleaning, moderate scale)
        5683,     # SERVICIOS ASESORÍA PRODUCCIÓN (IMSS hospital linen, SB=0 competitive)
        46291,    # IPSOS SA DE CV (342M market research, consultancy)
        35847,    # COMERCIALIZADORA PRODUCTOS BASICOS (142M salud)
        209582,   # LLANTAS Y ACCESORIOS INTERNACIONALES (191M 3 contracts)
        294544,   # ENERLOGIC (277M salud P3, small)
        256820,   # COCON COCINA Y ASEO (243M 496 contracts salud P6)
        36140,    # SISTEMAS NEUMÁTICOS DE ENVÍOS (1,170M IMSS pneumatic tubes)
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
    print(f"\nDone. Cases 636-643 inserted.")


if __name__ == "__main__":
    run()
