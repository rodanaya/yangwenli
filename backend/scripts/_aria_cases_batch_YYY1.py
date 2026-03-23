#!/usr/bin/env python3
"""
GT Mining Batch YYY1 - ARIA T3 investigation (8 vendors)

Investigated 2026-03-23:
  v15298   BARCA DE REYNOSA SA DE CV             ADD  (PEMEX-EP 57%+Corp 36%=93%, 80% SB, 414M)
  v8059    DM INGENIEROS SA DE CV                ADD  (PEMEX Corp 76%+EP 18%=94%, 60% SB, 525M)
  v126590  RT4 COMUNICACIONES SA DE CV           ADD  (IPICYT single 253M DA 82%, ghost escalation)
  v6989    SPACE TOURS SA DE CV                  ADD  (INM 95%, travel agency capture 261M 2002-2018)
  v203442  LOS CEDROS CONSTRUCCIONES SA DE CV    ADD  (SEDATU 97%, 247M SB/DA 2021-2022)
  v149345  SAMPOL INGENIERIA Y OBRAS MEXICO      ADD  (ISSSTE 81% DA 308M + AICM 19% = 100%)
  v24338   COMERCIALIZADORA Y CONSTRUCTORA DEL   ADD  (Chiapas entities+INPI 83%, 100% SB, 207M)
  v44534   MEDIPREV S DE RL DE CV                SKIP (PEMEX+IMSS+ISSSTE dispersed, 0% SB, legitimate medical)

Cases added: 7  |  Vendors skipped: 1
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 986:
        print(f"ERROR: max_id={max_id}, expected >= 986. Aborting.")
        conn.close()
        return

    c1 = max_id + 1
    c2 = max_id + 2
    c3 = max_id + 3
    c4 = max_id + 4
    c5 = max_id + 5
    c6 = max_id + 6
    c7 = max_id + 7

    print(f"Max GT case id: {max_id}")
    print(f"Inserting cases {c1}-{c7}")

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

    # Case 1: BARCA DE REYNOSA - PEMEX SB capture (oil services)
    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "PEMEX Oil Exploration Single-Bid Capture - Barca de Reynosa",
        "single_bid_capture", 2003, 2016, "high", 414_000_000,
        "ARIA T3 queue pattern analysis",
        "BARCA DE REYNOSA SA DE CV (v15298): 15 contracts, 447M total. "
        "80% single-bid rate. PEMEX Exploracion y Produccion: "
        "10 contracts, 255M SB (57%), SB=100%, 2003-2008. "
        "Petroleos Mexicanos (Corporativo): 2 contracts, 159M SB (35.6%), "
        "DA=50% SB=50%, 2011-2014. "
        "Combined PEMEX entities = 414M (92.6%). "
        "Services company based in Reynosa (Tamaulipas border city near PEMEX "
        "oil fields) with 92.6% concentration at PEMEX's exploration subsidiary "
        "and corporate entity via predominantly single-bid tenders. "
        "100% SB at PEMEX-EP across 10 contracts (2003-2008) followed by "
        "large PEMEX Corporativo contracts in 2011-2014.",
    ))
    conn.execute(sql_vendor, (
        c1, 15298, "BARCA DE REYNOSA, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.90,
        "PEMEX-EP 57% SB=100% + PEMEX Corp 35.6% = 92.6%, 80% SB",
    ))

    # Case 2: DM INGENIEROS - PEMEX infrastructure SB capture
    conn.execute(sql_case, (
        c2, f"CASE-{c2}",
        "PEMEX Infrastructure Single-Bid Capture - DM Ingenieros",
        "single_bid_capture", 2002, 2012, "high", 525_000_000,
        "ARIA T3 queue pattern analysis",
        "DM INGENIEROS SA DE CV (v8059): 12 contracts, 559M total (2002-2012). "
        "67% single-bid rate. Petroleos Mexicanos (Corporativo): "
        "4 contracts, 424M (75.8%), DA=25% SB=50%, 2010-2012. "
        "PEMEX Exploracion y Produccion: 6 contracts, 101M SB (18.1%), SB=100%, 2002-2007. "
        "Pemex-EP (entity): 2 contracts, 35M DA (6.3%), 2012. "
        "Combined PEMEX entities = 560M (100%). "
        "Engineering company with total concentration at PEMEX across its corporate "
        "entity and exploration subsidiary over a decade. "
        "Progression from small SB contracts at PEMEX-EP (2002-2007) to large "
        "PEMEX Corporativo contracts (424M in 2010-2012) suggests escalating "
        "capture pattern within Mexico's oil company.",
    ))
    conn.execute(sql_vendor, (
        c2, 8059, "DM INGENIEROS, S.A. DEC.V.",
        "primary", "high", "aria_queue_t3", 0.90,
        "PEMEX Corp 75.8% + PEMEX-EP 18.1% = 94%, 60% SB, all PEMEX",
    ))

    # Case 3: RT4 COMUNICACIONES - IPICYT single massive DA ghost
    conn.execute(sql_case, (
        c3, f"CASE-{c3}",
        "IPICYT Research Institute Ghost Direct Award - RT4 Comunicaciones",
        "ghost_company", 2014, 2025, "high", 253_000_000,
        "ARIA T3 queue pattern analysis",
        "RT4 COMUNICACIONES SA DE CV (v126590): 10 contracts, 308M total. "
        "IPICYT (Instituto Potosino de Investigacion Cientifica y Tecnologica): "
        "1 contract, 253M DA (82.1%), 2021. "
        "Prior activity: CAPUFE 3 contracts 32M (10.4%), 2014-2025; "
        "PROFECO 4 contracts 19M (6.2%), 2014-2024; SFP 2 contracts 4M, 2017. "
        "Pattern: Communications company accumulated small CAPUFE/PROFECO/SFP contracts "
        "2014-2021 (55M total), then won a single 253M direct award at IPICYT "
        "(a CONACYT science research institute in San Luis Potosi) in 2021 — "
        "4.6x their prior total revenue. Classic P2 ghost escalation: "
        "small legitimate activity as legitimacy cover, then one massive DA "
        "at a less-scrutinized research institution.",
    ))
    conn.execute(sql_vendor, (
        c3, 126590, "RT4 COMUNICACIONES SA DE CV",
        "primary", "high", "aria_queue_t3", 0.92,
        "IPICYT 82.1%: single 253M DA 2021 — 4.6x prior total, P2 ghost escalation",
    ))

    # Case 4: SPACE TOURS - INM immigration services capture
    conn.execute(sql_case, (
        c4, f"CASE-{c4}",
        "Immigration Institute Long-Term Service Capture - Space Tours",
        "institutional_capture", 2002, 2018, "high", 261_000_000,
        "ARIA T3 queue pattern analysis",
        "SPACE TOURS SA DE CV (v6989): 19 contracts, 275M total (2002-2018). "
        "47% single-bid rate. INM (Instituto Nacional de Migracion): "
        "10 contracts, 261M (95%), DA=30% SB=20%, 2002-2018. "
        "Tourism/travel services company with 95% concentration at Mexico's "
        "immigration institute over 16 years via a mix of direct award (30%), "
        "single-bid (20%), and competitive tenders (50%). "
        "INM contracts for a travel company: typically air/ground transportation "
        "for immigration operations (deportations, transfers, official travel). "
        "Single vendor capturing 95% of INM's transport/travel spending over "
        "16 years spans 4+ presidential administrations — entrenched capture.",
    ))
    conn.execute(sql_vendor, (
        c4, 6989, "SPACE TOURS S.A DE C.V.",
        "primary", "high", "aria_queue_t3", 0.88,
        "INM 95%: 10 contracts 261M, mixed DA/SB 2002-2018, 16 years",
    ))

    # Case 5: LOS CEDROS CONSTRUCCIONES - SEDATU single-year SB capture
    conn.execute(sql_case, (
        c5, f"CASE-{c5}",
        "SEDATU Housing Ministry Concentrated SB and DA Capture - Los Cedros Construcciones",
        "institutional_capture", 2017, 2022, "high", 247_000_000,
        "ARIA T3 queue pattern analysis",
        "LOS CEDROS CONSTRUCCIONES SA DE CV (v203442): 8 contracts, 256M total. "
        "62% single-bid rate. SEDATU (Secretaria de Desarrollo Agrario, Territorial "
        "y Urbano): 4 contracts, 247M (96.5%), DA=50% SB=50%, 2021-2022. "
        "Minor prior contracts: IMSS 5M SB (2017), Tabasco SOP 3M SB (2017). "
        "Construction company with 96.5% concentration at Mexico's housing/land "
        "ministry in a single 2-year period (2021-2022). "
        "4 contracts totaling 247M at SEDATU in just 2 years — an average of 62M/contract "
        "at the same federal agency via mixed SB and DA methods.",
    ))
    conn.execute(sql_vendor, (
        c5, 203442, "LOS CEDROS CONSTRUCCIONES SA DE CV",
        "primary", "high", "aria_queue_t3", 0.90,
        "SEDATU 96.5%: 4 contracts 247M, mixed SB/DA 2021-2022",
    ))

    # Case 6: SAMPOL INGENIERIA - ISSSTE + AICM engineering capture
    conn.execute(sql_case, (
        c6, f"CASE-{c6}",
        "ISSSTE Government Workers Institute DA Capture - Sampol Ingenieria",
        "institutional_capture", 2015, 2022, "high", 381_000_000,
        "ARIA T3 queue pattern analysis",
        "SAMPOL INGENIERIA Y OBRAS MEXICO SA DE CV (v149345): 4 contracts, 381M total. "
        "ISSSTE (Instituto de Seguridad y Servicios Sociales de los Trabajadores "
        "del Estado): 2 contracts, 308M DA (80.8%), 2015-2018. "
        "AICM (Aeropuerto Internacional de la Ciudad de Mexico): "
        "2 contracts, 73M SB (19.2%), 2020-2022. "
        "Combined = 381M (100%). "
        "Engineering company (Sampol is a Spanish infrastructure firm) with 100% "
        "of Mexican revenue concentrated at government workers pension institute "
        "(308M DA) and Mexico City international airport (73M SB). "
        "Two large DA contracts at ISSSTE (308M) represent non-competitive award "
        "of major engineering work at a sensitive social security institution.",
    ))
    conn.execute(sql_vendor, (
        c6, 149345, "SAMPOL INGENIERIA Y OBRAS MEXICO, S.A. de C.V.",
        "primary", "high", "aria_queue_t3", 0.88,
        "ISSSTE 80.8% (100% DA, 308M) + AICM 19.2% = 100%, 2015-2022",
    ))

    # Case 7: COMERCIALIZADORA Y CONSTRUCTORA DEL SURESTE - Chiapas SB capture
    conn.execute(sql_case, (
        c7, f"CASE-{c7}",
        "Chiapas State Infrastructure Single-Bid Capture - Comercializadora del Sureste",
        "single_bid_capture", 2006, 2015, "high", 207_000_000,
        "ARIA T3 queue pattern analysis",
        "COMERCIALIZADORA Y CONSTRUCTORA DEL SURESTE SA DE CV (v24338): "
        "20 contracts, 251M total (2006-2015). "
        "100% single-bid rate. INPI/CDI (Instituto Nacional de los Pueblos Indigenas): "
        "1 contract, 72M SB (28.7%), 2010. "
        "CHIS-Secretaria de Obras Publicas: 4 contracts, 59M SB (23.5%), 2013-2015. "
        "Secretaria de Infraestructura de Chiapas: 4 contracts, 45M SB (17.9%), 2008-2010. "
        "COCECH (Comision de Caminos del Estado de Chiapas): 4 contracts, 31M SB (12.4%), 2006-2007. "
        "Combined Chiapas entities + INPI = 207M (82.5%). "
        "Construction company in Chiapas with 100% SB rate capturing state infrastructure "
        "ministry, state roads commission, and federal indigenous affairs institute "
        "across the southern state over 9 years — systematic single-bid dominance "
        "at multiple Chiapas and federal entities.",
    ))
    conn.execute(sql_vendor, (
        c7, 24338, "COMERCIALIZADORA Y CONSTRUCTORA DEL SURESTE, S.A.",
        "primary", "high", "aria_queue_t3", 0.88,
        "INPI 28.7%+CHIS-SOP 23.5%+CHIS-Infra 17.9%+COCECH 12.4%=82.5%, 100% SB",
    ))

    # Link contracts
    links = [
        (c1, 15298, 2003, 2016),
        (c2, 8059, 2002, 2012),
        (c3, 126590, 2014, 2025),
        (c4, 6989, 2002, 2018),
        (c5, 203442, 2017, 2022),
        (c6, 149345, 2015, 2022),
        (c7, 24338, 2006, 2015),
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

    for vid in [15298, 8059, 126590, 6989, 203442, 149345, 24338]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    skips = [
        (44534, "Mediprev - PEMEX+IMSS+ISSSTE 95% but dispersed 3-institution, 0% SB, legitimate medical/occupational health services 2010-2013"),
    ]
    for vid, reason in skips:
        conn.execute(
            "UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes=? WHERE vendor_id=?",
            (reason, vid),
        )
        print(f"  v{vid}: SKIP")

    conn.commit()
    conn.close()
    print(f"\nDone. Inserted 7 cases ({c1}-{c7}), linked {total_linked} contracts, skipped 1.")


if __name__ == "__main__":
    main()
