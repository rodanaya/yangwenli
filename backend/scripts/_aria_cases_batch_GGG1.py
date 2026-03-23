#!/usr/bin/env python3
"""
GT Mining Batch GGG1 - ARIA T3 investigation (6 vendors)

Investigated 2026-03-23:
  v324     PERKIN ELMER DE MEXICO          SKIP (global scientific brand, structural DA on specialized instruments)
  v39197   MAQUINAS DIESEL SA DE CV        ADD  (SEMAR naval capture, 68.5% DA, 390M single 2025 DA)
  v1988    BREYSA CONSTRUCTORA SA DE CV    ADD  (Jalisco state SB capture, 100% SB, 15 ctrs 2002-2021)
  v19011   CONSTRUCTORA JILSA SA DE CV     ADD  (IMSS SB construction, 98.4% at IMSS, 100% SB, 1038M 2023)
  v23929   CONSTRUCTORA E INMOBILIARIA RIO MEDIO  ADD  (APIVER/SCT port SB, 100% SB, 554M at Veracruz port)
  v170357  ISM INNOVA SALUD MEXICO         SKIP (dispersed health supplies, 67% INSABI but low DA/SB)

Cases added: 4  |  Vendors skipped: 2
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 913:
        print(f"ERROR: max_id={max_id}, expected >= 913. Aborting.")
        conn.close()
        return

    c1 = max_id + 1
    c2 = max_id + 2
    c3 = max_id + 3
    c4 = max_id + 4

    print(f"Max GT case id: {max_id}")
    print(f"Inserting cases {c1}-{c4}")

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

    # Case 1: MAQUINAS DIESEL - SEMAR naval capture
    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "SEMAR Naval Equipment Direct Award Capture - Maquinas Diesel",
        "institutional_capture", 2009, 2025, "medium", 432_000_000,
        "ARIA T3 queue pattern analysis",
        "MAQUINAS DIESEL SA DE CV (v39197): 235 contracts, 1120M total (2009-2025). "
        "68.5% direct award rate overall. Secretaria de Marina is top institution at "
        "38.7% (432M): 390M DA 2025, 66M DA 2014, 58.5M DA 2024, 47.8M DA 2023. "
        "Large diesel engine/generator supplier concentrated at Navy with systematic "
        "DA awards spanning 16 years. Medium confidence: defense sector may have "
        "legitimate sole-source justifications but pattern is consistent with capture.",
    ))
    conn.execute(sql_vendor, (
        c1, 39197, "MAQUINAS DIESEL, S.A. DE C.V.",
        "primary", "medium", "aria_queue_t3", 0.80,
        "SEMAR 38.7% concentration, 68.5% DA rate, systematic naval DA awards 2009-2025",
    ))

    # Case 2: BREYSA CONSTRUCTORA - Jalisco SB capture
    conn.execute(sql_case, (
        c2, f"CASE-{c2}",
        "Jalisco State Construction Single-Bid Capture - Breysa Constructora",
        "single_bid_capture", 2002, 2021, "high", 1_177_000_000,
        "ARIA T3 queue pattern analysis",
        "BREYSA CONSTRUCTORA SA DE CV (v1988): 15 contracts, 1177M total (2002-2021). "
        "100% single-bid rate across all contracts. Jalisco state infrastructure agencies: "
        "JAL-Secretaria de Infraestructura y Obra Publica (345M 2017, 261M 2018, 258M 2015 "
        "= 864M) + Gobierno del Estado de Jalisco (269M 2019, 11M 2021). "
        "Systematic uncontested competitive tenders at Jalisco state government over 20 "
        "years. Classic state-level construction SB capture.",
    ))
    conn.execute(sql_vendor, (
        c2, 1988, "BREYSA CONSTRUCTORA S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.90,
        "Jalisco 100% concentration, 100% SB rate, 15 contracts 2002-2021",
    ))

    # Case 3: CONSTRUCTORA JILSA - IMSS SB construction
    conn.execute(sql_case, (
        c3, f"CASE-{c3}",
        "IMSS Construction Single-Bid Capture - Constructora Jilsa",
        "single_bid_capture", 2005, 2023, "high", 1_150_000_000,
        "ARIA T3 queue pattern analysis",
        "CONSTRUCTORA JILSA SA DE CV (v19011): 6 contracts, 1168M total. "
        "98.4% concentrated at IMSS: 1038.8M SB in 2023 + 110.5M SB in 2009 = 1149M. "
        "Both IMSS contracts are single-bid (uncontested competitive tenders). "
        "Extreme institutional concentration + 100% SB rate. "
        "2023 contract for 1.038B is one of the largest single construction SB contracts "
        "in the dataset. Classic IMSS construction capture pattern.",
    ))
    conn.execute(sql_vendor, (
        c3, 19011, "CONSTRUCTORA JILSA, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.92,
        "IMSS 98.4% concentration, 100% SB, 1038M 2023 + 110M 2009",
    ))

    # Case 4: CONSTRUCTORA RIO MEDIO - APIVER/SCT port capture
    conn.execute(sql_case, (
        c4, f"CASE-{c4}",
        "Veracruz Port Single-Bid Capture - Constructora Rio Medio",
        "single_bid_capture", 2006, 2017, "high", 553_000_000,
        "ARIA T3 queue pattern analysis",
        "CONSTRUCTORA E INMOBILIARIA RIO MEDIO SA DE CV (v23929): 16 contracts, "
        "1111M total (2006-2017). 100% single-bid rate. Concentrated at Veracruz port "
        "infrastructure: APIVER (Administracion Portuaria Integral de Veracruz): "
        "399M 2007 + 101M 2009 + 53M 2007 = 554M (50% of total). "
        "Also SCT: 190M 2013 + 63M 2015. All contracts uncontested competitive tenders. "
        "Major port/infrastructure construction SB capture spanning Calderon and Pena Nieto "
        "administrations.",
    ))
    conn.execute(sql_vendor, (
        c4, 23929, "CONSTRUCTORA E INMOBILIARIA RIO MEDIO S. A. DE C. V.",
        "primary", "high", "aria_queue_t3", 0.90,
        "APIVER 50% concentration, 100% SB, 16 contracts 2006-2017",
    ))

    # Link contracts
    links = [
        (c1, 39197, 2009, 2025),
        (c2, 1988, 2002, 2021),
        (c3, 19011, 2005, 2023),
        (c4, 23929, 2006, 2017),
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

    # ARIA queue updates for ADDs
    for vid in [39197, 1988, 19011, 23929]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    # SKIPs
    skips = [
        (324, "Global scientific instruments brand (PerkinElmer), structural DA for specialized lab equipment"),
        (170357, "Dispersed health supplies - 67% INSABI but low DA/SB, no clear capture signal"),
    ]
    for vid, reason in skips:
        conn.execute(
            "UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes=? WHERE vendor_id=?",
            (reason, vid),
        )
        print(f"  v{vid}: SKIP")

    conn.commit()
    conn.close()
    print(f"\nDone. Inserted 4 cases ({c1}-{c4}), linked {total_linked} contracts, skipped 2.")


if __name__ == "__main__":
    main()
