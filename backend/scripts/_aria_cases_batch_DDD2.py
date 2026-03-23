#!/usr/bin/env python3
"""
GT Mining Batch DDD2 - ARIA T3 investigation (20 vendors)

Investigated 2026-03-23:
  v21088   TESIA CONSTRUCCIONES SA DE CV          ADD  (SAGARPA+CONAGUA+SICT 77.6%, 100% SB, 383M)
  v23328   CONSTRUCCIONES Y ESTRUCTURALES CAMACHO ADD  (NL state entities 69.6%, 100% SB, 490M)
  v66733   GRUPO MULTISERVICIOS ALCAR             ADD  (IMSS 55.2% 72% SB + CINVESTAV 22.2% 95% DA = 77.4%)
  v11915   CONSTRUCTORA CADENA SA DE CV           ADD  (BC+SEDATU+SCT+SICT 70.4%, 93% SB, 102 ctrs 1159M)
  v44048   CYO FACTORY SA DE CV                   ADD  (IMSS 100% 83% DA, 1265 ctrs 1108M 2010-2025)
  v39155   TECNICA EN MATERIALES ELECTRICOS       ADD  (CFE 98.6% 215M, 79% DA, 70 ctrs 2009-2016)
  v47211   INSUMOS Y SOLUCIONES MEDICAS           ADD  (IMSS-Bienestar 49.5% 100% DA + IMSS 42.3% 95% DA = 91.8%)
  v5013    GRUPO OCTANO SA DE CV                  ADD  (IMSS 56.2% + SCT 19.5% + ISSSTE 15.1% = 90.8%, 83% DA/SB)
  v279396  COMERCIALIZADORA FTICA HIPERMEDIC      ADD  (IMSS 99.8% 449M, 100% DA, 29 ctrs 2022-2024)
  v5393    EL BC SUPPLY SA DE CV                  ADD  (HIM 42.4% 62% DA + IMSS 39.9% = 82.3%, medical)
  v1454    AUTOBUSES ESTRELLA BLANCA SA DE CV     ADD  (IMSS 81.9% 1017M, 69% non-competitive, 176 ctrs)
  v172563  COMERCIT SA DE CV                      ADD  (IMSS 82.7% 225M, 87% DA, 3076 ctrs 2016-2024)
  v93976   KABLA COMERCIAL SA DE CV               ADD  (IMSS 89% DA 51.6% + combined top 4 = 75%, 363 ctrs)
  v210043  AVANTARE CONSULTORES SA DE CV          ADD  (IMSS 99.3% 217M, 75% non-competitive, 4 ctrs 2022-2025, ghost)
  v115009  AMC BIOMEDICAL SA DE CV                ADD  (IMSS 93.5% 514M, 53% DA, 515 ctrs 2013-2025)
  v9369    CONSORCIO DE SERVICIOS INTEGRALES      SKIP (dispersed 254 ctrs, top=9.4% CONDUSEF)
  v692     DISTRIBUIDORA GARDI SA DE CV           SKIP (dispersed 481 ctrs, top=22.5% CONAFE, low DA/SB)
  v27340   GIMOSA SA DE CV                        SKIP (Guardia Nacional 56.9% competitive 0% SB/DA, NL 40% SB)
  v27260   TRANSLIQUIDOS VAZQUEZ SA DE CV         SKIP (LICONSA 100% but 78% competitive 0% SB, specialized transport)
  v2860    DEX DEL NOROESTE SA DE CV              SKIP (Sonora dispersed 584 ctrs, combined 60% mostly competitive)

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
    if max_id is None or max_id < 1032:
        print(f"ERROR: max_id={max_id}, expected >= 1032. Aborting.")
        conn.close()
        return

    cases = list(range(max_id + 1, max_id + 16))
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

    # Case 1: TESIA CONSTRUCCIONES - multi-ministry 100% SB
    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "Agriculture, Water and Transport Ministry Multi-Agency 100% SB - Tesia Construcciones",
        "single_bid_capture", 2010, 2025, "high", 297_000_000,
        "ARIA T3 queue pattern analysis",
        "TESIA CONSTRUCCIONES SA DE CV (v21088): 30 contracts, 383M total (2010-2025). "
        "100% single-bid rate. SAGARPA/SADER: 3 contracts, 111M SB (29%), 2023-2025. "
        "CONAGUA: 6 contracts, 81M SB (21.1%), 2010-2025. "
        "SICT (previously SCT): 6 contracts, 76M SB (19.8%), 2019-2022. "
        "Gobierno de Sonora: 3 contracts, 29M SB (7.7%), 2022. "
        "Combined top 4 = 297M (77.6%), all 100% SB. "
        "Construction company with 100% SB rate across 30 contracts at "
        "Mexico's agriculture, water, and transport ministries plus Sonora state. "
        "Zero competitive wins in lifetime — every single contract uncontested.",
    ))
    conn.execute(sql_vendor, (
        c1, 21088, "TESIA CONSTRUCCIONES, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.90,
        "SAGARPA 29%+CONAGUA 21.1%+SICT 19.8%+SON 7.7%=77.6%, 100% SB, 30 ctrs",
    ))

    # Case 2: CAMACHO - Nuevo León state 100% SB
    conn.execute(sql_case, (
        c2, f"CASE-{c2}",
        "Nuevo Leon State Infrastructure 100% SB Capture - Construcciones y Estructurales Camacho",
        "single_bid_capture", 2005, 2015, "high", 341_000_000,
        "ARIA T3 queue pattern analysis",
        "CONSTRUCCIONES Y ESTRUCTURALES CAMACHO SA DE CV (v23328): 35 contracts, 490M total. "
        "100% single-bid rate. NL-FIDEPROEU (Fideicomiso Promotor de Proyectos Estrategicos "
        "Urbanos de NL): 5 contracts, 129M SB (26.3%), 2007-2008. "
        "NL-SOPNL (Secretaria de Obras Publicas de Nuevo Leon): "
        "6 contracts, 93M SB (18.9%), 2005-2009. "
        "NL-Apodaca (Presidencia Municipal): 3 contracts, 68M SB (14%), 2010-2015. "
        "NL-CESE (Comite de Construccion de Escuelas de Nuevo Leon): "
        "2 contracts, 51M SB (10.4%), 2007-2008. "
        "Combined NL state entities = 341M (69.6%), all 100% SB. "
        "Nuevo León construction company capturing the state's urban development trust, "
        "public works ministry, Apodaca municipality, and school construction committee "
        "via exclusively uncontested single-bid procurement.",
    ))
    conn.execute(sql_vendor, (
        c2, 23328, "CONSTRUCCIONES Y ESTRUCTURALES CAMACHO, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.90,
        "NL-FIDEPROEU 26.3%+SOPNL 18.9%+Apodaca 14%+CESE 10.4%=69.6%, 100% SB",
    ))

    # Case 3: GRUPO MULTISERVICIOS ALCAR - IMSS 55.2% 72% SB + CINVESTAV 22.2% 95% DA
    conn.execute(sql_case, (
        c3, f"CASE-{c3}",
        "IMSS SB and CINVESTAV DA Dual Capture - Grupo Multiservicios Alcar",
        "institutional_capture", 2012, 2025, "high", 273_000_000,
        "ARIA T3 queue pattern analysis",
        "GRUPO MULTISERVICIOS ALCAR SA DE CV (v66733): 301 contracts, 352M total (2012-2025). "
        "IMSS: 126 contracts, 195M (55.2%), DA=16% SB=72% = 88% non-competitive, 2012-2025. "
        "CINVESTAV (Centro de Investigacion y Estudios Avanzados del IPN): "
        "111 contracts, 78M (22.2%), DA=95%, 2019-2025. "
        "Cultura: 12 contracts, 50M DA (14.1%), 2019-2025. "
        "Combined IMSS + CINVESTAV = 273M (77.4%). "
        "Multi-services company with IMSS as primary SB-captured client (72% SB, 126 contracts) "
        "and CINVESTAV as DA-captured secondary (95% DA, 111 contracts). "
        "Dual-institution non-competitive capture: 88% non-competitive at IMSS and "
        "95% DA at Mexico's advanced research center.",
    ))
    conn.execute(sql_vendor, (
        c3, 66733, "GRUPO MULTISERVICIOS ALCAR SA DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "IMSS 55.2% (72% SB) + CINVESTAV 22.2% (95% DA) = 77.4%, 301 ctrs",
    ))

    # Case 4: CONSTRUCTORA CADENA - BC+SEDATU+SCT+SICT 93% SB
    conn.execute(sql_case, (
        c4, f"CASE-{c4}",
        "Baja California and Federal Infrastructure 93% SB Multi-Agency Capture - Constructora Cadena",
        "single_bid_capture", 2011, 2022, "high", 816_000_000,
        "ARIA T3 queue pattern analysis",
        "CONSTRUCTORA CADENA SA DE CV (v11915): 102 contracts, 1159M total (2011-2022). "
        "93% single-bid rate. BC-SIDUE (Baja California Infrastructure): "
        "12 contracts, 225M SB (19.4%), SB=92%, 2011-2016. "
        "SEDATU: 3 contracts, 223M SB (19.3%), SB=67%, 2019-2020. "
        "SCT: 8 contracts, 213M SB (18.3%), SB=88%, 2015-2018. "
        "SICT (renamed SCT): 11 contracts, 155M SB (13.4%), SB=91%, 2019-2022. "
        "Combined BC-SIDUE + SEDATU + SCT + SICT = 816M (70.4%), all 88-92% SB. "
        "Construction company with 93% SB rate across 102 contracts spanning Baja California "
        "state infrastructure and federal transport/housing ministries over 11 years — "
        "sustained multi-institution single-bid dominance.",
    ))
    conn.execute(sql_vendor, (
        c4, 11915, "CONSTRUCTORA CADENA S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.90,
        "BC-SIDUE 19.4%+SEDATU 19.3%+SCT 18.3%+SICT 13.4%=70.4%, 93% SB, 102 ctrs 1159M",
    ))

    # Case 5: CYO FACTORY - IMSS 100% 83% DA 1108M
    conn.execute(sql_case, (
        c5, f"CASE-{c5}",
        "IMSS Single-Client Direct Award Capture 1108M - CYO Factory",
        "institutional_capture", 2010, 2025, "high", 1_108_000_000,
        "ARIA T3 queue pattern analysis",
        "CYO FACTORY SA DE CV (v44048): 1271 contracts, 1108M total (2010-2025). "
        "IMSS: 1265 contracts, 1108M (100%), DA=83% SB=0%, 2010-2025. "
        "DIF, HIM, INCAN: 3 trivial contracts 0M total. "
        "Company with 100% concentration at Mexico's national health insurer via "
        "83% direct award rate — 1265 contracts totaling 1108M at IMSS over 15 years, "
        "the overwhelming majority (83%) awarded directly without competition. "
        "Sustained DA-dominant capture across three presidential administrations "
        "(Calderon, Peña Nieto, AMLO). Zero SB among competitive procedures.",
    ))
    conn.execute(sql_vendor, (
        c5, 44048, "CYO FACTORY SA DE CV",
        "primary", "high", "aria_queue_t3", 0.93,
        "IMSS 100% (1108M): 83% DA, 1265 contracts 2010-2025, sustained single-client DA",
    ))

    # Case 6: TECNICA EN MATERIALES ELECTRICOS - CFE 98.6% 79% DA
    conn.execute(sql_case, (
        c6, f"CASE-{c6}",
        "CFE Electricity Commission 79% DA Electrical Materials Capture - Tecnica en Materiales Electricos",
        "institutional_capture", 2009, 2016, "high", 215_000_000,
        "ARIA T3 queue pattern analysis",
        "TECNICA EN MATERIALES ELECTRICOS SA DE CV (v39155): 76 contracts, 218M total (2009-2016). "
        "CFE (Comision Federal de Electricidad): "
        "70 contracts, 215M (98.6%), DA=79% SB=13%, 2009-2016. "
        "IMSS: 3 contracts, 2M (1.1%), 2012-2018. "
        "Electrical materials company with 98.6% concentration at Mexico's federal "
        "electricity commission via 79% direct award rate — 70 contracts totaling 215M "
        "at CFE 2009-2016, nearly all (79%) awarded directly without competition. "
        "Extreme single-client concentration with high DA rate at a major state enterprise.",
    ))
    conn.execute(sql_vendor, (
        c6, 39155, "TECNICA EN MATERIALES ELECTRICOS S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.90,
        "CFE 98.6% (215M): 79% DA, 70 contracts 2009-2016",
    ))

    # Case 7: INSUMOS Y SOLUCIONES MEDICAS - IMSS+IMSS-Bienestar 91.8% all DA
    conn.execute(sql_case, (
        c7, f"CASE-{c7}",
        "IMSS and IMSS-Bienestar Exclusive Direct Award Medical Capture - Insumos y Soluciones Medicas",
        "institutional_capture", 2010, 2025, "high", 622_000_000,
        "ARIA T3 queue pattern analysis",
        "INSUMOS Y SOLUCIONES MEDICAS SA DE CV (v47211): 1487 contracts, 677M total (2010-2025). "
        "IMSS-Bienestar (formerly Insabi): "
        "27 contracts, 336M (49.5%), DA=100%, 2024-2025. "
        "IMSS: 1388 contracts, 286M (42.3%), DA=95% SB=0%, 2010-2025. "
        "SEDENA: 7 contracts, 30M DA (4.4%), 2020-2021. "
        "Combined IMSS-Bienestar + IMSS = 622M (91.8%), both 95-100% DA. "
        "Medical supplies company with 91.8% concentration across IMSS's two main arms "
        "(classical IMSS and the AMLO-era IMSS-Bienestar rural health program) via "
        "exclusively direct award procurement — 1415 contracts at near-100% DA. "
        "Zero competitive wins at either institution.",
    ))
    conn.execute(sql_vendor, (
        c7, 47211, "INSUMOS Y SOLUCIONES MEDICAS S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.92,
        "IMSS-Bienestar 49.5% (100% DA) + IMSS 42.3% (95% DA) = 91.8%, 1415 ctrs DA",
    ))

    # Case 8: GRUPO OCTANO - IMSS+SCT+ISSSTE 90.8% high DA/SB
    conn.execute(sql_case, (
        c8, f"CASE-{c8}",
        "IMSS, Transport and Social Security Multi-Agency Non-Competitive Capture - Grupo Octano",
        "institutional_capture", 2002, 2022, "high", 218_000_000,
        "ARIA T3 queue pattern analysis",
        "GRUPO OCTANO SA DE CV (v5013): 214 contracts, 240M total (2002-2022). "
        "83% non-competitive (55% DA + 28% SB). "
        "IMSS: 110 contracts, 135M (56.2%), DA=47% SB=26% = 73% non-competitive, 2002-2022. "
        "SCT: 10 contracts, 47M SB (19.5%), SB=100%, 2007-2018. "
        "ISSSTE: 32 contracts, 36M (15.1%), DA=38% SB=44% = 82% non-competitive, 2002-2022. "
        "Combined IMSS + SCT + ISSSTE = 218M (90.8%), all predominantly non-competitive. "
        "Multi-services company capturing Mexico's national health insurer (IMSS, 73% non-competitive), "
        "federal transport ministry (SCT, 100% SB), and civil servant social security "
        "(ISSSTE, 82% non-competitive) over 20 years.",
    ))
    conn.execute(sql_vendor, (
        c8, 5013, "GRUPO OCTANO, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.86,
        "IMSS 56.2% (73% DA/SB) + SCT 19.5% (100% SB) + ISSSTE 15.1% = 90.8%",
    ))

    # Case 9: HIPERMEDIC - IMSS 99.8% 100% DA 2022-2024
    conn.execute(sql_case, (
        c9, f"CASE-{c9}",
        "IMSS 100% Direct Award Pharmaceutical Ghost Capture 2022-2024 - Hipermedic",
        "ghost_company", 2022, 2024, "high", 449_000_000,
        "ARIA T3 queue pattern analysis",
        "COMERCIALIZADORA FTICA HIPERMEDIC SA DE CV (v279396): 30 contracts, 450M total. "
        "IMSS: 29 contracts, 449M (99.8%), DA=100% SB=0%, 2022-2024. "
        "ISSSTE: 1 contract, 1M SB (0.2%), 2024. "
        "Company with 99.8% concentration at IMSS via 100% direct award — "
        "29 contracts totaling 449M in just 2022-2024 (3 years), all awarded directly. "
        "Massive and rapid DA capture of IMSS with zero competitive bids. "
        "Pattern consistent with a ghost/shell company established specifically to "
        "capture AMLO-era IMSS direct award pharmaceutical contracts. "
        "449M in 3 years without ever winning a competitive tender.",
    ))
    conn.execute(sql_vendor, (
        c9, 279396, "COMERCIALIZADORA FTICA HIPERMEDIC SA DE CV",
        "primary", "high", "aria_queue_t3", 0.93,
        "IMSS 99.8% (449M): 100% DA, 29 contracts 2022-2024, rapid ghost capture",
    ))

    # Case 10: EL BC SUPPLY - HIM+IMSS 82.3% high DA
    conn.execute(sql_case, (
        c10, f"CASE-{c10}",
        "Children's Hospital and IMSS Medical Supply Non-Competitive Dual Capture - El BC Supply",
        "institutional_capture", 2002, 2025, "medium", 198_000_000,
        "ARIA T3 queue pattern analysis",
        "EL BC SUPPLY SA DE CV (v5393): 149 contracts, 240M total (2002-2025). "
        "Hospital Infantil de Mexico Federico Gomez (HIM): "
        "47 contracts, 102M (42.4%), DA=62% SB=0%, 2007-2025. "
        "IMSS: 56 contracts, 96M (39.9%), DA=39% SB=23% = 62% non-competitive, 2002-2025. "
        "INP (Instituto Nacional de Pediatria): 4 contracts, 13M (5.5%), 2023-2024. "
        "Combined HIM + IMSS = 198M (82.3%), both with high DA rates. "
        "Baja California medical supply company with 82.3% concentration at "
        "Mexico's main children's hospital (HIM, 62% DA over 18 years) and "
        "national health insurer (IMSS, 62% non-competitive over 23 years).",
    ))
    conn.execute(sql_vendor, (
        c10, 5393, "EL BC SUPPLY, S.A. DE C.V.",
        "primary", "medium", "aria_queue_t3", 0.82,
        "HIM 42.4% (62% DA) + IMSS 39.9% (62% DA/SB) = 82.3%, 149 ctrs 2002-2025",
    ))

    # Case 11: AUTOBUSES ESTRELLA BLANCA - IMSS 81.9% 69% non-competitive
    conn.execute(sql_case, (
        c11, f"CASE-{c11}",
        "IMSS Transport Services 69% Non-Competitive Capture - Autobuses Estrella Blanca",
        "institutional_capture", 2002, 2025, "medium", 702_000_000,
        "ARIA T3 queue pattern analysis",
        "AUTOBUSES ESTRELLA BLANCA SA DE CV (v1454): 330 contracts, 1242M total (2002-2025). "
        "IMSS: 176 contracts, 1017M (81.9%), DA=33% SB=36% = 69% non-competitive, 2002-2025. "
        "INM: 6 contracts, 55M (4.4%), 2003-2016. "
        "BANJERCITO: 11 contracts, 35M (2.8%), 2003-2020. "
        "Major national bus operator with 81.9% concentration at Mexico's national "
        "health insurer (IMSS) via 69% non-competitive procurement — 176 contracts totaling "
        "1017M at IMSS over 23 years, with 33% DA and 36% SB rate. "
        "While Estrella Blanca is a real transport company, 81.9% of government revenue "
        "concentrated at a single client (IMSS) with 69% non-competitive procurement over "
        "23 years spanning five administrations indicates institutional capture of transport contracts.",
    ))
    conn.execute(sql_vendor, (
        c11, 1454, "AUTOBUSES ESTRELLA BLANCA S.A. DE C.V.",
        "primary", "medium", "aria_queue_t3", 0.80,
        "IMSS 81.9% (1017M): 69% non-competitive (33% DA + 36% SB), 176 ctrs 2002-2025",
    ))

    # Case 12: COMERCIT - IMSS 82.7% 87% DA 3076 ctrs
    conn.execute(sql_case, (
        c12, f"CASE-{c12}",
        "IMSS 87% Direct Award Micro-Contract Capture - Comercit",
        "institutional_capture", 2016, 2024, "high", 225_000_000,
        "ARIA T3 queue pattern analysis",
        "COMERCIT SA DE CV (v172563): 3248 contracts, 272M total (2016-2024). "
        "IMSS: 3076 contracts, 225M (82.7%), DA=87% SB=0%, 2016-2024. "
        "INSABI: 9 contracts, 27M (10%), DA=22%, 2021-2023. "
        "Combined IMSS + INSABI = 252M (92.7%). "
        "Company with 82.7% concentration at IMSS via 87% direct award — "
        "3076 contracts totaling 225M at IMSS over 8 years (average ~73K MXN per contract). "
        "Micro-contract DA capture: extremely high volume of small DA contracts at IMSS. "
        "87% DA across 3076 contracts = ~2676 direct awards at Mexico's largest health insurer. "
        "Pattern consistent with systematic exploitation of DA micro-contract thresholds.",
    ))
    conn.execute(sql_vendor, (
        c12, 172563, "COMERCIT SA DE CV",
        "primary", "high", "aria_queue_t3", 0.90,
        "IMSS 82.7% (225M): 87% DA, 3076 contracts 2016-2024, micro-contract DA exploitation",
    ))

    # Case 13: KABLA COMERCIAL - IMSS 89% DA 51.6% + combined 75%
    conn.execute(sql_case, (
        c13, f"CASE-{c13}",
        "IMSS 89% Direct Award Cable/Equipment Capture - Kabla Comercial",
        "institutional_capture", 2014, 2025, "high", 138_000_000,
        "ARIA T3 queue pattern analysis",
        "KABLA COMERCIAL SA DE CV (v93976): 363 contracts, 267M total (2014-2025). "
        "IMSS: 210 contracts, 138M (51.6%), DA=89% SB=1%, 2014-2025. "
        "CENAPRECE: 1 contract, 30M (11.3%), DA=0%, 2025. "
        "SEDENA: 7 contracts, 18M SB (6.7%), 2016-2025. "
        "SSA: 8 contracts, 14M DA (5.4%), 2019-2025. "
        "Combined top 4 = 200M (74.9%). "
        "Cable/equipment company with 51.6% concentration at IMSS via 89% direct award "
        "rate — 210 contracts at Mexico's national health insurer with near-exclusive "
        "DA procurement. Combined health sector exposure (IMSS + SSA = 57%) at "
        "dominant DA rates suggests systematic DA exploitation of health sector procurement.",
    ))
    conn.execute(sql_vendor, (
        c13, 93976, "KABLA COMERCIAL SA DE CV",
        "primary", "high", "aria_queue_t3", 0.86,
        "IMSS 51.6% (89% DA) + combined health+SEDENA = 74.9%, 363 ctrs",
    ))

    # Case 14: AVANTARE CONSULTORES - IMSS 99.3% ghost 4 ctrs
    conn.execute(sql_case, (
        c14, f"CASE-{c14}",
        "IMSS Ghost Consultant 99.3% Non-Competitive Capture 2022-2025 - Avantare Consultores",
        "ghost_company", 2017, 2025, "high", 217_000_000,
        "ARIA T3 queue pattern analysis",
        "AVANTARE CONSULTORES SA DE CV (v210043): 8 contracts, 218M total (2017-2025). "
        "IMSS: 4 contracts, 217M (99.3%), DA=50% SB=25% = 75% non-competitive, 2022-2025. "
        "INFOTEC: 2 contracts, 1M (0.6%), DA=50% SB=50%, 2018-2019. "
        "IMP: 2 contracts, 0.3M DA (0.1%), 2017. "
        "Consulting company with 99.3% concentration at IMSS via 75% non-competitive — "
        "4 contracts totaling 217M at IMSS in 2022-2025 (AMLO era). "
        "INFOTEC and IMP used as prior legitimacy cover (1.3M total). "
        "Classic P2 ghost pattern: minor presence at tech/energy institutions, "
        "then massive AMLO-era IMSS contracts via DA/SB. "
        "4 contracts = 217M in 4 years with no prior significant activity.",
    ))
    conn.execute(sql_vendor, (
        c14, 210043, "AVANTARE CONSULTORES SA DE CV",
        "primary", "high", "aria_queue_t3", 0.90,
        "IMSS 99.3% (217M): 75% non-competitive, 4 ctrs 2022-2025, ghost escalation",
    ))

    # Case 15: AMC BIOMEDICAL - IMSS 93.5% 53% DA 515 ctrs
    conn.execute(sql_case, (
        c15, f"CASE-{c15}",
        "IMSS Biomedical Direct Award Sustained Capture - AMC Biomedical",
        "institutional_capture", 2013, 2025, "high", 514_000_000,
        "ARIA T3 queue pattern analysis",
        "AMC BIOMEDICAL SA DE CV (v115009): 620 contracts, 550M total (2013-2025). "
        "IMSS: 515 contracts, 514M (93.5%), DA=53% SB=3%, 2013-2025. "
        "IMSS-Bienestar: 7 contracts, 16M DA (2.8%), 2023-2024. "
        "ISSSTE: 51 contracts, 8M (1.5%), 2019-2025. "
        "Combined IMSS + IMSS-Bienestar = 530M (96.3%). "
        "Biomedical company with 93.5% concentration at IMSS via 53% direct award "
        "rate — 515 contracts totaling 514M at Mexico's national health insurer over 12 years. "
        "Sustained DA-dominant capture across Peña Nieto and AMLO administrations. "
        "Combined IMSS arms (93.5% + 2.8%) = 96.3% single-ecosystem concentration.",
    ))
    conn.execute(sql_vendor, (
        c15, 115009, "AMC BIOMEDICAL SA DE CV",
        "primary", "high", "aria_queue_t3", 0.90,
        "IMSS 93.5% (514M): 53% DA, 515 contracts 2013-2025; IMSS-Bienestar 2.8% = 96.3%",
    ))

    # Link contracts
    links = [
        (c1, 21088, 2010, 2025),
        (c2, 23328, 2005, 2015),
        (c3, 66733, 2012, 2025),
        (c4, 11915, 2011, 2022),
        (c5, 44048, 2010, 2025),
        (c6, 39155, 2009, 2018),
        (c7, 47211, 2010, 2025),
        (c8, 5013, 2002, 2022),
        (c9, 279396, 2022, 2024),
        (c10, 5393, 2002, 2025),
        (c11, 1454, 2002, 2025),
        (c12, 172563, 2016, 2024),
        (c13, 93976, 2014, 2025),
        (c14, 210043, 2017, 2025),
        (c15, 115009, 2013, 2025),
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

    add_vids = [21088, 23328, 66733, 11915, 44048, 39155, 47211, 5013, 279396, 5393, 1454, 172563, 93976, 210043, 115009]
    for vid in add_vids:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    skips = [
        (9369, "Consorcio de Servicios Integrales - dispersed 254 ctrs across 20+ agencies, top=9.4% CONDUSEF"),
        (692, "Distribuidora Gardi - dispersed 481 ctrs education/food, top=22.5% CONAFE, low DA/SB"),
        (27340, "Gimosa - Guardia Nacional 56.9% contract is 0% DA/0% SB competitive; NL state 33.4% only 40% SB"),
        (27260, "Transliquidos Vazquez - LICONSA 100% concentration but 78% competitive procurement (0% SB, 22% DA), specialized transport"),
        (2860, "Dex del Noroeste - Sonora dispersed supplier 584 ctrs, combined Sonora entities ~60% mostly competitive"),
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
