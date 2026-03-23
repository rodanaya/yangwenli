#!/usr/bin/env python3
"""
GT Mining Batch XXX1 - ARIA T3 investigation (8 vendors)

Investigated 2026-03-23:
  v23025   CMCO SA DE CV                        ADD  (SCT 52%+SEMAR 43%=95%, 90% SB, 868M)
  v76384   IDEVVSA CONSTRUCCIONES SA DE CV      ADD  (SCT/SICT 70%+CAPUFE 25%=95%, 100% SB, 759M)
  v14706   CONSTRUCTORA WONGPEC SA DE CV        ADD  (CONAGUA 73%+IPN 17%=90%, 100% SB, 268M)
  v46423   MUEBLES Y MUDANZAS                   ADD  (SAT 53%+SEPOMEX 35%=87%, 95% DA, 477M)
  v140883  PROTECCION AGROPECUARIA CIA SEGUROS  ADD  (Michoacan 84.5%, insurance capture, 371M)
  v3145    LINOS CONSTRUCCIONES SA DE CV        ADD  (SEDATU 41%+IMSS 21%+CDMX 13%=75%, 55% SB)
  v44613   HILADOS Y TEJIDOS EL CARRETE         SKIP (78% health but low SB/DA, possible legitimate textile)
  v33477   PROFESSIONAL PHARMACY SA DE CV       SKIP (IMSS 88% but 0% SB, 26% DA, competitive pharma)

Cases added: 6  |  Vendors skipped: 2
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 980:
        print(f"ERROR: max_id={max_id}, expected >= 980. Aborting.")
        conn.close()
        return

    c1 = max_id + 1
    c2 = max_id + 2
    c3 = max_id + 3
    c4 = max_id + 4
    c5 = max_id + 5
    c6 = max_id + 6

    print(f"Max GT case id: {max_id}")
    print(f"Inserting cases {c1}-{c6}")

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

    # Case 1: CMCO - SCT + SEMAR dual SB capture
    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "SCT and Navy Ministry Dual Single-Bid Capture - CMCO",
        "single_bid_capture", 2005, 2023, "high", 868_000_000,
        "ARIA T3 queue pattern analysis",
        "CMCO SA DE CV (v23025): 10 contracts, 909M total. "
        "90% single-bid rate. SCT (Secretaria de Comunicaciones y Transportes): "
        "6 contracts, 474M SB (52.1%), DA=17%, 2005-2011. "
        "SEMAR (Secretaria de Marina): 1 contract, 394M SB (43.3%), 2023. "
        "PEMEX Refinacion: 2 contracts, 22M SB (2.4%), 2007-2008. "
        "Combined SCT + SEMAR = 868M (95.5%). "
        "Engineering company capturing Mexico's transport ministry via SB tenders "
        "(2005-2011) and then — after a gap — winning a single 394M SB at the Navy Ministry "
        "in 2023. Two different federal institutions (roads + navy) both at 90%+ SB. "
        "The 12-year gap then a 394M SB at SEMAR suggests dormant or reconstituted entity "
        "reactivating for a specific large contract.",
    ))
    conn.execute(sql_vendor, (
        c1, 23025, "CMCO SA. DE CV.",
        "primary", "high", "aria_queue_t3", 0.90,
        "SCT 52.1% SB (2005-2011) + SEMAR 43.3% SB (2023) = 95.5%, 90% SB",
    ))

    # Case 2: IDEVVSA CONSTRUCCIONES - SCT/SICT + CAPUFE roads SB capture
    conn.execute(sql_case, (
        c2, f"CASE-{c2}",
        "Federal Roads and Transport Ministry 100% SB Capture - IDEVVSA Construcciones",
        "single_bid_capture", 2010, 2024, "high", 759_000_000,
        "ARIA T3 queue pattern analysis",
        "IDEVVSA CONSTRUCCIONES SA DE CV (v76384): 17 contracts, 802M total. "
        "100% single-bid rate. SICT/SCT (Secretaria de Infraestructura, Comunicaciones "
        "y Transportes, formerly SCT): 12 contracts, 559M SB (69.7%), 2010-2022. "
        "CAPUFE (Caminos y Puentes Federales de Ingresos y Servicios Conexos): "
        "2 contracts, 200M SB (24.9%), 2024. "
        "Estado de Mexico: 2 contracts, 35M SB (4.4%), 2021-2022. "
        "Combined SICT/SCT + CAPUFE = 759M (94.6%), all 100% SB. "
        "Construction company with 100% uncontested single-bid rate across "
        "14 consecutive contracts at Mexico's federal transport ministry and toll road agency "
        "spanning 14 years (2010-2024). Dominant presence across the renamed ministry "
        "(SCT → SICT) and its toll bridge authority.",
    ))
    conn.execute(sql_vendor, (
        c2, 76384, "IDEVVSA CONSTRUCCIONES SA DE CV",
        "primary", "high", "aria_queue_t3", 0.92,
        "SICT/SCT 69.7% + CAPUFE 24.9% = 94.6%, 100% SB 14 contracts 2010-2024",
    ))

    # Case 3: CONSTRUCTORA WONGPEC - CONAGUA + IPN SB capture
    conn.execute(sql_case, (
        c3, f"CASE-{c3}",
        "CONAGUA and IPN Infrastructure 100% SB Capture - Constructora Wongpec",
        "single_bid_capture", 2005, 2015, "high", 268_000_000,
        "ARIA T3 queue pattern analysis",
        "CONSTRUCTORA WONGPEC SA DE CV (v14706): 12 contracts, 297M total (2005-2015). "
        "83% single-bid rate. CONAGUA: 4 contracts, 216M SB (72.7%), 2010-2015. "
        "IPN-Patronato de Obras e Instalaciones: 3 contracts, 52M SB (17.5%), 2005-2013. "
        "CINVESTAV (CONACYT advanced research): 2 contracts, 11M SB (3.7%), 2008. "
        "Combined CONAGUA + IPN + CINVESTAV = 279M (93.9%), SB=100% on all three. "
        "Construction company with dominant SB position at Mexico's national water commission "
        "and its largest science/technology polytechnic university. "
        "12 contracts at 100% SB across water infrastructure and research institution "
        "construction — systematic pre-arranged competition.",
    ))
    conn.execute(sql_vendor, (
        c3, 14706, "CONSTRUCTORA WONGPEC, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.88,
        "CONAGUA 72.7% + IPN 17.5% = 90.2%, 100% SB, 9 contracts",
    ))

    # Case 4: MUEBLES Y MUDANZAS - SAT + SEPOMEX furniture/moving DA capture
    conn.execute(sql_case, (
        c4, f"CASE-{c4}",
        "SAT Tax Authority and Postal Service Direct Award Capture - Muebles y Mudanzas",
        "institutional_capture", 2010, 2017, "high", 477_000_000,
        "ARIA T3 queue pattern analysis",
        "MUEBLES Y MUDANZAS SA DE CV (v46423): 81 contracts, 548M total (2010-2017). "
        "80% direct award rate. SAT (Servicio de Administracion Tributaria): "
        "35 contracts, 288M DA (52.6%), DA=91%, SB=6%, 2010-2016. "
        "SEPOMEX (Servicio Postal Mexicano): 4 contracts, 189M DA (34.5%), DA=100%, 2013-2017. "
        "Combined SAT + SEPOMEX = 477M (87%), DA=95%. "
        "Furniture/office supply and moving company with extreme DA dominance "
        "at Mexico's federal tax authority (SAT) and national postal service: "
        "91% DA rate at SAT across 35 contracts, 100% DA at SEPOMEX. "
        "Combined 87% at these two federal agencies via near-exclusive non-competitive awards.",
    ))
    conn.execute(sql_vendor, (
        c4, 46423, "MUEBLES Y MUDANZAS",
        "primary", "high", "aria_queue_t3", 0.90,
        "SAT 52.6% (91% DA, 35 ctrs) + SEPOMEX 34.5% (100% DA) = 87%, 95% DA",
    ))

    # Case 5: PROTECCION AGROPECUARIA - Michoacan agricultural insurance capture
    conn.execute(sql_case, (
        c5, f"CASE-{c5}",
        "Michoacan State Agricultural Insurance Capture - Proteccion Agropecuaria",
        "institutional_capture", 2014, 2019, "high", 371_000_000,
        "ARIA T3 queue pattern analysis",
        "PROTECCION AGROPECUARIA COMPANIA DE SEGUROS SA DE CV (v140883): "
        "7 contracts, 439M total. "
        "MICH-Comite de Adquisiciones del Poder Ejecutivo de Michoacan: "
        "3 contracts, 282M (64.2%), DA=33%, 2016-2018. "
        "Gobierno del Estado de Michoacan: 1 contract, 89M (20.3%), 2019. "
        "AGS-Secretaria de Administracion: 3 contracts, 68M (15.5%), DA=67%, 2014-2017. "
        "Combined Michoacan = 371M (84.5%). "
        "Agricultural insurance company (presumably covering crop/livestock losses) "
        "with 84.5% concentration in Michoacan state across the state procurement committee "
        "and state government. Aguascalientes contracts as secondary revenue stream. "
        "Insurance company capturing state-level agricultural risk pool contracts via "
        "non-competitive awards — consistent with cartel-era state capture in Michoacan.",
    ))
    conn.execute(sql_vendor, (
        c5, 140883, "PROTECCION AGROPECUARIA COMPANIA DE SEGUROS SA DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "Michoacan procurement 64.2% + Gov Mich 20.3% = 84.5%, 7 contracts 371M",
    ))

    # Case 6: LINOS CONSTRUCCIONES - SEDATU + IMSS + CDMX SB/DA capture
    conn.execute(sql_case, (
        c6, f"CASE-{c6}",
        "SEDATU and IMSS Multi-Agency Construction SB Capture - Linos Construcciones",
        "single_bid_capture", 2008, 2022, "medium", 675_000_000,
        "ARIA T3 queue pattern analysis",
        "LINOS CONSTRUCCIONES SA DE CV (v3145): 67 contracts, 899M total (2008-2022). "
        "55% single-bid rate. SEDATU (housing/urban): 5 contracts, 366M SB (40.7%), "
        "SB=100%, 2019-2022. "
        "IMSS: 37 contracts, 193M (21.5%), DA=51%+SB=27%, 2008-2018. "
        "CDMX-Gobierno: 1 contract, 116M DA (12.9%), 2022. "
        "AEPDF (public space authority CDMX): 1 contract, 45M SB (5%), 2009. "
        "Combined SEDATU + IMSS + CDMX = 720M (80%). "
        "Construction company spanning federal housing ministry (100% SB), "
        "national health insurer (mixed), and Mexico City government (DA). "
        "Multi-agency presence across federal and CDMX entities over 14 years "
        "with 55% SB rate and 366M concentrated at SEDATU via uncontested bids.",
    ))
    conn.execute(sql_vendor, (
        c6, 3145, "LINOS CONSTRUCCIONES S. A. DE C. V.",
        "primary", "medium", "aria_queue_t3", 0.80,
        "SEDATU 40.7% (100% SB) + IMSS 21.5% + CDMX 12.9% = 75%, 55% SB",
    ))

    # Link contracts
    links = [
        (c1, 23025, 2005, 2023),
        (c2, 76384, 2010, 2024),
        (c3, 14706, 2005, 2015),
        (c4, 46423, 2010, 2017),
        (c5, 140883, 2014, 2019),
        (c6, 3145, 2008, 2022),
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

    for vid in [23025, 76384, 14706, 46423, 140883, 3145]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    skips = [
        (44613, "Hilados y Tejidos El Carrete - 78% health institutions but low SB(1%)/DA(50%) at IMSS, possible legitimate medical textile supplier"),
        (33477, "Professional Pharmacy - IMSS 88% but 0% SB, 26% DA, competitive pharmaceutical supplier"),
    ]
    for vid, reason in skips:
        conn.execute(
            "UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes=? WHERE vendor_id=?",
            (reason, vid),
        )
        print(f"  v{vid}: SKIP")

    conn.commit()
    conn.close()
    print(f"\nDone. Inserted 6 cases ({c1}-{c6}), linked {total_linked} contracts, skipped 2.")


if __name__ == "__main__":
    main()
