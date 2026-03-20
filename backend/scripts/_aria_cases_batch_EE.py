#!/usr/bin/env python3
"""
GT Mining Batch EE - ARIA T3 investigation (3 vendors)

Investigated 2026-03-20:
  v27506   ZAPATA INTERNACIONAL SA CV                    -> ADD  (PEMEX PEP SB capture, 1.7B)
  v21092   EXPLORACIONES MINERAS DEL DESIERTO SA DE CV   -> ADD  (Sonora infra monopoly, 3.7B)
  v36960   DRAGADOS OFFSHORE DE MEXICO SA DE CV          -> ADD  (PEMEX PEP SB capture, 2.9B)

Cases added: 3  |  Vendors skipped: 0
"""
import sqlite3, sys, os

sys.stdout.reconfigure(encoding="utf-8")

DB = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 813:
        print(f"ERROR: max_id={max_id}, expected >= 813. Aborting.")
        conn.close()
        return

    c1 = max_id + 1
    c2 = max_id + 2
    c3 = max_id + 3

    print(f"Max GT case id: {max_id}")
    print(f"Inserting cases {c1}-{c3}")

    # -- Case 1: v27506 - PEMEX PEP Single-Bid Capture - Zapata Internacional --
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, source_news, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            c1,
            f"CASE-{c1}",
            "PEMEX PEP Single-Bid Capture - Zapata Internacional",
            "single_bid_capture",
            2006,
            2007,
            "medium",
            1_711_000_000,
            "ARIA T3 queue pattern analysis",
            "ZAPATA INTERNACIONAL SA CV won 3 contracts at PEMEX Exploracion y "
            "Produccion in 2006-2007 totaling 1,711M MXN. All via Licitacion Publica "
            "but 100% single-bid (no other bidders). 100% institutional concentration. "
            "P3 intermediary flag. No RFC. Medium confidence - could be legitimate "
            "offshore specialist, but single-bid pattern at PEMEX PEP is consistent "
            "with structured tenders. Energia sector.",
        ),
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)""",
        (c1, 27506, "ZAPATA INTERNACIONAL SA CV", "medium", "aria_queue_t3"),
    )

    # -- Case 2: v21092 - Sonora Infrastructure Single-Bid Monopoly --
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, source_news, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            c2,
            f"CASE-{c2}",
            "Sonora Infrastructure Single-Bid Monopoly - Exploraciones Mineras del Desierto",
            "single_bid_capture",
            2005,
            2011,
            "high",
            3_700_000_000,
            "ARIA T3 queue pattern analysis",
            "EXPLORACIONES MINERAS DEL DESIERTO won 33 contracts totaling 3,740M MXN "
            "across Sonora state infrastructure agencies (2005-2018), ALL 100% single-bid. "
            "Largest: 2,443M single contract at Fondo de Operacion de Obras Sonora (2010). "
            "Name implies mining company but wins road/highway contracts - sector mismatch. "
            "100% SB rate across 14 years and 7 institutions is statistically implausible. "
            "Multi-level state/federal capture in Sonora: SCT, Gobierno del Estado, Junta "
            "Estatal de Caminos, CAPUFE, Ayuntamiento de Guaymas. P1 Monopoly flag. "
            "Infraestructura sector. Fraud period scoped to 2005-2011 (peak activity; "
            "post-2011 only 3 small SCT contracts totaling 40M).",
        ),
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)""",
        (c2, 21092, "EXPLORACIONES MINERAS DEL DESIERTO, S.A. DE C.V.", "high", "aria_queue_t3"),
    )

    # -- Case 3: v36960 - PEMEX PEP Single-Bid Capture - Dragados Offshore --
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
        (id, case_id, case_name, case_type, year_start, year_end,
         confidence_level, estimated_fraud_mxn, source_news, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            c3,
            f"CASE-{c3}",
            "PEMEX PEP Single-Bid Capture - Dragados Offshore de Mexico",
            "single_bid_capture",
            2008,
            2009,
            "medium",
            2_909_000_000,
            "ARIA T3 queue pattern analysis",
            "DRAGADOS OFFSHORE DE MEXICO won 3 contracts at PEMEX Exploracion y "
            "Produccion in 2008-2009 totaling 2,909M MXN. All via Licitacion Publica "
            "but 100% single-bid. Largest: 2,630M single contract in 2009. 100% "
            "institutional concentration. P3 intermediary flag. No RFC. Medium "
            "confidence - Dragados name associated with Spanish ACS group (potential "
            "structural explanation), but Mexican subsidiary shows capture pattern "
            "at PEMEX PEP consistent with structured tenders. Energia sector.",
        ),
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
        (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
        VALUES (?,?,?,?,?)""",
        (c3, 36960, "DRAGADOS OFFSHORE DE MÉXICO, S.A. DE C.V.", "medium", "aria_queue_t3"),
    )

    # -- Link contracts to GT --
    cases_vendors = [
        (c1, 27506, 2006, 2007),
        (c2, 21092, 2005, 2011),
        (c3, 36960, 2008, 2009),
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

    # -- ARIA queue updates --
    for vid in [27506, 21092, 36960]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,),
        )

    conn.commit()
    conn.close()

    n_cases = c3 - c1 + 1
    print(f"\nDone. Inserted {n_cases} cases ({c1}-{c3}), linked {total_linked} contracts.")
    print("All 3 vendors confirmed as single-bid capture cases.")


if __name__ == "__main__":
    main()
