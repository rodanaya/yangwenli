#!/usr/bin/env python3
"""
GT Mining Batch EEE2 - ARIA T3 investigation (20 vendors)

Investigated 2026-03-23:
  v115286  TERRACERIAS Y PAVIMENTOS G & A        ADD  (JAL-SIOP 75%+SCT 20.1%=95.1%, 100% SB, 276M)
  v30179   GLOBAL MEXICANA DE INFRAESTRUCTURA    ADD  (INCMNSZ 69.1%+HGM 18.5%+IPN 10%=97.6%, 100% SB)
  v72082   DEPROYCO SA DE CV                     ADD  (SAGARPA 54.4%+SCT 17.5%+SICT 13.8%=91.6%, 100% SB)
  v11636   GALUMEDICAL SA DE CV                  ADD  (HGM 72.1% 83% DA + HRAE 11.3% + HIM 6.4% = 89.8%)
  v614     SERVICIOS HOSPITALARIOS DE MEXICO     ADD  (IMSS 59.5% 76% DA + CHIH 14.3% 100% DA + ISSSTE 8%)
  v66757   MARURBED CONSTRUCTORA SA DE CV        ADD  (ASIPONA-Topol 43.5%+CONAPESCA 25.7%+SIN 14.8%=84%+)
  v258316  CORPORATIVO SAG DE TO S DE RL         ADD  (Bienestar+INDEP+SRE+SICT=92.4%, 1095M 2020-2023)
  v41996   GRUPO CONSTRUCTOR ANGELO MIXTECO      ADD  (SCT 47.6%+CAPUFE 18.7%+PUE 14.4%+SICT 11.2%=91.9% SB)
  v33052   SUPERCATE SA DE CV                    ADD  (SCT 63.5%+CONAGUA 24.9%+SICT 7.8%=96.2%, 100% SB)
  v211297  SERVICIOS PJP4 DE MEXICO SA DE CV     ADD  (CENAGAS 100% 1384M, 83% non-competitive 2017-2023)
  v795     HYSOL INDAEL DE MEXICO SA DE CV       ADD  (SSA 90.8% 285M SB 1 contract 2023, ghost escalation)
  v94      SCIENCE APPLICATIONS INTL (SAIC)      ADD  (FIDEPOPYME 40.3% SB+SAT 31.5% DA+ports=94.1%)
  v57616   ERKAM SERVICIOS INTEGRALES            ADD  (SCT 70.4%+JEC-Sonora 10.7%+Hermosillo 9.7%=95.6% SB)
  v20187   FARMACEUTICO EMPRESARIAL MARTINEZ     ADD  (PEMEX Corp 90.1%+PEMEX 6.7%=96.8%, 78% DA, 520M)
  v159820  CAPITAL LEASING MEXICO SA DE CV       ADD  (IMSS 99.1% 445M 100% DA 1 contract 2016, ghost)
  v241705  JD ABARROTES Y PERECEDEROS SA DE CV   ADD  (UMPM 87.4% 208M 50% DA/SB, grocery at maritime univ)
  v24548   DESARROLLOS INTEGRALES CONIN SA DE CV ADD  (QRO entities 92.8%, 100% SB, 13 ctrs 332M)
  v44072   AT&T COMUNICACIONES DIGITALES         SKIP (global telecom brand, dispersed DA across agencies)
  v82913   NOXTROL                               SKIP (CFE 100% but 0% DA/0% SB = all 4 contracts competitive)
  v17512   SUPER CAMIONES Y AUTOS DE SILAO       SKIP (dispersed vehicle dealer 107 ctrs, CFE 29.5% competitive)

Cases added: 17  |  Vendors skipped: 3
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 1047:
        print(f"ERROR: max_id={max_id}, expected >= 1047. Aborting.")
        conn.close()
        return

    cases = list(range(max_id + 1, max_id + 18))  # 17 cases
    (c1, c2, c3, c4, c5, c6, c7, c8, c9, c10,
     c11, c12, c13, c14, c15, c16, c17) = cases

    print(f"Max GT case id: {max_id}")
    print(f"Inserting cases {c1}-{c17}")

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

    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "Jalisco Infrastructure and SCT 100% SB Road Capture - Terracerias y Pavimentos G&A",
        "single_bid_capture", 2013, 2021, "high", 262_000_000,
        "ARIA T3 queue pattern analysis",
        "TERRACERIAS Y PAVIMENTOS G & A SA DE CV (v115286): 8 contracts, 276M total. "
        "100% single-bid rate. JAL-SIOP (Jalisco Infrastructure): 4 contracts, 207M SB (75%), 2013-2016. "
        "SCT: 2 contracts, 55M SB (20.1%), 2014. Gobierno de Jalisco: 1 contract, 11M SB (4.1%), 2021. "
        "Combined JAL+SCT = 262M (95.1%), all 100% SB. "
        "Jalisco road company with 95.1% concentration at state infrastructure and "
        "federal transport ministry via exclusively uncontested single-bid procurement.",
    ))
    conn.execute(sql_vendor, (c1, 115286, "TERRACERIAS Y PAVIMENTOS G & A SA DE CV",
        "primary", "high", "aria_queue_t3", 0.90,
        "JAL-SIOP 75%+SCT 20.1%=95.1%, 100% SB, 8 ctrs 276M"))

    conn.execute(sql_case, (
        c2, f"CASE-{c2}",
        "Medical Research Institutions 100% SB Ghost Capture - Global Mexicana de Infraestructura",
        "ghost_company", 2007, 2018, "high", 466_000_000,
        "ARIA T3 queue pattern analysis",
        "GLOBAL MEXICANA DE INFRAESTRUCTURA SA DE CV (v30179): 6 contracts, 478M total. "
        "100% single-bid rate. INCMNSZ (Instituto Nacional de Ciencias Medicas y Nutricion Salvador Zubiran): "
        "1 contract, 330M SB (69.1%), 2018. "
        "Hospital General de Mexico: 1 contract, 88M SB (18.5%), 2012. "
        "IPN-POIIES (IPN Patronato de Obras): 2 contracts, 48M SB (10%), 2010. "
        "CONAGUA: 2 contracts, 12M SB (2.4%), 2007-2012. "
        "Combined medical/research = 466M (97.6%), all 100% SB. "
        "Infrastructure company with 97.6% concentration at elite medical research institutions "
        "(INCMNSZ, Hospital General, IPN) via exclusively uncontested single-bid awards. "
        "330M single SB at INCMNSZ in 2018 = 69.1% of lifetime revenue in one contract.",
    ))
    conn.execute(sql_vendor, (c2, 30179, "GLOBAL MEXICANA DE INFRAESTRUCTURA SA DE CV",
        "primary", "high", "aria_queue_t3", 0.92,
        "INCMNSZ 69.1% (330M SB)+HGM 18.5%+IPN 10%=97.6%, 100% SB, 6 ctrs"))

    conn.execute(sql_case, (
        c3, f"CASE-{c3}",
        "Agriculture, Transport and Sonora 100% SB Multi-Agency Capture - Deproyco",
        "single_bid_capture", 2010, 2024, "high", 395_000_000,
        "ARIA T3 queue pattern analysis",
        "DEPROYCO SA DE CV (v72082): 15 contracts, 431M total (2010-2024). "
        "100% single-bid rate. SAGARPA/SADER: 3 contracts, 234M SB (54.4%), 2023-2024. "
        "SCT: 3 contracts, 76M SB (17.5%), 2010-2012. "
        "SICT: 3 contracts, 59M SB (13.8%), 2021. "
        "JEC-Sonora: 3 contracts, 26M SB (5.9%), 2013-2014. "
        "Combined top 4 = 395M (91.6%), all 100% SB. "
        "Construction/projects company with 91.6% across agriculture ministry (SAGARPA), "
        "transport ministry (SCT/SICT), and Sonora roads — all 100% uncontested.",
    ))
    conn.execute(sql_vendor, (c3, 72082, "DEPROYCO SA DE CV",
        "primary", "high", "aria_queue_t3", 0.90,
        "SAGARPA 54.4%+SCT 17.5%+SICT 13.8%+JEC-SON 5.9%=91.6%, 100% SB"))

    conn.execute(sql_case, (
        c4, f"CASE-{c4}",
        "Hospital General 83% DA Medical Capture - Galumedical",
        "institutional_capture", 2007, 2025, "high", 786_000_000,
        "ARIA T3 queue pattern analysis",
        "GALUMEDICAL SA DE CV (v11636): 316 contracts, 875M total (2007-2025). "
        "Hospital General de Mexico Dr. Eduardo Liceaga: 87 contracts, 631M (72.1%), DA=83% SB=6%, 2010-2025. "
        "Hospital Regional Alta Especialidad Ixtapaluca: 10 contracts, 99M (11.3%), DA=20% SB=50%, 2013-2022. "
        "Hospital Infantil de Mexico (HIM): 54 contracts, 56M (6.4%), DA=83%, 2007-2025. "
        "Combined HGM+HRAE+HIM = 786M (89.8%), all high DA. "
        "Medical company with 72.1% concentration at Hospital General de Mexico via 83% DA — "
        "87 contracts totaling 631M at HGM over 15 years, mostly (83%) direct awards. "
        "Also captures two other specialized hospitals at high DA rates.",
    ))
    conn.execute(sql_vendor, (c4, 11636, "GALUMEDICAL S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.90,
        "HGM 72.1% (631M, 83% DA) + HRAE 11.3% + HIM 6.4% = 89.8%"))

    conn.execute(sql_case, (
        c5, f"CASE-{c5}",
        "IMSS 76% DA and Chihuahua Health 100% DA Hospital Services Capture - Servicios Hospitalarios",
        "institutional_capture", 2006, 2025, "high", 471_000_000,
        "ARIA T3 queue pattern analysis",
        "SERVICIOS HOSPITALARIOS DE MEXICO SA DE CV (v614): 235 contracts, 551M total (2006-2025). "
        "IMSS: 123 contracts, 328M (59.5%), DA=76% SB=5%, 2006-2025. "
        "CHIH-ICHISAL (Chihuahua Health Institute): 3 contracts, 79M (14.3%), DA=100%, 2017. "
        "NAFIN: 10 contracts, 64M (11.6%), DA=10%, 2008-2019. "
        "ISSSTE: 89 contracts, 44M (8%), DA=55%, 2009-2022. "
        "Combined IMSS+CHIH+ISSSTE = 451M (81.9%). "
        "Hospital services company with 59.5% at IMSS via 76% DA — 123 contracts at Mexico's "
        "national health insurer predominantly by direct award over 19 years. "
        "Also captures Chihuahua state health institute (79M, 100% DA) and ISSSTE.",
    ))
    conn.execute(sql_vendor, (c5, 614, "SERVICIOS HOSPITALARIOS DE MEXICO, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.88,
        "IMSS 59.5% (76% DA) + CHIH-ICHISAL 14.3% (100% DA) + ISSSTE 8% = 81.8%"))

    conn.execute(sql_case, (
        c6, f"CASE-{c6}",
        "Sinaloa Port Authority and Fisheries Agency SB Capture - Marurbed Constructora",
        "single_bid_capture", 2007, 2023, "high", 337_000_000,
        "ARIA T3 queue pattern analysis",
        "MARURBED CONSTRUCTORA SA DE CV (v66757): 17 contracts, 402M total (2007-2023). "
        "ASIPONA-Topolobampo (Sinaloa Pacific port): 1 contract, 175M SB (43.5%), 2023. "
        "CONAPESCA (National Fisheries): 7 contracts, 103M (25.7%), SB=71%, 2010-2020. "
        "Gobierno de Sinaloa: 1 contract, 59M SB (14.8%), 2020. "
        "JMAM (Mazatlan water): 1 contract, 25M SB (6.3%), 2015. "
        "Combined Sinaloa entities = 337M (83.9%), predominantly SB. "
        "Sinaloa construction company capturing the state's Pacific port authority "
        "(175M single SB 2023), national fisheries agency, Sinaloa state, and Mazatlan water — "
        "all concentrated in Sinaloa fishing/maritime/port sector via single-bid dominance.",
    ))
    conn.execute(sql_vendor, (c6, 66757, "MARURBED CONSTRUCTORA SA DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "ASIPONA-Topol 43.5% SB+CONAPESCA 25.7%+SIN Gov 14.8%=84%+, SB dominant"))

    conn.execute(sql_case, (
        c7, f"CASE-{c7}",
        "AMLO-Era Multi-Agency Capture Bienestar+INDEP+SRE 1095M - Corporativo SAG de TO",
        "institutional_capture", 2020, 2023, "high", 937_000_000,
        "ARIA T3 queue pattern analysis",
        "CORPORATIVO SAG DE TO S DE RL DE CV (v258316): 8 contracts, 1095M total (2020-2023). "
        "Banco del Bienestar: 1 contract, 407M DA (37.2%), 2022. "
        "INDEP (Instituto para Devolver al Pueblo lo Robado — confiscated assets agency): "
        "2 contracts, 321M SB (29.4%), 2023. "
        "SRE (Secretaria de Relaciones Exteriores): 2 contracts, 209M DA/SB (19.1%), 2021. "
        "SICT: 1 contract, 73M SB (6.7%), 2020. "
        "Combined 4 institutions = 1010M (92.4%), all 2020-2023 (AMLO era). "
        "Extraordinary capture: company winning 407M at AMLO's flagship 'Bienestar' bank, "
        "321M at INDEP (the anti-corruption confiscated goods auction agency), "
        "209M at the foreign ministry, and 73M at transport — all in 3 years. "
        "1095M in 8 contracts across four politically sensitive institutions is highly anomalous.",
    ))
    conn.execute(sql_vendor, (c7, 258316, "CORPORATIVO SAG DE TO S DE RL DE CV",
        "primary", "high", "aria_queue_t3", 0.92,
        "Bienestar 37.2% DA+INDEP 29.4% SB+SRE 19.1%=85.5%, 1095M 2020-2023 AMLO"))

    conn.execute(sql_case, (
        c8, f"CASE-{c8}",
        "Federal Roads and Puebla 97% SB Infrastructure Capture - Grupo Constructor Angelo Mixteco",
        "single_bid_capture", 2009, 2022, "high", 272_000_000,
        "ARIA T3 queue pattern analysis",
        "GRUPO CONSTRUCTOR ANGELO MIXTECO SA DE CV (v41996): 61 contracts, 296M total (2009-2022). "
        "SCT: 29 contracts, 141M SB (47.6%), SB=97%, 2009-2018. "
        "CAPUFE: 8 contracts, 55M SB (18.7%), SB=88%, 2010-2018. "
        "PUE-Admin (Puebla Administration): 1 contract, 43M SB (14.4%), 2018. "
        "SICT: 4 contracts, 33M SB (11.2%), SB=100%, 2019-2022. "
        "Combined SCT+CAPUFE+PUE+SICT = 272M (91.9%), all 88-100% SB. "
        "Construction company capturing federal transport (SCT/SICT) and toll roads (CAPUFE) "
        "via 97% single-bid procurement over 13 years.",
    ))
    conn.execute(sql_vendor, (c8, 41996, "GRUPO CONSTRUCTOR ANGELO MIXTECO, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.88,
        "SCT 47.6%+CAPUFE 18.7%+PUE 14.4%+SICT 11.2%=91.9%, 97% SB"))

    conn.execute(sql_case, (
        c9, f"CASE-{c9}",
        "SCT and CONAGUA 100% SB Roads and Water Capture - Supercate",
        "single_bid_capture", 2007, 2020, "high", 483_000_000,
        "ARIA T3 queue pattern analysis",
        "SUPERCATE SA DE CV (v33052): 17 contracts, 502M total (2007-2020). "
        "100% single-bid rate. SCT: 11 contracts, 319M SB (63.5%), 2009-2017. "
        "CONAGUA: 1 contract, 125M SB (24.9%), 2014. "
        "SICT: 2 contracts, 39M SB (7.8%), 2019-2020. "
        "Combined SCT+CONAGUA+SICT = 483M (96.2%), all 100% SB. "
        "Construction company with 96.2% across transport and water ministries "
        "via exclusively uncontested single-bid procurement over 13 years.",
    ))
    conn.execute(sql_vendor, (c9, 33052, "SUPERCATE S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.92,
        "SCT 63.5%+CONAGUA 24.9%+SICT 7.8%=96.2%, 100% SB, 17 ctrs 502M"))

    conn.execute(sql_case, (
        c10, f"CASE-{c10}",
        "CENAGAS Natural Gas Pipeline 83% Non-Competitive Capture 1384M - Servicios PJP4",
        "institutional_capture", 2017, 2023, "high", 1_384_000_000,
        "ARIA T3 queue pattern analysis",
        "SERVICIOS PJP4 DE MEXICO SA DE CV (v211297): 6 contracts, 1384M total (2017-2023). "
        "CENAGAS (Centro Nacional de Control del Gas Natural — national gas pipeline operator): "
        "6 contracts, 1384M (100%), DA=33% SB=50% = 83% non-competitive, 2017-2023. "
        "Company with 100% concentration at Mexico's natural gas pipeline control center via "
        "83% non-competitive procurement — 6 contracts totaling 1384M at a critical energy "
        "infrastructure institution over 6 years. "
        "CENAGAS controls Mexico's national natural gas grid — capture of this institution "
        "via non-competitive procurement at this scale raises critical infrastructure concerns.",
    ))
    conn.execute(sql_vendor, (c10, 211297, "SERVICIOS PJP4 DE MEXICO SA DE CV",
        "primary", "high", "aria_queue_t3", 0.93,
        "CENAGAS 100% (1384M): 83% non-competitive, 6 ctrs 2017-2023, critical gas infra"))

    conn.execute(sql_case, (
        c11, f"CASE-{c11}",
        "Health Ministry Ghost Single Contract 285M - Hysol Indael de Mexico",
        "ghost_company", 2002, 2023, "high", 285_000_000,
        "ARIA T3 queue pattern analysis",
        "HYSOL INDAEL DE MEXICO SA DE CV (v795): 45 contracts, 314M total (2002-2023). "
        "SSA (Secretaria de Salud): 1 contract, 285M SB (90.8%), 2023. "
        "SCT: 26 contracts, 14M (4.3%), competitive, 2002-2018. "
        "CAPUFE: 15 contracts, 12M (3.9%), competitive, 2002-2019. "
        "Classic P2 ghost escalation: 20+ years of small competitive contracts at "
        "SCT (14M) and CAPUFE (12M) as legitimacy cover, then 1 single-bid contract "
        "at the federal health ministry for 285M in 2023 — "
        "285M = 15x all prior combined revenue in one uncontested award. "
        "SSA = 90.8% of lifetime revenue from a single SB contract.",
    ))
    conn.execute(sql_vendor, (c11, 795, "HYSOL INDAEL DE MEXICO, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.92,
        "SSA 90.8% (285M SB, 1 contract 2023) — 15x prior revenue, P2 ghost escalation"))

    conn.execute(sql_case, (
        c12, f"CASE-{c12}",
        "Culture Trust SB and Tax Authority DA Multi-Client Capture - SAIC Mexico",
        "institutional_capture", 2002, 2013, "medium", 376_000_000,
        "ARIA T3 queue pattern analysis",
        "SCIENCE APPLICATIONS INTERNATIONAL CORPORATION (SAIC) (v94): 16 contracts, 525M total. "
        "FIDEPOPYME (Fideicomiso Programa de Mejoramiento de los Medios de Informacion): "
        "1 contract, 211M SB (40.3%), 2005. "
        "SAT (Secretaria de Administracion Tributaria): 5 contracts, 165M DA (31.5%), 2011-2013. "
        "API Veracruz: 5 contracts, 77M (14.6%), DA=40% SB=60%, 2002-2013. "
        "API Manzanillo: 1 contract, 40M SB (7.7%), 2002. "
        "US defense and IT contractor with 94.1% across a culture media trust (FIDEPOPYME, 211M SB), "
        "Mexico's tax authority (SAT, 165M DA), and Pacific/Atlantic port administrations. "
        "211M single SB at a culture media improvement trust by a US defense company is anomalous; "
        "SAT DA contracts add to the non-competitive pattern.",
    ))
    conn.execute(sql_vendor, (c12, 94, "SCIENCE APPLICATIONS INTERNATIONAL CORPORATION",
        "primary", "medium", "aria_queue_t3", 0.78,
        "FIDEPOPYME 40.3% (211M SB)+SAT 31.5% (165M DA)+ports=94.1%, US defense at culture trust"))

    conn.execute(sql_case, (
        c13, f"CASE-{c13}",
        "SCT and Sonora Entities 89% SB Construction Capture - Erkam Servicios Integrales",
        "single_bid_capture", 2010, 2015, "high", 375_000_000,
        "ARIA T3 queue pattern analysis",
        "ERKAM SERVICIOS INTEGRALES PARA LA CONSTRUCCION (v57616): 9 contracts, 394M total (2010-2015). "
        "89% single-bid rate. SCT: 2 contracts, 277M SB (70.4%), SB=50%, 2011-2015. "
        "JEC-Sonora: 1 contract, 42M SB (10.7%), 2010. "
        "SON-Hermosillo: 2 contracts, 38M SB (9.7%), 2011-2012. "
        "SON-CODESON: 1 contract, 19M SB (4.8%), 2011. "
        "Combined SCT+Sonora entities = 375M (95.6%), all SB. "
        "Sonora construction company with 70.4% at federal SCT (2 contracts, 277M) "
        "plus Sonora state roads and municipality via single-bid procurement.",
    ))
    conn.execute(sql_vendor, (c13, 57616, "ERKAM SERVICIOS INTEGRALES PARA LA CONSTRUCCION",
        "primary", "high", "aria_queue_t3", 0.88,
        "SCT 70.4%+JEC-SON 10.7%+Hermosillo 9.7%+CODESON 4.8%=95.6%, SB=89%"))

    conn.execute(sql_case, (
        c14, f"CASE-{c14}",
        "PEMEX 96.8% 78% DA Pharmaceutical Capture - Farmaceutico Empresarial Martinez",
        "institutional_capture", 2010, 2015, "high", 504_000_000,
        "ARIA T3 queue pattern analysis",
        "FARMACEUTICO EMPRESARIAL MARTINEZ SA DE CV (v20187): 282 contracts, 520M total. "
        "PEMEX Corporativo: 81 contracts, 469M (90.1%), DA=78%, 2010-2015. "
        "PEMEX: 5 contracts, 35M (6.7%), 0% DA, 2010. "
        "Combined PEMEX = 504M (96.8%), predominantly DA. "
        "Pharmaceutical company with 96.8% concentration across PEMEX entities via 78% "
        "direct award — 86 contracts totaling 504M at Mexico's national oil company "
        "predominantly by direct award over 5 years. "
        "Pharmaceutical company dominating PEMEX procurement via DA is unusual — "
        "PEMEX has specialized medical/occupational health needs but this level of DA "
        "concentration is anomalous.",
    ))
    conn.execute(sql_vendor, (c14, 20187, "FARMACEUTICO EMPRESARIAL MARTINEZ SA DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "PEMEX Corp 90.1%+PEMEX 6.7%=96.8%, 78% DA, 86 ctrs 504M 2010-2015"))

    conn.execute(sql_case, (
        c15, f"CASE-{c15}",
        "IMSS 445M Single Direct Award Ghost Leasing - Capital Leasing Mexico",
        "ghost_company", 2015, 2019, "high", 445_000_000,
        "ARIA T3 queue pattern analysis",
        "CAPITAL LEASING MEXICO SA DE CV (v159820): 4 contracts, 449M total (2015-2019). "
        "IMSS: 1 contract, 445M (99.1%), DA=100%, 2016. "
        "IPICYT (Instituto Potosino de Investigacion Cientifica): 3 contracts, 4M DA (0.9%), 2015-2019. "
        "Leasing company with 99.1% concentration at IMSS via a single 445M direct award contract in 2016. "
        "IPICYT used as prior DA legitimacy cover (4M, 3 contracts). "
        "Classic ghost pattern: establish prior presence at a respected research institute "
        "then win a single massive DA contract at IMSS — 445M in one DA award. "
        "445M = 111x all prior combined revenue from one direct award.",
    ))
    conn.execute(sql_vendor, (c15, 159820, "CAPITAL LEASING MEXICO SA DE CV",
        "primary", "high", "aria_queue_t3", 0.92,
        "IMSS 99.1% (445M): 100% DA, 1 contract 2016 — 111x IPICYT prior revenue"))

    conn.execute(sql_case, (
        c16, f"CASE-{c16}",
        "Maritime University Trust Industry Mismatch Grocery Capture - JD Abarrotes y Perecederos",
        "ghost_company", 2019, 2021, "high", 208_000_000,
        "ARIA T3 queue pattern analysis",
        "JD ABARROTES Y PERECEDEROS SA DE CV (v241705): 16 contracts, 239M total (2019-2021). "
        "UMPM (Fideicomiso Universidad Maritima y Portuaria de Mexico): "
        "8 contracts, 208M (87.4%), DA=50% SB=50%, 2019-2021. "
        "IMSS: 8 contracts, 30M (12.6%), competitive, 2019. "
        "Grocery/perishables company ('JD Abarrotes y Perecederos') with 87.4% concentration "
        "at the Maritime and Port University of Mexico trust via 50% DA + 50% SB. "
        "Industry mismatch: a grocery wholesaler supplying 208M to a maritime university trust — "
        "abarrotes y perecederos (groceries and perishables) does not legitimately provide "
        "services of this value to a specialized maritime university. "
        "Pattern consistent with front company exploiting a government trust.",
    ))
    conn.execute(sql_vendor, (c16, 241705, "JD ABARROTES Y PERECEDEROS SA DE CV",
        "primary", "high", "aria_queue_t3", 0.90,
        "UMPM 87.4% (208M, 50% DA/SB, 2019-2021), grocery company at maritime university"))

    conn.execute(sql_case, (
        c17, f"CASE-{c17}",
        "Queretaro State Infrastructure 100% SB Multi-Agency Capture - Desarrollos Integrales Conin",
        "single_bid_capture", 2006, 2019, "high", 308_000_000,
        "ARIA T3 queue pattern analysis",
        "DESARROLLOS INTEGRALES CONIN SA DE CV (v24548): 13 contracts, 332M total (2006-2019). "
        "100% single-bid rate (92% SB overall). "
        "QRO-CEI (Comision Estatal de Infraestructura de Queretaro): "
        "6 contracts, 137M SB (41.4%), SB=83%, 2010-2018. "
        "Gobierno de Queretaro: 1 contract, 130M SB (39.1%), 2019. "
        "QRO-CEA (Comision Estatal de Aguas): 1 contract, 22M SB (6.6%), 2015. "
        "QRO-CEC (Comision Estatal de Caminos): 2 contracts, 19M SB (5.7%), 2006. "
        "Combined Queretaro entities = 308M (92.8%), all 100% SB. "
        "Construction company capturing Queretaro state's infrastructure commission, "
        "state government, water commission, and road commission via exclusively "
        "uncontested single-bid procurement across 13 years.",
    ))
    conn.execute(sql_vendor, (c17, 24548, "DESARROLLOS INTEGRALES CONIN S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.90,
        "QRO-CEI 41.4%+QRO Gov 39.1%+QRO-CEA 6.6%+QRO-CEC 5.7%=92.8%, 100% SB"))

    # Link contracts
    links = [
        (c1, 115286, 2013, 2021),
        (c2, 30179, 2007, 2018),
        (c3, 72082, 2010, 2024),
        (c4, 11636, 2007, 2025),
        (c5, 614, 2006, 2025),
        (c6, 66757, 2007, 2023),
        (c7, 258316, 2020, 2023),
        (c8, 41996, 2009, 2022),
        (c9, 33052, 2007, 2020),
        (c10, 211297, 2017, 2023),
        (c11, 795, 2002, 2023),
        (c12, 94, 2002, 2013),
        (c13, 57616, 2010, 2015),
        (c14, 20187, 2005, 2018),
        (c15, 159820, 2015, 2019),
        (c16, 241705, 2019, 2021),
        (c17, 24548, 2006, 2019),
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

    add_vids = [115286, 30179, 72082, 11636, 614, 66757, 258316, 41996, 33052, 211297, 795, 94, 57616, 20187, 159820, 241705, 24548]
    for vid in add_vids:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    skips = [
        (44072, "AT&T Comunicaciones Digitales - global telecom brand, dispersed DA across SEGOB/PF/SAT/IMSS"),
        (82913, "NOXTROL - CFE 100% but all 4 contracts are 0% DA/0% SB competitive procurement"),
        (17512, "Super Camiones y Autos de Silao - dispersed vehicle dealer 107 ctrs, CFE 29.5% mostly competitive, INEGI/LFC all competitive"),
    ]
    for vid, reason in skips:
        conn.execute(
            "UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes=? WHERE vendor_id=?",
            (reason, vid),
        )
        print(f"  v{vid}: SKIP")

    conn.commit()
    conn.close()
    print(f"\nDone. Inserted 17 cases ({c1}-{c17}), linked {total_linked} contracts, skipped 3.")


if __name__ == "__main__":
    main()
