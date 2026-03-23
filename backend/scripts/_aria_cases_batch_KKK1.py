#!/usr/bin/env python3
"""
GT Mining Batch KKK1 - ARIA T3 investigation (6 vendors)

Investigated 2026-03-23:
  v137967  POWER DEPOT SA DE CV             SKIP (moderate Jalisco, 44.7% top inst, not strong enough)
  v1724    REPRESENTACIONES ALDO CAMPECHE   ADD  (Campeche state SB, 891M single contract 2007)
  v15446   BOSNOR SA DE CV                  ADD  (PEMEX SB/DA capture, 99% at PEMEX, 3 contracts)
  v46975   AGILENT TECHNOLOGIES MEXICO      SKIP (global Agilent/HP brand, structural DA on lab equipment)
  v53907   CONECTIVIDAD EXPERTA             SKIP (CNSF IT, borderline financial regulator IT)
  v118914  SARENGGO SA DE CV               ADD  (Banco del Bienestar capture, 81% concentration, 390M)

Cases added: 3  |  Vendors skipped: 3
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 926:
        print(f"ERROR: max_id={max_id}, expected >= 926. Aborting.")
        conn.close()
        return

    c1 = max_id + 1
    c2 = max_id + 2
    c3 = max_id + 3

    print(f"Max GT case id: {max_id}")
    print(f"Inserting cases {c1}-{c3}")

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

    # Case 1: REPRESENTACIONES ALDO - Campeche state SB
    conn.execute(sql_case, (
        c1, f"CASE-{c1}",
        "Campeche State Public Works Single-Bid Capture - Representaciones Aldo",
        "single_bid_capture", 2002, 2024, "high", 890_800_000,
        "ARIA T3 queue pattern analysis",
        "REPRESENTACIONES ALDO DE CAMPECHE SA DE CV (v1724): 36 contracts, 982M "
        "(2002-2024). 94.4% single-bid rate. "
        "Secretaria de Obras Publicas y Comunicaciones: 890.8M SB (2007) = 90.7% "
        "of total value in ONE single-bid contract. Additional smaller SB contracts "
        "at Secretaria de Infraestructura Campeche (2018-2022). "
        "Campeche-based construction company winning state government public works "
        "via uncontested competitive tenders. Massive single-contract SB capture "
        "in 2007 represents over 890M to a local construction firm.",
    ))
    conn.execute(sql_vendor, (
        c1, 1724, "REPRESENTACIONES ALDO DE CAMPECHE S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.90,
        "Campeche SPC 891M SB 2007 = 90.7% of total, 36 ctrs 94.4% SB",
    ))

    # Case 2: BOSNOR - PEMEX capture
    conn.execute(sql_case, (
        c2, f"CASE-{c2}",
        "PEMEX Exploration Direct Award Capture - Bosnor",
        "institutional_capture", 2003, 2014, "high", 452_900_000,
        "ARIA T3 queue pattern analysis",
        "BOSNOR SA DE CV (v15446): 3 contracts, 457M total (2003-2014). "
        "99% concentrated at PEMEX: PEP (PEMEX Exploracion y Produccion) 404M SB "
        "(2003) + PEMEX Corporativo 48.9M DA (2012). "
        "Two massive contracts at PEMEX spanning 9 years. "
        "Energy/marine services company with near-total PEMEX dependency. "
        "66.7% DA rate (2 of 3 contracts are DA). Single uncontested tender + "
        "direct award pattern at Mexico's national oil company.",
    ))
    conn.execute(sql_vendor, (
        c2, 15446, "BOSNOR, S.A. DE C.V.",
        "primary", "high", "aria_queue_t3", 0.88,
        "PEMEX 99% concentration: 404M SB 2003 + 48.9M DA 2012",
    ))

    # Case 3: SARENGGO - Banco del Bienestar capture
    conn.execute(sql_case, (
        c3, f"CASE-{c3}",
        "Banco del Bienestar IT Institutional Capture - Sarenggo",
        "institutional_capture", 2013, 2020, "high", 390_000_000,
        "ARIA T3 queue pattern analysis",
        "SARENGGO SA DE CV (v118914): 9 contracts, 480M total (2013-2020). "
        "Banco del Bienestar SNC: 243.4M SB (2019) + 146.6M DA (2019) = 390M (81%). "
        "Also SEDATU: 60M SB (2020), IMP: 25.7M SB (2013). "
        "IT/services company with 81% concentration at Banco del Bienestar "
        "(government bank for financial inclusion of unbanked population). "
        "Major contracts via both SB and DA methods at the AMLO-era government bank "
        "in a single year (2019). Classic dual-method institutional capture.",
    ))
    conn.execute(sql_vendor, (
        c3, 118914, "SARENGGO SA DE CV",
        "primary", "high", "aria_queue_t3", 0.88,
        "Banco del Bienestar 81%: 243M SB + 146M DA in 2019",
    ))

    # Link contracts
    links = [
        (c1, 1724, 2002, 2024),
        (c2, 15446, 2003, 2014),
        (c3, 118914, 2013, 2020),
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

    for vid in [1724, 15446, 118914]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    skips = [
        (137967, "Moderate Jalisco concentration (Power Depot), 44.7% top institution not strong enough for capture"),
        (46975, "Global Agilent Technologies brand (HP spin-off), structural DA for proprietary lab instruments"),
        (53907, "Borderline CNSF IT services (Conectividad Experta), financial regulator IT legitimately concentrated"),
    ]
    for vid, reason in skips:
        conn.execute(
            "UPDATE aria_queue SET review_status='skipped', in_ground_truth=0, reviewer_notes=? WHERE vendor_id=?",
            (reason, vid),
        )
        print(f"  v{vid}: SKIP")

    conn.commit()
    conn.close()
    print(f"\nDone. Inserted 3 cases ({c1}-{c3}), linked {total_linked} contracts, skipped 3.")


if __name__ == "__main__":
    main()
