#!/usr/bin/env python3
"""
GT Mining Batch SSS1 - ARIA T3 investigation (8 vendors)

Investigated 2026-03-23:
  v195663  GAVIL INGENIERIA SA DE CV           ADD  (FGR 81.4% SB, 363M at Attorney General 2022-2023)
  v85858   ALEJANDRO CARREON IBANEZ            ADD  (Dolores Hidalgo municipal 98.3%, 992M individual 2013-14)
  v45433   SOFILAB SA DE CV                    ADD  (Hospital Juarez 87%+INCAN 9.4%=96.5%, 76.3% DA)
  v32995   MAGGSA CONSTRUCTORA SA DE CV        ADD  (CAPUFE+SCT 85.3%, 95.7% SB, 964M roads)
  v26168   JM CONSTRUCTORA Y SUPERVISION       ADD  (CDMX alcaldias+Jalisco 75.7%, 73.1% SB, 417M)
  v4405    PAN ROL SA DE CV                    SKIP (IMSS 71.5% but 474 ctrs food supplier, 26% DA)
  v277530  BFS INGENIERIA APLICADA SA DE CV    SKIP (IFT 77.5% competitive + IMSS SB, legitimate)
  v244817  SOLARA SA DE CV                     SKIP (180 ctrs dispersed health supply, top=12%)

Cases added: 5  |  Vendors skipped: 3
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 956:
        print(f"ERROR: max_id={max_id}, expected >= 956. Aborting.")
        conn.close()
        return

    c1 = max_id + 1
    c2 = max_id + 2
    c3 = max_id + 3
    c4 = max_id + 4
    c5 = max_id + 5

    print(f"Max GT case id: {max_id}")
    print(f"Inserting cases {c1}-{c5}")

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

    # Case 1: GAVIL INGENIERIA - FGR Attorney General SB capture
    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "Attorney General Office Single-Bid Capture - Gavil Ingenieria",
        "single_bid_capture", 2022, 2025, "high", 416_000_000,
        "ARIA T3 queue pattern analysis",
        "GAVIL INGENIERIA SA DE CV (v195663): 13 contracts, 446M total (2022-2025). "
        "100% single-bid rate. FGR (Fiscalia General de la Republica): "
        "3 contracts, 363M SB (81.4%), 2022-2023. "
        "IMSS: 30M SB (2024). Secretaria Anticorrupcion y Buen Gobierno: 23M SB (2025). "
        "Combined = 416M (93%) across law enforcement and anti-corruption institutions. "
        "Engineering company with dominant SB capture at Mexico's Attorney General "
        "office — 363M in 3 contracts over just 2 years. "
        "Ironic that a construction firm captures the anti-corruption secretariat.",
    ))
    conn.execute(sql_vendor, (
        c1, 195663, "GAVIL INGENIERIA SA DE CV",
        "primary", "high", "aria_queue_t3", 0.92,
        "FGR 81.4%: 3 contracts 363M SB 2022-2023, all 100% SB",
    ))

    # Case 2: ALEJANDRO CARREON IBANEZ - Dolores Hidalgo municipal capture (individual)
    conn.execute(sql_case, (
        c2, f"CASE-{c2}",
        "Dolores Hidalgo Municipal Capture Individual Contractor - Alejandro Carreon",
        "institutional_capture", 2013, 2014, "high", 992_000_000,
        "ARIA T3 queue pattern analysis",
        "ALEJANDRO CARREON IBANEZ (v85858): 16 contracts, 1009M total. "
        "Natural person (individual contractor) winning state/municipal contracts. "
        "GTO-Presidencia Municipal de Dolores Hidalgo Cuna de la Independencia: "
        "3 contracts, 992M (98.3%), DA=33.3%, SB=66.7%, 2013-2014. "
        "Dolores Hidalgo is a city of ~150K in Guanajuato. "
        "An individual receiving 992M from a single small municipal government "
        "in two years is extreme. No other significant contracts before or after. "
        "Classic ghost/individual municipal capture — individual registered as "
        "contractor to funnel municipal spending.",
    ))
    conn.execute(sql_vendor, (
        c2, 85858, "ALEJANDRO CARREON IBANEZ",
        "primary", "high", "aria_queue_t3", 0.95,
        "Dolores Hidalgo GTO 98.3%: 992M individual contractor 2013-2014",
    ))

    # Case 3: SOFILAB - Hospital Juarez medical supply DA capture
    conn.execute(sql_case, (
        c3, f"CASE-{c3}",
        "Hospital Juarez Federal Hospital Direct Award Capture - Sofilab",
        "institutional_capture", 2014, 2025, "high", 470_000_000,
        "ARIA T3 queue pattern analysis",
        "SOFILAB SA DE CV (v45433): 129 contracts, 487M total (2014-2025). "
        "62.8% direct award rate. Hospital Juarez de Mexico: 76 contracts, 424M "
        "(87%), DA=76.3% (2017-2024). "
        "Instituto Nacional de Cancerologia: 10 contracts, 46M (9.4%), 2014-2025. "
        "Combined = 470M (96.5%). "
        "Medical laboratory/supply company with systematic DA dominance at "
        "Hospital Juarez (major federal trauma hospital in CDMX) over 7 years. "
        "76 contracts at 76.3% DA rate at one hospital — long-term exclusive supply.",
    ))
    conn.execute(sql_vendor, (
        c3, 45433, "SOFILAB S.A.D E C.V.",
        "primary", "high", "aria_queue_t3", 0.90,
        "Hospital Juarez 87% (76.3% DA, 76 ctrs) + INCAN 9.4% = 96.5%",
    ))

    # Case 4: MAGGSA CONSTRUCTORA - CAPUFE/SCT road infrastructure SB capture
    conn.execute(sql_case, (
        c4, f"CASE-{c4}",
        "CAPUFE and SCT Road Infrastructure Single-Bid Capture - Maggsa Constructora",
        "single_bid_capture", 2007, 2022, "high", 822_000_000,
        "ARIA T3 queue pattern analysis",
        "MAGGSA CONSTRUCTORA SA DE CV (v32995): 23 contracts, 964M total (2007-2022). "
        "95.7% single-bid rate. CAPUFE (Caminos y Puentes Federales): "
        "2 contracts, 394M SB (40.9%), 2018-2019. "
        "SCT/Infraestructura: 313M SB (32.5%), 2021-2022. "
        "SCT historic: 115M SB (11.9%), 2007-2017. "
        "Combined federal roads entities = 822M (85.3%), 95.7% SB. "
        "Construction company dominating federal highway and bridge procurement "
        "via uncontested single-bid tenders across multiple administrations (2007-2022). "
        "23 consecutive SB wins at CAPUFE and SCT over 15 years.",
    ))
    conn.execute(sql_vendor, (
        c4, 32995, "MAGGSA CONSTRUCTORA, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.92,
        "CAPUFE 40.9% + SCT 44.4% = 85.3%, 95.7% SB, 23 contracts 2007-2022",
    ))

    # Case 5: JM CONSTRUCTORA - CDMX alcaldias + Jalisco SB capture
    conn.execute(sql_case, (
        c5, f"CASE-{c5}",
        "CDMX Alcaldias and Jalisco Construction Single-Bid Capture - JM Constructora",
        "single_bid_capture", 2014, 2018, "high", 316_000_000,
        "ARIA T3 queue pattern analysis",
        "JM CONSTRUCTORA Y SUPERVISION SA DE CV (v26168): 26 contracts, 417M total. "
        "73.1% single-bid rate. CDMX-Alcaldia de Benito Juarez: 151M SB (2016) = 36.2%. "
        "JAL-Secretaria de Infraestructura: 96M SB (22.9%), 2014-2018. "
        "CDMX-Alcaldia de Cuauhtemoc: 69M SB (2016) = 16.5%. "
        "Combined = 316M (75.7%) at two CDMX alcaldias plus Jalisco state. "
        "Construction/supervision firm capturing CDMX borough and Jalisco state "
        "infrastructure contracts via uncontested competitive tenders. "
        "Winning at two different CDMX alcaldias simultaneously is unusual.",
    ))
    conn.execute(sql_vendor, (
        c5, 26168, "JM CONSTRUCTORA Y SUPERVISION, S.A.",
        "primary", "high", "aria_queue_t3", 0.88,
        "CDMX-BJ 36% + CDMX-Cuauh 16.5% + JAL 23% = 75.7%, 73.1% SB",
    ))

    # Link contracts
    links = [
        (c1, 195663, 2022, 2025),
        (c2, 85858, 2013, 2014),
        (c3, 45433, 2014, 2025),
        (c4, 32995, 2007, 2022),
        (c5, 26168, 2014, 2018),
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

    for vid in [195663, 85858, 45433, 32995, 26168]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    skips = [
        (4405, "Pan Rol - IMSS 71.5% but 474 contracts food/catering supply, DA=26% not extreme, institutional food vendor"),
        (277530, "BFS Ingenieria - IFT 77.5% but 2/3 contracts competitive, IMSS SB 2025, appears legitimately contracted"),
        (244817, "Solara SA de CV - 180 contracts dispersed health/education supply, top=12%, structural multi-client"),
    ]
    for vid, reason in skips:
        conn.execute(
            "UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes=? WHERE vendor_id=?",
            (reason, vid),
        )
        print(f"  v{vid}: SKIP")

    conn.commit()
    conn.close()
    print(f"\nDone. Inserted 5 cases ({c1}-{c5}), linked {total_linked} contracts, skipped 3.")


if __name__ == "__main__":
    main()
