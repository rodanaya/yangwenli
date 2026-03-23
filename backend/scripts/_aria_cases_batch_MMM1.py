#!/usr/bin/env python3
"""
GT Mining Batch MMM1 - ARIA T3 investigation (8 vendors)

Investigated 2026-03-23:
  v50645   COMERCIALIZADORA INCAN SA DE CV  ADD  (INCAN cancer institute DA monopoly, 95.3% DA, 1307 ctrs)
  v76012   CONSTRUCTORA VVR SA DE CV        ADD  (Coahuila state SB capture, 94.4% SB, 88% at Coahuila)
  v1117    CONSTRUCCION Y ARRENDAMIENTO     ADD  (Sinaloa/CONAGUA SB, 83.5% SB, 391M at CONAGUA)
  v87441   FYSIS SOLUCIONES AMBIENTALES     ADD  (CFE environmental DA capture, 82% at CFE, 276M DA)
  v249324  EISAI LABORATORIOS SA DE CV      SKIP (global Eisai/Japanese pharma, specialty neurology drugs)
  v36907   CORPORATIVO ICSI SA DE CV        SKIP (dispersed, SEC estatal 48% + PEMEX 27%, multi-sector)
  v19557   SUCISA SA DE CV                  SKIP (dispersed, 3 different state/fed institutions)
  v12669   NETRIX SA DE CV                  SKIP (dispersed IT, INM 41% + FIRA 37% split)

Cases added: 4  |  Vendors skipped: 4
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 930:
        print(f"ERROR: max_id={max_id}, expected >= 930. Aborting.")
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

    # Case 1: COMERCIALIZADORA INCAN - cancer institute DA monopoly
    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "INCAN Cancer Institute Direct Award Monopoly - Comercializadora Incan",
        "institutional_capture", 2004, 2025, "high", 720_000_000,
        "ARIA T3 queue pattern analysis",
        "COMERCIALIZADORA INCAN SA DE CV (v50645): 1307 contracts, 756M total (2004-2025). "
        "Instituto Nacional de Cancerologia (INCAN): 1245 contracts, 720M (95.2%), 95.3% DA. "
        "Medical supply/pharmaceutical company with near-exclusive DA relationship at "
        "Mexico's national cancer institute spanning 21 years. "
        "95.3% DA rate across 1245 contracts is extreme — essentially no competitive "
        "tendering at INCAN. Classic long-term institutional capture of government "
        "specialty hospital procurement.",
    ))
    conn.execute(sql_vendor, (
        c1, 50645, "COMERCIALIZADORA INCAN SA DE CV",
        "primary", "high", "aria_queue_t3", 0.92,
        "INCAN 95.2% concentration, 95.3% DA rate, 1245 contracts 2004-2025",
    ))

    # Case 2: CONSTRUCTORA VVR - Coahuila state SB capture
    conn.execute(sql_case, (
        c2, f"CASE-{c2}",
        "Coahuila State Construction Single-Bid Capture - Constructora VVR",
        "single_bid_capture", 2010, 2024, "high", 458_000_000,
        "ARIA T3 queue pattern analysis",
        "CONSTRUCTORA VVR SA DE CV (v76012): 18 contracts, 518M total (2010-2024). "
        "94.4% single-bid rate. Coahuila state concentration: "
        "Gobierno del Estado de Coahuila + COA-Secretaria de Obras = 458M (88%). "
        "Construction company winning Coahuila state public works contracts "
        "via uncontested competitive tenders across multiple administrations. "
        "Pattern of large SB awards concentrated in one state — classic "
        "state-level construction capture.",
    ))
    conn.execute(sql_vendor, (
        c2, 76012, "CONSTRUCTORA VVR SA DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "Coahuila 88% concentration, 94.4% SB, 18 contracts 2010-2024",
    ))

    # Case 3: CONSTRUCCION Y ARRENDAMIENTO - Sinaloa/CONAGUA SB capture
    conn.execute(sql_case, (
        c3, f"CASE-{c3}",
        "Sinaloa and CONAGUA Infrastructure Single-Bid Capture - Construccion y Arrendamiento",
        "single_bid_capture", 2007, 2020, "high", 591_000_000,
        "ARIA T3 queue pattern analysis",
        "CONSTRUCCION Y ARRENDAMIENTO SA DE CV (v1117): 12 contracts, 708M total (2007-2020). "
        "83.5% single-bid rate. CONAGUA: 391M SB (52% of total). "
        "Sinaloa state agencies: SIN-Obras Publicas 200M SB (2009). "
        "Combined water infrastructure (CONAGUA) + Sinaloa state = 591M (83%). "
        "Construction/leasing company capturing federal water commission and "
        "Sinaloa state construction contracts through uncontested tenders.",
    ))
    conn.execute(sql_vendor, (
        c3, 1117, "CONSTRUCCION Y ARRENDAMIENTO SA DE CV",
        "primary", "high", "aria_queue_t3", 0.87,
        "CONAGUA 52% + Sinaloa 28% = 83% combined, 83.5% SB",
    ))

    # Case 4: FYSIS SOLUCIONES AMBIENTALES - CFE environmental DA capture
    conn.execute(sql_case, (
        c4, f"CASE-{c4}",
        "CFE Environmental Services Direct Award Capture - Fysis Soluciones Ambientales",
        "institutional_capture", 2013, 2019, "high", 337_000_000,
        "ARIA T3 queue pattern analysis",
        "FYSIS SOLUCIONES AMBIENTALES SA DE CV (v87441): 6 contracts, 411M total (2013-2019). "
        "CFE (Comision Federal de Electricidad): 337M (82%), 100% DA. "
        "CFE Generacion VI: 276M DA (2016) = single largest contract. "
        "Also PEMEX: 45M SB (2018). "
        "Environmental/industrial services company with 82% concentration at "
        "Mexico's national electricity company via 100% direct awards. "
        "Large single-award 276M DA at CFE subsidiary in 2016.",
    ))
    conn.execute(sql_vendor, (
        c4, 87441, "FYSIS SOLUCIONES AMBIENTALES SA DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "CFE 82% concentration, 100% DA at CFE, 276M DA in 2016",
    ))

    # Link contracts
    links = [
        (c1, 50645, 2004, 2025),
        (c2, 76012, 2010, 2024),
        (c3, 1117, 2007, 2020),
        (c4, 87441, 2013, 2019),
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

    for vid in [50645, 76012, 1117, 87441]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    skips = [
        (249324, "Global Eisai pharma (Japanese brand) - specialty neurology/oncology drugs, structural DA"),
        (36907, "Dispersed multi-sector (Corporativo ICSI) - SEC estatal 48% + PEMEX 27%, no single capture"),
        (19557, "Dispersed across 3 different state/federal institutions (SUCISA), no concentration"),
        (12669, "Dispersed IT vendor (Netrix) - INM 41% + FIRA 37% at two different sectors, not capture"),
    ]
    for vid, reason in skips:
        conn.execute(
            "UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes=? WHERE vendor_id=?",
            (reason, vid),
        )
        print(f"  v{vid}: SKIP")

    conn.commit()
    conn.close()
    print(f"\nDone. Inserted 4 cases ({c1}-{c4}), linked {total_linked} contracts, skipped 4.")


if __name__ == "__main__":
    main()
