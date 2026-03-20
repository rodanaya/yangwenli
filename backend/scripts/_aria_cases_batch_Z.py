#!/usr/bin/env python3
"""
GT Batch Z — ARIA T3 investigation (4 vendors, 3 confirmed + 1 skip)

Case 799: PEMEX SB capture — Maquinaria Intercontinental (v1008)
          145 contracts, 1,128M MXN. PEMEX EP: 38 contracts 844M @ 52.6% SB.
          PEMEX Gas: 69.2% SB. PEMEX Refinacion: 71.4% SB. Peak 2002-2012.
Case 800: CFE SB capture — Ufara Power Networks (v149097)
          7 contracts, 1,014M MXN. CFE: 4 contracts 1,011M @ 100% SB.
          Single 997.5M SB contract in 2016. Extreme concentration.
Case 801: CDMX/SCT intermediary — Cargo Crane (v268801)
          2 contracts, 723M MXN. 646M DA to CDMX (2021), 77M SB to SCT (2023).
          P3 intermediary pattern. RFC: CCR021011785.

SKIP: Multiproseg (v212655) — 111 contracts across 8+ institutions, no
      single-institution capture. Legitimate security services vendor.
"""
import sys
sys.stdout.reconfigure(encoding="utf-8")

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "RUBLI_NORMALIZED.db")


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    max_id = conn.execute("SELECT MAX(id) FROM ground_truth_cases").fetchone()[0]
    if max_id is None or max_id < 798:
        print(f"ERROR: max ground_truth_cases.id={max_id}, expected >= 798. Aborting.")
        conn.close()
        return

    next_id = max_id + 1
    print(f"Starting from case id {next_id} (current max={max_id})")

    # ── Case 799: Maquinaria Intercontinental — PEMEX SB capture ──
    c799 = next_id
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
           (id, case_id, case_name, case_type, year_start, year_end,
            confidence_level, estimated_fraud_mxn, source_news, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (c799, f"CASE-{c799}",
         "PEMEX SB Capture — Maquinaria Intercontinental",
         "single_bid_capture", 2002, 2012,
         "medium", 500_000_000,
         "ARIA T3 investigation",
         "Heavy machinery vendor with systematic single-bid capture at "
         "multiple PEMEX subsidiaries. PEMEX EP: 38 contracts 844M @ 52.6% SB. "
         "PEMEX Gas: 13 contracts 44M @ 69.2% SB. PEMEX Refinacion: 7 contracts "
         "16M @ 71.4% SB. Total PEMEX: ~920M. Peak SB rates 2005-2010 (55-64%). "
         "Zero DA — wins through uncontested competitive procedures.")
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
           (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
           VALUES (?, ?, ?, ?, ?)""",
        (c799, 1008, "MAQUINARIA INTERCONTINENTAL, S.A. DE C.V.",
         "medium", "aria_queue_t3")
    )
    rows = conn.execute(
        "SELECT id FROM contracts WHERE vendor_id=? AND contract_year BETWEEN ? AND ?",
        (1008, 2002, 2012)
    ).fetchall()
    for (cid,) in rows:
        conn.execute(
            "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?, ?)",
            (c799, cid)
        )
    print(f"  Case {c799}: Maquinaria Intercontinental — {len(rows)} contracts labeled")

    # ── Case 800: Ufara Power Networks — CFE SB capture ──
    c800 = next_id + 1
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
           (id, case_id, case_name, case_type, year_start, year_end,
            confidence_level, estimated_fraud_mxn, source_news, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (c800, f"CASE-{c800}",
         "CFE SB Capture — Ufara Power Networks",
         "single_bid_capture", 2015, 2017,
         "high", 1_000_000_000,
         "ARIA T3 investigation",
         "Electrical infrastructure vendor with extreme single-bid capture at CFE. "
         "4 contracts at CFE totaling 1,011M MXN at 100% SB rate. Single contract "
         "in 2016 worth 997.5M MXN won through uncontested competitive procedure. "
         "Only 7 total contracts — classic SB capture pattern where vendor faces "
         "zero competition on billion-peso CFE tenders.")
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
           (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
           VALUES (?, ?, ?, ?, ?)""",
        (c800, 149097, "UFARA POWER NETWORKS SA DE CV",
         "high", "aria_queue_t3")
    )
    rows = conn.execute(
        "SELECT id FROM contracts WHERE vendor_id=? AND contract_year BETWEEN ? AND ?",
        (149097, 2015, 2017)
    ).fetchall()
    for (cid,) in rows:
        conn.execute(
            "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?, ?)",
            (c800, cid)
        )
    print(f"  Case {c800}: Ufara Power Networks — {len(rows)} contracts labeled")

    # ── Case 801: Cargo Crane — CDMX/SCT intermediary ──
    c801 = next_id + 2
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_cases
           (id, case_id, case_name, case_type, year_start, year_end,
            confidence_level, estimated_fraud_mxn, source_news, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (c801, f"CASE-{c801}",
         "CDMX/SCT Intermediary — Cargo Crane",
         "intermediary_capture", 2021, 2023,
         "medium", 645_000_000,
         "ARIA T3 investigation",
         "P3 intermediary pattern. Only 2 contracts totaling 723M MXN. "
         "646M direct award from Gobierno de CDMX (2021) — single massive DA. "
         "77M single-bid contract from SICT (2023). RFC CCR021011785 (incorporated "
         "2002). Extremely high value-per-contract (361M avg) with mixed DA/SB "
         "pattern consistent with intermediary role.")
    )
    conn.execute(
        """INSERT OR IGNORE INTO ground_truth_vendors
           (case_id, vendor_id, vendor_name_source, evidence_strength, match_method)
           VALUES (?, ?, ?, ?, ?)""",
        (c801, 268801, "CARGO CRANE, S.A. DE C.V.",
         "medium", "aria_queue_t3")
    )
    rows = conn.execute(
        "SELECT id FROM contracts WHERE vendor_id=? AND contract_year BETWEEN ? AND ?",
        (268801, 2021, 2023)
    ).fetchall()
    for (cid,) in rows:
        conn.execute(
            "INSERT OR IGNORE INTO ground_truth_contracts (case_id, contract_id) VALUES (?, ?)",
            (c801, cid)
        )
    print(f"  Case {c801}: Cargo Crane — {len(rows)} contracts labeled")

    # ── ARIA queue updates ──
    # Confirmed vendors
    for vid in [1008, 149097, 268801]:
        conn.execute(
            "UPDATE aria_queue SET in_ground_truth=1, review_status='confirmed' WHERE vendor_id=?",
            (vid,)
        )
    # Skipped vendor
    conn.execute(
        """UPDATE aria_queue SET review_status='reviewed',
           reviewer_notes='SKIP: 111 contracts across 8+ institutions (INEA, Colegio Bachilleres, INP, hospitals, CEAV, Banobras). DA=50%, SB=46%. No single-institution capture — legitimate security services vendor with broad government client base.'
           WHERE vendor_id=?""",
        (212655,)
    )

    conn.commit()
    print(f"\nDone. Inserted cases {next_id}-{next_id+2}. Skipped v212655 (Multiproseg).")
    print("ARIA queue: 3 confirmed, 1 reviewed/skipped.")

    # Verify
    for cid in [c799, c800, c801]:
        n = conn.execute(
            "SELECT COUNT(*) FROM ground_truth_contracts WHERE case_id=?", (cid,)
        ).fetchone()[0]
        name = conn.execute(
            "SELECT case_name FROM ground_truth_cases WHERE id=?", (cid,)
        ).fetchone()[0]
        print(f"  Verify case {cid}: {name} — {n} contracts")

    conn.close()


if __name__ == "__main__":
    main()
