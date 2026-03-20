#!/usr/bin/env python3
"""
GT Mining Batch DD -- ARIA T3 investigation (5 vendors)

Investigated 2026-03-20:
  v33566   GANADEROS PRODUCTORES DE LECHE PURA SA DE CV    -> ADD  (DIF EdoMex single-bid capture, 581M in 2 SB contracts)
  v74103   VIGI-KLEAN DEL SURESTE SA DE CV                 -> SKIP (diversified cleaning company, 8+ institutions, no capture)
  v16929   VISION CONSERVACION Y MANTENIMIENTO S DE RL     -> SKIP (20-year ISSSTE vendor, moderate DA, established tenure)
  v7848    SERVICIOS DE INGENIERIA Y CONTROL AVANZADO      -> SKIP (PEMEX engineering specialist, structural energy sector)
  v83456   COMERCIALIZADORA SALYMED SA DE CV               -> ADD  (ISSSTE pharma capture, 236M windfall 2017-2018, 87% ISSSTE)

Cases added: 2  |  Vendors skipped: 3
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 806:
        print(f"ERROR: max_id={max_id}, expected >= 806. Aborting.")
        conn.close()
        return

    c1 = max_id + 1  # v33566 -- DIF EdoMex single-bid dairy capture
    c2 = max_id + 2  # v83456 -- ISSSTE pharma distributor capture

    print(f"Max GT case id: {max_id}")
    print(f"Inserting cases {c1}-{c2}")

    # -- Case 1: v33566 -- DIF EdoMex Single-Bid Dairy Capture -----------
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, source_news, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            c1,
            f"CASE-{c1}",
            "DIF EdoMex Dairy Single-Bid Capture -- Ganaderos Productores",
            "single_bid_capture",
            2007,
            2008,
            "medium",
            581_000_000,
            "ARIA T3 queue pattern analysis",
            "GANADEROS PRODUCTORES DE LECHE PURA won 2 massive single-bid "
            "Licitacion Publica contracts at DIF Estado de Mexico: 118.5M (2007) "
            "and 462.2M (2008), totaling 581M MXN -- 95.5% of vendor lifetime "
            "value. Only 4 contracts total. A dairy cooperative winning 462M in a "
            "single-bid competitive procedure is consistent with institutional "
            "capture at state-level DIF. Remaining 2 contracts at DIF Quintana Roo "
            "(27M, competitive) suggest limited legitimate reach. P3 intermediary "
            "flag. No RFC on file.",
        ),
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)""",
        (c1, 33566, "GANADEROS PRODUCTORES DE LECHE PURA, S.A. DE C.V.", "medium", "aria_queue_t3"),
    )

    # -- Case 2: v83456 -- ISSSTE Pharma Distributor Capture -------------
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, source_news, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            c2,
            f"CASE-{c2}",
            "ISSSTE Pharma Distributor Capture -- Comercializadora Salymed",
            "procurement_capture",
            2017,
            2018,
            "medium",
            236_000_000,
            "ARIA T3 queue pattern analysis",
            "COMERCIALIZADORA SALYMED, medical/pharma distributor, scaled from "
            "3.3M/yr to 161M/yr at ISSSTE between 2015-2018 -- a 49x increase. "
            "ISSSTE represents 87% of vendor lifetime value (320M of 369M). "
            "The 2017-2018 windfall (236M at ISSSTE, 40-50% DA) followed by "
            "collapse to 2-3M/yr in 2019-2021 is the classic institutional "
            "capture pattern. A 2022 bump to 43.6M at 83% DA suggests renewed "
            "access. Also served SEDENA (31M), SENASICA (5M), and national "
            "institutes (small). 61% overall DA rate. No RFC on file.",
        ),
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)""",
        (c2, 83456, "COMERCIALIZADORA SALYMED SA DE CV", "medium", "aria_queue_t3"),
    )

    # -- Link contracts to GT --------------------------------------------
    cases_vendors = [
        (c1, 33566, 2007, 2008),
        (c2, 83456, 2017, 2018),
    ]
    total_linked = 0
    for case_id, vendor_id, yr_start, yr_end in cases_vendors:
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

    # -- ARIA queue updates -----------------------------------------------
    # Confirmed vendors
    for vid in [33566, 83456]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    # Skipped vendors
    conn.execute(
        "UPDATE aria_queue SET review_status='reviewed', "
        "reviewer_notes='SKIP: diversified cleaning/security company across 8+ institutions "
        "(ISSSTE 20%, IMSS-Bienestar 18%, CRAE Chiapas 17%, CAPUFE 12%). No extreme "
        "concentration at any single institution. 280 contracts over 15 years. Legitimate "
        "diversified services vendor.' WHERE vendor_id=?",
        (74103,),
    )
    conn.execute(
        "UPDATE aria_queue SET review_status='reviewed', "
        "reviewer_notes='SKIP: 20-year ISSSTE maintenance vendor (2005-2024) with moderate "
        "DA rates (47% at ISSSTE). Long tenure and gradual growth suggest established vendor "
        "relationship, not capture. Also serves Parque Fundidora, INEGI, SADER. 134 contracts, "
        "no abrupt scaling.' WHERE vendor_id=?",
        (16929,),
    )
    conn.execute(
        "UPDATE aria_queue SET review_status='reviewed', "
        "reviewer_notes='SKIP: PEMEX engineering specialist (2002-2010 era, Structure A data). "
        "51% of value at PEMEX Refinacion with 68% SB, but this reflects structural energy "
        "sector specialization. Post-2010 activity small-scale at IMP and ASA. No capture "
        "pattern.' WHERE vendor_id=?",
        (7848,),
    )

    conn.commit()
    conn.close()

    print(f"\nDone. Inserted {c2 - c1 + 1} cases ({c1}-{c2}), linked {total_linked} contracts.")
    print("Skipped: v74103 VIGI-KLEAN (diversified), v16929 VISION (long-tenure ISSSTE), v7848 SERVICIOS ING (PEMEX structural)")


if __name__ == "__main__":
    main()
