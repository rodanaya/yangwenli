#!/usr/bin/env python3
"""
GT Mining Batch AAA2 - ARIA T3 investigation (8 vendors)

Investigated 2026-03-23:
  v107566  GCQ CONSTRUCCIONES SA DE CV          ADD  (Michoacan Salud 61%+SCOP 35%=96%, SB=100%)
  v132571  OVAIDE SA DE CV                      ADD  (SEP 55%+SCT 45%=100%, 3 ctrs ghost)
  v87100   GRUPO CONSTRUCCIONES PLANIFICADAS    ADD  (CAPUFE+SCT+Sonora+BC 100% SB, 1077M)
  v119068  SACYR MEXICO SA DE CV                ADD  (IMSS 74%+SCT 26%=100%, 997M, Spanish firm)
  v5836    TOBOGAN TOURS SA DE CV               ADD  (SCT 100%, 1245M SB, travel company ghost)
  v102742  GRUPO LIBRA SERVICIOS ADMIN          ADD  (SEP 33%+INBA 30%+IMSS 23%+AEFCM 12%=97%)
  v42642   AMPLI BIO SA DE CV                   ADD  (SENASICA 62% DA + INCAN+INPer 22%=84%)
  v57674   BIO PAPPEL PRINTING                  SKIP (100% at state printers, legitimate paper supply ecosystem)

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
    if max_id is None or max_id < 999:
        print(f"ERROR: max_id={max_id}, expected >= 999. Aborting.")
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

    # Case 1: GCQ CONSTRUCCIONES - Michoacan state health + roads SB capture
    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "Michoacan State Health and Roads 100% SB Capture - GCQ Construcciones",
        "single_bid_capture", 2017, 2018, "high", 512_000_000,
        "ARIA T3 queue pattern analysis",
        "GCQ CONSTRUCCIONES SA DE CV (v107566): 10 contracts, 536M total. "
        "70% single-bid rate. MICH-Secretaria de Salud: 1 contract, 324M SB (60.4%), 2018. "
        "MICH-Secretaria de Comunicaciones y Obras Publicas: "
        "1 contract, 188M SB (35.1%), 2017. "
        "Combined Michoacan state = 512M (95.5%), both 100% SB. "
        "Construction company capturing Michoacan's health ministry (324M) and "
        "communications/public works ministry (188M) via uncontested SB tenders "
        "in consecutive years. Two massive SB contracts at Michoacan state agencies "
        "totaling 512M — consistent with cartel-era state capture patterns in Michoacan.",
    ))
    conn.execute(sql_vendor, (
        c1, 107566, "GCQ CONSTRUCCIONES SA DE CV",
        "primary", "high", "aria_queue_t3", 0.92,
        "MICH-Salud 60.4% SB + MICH-SCOP 35.1% SB = 95.5%, 2 contracts 512M 2017-2018",
    ))

    # Case 2: OVAIDE - SEP + SCT dual ghost SB
    conn.execute(sql_case, (
        c2, f"CASE-{c2}",
        "SEP and SCT Dual Ministry Ghost Single-Bid Contracts - Ovaide",
        "ghost_company", 2014, 2024, "high", 531_000_000,
        "ARIA T3 queue pattern analysis",
        "OVAIDE SA DE CV (v132571): 3 contracts, 532M total. "
        "67% single-bid rate. SEP: 1 contract, 294M SB (55.3%), 2021. "
        "SCT: 1 contract, 237M SB (44.5%), 2014. "
        "CENACE: 1 contract, 1M DA, 2024. "
        "Classic two-contract ghost company: "
        "Two massive SB contracts at Mexico's Education Ministry (294M, 2021) "
        "and Transport Ministry (237M, 2014) totaling 531M. "
        "No significant other activity. A company with only 3 lifetime contracts "
        "accumulating 531M entirely via single-bid tenders at two major federal "
        "ministries — textbook P2 ghost structure with selective large SB awards.",
    ))
    conn.execute(sql_vendor, (
        c2, 132571, "OVAIDE SA DE CV",
        "primary", "high", "aria_queue_t3", 0.93,
        "SEP 55.3% SB (2021) + SCT 44.5% SB (2014) = 100%, 3-contract ghost",
    ))

    # Case 3: GRUPO CONSTRUCCIONES PLANIFICADAS - multi-roads 100% SB capture
    conn.execute(sql_case, (
        c3, f"CASE-{c3}",
        "Federal and State Road Infrastructure 100% SB Capture - Grupo Construcciones Planificadas",
        "single_bid_capture", 2012, 2020, "high", 867_000_000,
        "ARIA T3 queue pattern analysis",
        "GRUPO CONSTRUCCIONES PLANIFICADAS SA DE CV (v87100): 18 contracts, 1077M total. "
        "100% single-bid rate. CAPUFE: 4 contracts, 340M SB (31.6%), 2012-2018. "
        "SCT: 2 contracts, 194M SB (18%), 2014-2015. "
        "SON-Gobierno del Estado de Sonora: 1 contract, 167M SB (15.5%), 2020. "
        "BC-Secretaria de Infraestructura: 1 contract, 166M SB (15.4%), 2012. "
        "Combined = 867M (80.5%) at roads/infrastructure entities, all 100% SB. "
        "Construction company with 100% single-bid rate across 18 contracts "
        "at federal toll road authority (CAPUFE), federal transport ministry (SCT), "
        "Sonora state, and Baja California state — all exclusively via uncontested tenders. "
        "National-scale road infrastructure SB capture spanning 8 years.",
    ))
    conn.execute(sql_vendor, (
        c3, 87100, "GRUPO CONSTRUCCIONES PLANIFICADAS SA DE CV",
        "primary", "high", "aria_queue_t3", 0.92,
        "CAPUFE 31.6%+SCT 18%+Sonora 15.5%+BC 15.4%=80.5%, ALL 100% SB, 18 contracts",
    ))

    # Case 4: SACYR MEXICO - IMSS + SCT infrastructure capture (Spanish firm)
    conn.execute(sql_case, (
        c4, f"CASE-{c4}",
        "IMSS Hospital and SCT Road Infrastructure DA/SB Capture - Sacyr Mexico",
        "institutional_capture", 2013, 2018, "high", 997_000_000,
        "ARIA T3 queue pattern analysis",
        "SACYR MEXICO SA DE CV (v119068): 10 contracts, 998M total (2013-2018). "
        "80% direct award rate. IMSS: 2 contracts, 741M (74.2%), DA=50% SB=50%, 2017-2018. "
        "SCT: 8 contracts, 256M (25.6%), DA=88% SB=12%, 2013-2014. "
        "Combined IMSS + SCT = 997M (99.9%). "
        "Sacyr is a Spanish infrastructure multinational (Grupo Sacyr). "
        "Mexican subsidiary with 100% concentration at IMSS hospital construction (2 massive contracts, "
        "741M, 50% DA+50% SB) and SCT road infrastructure (8 contracts, 256M, 88% DA). "
        "Single-vendor dominance of all 10 federal contracts across "
        "health and transport ministries suggests systematic federal access via "
        "DA/SB mechanisms at two of Mexico's largest federal spending entities.",
    ))
    conn.execute(sql_vendor, (
        c4, 119068, "SACYR MEXICO S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.90,
        "IMSS 74.2% (50%DA+50%SB, 741M) + SCT 25.6% (88%DA) = 99.9%, 10 contracts",
    ))

    # Case 5: TOBOGAN TOURS - SCT 100% SB ghost (travel company at transport ministry)
    conn.execute(sql_case, (
        c5, f"CASE-{c5}",
        "SCT Transport Ministry Ghost SB Capture by Travel Company - Tobogan Tours",
        "ghost_company", 2002, 2009, "high", 1_245_000_000,
        "ARIA T3 queue pattern analysis",
        "TOBOGAN TOURS SA DE CV (v5836): 17 contracts, 1248M total (2002-2009). "
        "100% single-bid rate. SCT: 7 contracts, 1245M SB (99.8%), 2002-2009. "
        "Name means 'Toboggan Tours' — a travel/tourism company. "
        "A tour operator winning 1.245 BILLION pesos via 100% SB at Mexico's "
        "Secretaria de Comunicaciones y Transportes (road/air/maritime transport ministry) "
        "over 7 years is structurally anomalous. Tourism companies do not build roads. "
        "Classic industry mismatch ghost: company with tourism-sector name registered "
        "to capture transport ministry procurement via uncontested tenders. "
        "Zero legitimate explanation for a tour company as SCT's primary contractor.",
    ))
    conn.execute(sql_vendor, (
        c5, 5836, "TOBOGAN TOURS SA DE CV",
        "primary", "high", "aria_queue_t3", 0.95,
        "SCT 99.8%: 7 contracts 1245M, 100% SB 2002-2009 — travel company at transport ministry",
    ))

    # Case 6: GRUPO LIBRA SERVICIOS - SEP+INBA+IMSS+AEFCM multi-institution admin capture
    conn.execute(sql_case, (
        c6, f"CASE-{c6}",
        "Education, Culture and Health Multi-Ministry Administrative Capture - Grupo Libra",
        "institutional_capture", 2013, 2018, "high", 697_000_000,
        "ARIA T3 queue pattern analysis",
        "GRUPO LIBRA SERVICIOS ADMINISTRATIVOS SA DE CV (v102742): "
        "33 contracts, 719M total (2013-2018). "
        "48% single-bid rate + 48% DA. "
        "SEP: 5 contracts, 235M SB (32.7%), DA=20% SB=80%, 2015-2018. "
        "INBA (Instituto Nacional de Bellas Artes): 3 contracts, 215M DA (29.9%), "
        "DA=67%, 2016-2018. "
        "IMSS: 11 contracts, 163M DA (22.7%), DA=82%, 2013-2017. "
        "AEFCM (Autoridad Educativa Federal CDMX): 2 contracts, 84M (11.7%), 2018. "
        "Combined = 697M (96.9%). "
        "Administrative services company capturing education (SEP, AEFCM), culture (INBA), "
        "and health (IMSS) ministries via a mix of SB and DA mechanisms over 5 years. "
        "Simultaneous access to 4 federal institutions with high DA/SB rates suggests "
        "systematic government access beyond normal competitive scope.",
    ))
    conn.execute(sql_vendor, (
        c6, 102742, "GRUPO LIBRA SERVICIOS ADMINISTRATIVOS, S.A. DE C.V",
        "primary", "high", "aria_queue_t3", 0.88,
        "SEP 32.7% SB + INBA 29.9% DA + IMSS 22.7% DA + AEFCM 11.7% = 96.9%",
    ))

    # Case 7: AMPLI BIO - SENASICA + health institutes DA capture
    conn.execute(sql_case, (
        c7, f"CASE-{c7}",
        "SENASICA Food Safety and Health Institute DA Capture - Ampli Bio",
        "institutional_capture", 2010, 2024, "medium", 233_000_000,
        "ARIA T3 queue pattern analysis",
        "AMPLI BIO SA DE CV (v42642): 299 contracts, 276M total (2010-2024). "
        "82% direct award rate. SENASICA (Servicio Nacional de Sanidad, Inocuidad "
        "y Calidad Agroalimentaria): 98 contracts, 172M (62.3%), DA=68%, 2010-2023. "
        "INCAN (Instituto Nacional de Cancerologia): 20 contracts, 33M (12%), DA=95%, 2012-2024. "
        "INPer (Instituto Nacional de Perinatologia): 36 contracts, 28M (10.1%), DA=86%, 2013-2024. "
        "Combined = 233M (84.4%). "
        "Biological products company with systematic DA dominance at Mexico's "
        "food safety authority (98 contracts at 68% DA over 13 years) and "
        "two national health institutes (INCAN at 95% DA, INPer at 86% DA). "
        "82% overall DA rate across 299 contracts — systematic non-competitive "
        "procurement at both agricultural safety and oncology/perinatology institutions.",
    ))
    conn.execute(sql_vendor, (
        c7, 42642, "AMPLI BIO SA DE CV",
        "primary", "medium", "aria_queue_t3", 0.82,
        "SENASICA 62.3% (68% DA) + INCAN 12% (95% DA) + INPer 10.1% = 84.4%, 82% DA",
    ))

    # Link contracts
    links = [
        (c1, 107566, 2013, 2023),
        (c2, 132571, 2014, 2024),
        (c3, 87100, 2012, 2020),
        (c4, 119068, 2013, 2018),
        (c5, 5836, 2002, 2009),
        (c6, 102742, 2013, 2018),
        (c7, 42642, 2010, 2024),
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

    for vid in [107566, 132571, 87100, 119068, 5836, 102742, 42642]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    skips = [
        (57674, "Bio Pappel Printing - 100% at government printers (CONALITEG+IEP+TGM) but legitimate paper supply ecosystem for state printing enterprises"),
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
