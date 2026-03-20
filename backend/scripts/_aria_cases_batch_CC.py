#!/usr/bin/env python3
"""
GT Batch CC — ARIA T3 investigation (4 vendors, all confirmed)

Case CC+0: KIT WEAR SA DE CV (v264411)
          7 contracts, 624M MXN. Secretaria de Bienestar: 6 contracts 617M @ 83% SB (2020-2025).
          P1 Monopoly flag.

Case CC+1: IMAGE TECHNOLOGY SA DE CV (v10800)
          8 contracts, 1,291M MXN. Seguro Popular: 100% SB (2005-2006).

Case CC+2: MULTISERVICIOS JAVER SA DE CV (v25673)
          24 contracts, ~698M MXN. CDMX Obras 507M @ 75% SB + Morelos 191M @ 67% SB (2006-2017).

Case CC+3: MUEBLES Y MUDANZAS INTERNACIONALES SA DE CV (v2938)
          38 contracts, 687M MXN. SEPOMEX: 100% SB (2010-2013).
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 809:
        print(f"ERROR: max_id={max_id}, expected >= 809. Aborting.")
        conn.close()
        return

    c0 = max_id + 1  # KIT WEAR
    c1 = max_id + 2  # IMAGE TECHNOLOGY
    c2 = max_id + 3  # MULTISERVICIOS JAVER
    c3 = max_id + 4  # MUEBLES Y MUDANZAS

    print(f"Max GT case id: {max_id}")
    print(f"Inserting cases {c0}-{c3}")

    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, source_news, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (c0, f"CASE-{c0}",
         "Bienestar Uniform Single-Bid Monopoly — Kit Wear",
         "single_bid_capture", 2020, 2025,
         "high", 617_000_000,
         "ARIA T3 investigation, P1 Monopoly flag",
         "KIT WEAR SA DE CV (v264411) dominates uniform/apparel procurement at Secretaria "
         "de Bienestar. 6 contracts totaling 617M MXN at 83% single-bid rate (2020-2025). "
         "P1 Monopoly classification in ARIA. All competitive tenders won uncontested. "
         "Classic welfare-era SB capture: vendor emerged with AMLO administration and "
         "maintained exclusive access to Bienestar apparel contracts."),
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)""",
        (c0, 264411, "KIT WEAR SA DE CV", "high", "aria_queue_t3"),
    )

    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, source_news, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (c1, f"CASE-{c1}",
         "Seguro Popular IT Single-Bid Capture — Image Technology",
         "single_bid_capture", 2005, 2006,
         "high", 1_291_000_000,
         "ARIA T3 investigation",
         "IMAGE TECHNOLOGY SA DE CV (v10800) captured 1.291B MXN in IT contracts at "
         "Seguro Popular via 100% single-bid procedures in 2005-2006. 8 contracts, "
         "all uncontested competitive procedures at one institution in a 2-year window. "
         "Extreme concentration: 100% of value at Seguro Popular, 100% SB rate."),
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)""",
        (c1, 10800, "IMAGE TECHNOLOGY SA DE CV", "high", "aria_queue_t3"),
    )

    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, source_news, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (c2, f"CASE-{c2}",
         "CDMX/Morelos Construction Single-Bid Capture — Multiservicios Javer",
         "single_bid_capture", 2006, 2017,
         "medium", 500_000_000,
         "ARIA T3 investigation",
         "MULTISERVICIOS JAVER SA DE CV (v25673) captured construction contracts across "
         "two state-level public works agencies. CDMX Obras Publicas: 507M MXN at ~75% SB "
         "(2006-2014). Morelos Secretaria de Obras: 191M MXN at ~67% SB (2015-2017). "
         "Total ~698M MXN. 24 contracts. Cross-state construction intermediary with "
         "systematic single-bid wins spanning two administrations."),
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)""",
        (c2, 25673, "MULTISERVICIOS JAVER SA DE CV", "medium", "aria_queue_t3"),
    )

    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, source_news, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (c3, f"CASE-{c3}",
         "SEPOMEX Logistics Single-Bid Capture — Muebles y Mudanzas",
         "single_bid_capture", 2010, 2013,
         "high", 687_000_000,
         "ARIA T3 investigation",
         "MUEBLES Y MUDANZAS INTERNACIONALES SA DE CV (v2938) captured 687M MXN in "
         "furniture/logistics contracts at SEPOMEX via 100% single-bid procedures "
         "(2010-2013). 38 contracts, all uncontested competitive tenders at the state "
         "postal service. 100% institutional concentration, 100% SB rate. Classic SB "
         "capture pattern with dedicated postal-sector vendor facing zero competition."),
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)""",
        (c3, 2938, "MUEBLES Y MUDANZAS INTERNACIONALES SA DE CV", "high", "aria_queue_t3"),
    )

    # ── Link contracts ────────────────────────────────────────────────────
    cases_vendors = [
        (c0, 264411, 2020, 2025),
        (c1, 10800,  2005, 2006),
        (c2, 25673,  2006, 2017),
        (c3, 2938,   2010, 2013),
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

    # ── ARIA queue updates ────────────────────────────────────────────────
    for vid in [264411, 10800, 25673, 2938]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    conn.commit()
    conn.close()

    print(f"\nDone. Inserted {c3 - c0 + 1} cases ({c0}-{c3}), linked {total_linked} contracts.")


if __name__ == "__main__":
    main()
