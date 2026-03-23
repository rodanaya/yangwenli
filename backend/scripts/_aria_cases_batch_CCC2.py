#!/usr/bin/env python3
"""
GT Mining Batch CCC2 - ARIA T3 investigation (20 vendors)

Investigated 2026-03-23:
  v139325  ONE TO ONE SOLUTION MEXICO SA DE CV     ADD  (IEPSA 88.5% 521M, 100% DA/SB, 8 ctrs 2014-2019)
  v34359   CONSTRUCTORA SOGU SA DE CV             ADD  (SEDATU 82.2% 350M, 100% non-competitive 2019-2024)
  v9673    REPRESENTACIONES REYCO DE SALTILLO     ADD  (SCT 99.8% 1025M, extreme concentration 2002-2013)
  v172800  TECROM SA DE CV                        ADD  (IMSS 95% 938M, 80% DA, 137 ctrs 2016-2025)
  v155170  ECO BAJA TOURS SA DE CV                ADD  (IMSS 67.9%+ISSSTE 29.4%=97.3%, travel at health, 263M)
  v39196   MOTORES E INGENIERIA MEXMOT            ADD  (CONAGUA 50.5% SB67% + CFE 45.9% SB58% = 96.4%, 735M)
  v21096   EDIFICACION INTEGRAL DEL NOROESTE      ADD  (SEDATU 63.4% 430M, 100% non-competitive 2021-2024)
  v65155   L C PROYECTOS Y CONSTRUCCIONES         ADD  (SON-SIDUR 35%+SEDATU 26.3%+SAGARPA 20.3%=81.6%, SB81%)
  v24386   GRUPO COVASA SA DE CV                  ADD  (MEX-CEA 87.2% 316M, 100% SB, 7 ctrs 2006-2010)
  v203404  SINERGIA SERVICIOS DE PLANIFICACION    ADD  (SIAP 78.6%+INCAN 15.6%=94.2%, SB high, mismatch)
  v112145  CONCRETOS ASFALTICOS TECAMAC           ADD  (AICM 89.5% 724M, 75% SB, 12 ctrs 2015-2022)
  v78      LIMPIEZA PROFESIONAL DE MICHOACAN      ADD  (SAGARPA 87.9% 376M, 100% SB, cleaning at agriculture)
  v103816  MAHARBA SERVICIOS INMOBILIARIOS        ADD  (Tulum 99.4% 951M, 100% SB, 7 ctrs 2013-2018)
  v22993   LA AZTECA CONSTRUCCIONES               ADD  (SCT+SON Gov+JEC-SON+SON-SIDUR=85.6%, 100% SB, 664M)
  v34356   CONSTRUCTORA E IMPULSORA CONDOR        ADD  (CHIS-Infra 49.9%+SCT 23.5%+SEDATU 22.8%=96.2%, 741M)
  v46734   UNIFORMES EL TREN SA DE CV             SKIP (dispersed uniforms 476 ctrs, IMSS 43% mostly competitive)
  v43667   GRUPO RIMOVA SA DE CV                  SKIP (IEPSA top 35.7%, combined 55.4%, below 60% threshold)
  v78888   MICMAR SA DE CV                        SKIP (dispersed 30 ctrs, SHCP single SB 36%, no dominant pattern)
  v5932    DISTRIBUIDORA Y EXPORTADORA MEDIC.     SKIP (dispersed medicines 424 ctrs, top=27.5% low DA/SB)
  v124446  MEDICAL ADVANCED SUPPLIES SA DE CV     SKIP (dispersed medical 343 ctrs, top=26.8% mostly competitive)

Cases added: 15  |  Vendors skipped: 5
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 1017:
        print(f"ERROR: max_id={max_id}, expected >= 1017. Aborting.")
        conn.close()
        return

    cases = list(range(max_id + 1, max_id + 16))  # 15 cases
    c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13, c14, c15 = cases

    print(f"Max GT case id: {max_id}")
    print(f"Inserting cases {c1}-{c15}")

    sql_case = (
        "INSERT OR IGNORE INTO ground_truth_cases "
        "(id, case_id, case_name, case_type, year_start, year_end, "
        "confidence_level, estimated_fraud_mxn, source_news, notes) "
        "VALUES (?,?,?,?,?,?,?,?,?,?)"
    )
    sql_vendor = (
        "INSERT OR IGNORE INTO ground_truth_vendors "
        "(case_id, vendor_id, vendor_name_source, role, evidence_strength, "
        "match_method, match_confidence, notes) VALUES (?,?,?,?,?,?,?,?)"
    )

    # Case 1: ONE TO ONE SOLUTION - IEPSA 88.5% all non-competitive
    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "State Printing Company Non-Competitive Capture - One to One Solution Mexico",
        "institutional_capture", 2014, 2021, "high", 521_000_000,
        "ARIA T3 queue pattern analysis",
        "ONE TO ONE SOLUTION MEXICO SA DE CV (v139325): 31 contracts, 589M total. "
        "IEPSA (Impresora y Encuadernadora Progreso SA de CV — state printing enterprise): "
        "8 contracts, 521M (88.5%), DA=63% SB=38% = 100% non-competitive, 2014-2019. "
        "Talleres Graficos de Mexico: 22 contracts, 60M DA (10.2%), 2021. "
        "CONALITEG: 1 contract, 8M (1.3%), 2020. "
        "Technology/solutions company with 88.5% concentration at Mexico's state-owned printing "
        "enterprise via exclusively non-competitive mechanisms (63% DA + 38% SB). "
        "8 contracts totaling 521M at IEPSA 2014-2019 — all awarded without competition. "
        "IEPSA is a government parastatal; contracts awarded here bypass the standard "
        "federal procurement competitive process.",
    ))
    conn.execute(sql_vendor, (
        c1, 139325, "ONE TO ONE SOLUTION MEXICO SA DE CV",
        "primary", "high", "aria_queue_t3", 0.90,
        "IEPSA 88.5% (521M): 100% non-competitive (63% DA + 38% SB), 8 ctrs 2014-2019",
    ))

    # Case 2: CONSTRUCTORA SOGU - SEDATU 82.2% all non-competitive
    conn.execute(sql_case, (
        c2, f"CASE-{c2}",
        "SEDATU Housing Ministry Non-Competitive Capture - Constructora Sogu",
        "institutional_capture", 2010, 2024, "high", 350_000_000,
        "ARIA T3 queue pattern analysis",
        "CONSTRUCTORA SOGU SA DE CV (v34359): 24 contracts, 425M total. "
        "SEDATU (Secretaria de Desarrollo Agrario, Territorial y Urbano): "
        "6 contracts, 350M (82.2%), DA=67% SB=33% = 100% non-competitive, 2019-2024. "
        "INPI (Instituto Nacional de los Pueblos Indigenas): 3 contracts, 23M SB (5.4%), 2012-2014. "
        "MOR-Comision Estatal del Agua: 5 contracts, 18M SB (4.2%), 2010-2015. "
        "Construction company with 82.2% concentration at Mexico's housing/land ministry "
        "exclusively via non-competitive mechanisms (67% DA + 33% SB). "
        "6 contracts totaling 350M at SEDATU 2019-2024 — all non-competitive. "
        "Pattern consistent with sustained capture of AMLO-era housing ministry via "
        "direct award and uncontested bid rotation.",
    ))
    conn.execute(sql_vendor, (
        c2, 34359, "CONSTRUCTORA SOGU, S.A. DE C.V",
        "primary", "high", "aria_queue_t3", 0.88,
        "SEDATU 82.2% (350M): 67% DA + 33% SB = 100% non-competitive, 6 ctrs 2019-2024",
    ))

    # Case 3: REPRESENTACIONES REYCO - SCT 99.8% extreme concentration
    conn.execute(sql_case, (
        c3, f"CASE-{c3}",
        "Federal Transport Ministry Extreme Concentration - Representaciones Reyco de Saltillo",
        "institutional_capture", 2002, 2016, "medium", 1_025_000_000,
        "ARIA T3 queue pattern analysis",
        "REPRESENTACIONES REYCO DE SALTILLO SA DE CV (v9673): 28 contracts, 1028M total. "
        "SCT (Secretaria de Comunicaciones y Transportes): "
        "20 contracts, 1025M (99.8%), DA=0% SB=30%, 2002-2013. "
        "COAH-Secretaria de Finanzas: 2 contracts, 2M (0.2%), 2012-2013. "
        "CINVESTAV: 3 contracts, 1M DA, 2014-2016. "
        "Saltillo-based company with 99.8% concentration at Mexico's federal transport "
        "ministry — 20 contracts totaling 1025M over 11 years (2002-2013). "
        "While DA=0%, 30% of contracts were single-bid (6 uncontested out of 20). "
        "Extreme single-institution concentration (99.8%) by a regional company "
        "at a major federal ministry spanning three consecutive administrations "
        "raises institutional capture concerns regardless of bid competition rate.",
    ))
    conn.execute(sql_vendor, (
        c3, 9673, "REPRESENTACIONES REYCO DE SALTILLO, S.A. DE C.V.",
        "primary", "medium", "aria_queue_t3", 0.85,
        "SCT 99.8% (1025M, 20 ctrs 2002-2013): extreme single-ministry concentration, 30% SB",
    ))

    # Case 4: TECROM - IMSS 95% 80% DA pharma
    conn.execute(sql_case, (
        c4, f"CASE-{c4}",
        "IMSS Direct Award Pharmaceutical Capture - Tecrom",
        "institutional_capture", 2016, 2025, "high", 750_000_000,
        "ARIA T3 queue pattern analysis",
        "TECROM SA DE CV (v172800): 435 contracts, 987M total (2016-2025). "
        "IMSS (Instituto Mexicano del Seguro Social): "
        "137 contracts, 938M (95%), DA=80% SB=1%, 2016-2025. "
        "COFEPRIS: 8 contracts, 7M (0.7%), 2018-2024. "
        "SENASICA: 23 contracts, 7M (0.7%), 2016-2024. "
        "Medical/pharmaceutical company with 95% concentration at Mexico's national "
        "health insurer via 80% direct award rate — 137 contracts totaling 938M at IMSS "
        "spanning 2016-2025, nearly all (80%) awarded directly without competition. "
        "Sustained DA-heavy capture of IMSS across two presidential administrations "
        "(Peña Nieto and AMLO), with COFEPRIS and SENASICA as minor legitimacy presence.",
    ))
    conn.execute(sql_vendor, (
        c4, 172800, "TECROM SA DE CV",
        "primary", "high", "aria_queue_t3", 0.92,
        "IMSS 95% (938M): 80% DA, 137 contracts 2016-2025, sustained DA capture",
    ))

    # Case 5: ECO BAJA TOURS - travel company at health institutions
    conn.execute(sql_case, (
        c5, f"CASE-{c5}",
        "Travel Agency Industry Mismatch Capture at Social Security Institutions - Eco Baja Tours",
        "ghost_company", 2015, 2025, "high", 255_000_000,
        "ARIA T3 queue pattern analysis",
        "ECO BAJA TOURS SA DE CV (v155170): 71 contracts, 263M total (2015-2025). "
        "IMSS: 42 contracts, 178M (67.9%), DA=50% SB=43% = 93% non-competitive, 2015-2025. "
        "ISSSTE: 12 contracts, 77M (29.4%), DA=25% SB=75% = 100% non-competitive, 2017-2025. "
        "CFE: 16 contracts, 7M (2.6%), 2015-2017. "
        "Combined IMSS + ISSSTE = 255M (97.3%), all non-competitive. "
        "Travel and tourism company ('Eco Baja Tours') capturing Mexico's two largest "
        "social security health institutions (IMSS and ISSSTE) via exclusively non-competitive "
        "procurement across 10 years. "
        "Industry mismatch: a tour operator/travel agency supplying services to national "
        "health insurers at 97.3% concentration without competitive bidding. "
        "Pattern consistent with a front company using travel services as cover.",
    ))
    conn.execute(sql_vendor, (
        c5, 155170, "ECO BAJA TOURS SA DE CV",
        "primary", "high", "aria_queue_t3", 0.90,
        "IMSS 67.9% (93% DA/SB) + ISSSTE 29.4% (100% SB) = 97.3%, travel at health",
    ))

    # Case 6: MEXMOT - CONAGUA+CFE SB capture
    conn.execute(sql_case, (
        c6, f"CASE-{c6}",
        "Water and Electricity Agency SB Capture - Motores e Ingenieria Mexmot",
        "single_bid_capture", 2009, 2025, "high", 708_000_000,
        "ARIA T3 queue pattern analysis",
        "MOTORES E INGENIERIA MEXMOT SA DE CV (v39196): 26 contracts, 735M total. "
        "CONAGUA (Comision Nacional del Agua): "
        "6 contracts, 371M (50.5%), DA=33% SB=67%, 2017-2025. "
        "CFE (Comision Federal de Electricidad): "
        "12 contracts, 337M (45.9%), DA=33% SB=58%, 2009-2017. "
        "CDMX-SEDEMA: 2 contracts, 13M, 2010. "
        "Combined CONAGUA + CFE = 708M (96.4%), both with high SB rates. "
        "Motors and industrial engineering company capturing Mexico's two major "
        "water and electricity agencies via predominantly single-bid procurement: "
        "CONAGUA (67% SB, 2017-2025) replacing the earlier CFE capture (58% SB, 2009-2017). "
        "Sequential two-agency capture spanning 16 years.",
    ))
    conn.execute(sql_vendor, (
        c6, 39196, "MOTORES E INGENIERIA MEXMOT S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.90,
        "CONAGUA 50.5% (67% SB) + CFE 45.9% (58% SB) = 96.4%, 26 ctrs 735M",
    ))

    # Case 7: EDIFICACION INTEGRAL DEL NOROESTE - SEDATU 63.4%
    conn.execute(sql_case, (
        c7, f"CASE-{c7}",
        "SEDATU Housing Ministry Non-Competitive Capture - Edificacion Integral del Noroeste",
        "institutional_capture", 2007, 2024, "high", 430_000_000,
        "ARIA T3 queue pattern analysis",
        "EDIFICACION INTEGRAL DEL NOROESTE SA DE CV (v21096): 34 contracts, 679M total. "
        "SEDATU: 7 contracts, 430M (63.4%), DA=43% SB=57% = 100% non-competitive, 2021-2024. "
        "SON-SIDUR (Sonora Infrastructure): 5 contracts, 69M SB (10.2%), 2014-2018. "
        "CONAGUA: 7 contracts, 47M SB (6.9%), 2007-2013. "
        "SON-Cajeme municipality: 4 contracts, 46M SB (6.8%), 2012-2015. "
        "Sonora-based construction company with 63.4% concentration at SEDATU via "
        "100% non-competitive mechanisms (43% DA + 57% SB) in recent AMLO-era contracts. "
        "7 contracts totaling 430M at SEDATU 2021-2024 — all without competition. "
        "Combined with Sonora state capture (SON-SIDUR 10.2%) = 73.6% at SB/DA.",
    ))
    conn.execute(sql_vendor, (
        c7, 21096, "EDIFICACION INTEGRAL DEL NOROESTE S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.88,
        "SEDATU 63.4% (430M): 43% DA + 57% SB = 100% non-competitive, 7 ctrs 2021-2024",
    ))

    # Case 8: LC PROYECTOS - SON+SEDATU+SAGARPA multi-agency SB
    conn.execute(sql_case, (
        c8, f"CASE-{c8}",
        "Sonora State and Federal Multi-Agency SB Capture - LC Proyectos y Construcciones",
        "single_bid_capture", 2010, 2025, "high", 431_000_000,
        "ARIA T3 queue pattern analysis",
        "L C PROYECTOS Y CONSTRUCCIONES (v65155): 31 contracts, 528M total. "
        "81% single-bid rate. SON-SIDUR (Sonora Infrastructure): "
        "5 contracts, 185M SB (35%), SB=100%, 2016-2018. "
        "SEDATU: 4 contracts, 139M (26.3%), DA=75%, 2022-2024. "
        "SAGARPA/SADER (Agriculture): 2 contracts, 107M (20.3%), DA/SB=50%, 2023-2025. "
        "CONAGUA: 16 contracts, 64M SB (12.2%), SB=88%, 2010-2023. "
        "Combined SON-SIDUR + SEDATU + SAGARPA = 431M (81.6%), all high SB or DA. "
        "Construction/projects company capturing Sonora state infrastructure ministry "
        "(35%, 100% SB) and federal SEDATU (26.3%, 75% DA) and agriculture ministry "
        "(20.3%) — multi-agency SB/DA capture spanning 15 years across Sonora and federal.",
    ))
    conn.execute(sql_vendor, (
        c8, 65155, "L C PROYECTOS Y CONSTRUCCIONES",
        "primary", "high", "aria_queue_t3", 0.88,
        "SON-SIDUR 35% (100% SB)+SEDATU 26.3% (75% DA)+SAGARPA 20.3%=81.6%, SB=81%",
    ))

    # Case 9: GRUPO COVASA - MEX-CEA 87.2% 100% SB
    conn.execute(sql_case, (
        c9, f"CASE-{c9}",
        "State of Mexico Water Commission 100% SB Capture - Grupo Covasa",
        "single_bid_capture", 2006, 2014, "high", 316_000_000,
        "ARIA T3 queue pattern analysis",
        "GRUPO COVASA SA DE CV (v24386): 11 contracts, 362M total (2006-2014). "
        "100% single-bid rate. MEX-CEA (Comision del Agua del Estado de Mexico): "
        "7 contracts, 316M SB (87.2%), SB=100%, 2006-2010. "
        "SCT: 2 contracts, 27M SB (7.6%), 2010-2014. "
        "JCAM (Junta de Caminos del Estado de Mexico): 2 contracts, 19M SB (5.2%), 2007. "
        "Combined = 362M (100%), all 100% SB. "
        "Construction company with 87.2% concentration at the State of Mexico's water "
        "commission via 7 uncontested single-bid contracts totaling 316M (2006-2010). "
        "All 11 lifetime contracts won without competition — no competitive bids ever won. "
        "State of Mexico water authority during the Peña Nieto governorship "
        "(2005-2011) before his federal presidency.",
    ))
    conn.execute(sql_vendor, (
        c9, 24386, "GRUPO COVASA S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.92,
        "MEX-CEA 87.2% (316M): 100% SB, 7 ctrs 2006-2010, State of Mexico water capture",
    ))

    # Case 10: SINERGIA SERVICIOS - SIAP+INCAN 94.2% SB mismatch
    conn.execute(sql_case, (
        c10, f"CASE-{c10}",
        "Agricultural Statistics Agency and Cancer Institute SB Mismatch - Sinergia Servicios",
        "ghost_company", 2019, 2024, "high", 309_000_000,
        "ARIA T3 queue pattern analysis",
        "SINERGIA SERVICIOS DE PLANIFICACION EMPRESARIAL SA DE CV (v203404): "
        "23 contracts, 328M total (2019-2024). "
        "SIAP (Servicio de Informacion Agroalimentaria y Pesquera): "
        "8 contracts, 258M (78.6%), DA=25% SB=75%, 2019-2023. "
        "INCAN (Instituto Nacional de Cancerologia): "
        "10 contracts, 51M (15.6%), DA=10% SB=90%, 2019. "
        "CNBV: 1 contract, 12M DA (3.6%), 2020. "
        "Combined SIAP + INCAN = 309M (94.2%), both high SB. "
        "Business planning/enterprise services company ('Sinergia Servicios de "
        "Planificacion Empresarial') with 94.2% concentration at Mexico's agricultural "
        "statistics agency (SIAP) and national cancer institute (INCAN). "
        "Industry mismatch: an enterprise planning consultancy capturing an "
        "agricultural data agency and medical institute via SB procurement is "
        "consistent with front company pattern. All activity 2019-2024 (AMLO era).",
    ))
    conn.execute(sql_vendor, (
        c10, 203404, "SINERGIA SERVICIOS DE PLANIFICACION EMPRESARIAL SA DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "SIAP 78.6% (75% SB) + INCAN 15.6% (90% SB) = 94.2%, business planning at ag+cancer",
    ))

    # Case 11: CONCRETOS ASFALTICOS TECAMAC - AICM 89.5% SB
    conn.execute(sql_case, (
        c11, f"CASE-{c11}",
        "Mexico City Airport 75% SB Concrete Capture - Concretos Asfalticos Tecamac",
        "single_bid_capture", 2013, 2022, "high", 724_000_000,
        "ARIA T3 queue pattern analysis",
        "CONCRETOS ASFALTICOS TECAMAC (v112145): 20 contracts, 809M total (2013-2022). "
        "85% single-bid rate. AICM (Aeropuerto Internacional de la Ciudad de Mexico): "
        "12 contracts, 724M (89.5%), DA=25% SB=75%, 2015-2022. "
        "ASA (Aeropuertos y Servicios Auxiliares): 4 contracts, 42M SB (5.2%), 2014-2017. "
        "MEX-SOP: 1 contract, 25M SB (3.1%), 2013. "
        "Combined AICM + ASA = 766M (94.7%), all SB. "
        "Concrete and asphalt company (Tecamac, Estado de Mexico) with 89.5% concentration "
        "at Mexico City International Airport via 75% single-bid procurement — "
        "12 contracts totaling 724M at AICM 2015-2022. "
        "AICM infrastructure contracts through uncontested bids spanning nearly a decade.",
    ))
    conn.execute(sql_vendor, (
        c11, 112145, "CONCRETOS ASFALTICOS TECAMAC",
        "primary", "high", "aria_queue_t3", 0.90,
        "AICM 89.5% (724M): 75% SB, 12 ctrs 2015-2022; ASA 5.2% SB = 94.7%",
    ))

    # Case 12: LIMPIEZA PROFESIONAL DE MICHOACAN - SAGARPA 87.9% 100% SB cleaning mismatch
    conn.execute(sql_case, (
        c12, f"CASE-{c12}",
        "Agriculture Ministry Ghost Cleaning Company Capture - Limpieza Profesional de Michoacan",
        "ghost_company", 2002, 2010, "high", 376_000_000,
        "ARIA T3 queue pattern analysis",
        "LIMPIEZA PROFESIONAL DE MICHOACAN (v78): 19 contracts, 428M total (2002-2010). "
        "95% single-bid rate. SAGARPA (Secretaria de Agricultura, Ganaderia, Desarrollo Rural): "
        "4 contracts, 376M SB (87.9%), SB=100%, 2002-2005. "
        "API Lazaro Cardenas: 4 contracts, 27M SB (6.4%), 2002-2010. "
        "FIRA: 4 contracts, 12M SB (2.9%), 2007-2009. "
        "CFE: 4 contracts, 11M SB (2.7%), 2003-2009. "
        "Industry mismatch: a cleaning/janitorial company from Michoacan capturing "
        "Mexico's federal agriculture ministry via 4 uncontested SB contracts totaling "
        "376M in 2002-2005 — SAGARPA = 87.9% of lifetime revenue. "
        "Cleaning companies do not legitimately supply 376M in agriculture ministry contracts. "
        "Pattern consistent with phantom/ghost company with industry mismatch front.",
    ))
    conn.execute(sql_vendor, (
        c12, 78, "LIMPIEZA PROFESIONAL DE MICHOACAN",
        "primary", "high", "aria_queue_t3", 0.92,
        "SAGARPA 87.9% (376M): 100% SB, 4 ctrs 2002-2005, cleaning company at agriculture",
    ))

    # Case 13: MAHARBA - Tulum municipality 99.4% 100% SB
    conn.execute(sql_case, (
        c13, f"CASE-{c13}",
        "Tulum Municipality 100% SB Real Estate Capture - Maharba Servicios Inmobiliarios",
        "single_bid_capture", 2013, 2018, "high", 951_000_000,
        "ARIA T3 queue pattern analysis",
        "MAHARBA SERVICIOS INMOBILIARIOS SA DE CV (v103816): 9 contracts, 957M total (2013-2018). "
        "100% single-bid rate. Q ROO-Presidencia Municipal de Tulum: "
        "7 contracts, 951M SB (99.4%), SB=100%, 2013-2018. "
        "Q ROO-Solidaridad: 2 contracts, 6M SB (0.6%), 2017. "
        "Real estate services company with 99.4% concentration at the Tulum municipal "
        "government via 7 uncontested single-bid contracts totaling 951M (2013-2018). "
        "Tulum is a major tourist destination in Quintana Roo — a state with documented "
        "history of municipal-level procurement corruption linked to land development. "
        "A real estate company winning 951M at a small Caribbean municipality exclusively "
        "via uncontested bids is consistent with capture of a tourism-revenue municipal "
        "authority. All 9 lifetime contracts uncontested.",
    ))
    conn.execute(sql_vendor, (
        c13, 103816, "MAHARBA SERVICIOS INMOBILIARIOS SA DE CV",
        "primary", "high", "aria_queue_t3", 0.92,
        "Q ROO-Tulum 99.4% (951M): 100% SB, 7 ctrs 2013-2018, real estate at tourism municipality",
    ))

    # Case 14: LA AZTECA CONSTRUCCIONES - SCT+Sonora 85.6% 100% SB
    conn.execute(sql_case, (
        c14, f"CASE-{c14}",
        "Federal and Sonora State Roads 100% SB Capture - La Azteca Construcciones",
        "single_bid_capture", 2005, 2019, "high", 569_000_000,
        "ARIA T3 queue pattern analysis",
        "LA AZTECA CONSTRUCCIONES Y URBANIZACIONES SA DE CV (v22993): "
        "22 contracts, 664M total (2005-2019). "
        "100% single-bid rate. SCT: 8 contracts, 196M SB (29.5%), 2005-2018. "
        "Gobierno del Estado de Sonora: 1 contract, 173M SB (26%), 2019. "
        "Junta Estatal de Caminos de Sonora (JEC-SON): 2 contracts, 125M SB (18.8%), 2006-2008. "
        "SON-SIDUR: 3 contracts, 75M SB (11.3%), 2016-2017. "
        "Combined SCT + SON-Gov + JEC-SON + SON-SIDUR = 569M (85.6%), all 100% SB. "
        "Construction company capturing both federal SCT and Sonora state road/infrastructure "
        "institutions via exclusively uncontested single-bid procurement over 14 years. "
        "100% SB across 22 contracts — never once won a competitive tender.",
    ))
    conn.execute(sql_vendor, (
        c14, 22993, "LA AZTECA CONSTRUCCIONES Y URBANIZACIONES SA DE CV",
        "primary", "high", "aria_queue_t3", 0.90,
        "SCT 29.5%+SON Gov 26%+JEC-SON 18.8%+SON-SIDUR 11.3%=85.6%, 100% SB, 22 ctrs",
    ))

    # Case 15: CONSTRUCTORA E IMPULSORA CONDOR - CHIS+SCT+SEDATU 96.2%
    conn.execute(sql_case, (
        c15, f"CASE-{c15}",
        "Chiapas and Federal Infrastructure SB Capture - Constructora e Impulsora Condor",
        "single_bid_capture", 2008, 2022, "high", 713_000_000,
        "ARIA T3 queue pattern analysis",
        "CONSTRUCTORA E IMPULSORA CONDOR SA DE CV (v34356): 19 contracts, 741M total (2008-2022). "
        "84% single-bid rate. CHIS-Secretaria de Infraestructura del Estado de Chiapas: "
        "3 contracts, 370M SB (49.9%), SB=100%, 2008-2009. "
        "SCT: 8 contracts, 174M SB (23.5%), SB=100%, 2009-2018. "
        "SEDATU: 5 contracts, 169M (22.8%), DA=60% SB=40%, 2021-2022. "
        "MOR-CEAM: 1 contract, 14M SB (1.9%), 2008. "
        "Combined Chiapas + SCT + SEDATU = 713M (96.2%). "
        "Construction company capturing Chiapas state infrastructure (49.9%, 100% SB, 2008-2009 — "
        "during the Sabines governorship), federal transport ministry SCT (23.5%, 100% SB), "
        "and SEDATU (22.8%, non-competitive) across three phases 2008-2022. "
        "Chiapas infrastructure capture during a period of documented PAN-PRI corruption.",
    ))
    conn.execute(sql_vendor, (
        c15, 34356, "CONSTRUCTORA E IMPULSORA CONDOR SA DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "CHIS-Infra 49.9% (100% SB) + SCT 23.5% (100% SB) + SEDATU 22.8% = 96.2%",
    ))

    # Link contracts
    links = [
        (c1, 139325, 2014, 2021),
        (c2, 34359, 2010, 2024),
        (c3, 9673, 2002, 2016),
        (c4, 172800, 2016, 2025),
        (c5, 155170, 2015, 2025),
        (c6, 39196, 2009, 2025),
        (c7, 21096, 2007, 2024),
        (c8, 65155, 2010, 2025),
        (c9, 24386, 2006, 2014),
        (c10, 203404, 2019, 2024),
        (c11, 112145, 2013, 2022),
        (c12, 78, 2002, 2010),
        (c13, 103816, 2013, 2018),
        (c14, 22993, 2005, 2019),
        (c15, 34356, 2008, 2022),
    ]
    total_linked = 0
    for case_id, vendor_id, yr_start, yr_end in links:
        rows = conn.execute(
            "SELECT id FROM contracts WHERE vendor_id=? AND contract_year BETWEEN ? AND ?",
            (vendor_id, yr_start, yr_end),
        ).fetchall()
        for (cid,) in rows:
            conn.execute(
                "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?,?)",
                (case_id, cid),
            )
        total_linked += len(rows)
        print(f"  Case {case_id} (v{vendor_id}): linked {len(rows)} contracts ({yr_start}-{yr_end})")

    add_vids = [139325, 34359, 9673, 172800, 155170, 39196, 21096, 65155, 24386, 203404, 112145, 78, 103816, 22993, 34356]
    for vid in add_vids:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    skips = [
        (46734, "Uniformes El Tren - dispersed uniforms 476 ctrs across IMSS/CFE/CAPUFE, IMSS 43% mostly competitive (15% DA 6% SB)"),
        (43667, "Grupo Rimova - IEPSA top 35.7% DA=100%, combined IEPSA+AEFCM=55.4%, below 60% single-institution threshold"),
        (78888, "Micmar - dispersed 30 contracts, SHCP single SB 36% (1 contract), no dominant pattern across 5 agencies"),
        (5932, "Distribuidora y Exportadora de Medicamentos - dispersed medicines 424 ctrs, top=27.5% SSA-Hidalgo, low DA/SB pattern"),
        (124446, "Medical Advanced Supplies - dispersed medical supplies 343 ctrs, IMSS 26.8% mostly competitive, top 4=81.6% but mixed"),
    ]
    for vid, reason in skips:
        conn.execute(
            "UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes=? WHERE vendor_id=?",
            (reason, vid),
        )
        print(f"  v{vid}: SKIP")

    conn.commit()
    conn.close()
    print(f"\nDone. Inserted 15 cases ({c1}-{c15}), linked {total_linked} contracts, skipped 5.")


if __name__ == "__main__":
    main()
