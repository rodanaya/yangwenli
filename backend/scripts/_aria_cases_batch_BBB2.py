#!/usr/bin/env python3
"""
GT Mining Batch BBB2 - ARIA T3 investigation (20 vendors)

Investigated 2026-03-23:
  v51859   CONSTRUCCIONES DISEÑO Y SERVICIOS      ADD  (QRO-CEA 92.6% single 235M SB 2016, ghost)
  v21069   INFRAESTRUCTURA DEL GOLFO SA DE CV     ADD  (SCT+SICT 69.7%+CAPUFE 13.6%=83.3%, 99% SB, 939M)
  v3142    GEUR INGENIERIA SA DE CV               ADD  (SEDATU 92.9%, 10 ctrs 286M DA/SB)
  v44569   ARTICULOS PROMOCIONALES CASA XAVIER    ADD  (AGS-IAM 99.5%, 2 ctrs 256M, industry mismatch ghost)
  v170     INFRAESTRUCTURA MARITIMA Y PORTUARIA   ADD  (Ports+SEMAR 91% SB, 12 ctrs 358M)
  v84581   TECHNOTREND                            ADD  (INEGI 99.8%, 3 SB ctrs 302M)
  v14171   REGIOMONTANA DE CONSTRUCCION           ADD  (SADM+SCT+IMSS+HIM 66.8%, 96% SB, 788M)
  v23060   INMOBILIARIA RUSO SA DE CV             ADD  (VER-CAPCCE 82.7% SB 663M + VER 14% = 96%, 8 ctrs 802M)
  v67887   AUDITORIA DE MEDIOS Y SERVICIOS        ADD  (IFT 58.7% SB + PRONOSTICOS 39.4% DA = 98.1%)
  v67309   ROTHS INGENIERIA Y REPRESENTACIONES    ADD  (MICH-Salud 50.5% SB + JAL-SIOP 48.4% SB = 98.9%, 734M)
  v18559   CENTRO DE SERVICIO AVEMEX              ADD  (SCT 79.7%+AFAC 11%=90.7%, 100% SB, 341M)
  v31460   OLYMPUS AMERICA DE MEXICO              SKIP (global medical brand, dispersed 18% top)
  v23651   PROVEEDORA MEDICA DEL NOROESTE         SKIP (SON-ISSSTESON 83.5% but 0% DA/SB competitive)
  v4406    TECNICOS EN ALIMENTACION               SKIP (dispersed food/nutrition, top=27%, no DA/SB pattern)
  v45414   GRUPO DE RADIODIFUSORAS SA DE CV       SKIP (dispersed media 100% DA, top=14%, 20+ agencies)
  v13174   TERUMO MEDICAL DE MEXICO               SKIP (global Japanese medical brand, dispersed)
  v1311    COMPUPROVEEDORES SA DE CV              SKIP (dispersed IT, top=17%, low DA/SB)
  v1522    PROVEEDORA CLINICA MEDICA              SKIP (dispersed clinical 486 ctrs, low SB=1%)
  v45044   PERIODICO EXCELSIOR SA DE CV           SKIP (newspaper advertising, dispersed, top=23%)
  v29048   LIMPIEZA CORPORATIVA DE SIN            SKIP (SAT+CAPUFE=53.7%, below combined 70% threshold)

Cases added: 11  |  Vendors skipped: 9
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 1006:
        print(f"ERROR: max_id={max_id}, expected >= 1006. Aborting.")
        conn.close()
        return

    c1 = max_id + 1
    c2 = max_id + 2
    c3 = max_id + 3
    c4 = max_id + 4
    c5 = max_id + 5
    c6 = max_id + 6
    c7 = max_id + 7
    c8 = max_id + 8
    c9 = max_id + 9
    c10 = max_id + 10
    c11 = max_id + 11

    print(f"Max GT case id: {max_id}")
    print(f"Inserting cases {c1}-{c11}")

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

    # Case 1: CONSTRUCCIONES DISEÑO Y SERVICIOS - QRO-CEA ghost escalation
    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "Queretaro State Water Commission Ghost Single-Bid Contract - Construcciones Diseño",
        "ghost_company", 2010, 2016, "high", 235_000_000,
        "ARIA T3 queue pattern analysis",
        "CONSTRUCCIONES DISEÑO Y SERVICIOS AMBIENTALES SA DE CV (v51859): "
        "22 contracts, 254M total. "
        "100% single-bid rate. QRO-Comision Estatal de Aguas de Queretaro: "
        "1 contract, 235M SB (92.6%), 2016. "
        "Prior activity: COAH-Secretaria de Infraestructura 7 contracts 10M SB (2010-2012), "
        "CONAGUA 6 contracts 6M SB (2011-2012), SEPOMEX 8 contracts 3M DA (2013-2015). "
        "Classic P2 ghost escalation: company accumulated small water/infrastructure contracts "
        "(total 19M, 2010-2015) at Coahuila, CONAGUA, and postal service, "
        "then won a single 235M SB at Queretaro's state water commission in 2016 — "
        "12.4x all prior revenue in one contract. "
        "QRO-CEA = 92.6% of lifetime revenue from one uncontested tender.",
    ))
    conn.execute(sql_vendor, (
        c1, 51859, "CONSTRUCCIONES DISEÑO Y SERVICIOS AMBIENTALES SA DE CV",
        "primary", "high", "aria_queue_t3", 0.92,
        "QRO-CEA 92.6%: single 235M SB 2016 — 12.4x prior total, P2 ghost escalation",
    ))

    # Case 2: INFRAESTRUCTURA DEL GOLFO - SCT + SICT + CAPUFE roads SB capture
    conn.execute(sql_case, (
        c2, f"CASE-{c2}",
        "Federal Roads and Toll Authority 99% SB Capture - Infraestructura del Golfo",
        "single_bid_capture", 2005, 2021, "high", 782_000_000,
        "ARIA T3 queue pattern analysis",
        "INFRAESTRUCTURA DEL GOLFO SA DE CV (v21069): 81 contracts, 939M total (2005-2021). "
        "99% single-bid rate. SCT (Secretaria de Comunicaciones y Transportes): "
        "45 contracts, 526M SB (56%), SB=98%, 2013-2017. "
        "SICT (Secretaria de Infraestructura, Comunicaciones y Transportes — renamed SCT): "
        "2 contracts, 128M SB (13.7%), 2019-2021. "
        "CAPUFE (Caminos y Puentes Federales): 1 contract, 128M SB (13.6%), 2019. "
        "JEC-San Luis Potosi: 14 contracts, 73M SB (7.8%), 2005-2008. "
        "Combined SCT/SICT + CAPUFE = 782M (83.3%), all 99% SB. "
        "Gulf coast infrastructure company with 99% SB rate across 81 contracts "
        "at Mexico's federal transport ministry (and its renamed successor) and toll road authority. "
        "Sustained dominance 2005-2021 spanning three presidential administrations.",
    ))
    conn.execute(sql_vendor, (
        c2, 21069, "INFRAESTRUCTURA DEL GOLFO S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.92,
        "SCT 56% SB + SICT 13.7% SB + CAPUFE 13.6% SB = 83.3%, 99% SB, 81 ctrs",
    ))

    # Case 3: GEUR INGENIERIA - SEDATU concentrated capture
    conn.execute(sql_case, (
        c3, f"CASE-{c3}",
        "SEDATU Housing Ministry Concentrated Capture - GEUR Ingenieria",
        "institutional_capture", 2002, 2024, "high", 286_000_000,
        "ARIA T3 queue pattern analysis",
        "GEUR INGENIERIA SA DE CV (v3142): 20 contracts, 308M total. "
        "SEDATU (Secretaria de Desarrollo Agrario, Territorial y Urbano): "
        "10 contracts, 286M (92.9%), DA=40% SB=60%, 2019-2024. "
        "Minor prior activity: CONAGUA 2 contracts 8M SB (2002-2016), "
        "ISSSTE 3 contracts 8M SB (2005-2008), SEPOMEX 1 contract 2M DA (2013). "
        "Engineering company with 92.9% concentration at Mexico's housing/land ministry "
        "via a mix of direct award (40%) and single-bid (60%) tenders. "
        "10 contracts totaling 286M at SEDATU spanning 2019-2024 — "
        "sustained recent capture at federal housing ministry via non-competitive mechanisms.",
    ))
    conn.execute(sql_vendor, (
        c3, 3142, "GEUR INGENIERIA, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.90,
        "SEDATU 92.9%: 10 contracts 286M, 40% DA + 60% SB, 2019-2024",
    ))

    # Case 4: ARTICULOS PROMOCIONALES CASA XAVIER - AGS women's institute ghost mismatch
    conn.execute(sql_case, (
        c4, f"CASE-{c4}",
        "Aguascalientes Women's Institute Promotional Goods Ghost Capture - Casa Xavier",
        "ghost_company", 2010, 2018, "high", 256_000_000,
        "ARIA T3 queue pattern analysis",
        "ARTICULOS PROMOCIONALES CASA XAVIER SA DE CV (v44569): 27 contracts, 258M total. "
        "AGS-Instituto Aguascalentense de las Mujeres (IAM): "
        "2 contracts, 256M (99.5%), DA=50% SB=50%, 2015-2018. "
        "Prior activity: CFE 8 contracts 0.6M DA (2010-2015), "
        "CONAFOR 6 contracts 0.3M DA (2010-2014), PEMEX 3 contracts 0.3M DA (2010-2014). "
        "Promotional items and merchandise company with 99.5% concentration at "
        "Aguascalientes state women's empowerment institute. "
        "Two contracts totaling 256M at a state gender institute — "
        "promotional goods company does not supply services of this scale to "
        "gender/social programs institutions legitimately. "
        "24M in prior small DA contracts at CFE/CONAFOR/PEMEX used as cover; "
        "256M = 99.5% from 2 contracts at IAM is a classic ghost mismatch pattern.",
    ))
    conn.execute(sql_vendor, (
        c4, 44569, "ARTICULOS PROMOCIONALES CASA XAVIER SA DE CV",
        "primary", "high", "aria_queue_t3", 0.92,
        "AGS-IAM 99.5%: 2 contracts 256M 2015-2018, industry mismatch ghost (promo goods at women's institute)",
    ))

    # Case 5: INFRAESTRUCTURA MARITIMA Y PORTUARIA - ports + SEMAR SB capture
    conn.execute(sql_case, (
        c5, f"CASE-{c5}",
        "Federal Port Authorities and Navy Ministry SB Capture - Infraestructura Maritima",
        "single_bid_capture", 2002, 2025, "high", 324_000_000,
        "ARIA T3 queue pattern analysis",
        "INFRAESTRUCTURA MARITIMA Y PORTUARIA SA DE CV (v170): "
        "12 contracts, 358M total (2002-2025). "
        "92% single-bid rate. ASIPONA Progreso (Administracion del Sistema Portuario "
        "Nacional Progreso, Yucatan): 5 contracts, 171M SB (47.9%), 2019-2025. "
        "Secretaria de Marina (SEMAR): 1 contract, 91M SB (25.4%), 2019. "
        "ASIPONA Lazaro Cardenas: 1 contract, 35M DA (9.7%), 2024. "
        "API Veracruz: 2 contracts, 27M SB (7.6%), 2002-2003. "
        "Combined ASIPONA Progreso + SEMAR + API Veracruz = 289M (80.8%), mostly SB. "
        "Maritime infrastructure company capturing Mexico's main Yucatan port authority "
        "(47.9% via uncontested bids) and the Navy Ministry (91M SB) in 2019, "
        "plus earlier presence at Veracruz port — systematic SB presence at "
        "federal maritime/port institutions.",
    ))
    conn.execute(sql_vendor, (
        c5, 170, "INFRAESTRUCTURA MARITIMA Y PORTUARIA, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.88,
        "ASIPONA Progreso 47.9% SB + SEMAR 25.4% SB + API Veracruz 7.6% = 80.8%, 92% SB",
    ))

    # Case 6: TECHNOTREND - INEGI statistics institute ghost SB
    conn.execute(sql_case, (
        c6, f"CASE-{c6}",
        "INEGI National Statistics Institute Ghost SB Capture - Technotrend",
        "ghost_company", 2010, 2018, "high", 302_000_000,
        "ARIA T3 queue pattern analysis",
        "TECHNOTREND (v84581): 6 contracts, 303M total. "
        "INEGI (Instituto Nacional de Estadistica y Geografia): "
        "3 contracts, 302M SB (99.8%), 2013-2018. "
        "CINVESTAV: 3 contracts, 1M DA (0.2%), 2010-2014. "
        "Technology company with 99.8% concentration at Mexico's national "
        "statistics and geography institute via 3 single-bid contracts totaling 302M. "
        "CINVESTAV (advanced research center) used as prior legitimacy cover (1M). "
        "Three massive SB contracts at INEGI spanning 2013-2018 with no other significant "
        "activity — classic two-phase pattern: establish credentials at a minor institution, "
        "then capture the target institution via uncontested single-bid awards.",
    ))
    conn.execute(sql_vendor, (
        c6, 84581, "TECHNOTREND",
        "primary", "high", "aria_queue_t3", 0.92,
        "INEGI 99.8%: 3 SB contracts 302M 2013-2018, CINVESTAV 1M as prior cover",
    ))

    # Case 7: REGIOMONTANA DE CONSTRUCCION - multi-institution 96% SB capture
    conn.execute(sql_case, (
        c7, f"CASE-{c7}",
        "Monterrey Multi-Agency Infrastructure 96% SB Capture - Regiomontana de Construccion",
        "single_bid_capture", 2003, 2013, "high", 526_000_000,
        "ARIA T3 queue pattern analysis",
        "REGIOMONTANA DE CONSTRUCCION Y SERVICIOS SA DE CV (v14171): "
        "24 contracts, 788M total (2003-2013). "
        "96% single-bid rate. SADM (Servicios de Agua y Drenaje de Monterrey): "
        "5 contracts, 179M SB (22.8%), 2005-2008. "
        "SCT: 4 contracts, 148M SB (18.8%), 2009-2013. "
        "IMSS: 2 contracts, 127M SB (16.1%), 2003-2008. "
        "Hospital Infantil de Mexico Federico Gomez: 1 contract, 72M SB (9.1%), 2009. "
        "Combined top 4 = 526M (66.8%), all 100% SB. "
        "Monterrey-based construction company with 96% SB rate across 24 contracts "
        "at water utility (SADM), federal transport ministry (SCT), national health insurer (IMSS), "
        "and children's hospital — multi-institution uncontested bid capture across "
        "water, roads, health, and specialized medical sectors in a single decade.",
    ))
    conn.execute(sql_vendor, (
        c7, 14171, "REGIOMONTANA DE CONSTRUCCION Y SERVICIOS, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.88,
        "SADM 22.8%+SCT 18.8%+IMSS 16.1%+HIM 9.1%=66.8%, 96% SB, 24 ctrs 788M",
    ))

    # Case 8: INMOBILIARIA RUSO - Veracruz state toll roads SB capture
    conn.execute(sql_case, (
        c8, f"CASE-{c8}",
        "Veracruz State Toll Roads Single-Bid Capture - Inmobiliaria Ruso",
        "single_bid_capture", 2005, 2017, "high", 710_000_000,
        "ARIA T3 queue pattern analysis",
        "INMOBILIARIA RUSO SA DE CV (v23060): 8 contracts, 802M total (2005-2017). "
        "88% single-bid rate. VER-CAPCCE (OPD Carreteras y Puentes Estatales de Cuota "
        "de Veracruz — state toll road authority): "
        "2 contracts, 663M SB (82.7%), 2006-2007. "
        "VER-Secretaria de Desarrollo Regional: 1 contract, 59M SB (7.4%), 2005. "
        "VER-Secretaria de Comunicaciones: 2 contracts, 47M SB (5.8%), 2006-2007. "
        "Combined Veracruz entities = 769M (95.9%). "
        "Real estate/construction company capturing Veracruz state's toll road authority "
        "via two massive uncontested SB contracts totaling 663M in 2006-2007 — "
        "2 contracts = 82.7% of lifetime revenue. Entire activity concentrated in "
        "Veracruz state infrastructure via 100% single-bid mechanisms.",
    ))
    conn.execute(sql_vendor, (
        c8, 23060, "INMOBILIARIA RUSO, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.90,
        "VER-CAPCCE 82.7% (2 SB contracts 663M 2006-2007) + VER entities 13.2% = 95.9%",
    ))

    # Case 9: AUDITORIA DE MEDIOS Y SERVICIOS - IFT + PRONOSTICOS dual capture
    conn.execute(sql_case, (
        c9, f"CASE-{c9}",
        "Telecom Regulator and Gaming Agency Dual Capture - Auditoria de Medios",
        "institutional_capture", 2010, 2024, "high", 236_000_000,
        "ARIA T3 queue pattern analysis",
        "AUDITORIA DE MEDIOS Y SERVICIOS A ANUNCIANTES SA DE CV (v67887): "
        "33 contracts, 241M total (2010-2024). "
        "Instituto Federal de Telecomunicaciones (IFT): "
        "9 contracts, 141M (58.7%), DA=22% SB=78%, 2014-2024. "
        "PRONOSTICOS para la Asistencia Publica: "
        "6 contracts, 95M (39.4%), DA=100%, 2013-2017. "
        "Combined IFT + PRONOSTICOS = 236M (98.1%). "
        "Media monitoring/audit company with 98% concentration at "
        "Mexico's telecom and broadcast regulator (IFT, 58.7% at 78% SB) and "
        "national sports betting agency (PRONOSTICOS, 39.4% at 100% DA). "
        "Two-institution capture: uncontested SB at the regulatory body (IFT) "
        "and exclusive DA at the state gaming agency — both institutions are "
        "key consumers of media monitoring services.",
    ))
    conn.execute(sql_vendor, (
        c9, 67887, "AUDITORIA DE MEDIOS Y SERVICIOS A ANUNCIANTES SA DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "IFT 58.7% (78% SB) + PRONOSTICOS 39.4% (100% DA) = 98.1%",
    ))

    # Case 10: ROTHS INGENIERIA - Michoacan + Jalisco dual state SB capture
    conn.execute(sql_case, (
        c10, f"CASE-{c10}",
        "Michoacan and Jalisco State Infrastructure Dual SB Capture - Roths Ingenieria",
        "single_bid_capture", 2012, 2017, "high", 726_000_000,
        "ARIA T3 queue pattern analysis",
        "ROTHS INGENIERIA Y REPRESENTACIONES SA DE CV (v67309): "
        "13 contracts, 734M total (2012-2017). "
        "100% single-bid rate. MICH-Secretaria de Salud (Michoacan Health Ministry): "
        "1 contract, 371M SB (50.5%), 2016. "
        "JAL-Secretaria de Infraestructura y Obra Publica (Jalisco SIOP): "
        "8 contracts, 355M SB (48.4%), 2013-2017. "
        "JAL-Comision Estatal del Agua: 2 contracts, 4M SB (0.6%), 2015. "
        "Combined Michoacan + Jalisco = 730M (99.5%), all 100% SB. "
        "Engineering company capturing Michoacan's health ministry (371M, 1 contract, 2016) "
        "and Jalisco's infrastructure ministry (355M, 8 contracts, 2013-2017) "
        "via exclusively uncontested single-bid tenders. "
        "100% SB across 13 contracts at two major state governments — "
        "Michoacan pattern consistent with cartel-era state capture.",
    ))
    conn.execute(sql_vendor, (
        c10, 67309, "ROTHS INGENIERIA Y REPRESENTACIONES, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.90,
        "MICH-Salud 50.5% SB (371M 2016) + JAL-SIOP 48.4% SB = 98.9%, 100% SB",
    ))

    # Case 11: CENTRO DE SERVICIO AVEMEX - SCT + AFAC transport SB capture
    conn.execute(sql_case, (
        c11, f"CASE-{c11}",
        "Federal Transport and Aviation Authority SB Capture - Centro de Servicio Avemex",
        "single_bid_capture", 2005, 2020, "high", 310_000_000,
        "ARIA T3 queue pattern analysis",
        "CENTRO DE SERVICIO AVEMEX SA DE CV (v18559): 21 contracts, 341M total (2005-2020). "
        "81% single-bid rate. SCT (Secretaria de Comunicaciones y Transportes): "
        "9 contracts, 272M SB (79.7%), SB=100%, 2005-2018. "
        "AFAC (Agencia Federal de Aviacion Civil): "
        "2 contracts, 38M SB (11%), SB=100%, 2019-2020. "
        "CONAGUA: 6 contracts, 23M SB (6.8%), 2005-2012. "
        "Combined SCT + AFAC = 310M (90.7%), all 100% SB. "
        "Aviation/transport services company with 90.7% concentration at "
        "Mexico's transport ministry and federal civil aviation authority — "
        "both exclusively via uncontested single-bid tenders over 15 years. "
        "SCT (100% SB, 2005-2018) followed by AFAC (100% SB, 2019-2020) suggests "
        "sustained capture of transport-sector institutions across administrations.",
    ))
    conn.execute(sql_vendor, (
        c11, 18559, "CENTRO DE SERVICIO AVEMEX, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.88,
        "SCT 79.7% (100% SB) + AFAC 11% (100% SB) = 90.7%, 2005-2020",
    ))

    # Link contracts
    links = [
        (c1, 51859, 2010, 2016),
        (c2, 21069, 2005, 2021),
        (c3, 3142, 2002, 2024),
        (c4, 44569, 2010, 2018),
        (c5, 170, 2002, 2025),
        (c6, 84581, 2010, 2018),
        (c7, 14171, 2003, 2013),
        (c8, 23060, 2005, 2017),
        (c9, 67887, 2010, 2024),
        (c10, 67309, 2012, 2017),
        (c11, 18559, 2005, 2020),
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

    for vid in [51859, 21069, 3142, 44569, 170, 84581, 14171, 23060, 67887, 67309, 18559]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    skips = [
        (31460, "Olympus America de Mexico - global Japanese medical device brand, dispersed across 18% top institution (ISSSTE), 423 contracts"),
        (23651, "Proveedora Medica del Noroeste - SON-ISSSTESON 83.5% concentration but 0% DA/0% SB competitive procurement only"),
        (4406, "Tecnicos en Alimentacion - dispersed food/nutrition supply across SSA 27%+DIF 16%+IMSS 16%, no single DA/SB pattern"),
        (45414, "Grupo de Radiodifusoras - dispersed media/advertising 100% DA across 20+ agencies, top=14% IMSS, structural media"),
        (13174, "Terumo Medical de Mexico - global Japanese cardiovascular device brand, dispersed health institutions"),
        (1311, "Compuproveedores - dispersed IT/supplies 537 contracts, top=17% CFE, low DA/SB rates"),
        (1522, "Proveedora Clinica Medica - dispersed clinical supplier 486 contracts health institutes, low SB=1%"),
        (45044, "Periodico Excelsior - national newspaper 100% DA advertising across government agencies, top=23% LOTENAL, structural media"),
        (29048, "Limpieza Corporativa de Sinaloa - SAT+CAPUFE=53.7% combined SB but below 70% combined threshold, cleaning services"),
    ]
    for vid, reason in skips:
        conn.execute(
            "UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes=? WHERE vendor_id=?",
            (reason, vid),
        )
        print(f"  v{vid}: SKIP")

    conn.commit()
    conn.close()
    print(f"\nDone. Inserted 11 cases ({c1}-{c11}), linked {total_linked} contracts, skipped 9.")


if __name__ == "__main__":
    main()
