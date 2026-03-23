#!/usr/bin/env python3
"""
GT Mining Batch ZZZ1 - ARIA T3 investigation (8 vendors)

Investigated 2026-03-23:
  v22458   CONSTRUCTORA DE INFRAESTRUCTURA DE DGO  ADD  (Durango+SCT 100% SB, 657M)
  v61790   AUTOTRANSPORTES INTERNACIONALES         ADD  (SRE 74%+ProMex 17%+CPTM 8%=98%, 327M)
  v11322   CONSTRUCTORA ARPOZA SA DE CV            ADD  (IMSS single 297M SB 88%, ghost)
  v136640  CONSTRUCTORA MENDEZ D SA DE CV          ADD  (Sonora Infra 61%+QRO 18%=79%, 100% SB, recent)
  v7538    J A DIAZ Y CIA SA DE CV                 ADD  (CENAGAS single 276M SB 72%, ghost 2021)
  v36132   SELECT PRODUCE DE MEXICO SA DE CV       ADD  (IMSS+ISSSTE 100%, 65 ctrs 335M, 17 years)
  v185667  SOLUCIONES INMESOL SA DE CV             SKIP (dispersed ag/finance, top=33%, 106 ctrs)
  v954     NYLEX SA DE CV                          SKIP (ISSSTE 35% but 0% DA/SB competitive, dispersed 173 ctrs)

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
    if max_id is None or max_id < 993:
        print(f"ERROR: max_id={max_id}, expected >= 993. Aborting.")
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

    # Case 1: CONSTRUCTORA DURANGO - Durango state + SCT 100% SB capture
    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "Durango State and SCT Road Infrastructure 100% SB Capture - Constructora Durango",
        "single_bid_capture", 2005, 2014, "high", 657_000_000,
        "ARIA T3 queue pattern analysis",
        "CONSTRUCTORA DE INFRAESTRUCTURA DE DURANGO SA DE CV (v22458): "
        "5 contracts, 657M total (2005-2014). "
        "100% single-bid rate. DGO-Secretaria de Comunicaciones y Obras Publicas: "
        "2 contracts, 417M SB (63.5%), 2005-2010. "
        "SCT (Secretaria de Comunicaciones y Transportes): "
        "3 contracts, 240M SB (36.5%), 2010-2014. "
        "Combined = 657M (100%). "
        "Construction company in Durango capturing both the state transport/public "
        "works ministry (417M) and federal SCT (240M) via 100% uncontested SB tenders. "
        "5 contracts, all single-bid, spanning Durango state and federal road agency — "
        "complete dominance of road infrastructure procurement in the region.",
    ))
    conn.execute(sql_vendor, (
        c1, 22458, "CONSTRUCTORA DE INFRAESTRUCTURA DE DURANGO S.A DE CV",
        "primary", "high", "aria_queue_t3", 0.92,
        "DGO-SCOP 63.5% + SCT 36.5% = 100%, all SB=100%, 5 contracts 657M",
    ))

    # Case 2: AUTOTRANSPORTES INTERNACIONALES - SRE + ProMex + CPTM diplomatic capture
    conn.execute(sql_case, (
        c2, f"CASE-{c2}",
        "Foreign Ministry and Trade Promotion Capture - Autotransportes Internacionales",
        "institutional_capture", 2011, 2019, "high", 327_000_000,
        "ARIA T3 queue pattern analysis",
        "AUTOTRANSPORTES INTERNACIONALES S DE RL DE CV (v61790): "
        "23 contracts, 333M total (2011-2019). "
        "61% direct award rate. SRE (Secretaria de Relaciones Exteriores): "
        "2 contracts, 246M (73.9%), DA=50% SB=50%, 2016-2019. "
        "ProMexico (trade promotion trust): 5 contracts, 56M (16.8%), DA=60%, 2013-2019. "
        "CPTM (Consejo de Promocion Turistica de Mexico): "
        "10 contracts, 25M (7.5%), DA=40%, 2011-2019. "
        "Combined SRE + ProMexico + CPTM = 327M (98.2%). "
        "International transport company with 98% concentration at Mexico's foreign "
        "ministry and its trade/tourism promotion entities — diplomatic/official "
        "transport services captured via mixed DA and SB tenders over 8 years.",
    ))
    conn.execute(sql_vendor, (
        c2, 61790, "AUTOTRANSPORTES INTERNACIONALES S DE RL DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "SRE 73.9% + ProMexico 16.8% + CPTM 7.5% = 98.2%, 61% DA",
    ))

    # Case 3: CONSTRUCTORA ARPOZA - IMSS single massive SB ghost
    conn.execute(sql_case, (
        c3, f"CASE-{c3}",
        "IMSS Single-Bid Ghost Construction Contract - Constructora Arpoza",
        "ghost_company", 2003, 2014, "high", 297_000_000,
        "ARIA T3 queue pattern analysis",
        "CONSTRUCTORA ARPOZA SA DE CV (v11322): 16 contracts, 339M total. "
        "81% single-bid rate. IMSS: 1 contract, 297M SB (87.6%), 2005. "
        "Minor subsequent contracts: MEX-ISEM 17M SB (2014), HGO water 10M SB (2010), "
        "Toluca water 6M SB (2003-2008). "
        "Classic ghost escalation: company accumulated small water/state contracts, "
        "then won a single 297M SB at IMSS in 2005 (24.7x any prior single contract). "
        "87.6% of total lifetime revenue from one uncontested IMSS construction contract. "
        "P2 ghost pattern: established as regional water supplier, captured IMSS via SB.",
    ))
    conn.execute(sql_vendor, (
        c3, 11322, "CONSTRUCTORA ARPOZA, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.90,
        "IMSS 87.6%: single 297M SB 2005 — ghost escalation from small water contracts",
    ))

    # Case 4: CONSTRUCTORA MENDEZ D - Sonora state recent SB capture
    conn.execute(sql_case, (
        c4, f"CASE-{c4}",
        "Sonora State Infrastructure Recent SB Capture - Constructora Mendez D",
        "single_bid_capture", 2017, 2025, "high", 226_000_000,
        "ARIA T3 queue pattern analysis",
        "CONSTRUCTORA MENDEZ D SA DE CV (v136640): 12 contracts, 286M total (2017-2025). "
        "92% single-bid rate. SON-Secretaria de Infraestructura y Desarrollo Urbano: "
        "2 contracts, 175M SB (61.2%), 2023-2024. "
        "QRO-Comision Estatal de Infraestructura de Queretaro: "
        "2 contracts, 51M SB (17.8%), 2017. "
        "SON-Gobierno del Estado de Sonora: 2 contracts, 31M mixed (10.8%), 2022. "
        "Combined Sonora state entities = 206M (72%), SB=100% at state infrastructure. "
        "Construction company with dominant recent SB wins at Sonora state infrastructure "
        "ministry (175M in 2 contracts, 2023-2024) and earlier Queretaro state presence. "
        "Concentrated recent activity at Sonora infrastructure via uncontested bids.",
    ))
    conn.execute(sql_vendor, (
        c4, 136640, "CONSTRUCTORA MENDEZ D SA DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "Sonora Infra 61.2% + QRO 17.8% + Sonora Gov 10.8% = 89.8%, 92% SB",
    ))

    # Case 5: J.A. DIAZ Y CIA - CENAGAS gas control single SB ghost
    conn.execute(sql_case, (
        c5, f"CASE-{c5}",
        "CENAGAS Gas Network Single-Bid Ghost Contract - JA Diaz y Cia",
        "ghost_company", 2002, 2025, "high", 276_000_000,
        "ARIA T3 queue pattern analysis",
        "J A DIAZ Y CIA SA DE CV (v7538): 77 contracts, 381M total (2002-2025). "
        "CENAGAS (Centro Nacional de Control del Gas Natural): "
        "1 contract, 276M SB (72.4%), 2021. "
        "Prior activity: PEMEX Refinacion 22 ctrs 33M SB (2002-2010), "
        "CFE 42 ctrs 15M DA (2010-2017), ASA 1 ctr 54M DA (2025). "
        "Pattern: Company spent 2002-2017 on small PEMEX/CFE utility contracts "
        "(total ~48M), then won a single 276M SB at CENAGAS (natural gas grid operator) "
        "in 2021 — 5.7x all prior revenue. "
        "Classic P2 ghost escalation: utility sector presence (PEMEX/CFE) used as "
        "legitimacy to access the gas network control center, then single massive SB.",
    ))
    conn.execute(sql_vendor, (
        c5, 7538, "J. A. DIAZ Y CIA., S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.90,
        "CENAGAS 72.4%: single 276M SB 2021 — P2 ghost from PEMEX/CFE small contracts",
    ))

    # Case 6: SELECT PRODUCE DE MEXICO - IMSS + ISSSTE food/produce long-term capture
    conn.execute(sql_case, (
        c6, f"CASE-{c6}",
        "IMSS and ISSSTE Long-Term Exclusive Produce Supply Capture - Select Produce",
        "institutional_capture", 2008, 2025, "medium", 335_000_000,
        "ARIA T3 queue pattern analysis",
        "SELECT PRODUCE DE MEXICO SA DE CV (v36132): 65 contracts, 335M total (2008-2025). "
        "IMSS: 38 contracts, 294M (87.8%), DA=24% SB=18%, 2008-2025. "
        "ISSSTE: 27 contracts, 41M (12.2%), DA=70% SB=7%, 2018-2025. "
        "Combined IMSS + ISSSTE = 335M (100%). "
        "Food/produce company with 100% concentration at Mexico's two largest public "
        "health insurers over 17 years. Systematic supply of fresh produce to "
        "federal health institutions across 65 contracts — while DA/SB rates are moderate "
        "at IMSS, the 17-year exclusive dual-institution supply relationship with "
        "progressively higher DA at ISSSTE (70%) suggests entrenched preferred supplier.",
    ))
    conn.execute(sql_vendor, (
        c6, 36132, "SELECT PRODUCE DE MEXICO, S.A. DE C.V",
        "primary", "medium", "aria_queue_t3", 0.80,
        "IMSS 87.8% + ISSSTE 12.2% = 100%, 65 contracts 335M 2008-2025",
    ))

    # Link contracts
    links = [
        (c1, 22458, 2005, 2014),
        (c2, 61790, 2011, 2019),
        (c3, 11322, 2003, 2014),
        (c4, 136640, 2017, 2025),
        (c5, 7538, 2002, 2025),
        (c6, 36132, 2008, 2025),
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

    for vid in [22458, 61790, 11322, 136640, 7538, 36132]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    skips = [
        (185667, "Soluciones Inmesol - dispersed ag/finance, SADER 33%+SENASICA 20%=53%, top=33%, 106 contracts multi-sector"),
        (954, "Nylex SA - ISSSTE 35% but 0% DA/SB competitive, dispersed 173 contracts PEMEX/ISSSTE mixed"),
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
